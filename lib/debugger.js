'use babel'

import { store, getDebugger, getBreakpoint, getBreakpoints, addOutputMessage } from './store'

/**
 * Starts a new debugging session.
 * @param  {string} name   The name of the debugger.
 * @param  {object} config The config used to start the debugger.
 * @param  {string} file   The file to debug
 * @return {Promise}
 */
export function start (name, config, file) {
  const { api } = getDebugger(name)

  // show the panel if not visible yet
  const panelState = store.getState().panel
  if (!panelState.visible) {
    store.dispatch({ type: 'TOGGLE_PANEL' })
  }

  store.dispatch({ type: 'SET_STATE', name: name, state: 'starting' })

  // start the debugger
  addOutputMessage('debug', `Starting debugger "${name}" with config "${config.name}"`)

  return api.start({ config, file })
    .then(() => {
      addOutputMessage('debug', `Started debugger "${name}" with config "${config.name}"`)
      store.dispatch({ type: 'SET_STATE', name: name, state: 'started' })

      return Promise.all(
        getBreakpoints(name).map((bp) => {
          return addBreakpoint(name, bp.file, bp.line)
        })
      ).then(() => {
        // if !config.stopOnEntry
        return resume()
      })
    })
    .catch((err) => {
      addOutputMessage('debug', `Failed to start debugger "${name}" with config "${config.name}"\r\n  Error: ${err}`)
      return stop()
    })
}

/**
 * Stops a debugging session.
 * @param  {string} name The name of the debugger.
 * @return {Promise}
 */
export function stop (name) {
  if (!isStarted(name)) {
    return Promise.resolve()
  }
  const { name: dbgName, api } = getDebugger(name)
  return api.stop().then(() => {
    store && store.dispatch({ type: 'STOP', name: name || dbgName })
  })
}

/**
 * Adds a new breakpoint to the given file and line
 * @param {string} name The name of the debugger.
 * @param {string} file
 * @param {number} line
 * @return {Promise}
 */
export function addBreakpoint (name, file, line) {
  if (!isStarted()) {
    store.dispatch({ type: 'ADD_BREAKPOINT', name, bp: { file, line, state: 'notStarted' } })
    return Promise.resolve()
  }

  const bp = getBreakpoint(name, file, line)
  if (bp && bp.state === 'busy') {
    // already being added
    return Promise.resolve()
  }

  const fileAndLine = `${file}:${line + 1}`
  addOutputMessage('debug', `Adding breakpoint @ ${fileAndLine}`)
  store.dispatch({ type: 'ADD_BREAKPOINT', name, bp: { file, line, state: 'busy' } })
  return _addBreakpoint(name, file, line)
    .then((response) => {
      addOutputMessage('debug', `Added breakpoint @ ${fileAndLine}`)
      store.dispatch({ type: 'ADD_BREAKPOINT', name, bp: { file, line, id: response.id, state: 'valid' } })
    })
    .catch((err) => {
      addOutputMessage('debug', `Adding breakpoint @ ${fileAndLine} failed!\r\n  Error: ${err}`)
      store.dispatch({ type: 'ADD_BREAKPOINT', name, bp: { file, line, state: 'invalid', message: err } })
    })
}
function _addBreakpoint (name, file, line) {
  return getDebugger(name).api.addBreakpoint({ file, line })
}

/**
 * Removes a breakpoint set on the given file and line
 * @param {string} name The name of the debugger.
 * @param {string} file
 * @param {number} line
 * @return {Promise}
 */
export function removeBreakpoint (name, file, line) {
  const bp = getBreakpoint(name, file, line)
  if (!bp) {
    return Promise.resolve()
  }
  const { state } = bp

  function done () {
    store.dispatch({ type: 'REMOVE_BREAKPOINT', name, bp: { file, line, state: 'removed' } })
  }

  if (state === 'invalid' || !isStarted()) {
    return Promise.resolve().then(done)
  }

  const fileAndLine = `${file}:${line + 1}`
  addOutputMessage('debug', `Removing breakpoint @ ${fileAndLine}`)
  store.dispatch({ type: 'REMOVE_BREAKPOINT', name, bp: { file, line, state: 'busy' } })
  return _removeBreakpoint(name, bp)
    .then(() => addOutputMessage('debug', `Removed breakpoint @ ${fileAndLine}`))
    .then(done)
    .catch((err) => {
      addOutputMessage('debug', `Removing breakpoint @ ${fileAndLine} failed!\r\n  Error: ${err}`)
      store.dispatch({ type: 'REMOVE_BREAKPOINT', name, bp: { file, line, state: 'invalid', message: err } })
    })
}
function _removeBreakpoint (name, bp) {
  return getDebugger(name).api.removeBreakpoint({ bp })
}

/**
 * Adds or removes a breakpoint for the given file and line.
 * @param {string} name The name of the debugger.
 * @param {string} file
 * @param {number} line
 * @return {Promise}
 */
export function toggleBreakpoint (name, file, line) {
  const bp = store.getBreakpoint(name, file, line)
  if (!bp) {
    return addBreakpoint(name, file, line)
  }
  return removeBreakpoint(name, file, line)
}

/**
 * Resumes the current debugger.
 * @return {Promise}
 */
export function resume () {
  return getDebugger().api.resume().then(updateState)
}

/**
 * Step the current debugger to the next line.
 * @return {Promise}
 */
export function next () {
  return getDebugger().api.next().then(updateState)
}

/**
 * Step the current debugger into the current function/instruction.
 * @return {Promise}
 */
export function stepIn () {
  return getDebugger().api.stepIn().then(updateState)
}

/**
 * Step the current debugger out of the current function/instruction.
 * @return {Promise}
 */
export function stepOut () {
  return getDebugger().api.stepOut().then(updateState)
}

function updateState (newState) {
  if (newState.exited) {
    return stop()
  }
  return getThreads() // get the new threads
    .then(() => selectThread(newState.threadID)) // select the current thread
    .then(() => selectStacktrace(0)) // reselect the first stacktrace entry
}

/**
 * Restarts the current debugger.
 * @return {Promise}
 */
export function restart () {
  if (!isStarted()) {
    return Promise.resolve()
  }
  const { name, api } = getDebugger()
  return api.restart().then(() => {
    store.dispatch({ type: 'RESTART', name })
    // TODO add the breakpoints again?
    // immediately start the execution (like "start" does)
    resume()
  })
}

/**
 * Selects the given stacktrace of the current debugger.
 * @param  {number} index The selected index within the stacktrace
 * @return {Promise}
 */
export function selectStacktrace (index) {
  const dbg = getDebugger()
  const { name, api } = dbg
  if (dbg.selectedStacktrace === index) {
    // no need to change
    return Promise.resolve()
  }
  store.dispatch({ type: 'SET_SELECTED_STACKTRACE', state: 'busy', index })
  return api.selectStacktrace({ index }).then(() => {
    store.dispatch({ type: 'SET_SELECTED_STACKTRACE', name, state: 'waiting', index })
  })
}

/**
 * Selects the given thread of the current debugger.
 * @param  {string|number} id The id of the selected thread
 * @return {Promise}
 */
export function selectThread (id) {
  if (!isStarted()) {
    return Promise.resolve()
  }
  const dbg = getDebugger()
  const { name, api } = dbg
  if (dbg.selectedThread === id) {
    // no need to change
    return getStacktrace(id)
  }
  store.dispatch({ type: 'SET_SELECTED_THREAD', name, state: 'busy', id })
  return api.selectThread({ id }).then(() => {
    store.dispatch({ type: 'SET_SELECTED_THREAD', name, state: 'waiting', id })
    return getStacktrace(id)
  })
}

function getStacktrace (threadID) {
  if (!isStarted()) {
    return Promise.resolve()
  }
  const { name, api } = getDebugger()
  store.dispatch({ type: 'SET_STATE', name, state: 'busy' })
  return api.getStacktrace({ threadID }).then((stacktrace) => {
    store.dispatch({ type: 'UPDATE_STACKTRACE', name, state: 'waiting', stacktrace })
  })
}

function getThreads () {
  if (!isStarted()) {
    return Promise.resolve()
  }
  const { name, api } = getDebugger()
  store.dispatch({ type: 'SET_STATE', name, state: 'busy' })
  return api.getThreads().then((threads) => {
    store.dispatch({ type: 'UPDATE_THREADS', name, state: 'waiting', threads })
  })
}

/**
 * Loads the variables for the given path.
 * @param  {string} path     The path of the variable to load
 * @param  {object} variable The variable
 * @return {Promise}
 */
export function loadVariable (path, variable) {
  const dbg = getDebugger()
  const { name, api } = dbg

  store.dispatch({ type: 'SET_STATE', name, state: 'busy' })
  return api.loadVariable({ path, variable }).then((variables) => {
    store.dispatch({
      type: 'UPDATE_VARIABLES',
      // updating variable at this path ...
      path,
      // ... resulted in the following variables
      variables,
      name,
      // add it to current selected stacktrace entry
      stacktraceIndex: dbg.selectedStacktrace,
      state: 'waiting'
    })
  })
}

/**
 * Returns `true` if the given debugger is started, `false` otherwise.
 * @param  {string} name   The name of the debugger.
 * @return {boolean}
 */
export function isStarted (name) {
  const dbg = getDebugger(name)
  const state = dbg ? dbg.state : 'notStarted'
  return state !== 'notStarted' && state !== 'starting'
}
