'use babel'

import { createStore, combineReducers } from 'redux'

const assign = (...items) => Object.assign.apply(Object, [{}].concat(items))

function updateArrayItem (array, index, o) {
  return array.slice(0, index).concat(
    assign(array[index], o),
    array.slice(index + 1)
  )
}

function stacktrace (state = [], action) {
  switch (action.type) {
    case 'RESTART':
    case 'STOP':
      return []

    case 'UPDATE_STACKTRACE':
      // attempt to copy the variables over to the new stacktrace
      return action.stacktrace.map((stack) => {
        const existingStack = state.find((st) => st.id === stack.id)
        if (!stack.variables && existingStack) {
          stack.variables = existingStack.variables
        }
        return stack
      })

    case 'UPDATE_VARIABLES':
      var variables = state[action.stacktraceIndex].variables
      if (action.path) {
        // update the variable at "path" to loaded
        variables = assign(variables, {
          [action.path]: assign(variables[action.path], { loaded: true })
        })
      }

      variables = assign(variables, action.variables)
      return updateArrayItem(state, action.stacktraceIndex, { variables: variables })
  }
  return state
}
function threads (state = [], action) {
  switch (action.type) {
    case 'RESTART':
    case 'STOP':
      return []

    case 'UPDATE_THREADS':
      return action.threads || state
  }
  return state
}
function breakpoints (state = [], action) {
  const { bp } = action
  const { file, line } = bp || {}
  const index = indexOfBreakpoint(state, file, line)
  switch (action.type) {
    case 'ADD_BREAKPOINT':
      if (index === -1) {
        return state.concat(bp).sort((a, b) => {
          const s = a.file.localeCompare(b.file)
          return s !== 0 ? s : (a.line - b.line)
        })
      }
      return updateArrayItem(state, index, bp)

    case 'REMOVE_BREAKPOINT':
      if (bp.state !== 'busy') {
        return index === -1 ? state : state.slice(0, index).concat(state.slice(index + 1))
      }
      return updateArrayItem(state, index, bp)

    case 'UPDATE_BREAKPOINT_LINE':
      if (index !== -1) {
        return updateArrayItem(state, index, { line: action.newLine })
      }
      return state

    case 'STOP':
      return state.map(({ file, line }) => {
        return { file, line, state: 'notStarted' }
      })

    case 'INIT_STORE':
      return state.map((bp) => {
        return assign(bp, { state: 'notStarted' })
      })
  }

  return state
}
function state (state = 'notStarted', action) {
  switch (action.type) {
    case 'STOP':
      return 'notStarted'

    case 'RESTART':
      return 'started'

    case 'SET_STATE':
      return action.state

    case 'SET_SELECTED_THREAD':
      return action.state
  }
  return state
}
function selectedStacktrace (state = 0, action) {
  switch (action.type) {
    case 'RESTART':
    case 'STOP':
      return 0

    case 'SET_SELECTED_STACKTRACE':
      return action.index

    case 'UPDATE_STACKTRACE':
      return 0 // set back to the first function on each update
  }
  return state
}
function selectedThread (state = 0, action) {
  switch (action.type) {
    case 'RESTART':
    case 'STOP':
      return 0

    case 'SET_SELECTED_THREAD':
      return action.id
  }
  return state
}
function selectedConfig (state = '', action) {
  switch (action.type) {
    case 'SET_SELECTED_CONFIG':
      return action.configName
  }
  return state
}
function name (state = '', action) {
  if (action.type === 'ADD_DEBUGGER') {
    return action.name
  }
  return state
}
function configs (state = [], action) {
  if (action.type === 'ADD_DEBUGGER') {
    return action.dbg.configs || []
  }
  if (action.type === 'UPDATE_CONFIGS') {
    return action.configs || []
  }
  return state
}
function scopes (state = [], action) {
  if (action.type === 'ADD_DEBUGGER') {
    return action.dbg.scopes || []
  }
  return state
}
function api (state = null, action) {
  switch (action.type) {
    case 'ADD_DEBUGGER':
      return action.dbg.api || state

    case 'REMOVE_DEBUGGER':
      return null
  }
  return state
}

const provider = combineReducers({
  stacktrace,
  threads,
  breakpoints,
  state,
  selectedStacktrace,
  selectedThread,
  selectedConfig,
  name,
  scopes,
  configs,
  api
})

function debuggers (state = { }, action) {
  switch (action.type) {
    case 'ADD_DEBUGGER':
      var ap = provider(state[action.name] || {}, { type: 'ADD_DEBUGGER', name: action.name, dbg: action.dbg })
      return assign(state, { [action.name]: ap })
    case 'REMOVE_DEBUGGER':
      var existing = state[action.name]
      if (!existing) {
        return state
      }
      var rp = provider(existing, { type: 'REMOVE_DEBUGGER' })
      return assign(state, { [action.name]: rp })

    case 'ADD_BREAKPOINT':
    case 'REMOVE_BREAKPOINT':
    case 'SET_SELECTED_CONFIG':
    case 'SET_SELECTED_STACKTRACE':
    case 'SET_SELECTED_THREAD':
    case 'UPDATE_STACKTRACE':
    case 'UPDATE_THREADS':
    case 'UPDATE_VARIABLES':
    case 'UPDATE_CONFIGS':
    case 'SET_STATE':
    case 'STOP':
    case 'RESTART':
      return assign(state, { [action.name]: provider(state[action.name], action) })

    case 'INIT_STORE':
      var nextState = {}
      var hasChanged = false
      Object.keys(state).forEach((name) => {
        const nextDbgState = provider(state[name], { type: 'INIT_STORE' })
        nextState[name] = nextDbgState
        hasChanged = hasChanged || state[name] !== nextDbgState
      })
      return hasChanged ? nextState : state
  }
  return state
}
function selectedDebugger (state = '', action) {
  if (action.type === 'SET_SELECTED_DEBUGGER') {
    return action.name
  }
  if (action.type === 'REMOVE_DEBUGGER' && state === action.name) {
    return ''
  }
  return state
}

const getDefaultPanel = () => {
  return { visible: atom.config.get('debug.panelInitialVisible') }
}
function panel (state = getDefaultPanel(), action) {
  switch (action.type) {
    case 'TOGGLE_PANEL':
      return assign(state, { visible: 'visible' in action ? action.visible : !state.visible })

    case 'SET_PANEL_WIDTH':
      return assign(state, { width: action.width })

    case 'INIT_STORE':
      // ensure the panel has a usable "visible" prop!
      if (typeof state.visible !== 'boolean') {
        return assign(state, getDefaultPanel())
      }
      return state
  }
  return state
}
const defaultOutput = {
  messages: [],
  visible: false,
  filters: { debug: true, output: true }
}
function output (state = defaultOutput, action) {
  switch (action.type) {
    case 'TOGGLE_OUTPUT':
      return assign(state, { visible: 'visible' in action ? action.visible : !state.visible })

    case 'CLEAN_OUTPUT':
      return assign(state, { messages: [] })

    case 'ADD_OUTPUT_MESSAGE': {
      const messages = state.messages.concat({ message: action.message, name: action.name })
      return assign(state, { messages: messages })
    }
    case 'TOGGLE_OUTPUT_FILTER':
      return assign(state, {
        filters: assign(state.filters, {
          [action.filter]: !(state.filters[action.filter] !== false)
        })
      })
  }
  return state
}
function variables (state = { expanded: {} }, action) {
  switch (action.type) {
    case 'TOGGLE_VARIABLE':
      var expanded = assign(state.expanded, {
        [action.path]: 'expanded' in action ? action.expanded : !state.expanded[action.path]
      })
      return assign(state, { expanded })
  }
  return state
}

export let store

export function init (state) {
  store = createStore(combineReducers({
    panel,
    debuggers,
    selectedDebugger,
    output,
    variables
  }), state)

  // init the store (upgrades the previous state so it is usable again)
  store.dispatch({ type: 'INIT_STORE' })
}

export function dispose () {
  store = null
}

export function serialize () {
  const state = store.getState()
  const mapBP = ({ file, line }) => {
    return { file, line }
  }
  const debuggers = {}
  Object.keys(state.debuggers).filter((n) => n).forEach((name) => {
    const dbg = state.debuggers[name]
    debuggers[dbg.name] = {
      breakpoints: dbg.breakpoints.map(mapBP),
      name: dbg.name
    }
  })
  return {
    panel: state.panel,
    debuggers: debuggers
  }
}

// helpers

export function getDebuggers () {
  const { debuggers } = store.getState()
  const dbgs = {}
  Object.keys(debuggers).forEach((n) => {
    const dbg = debuggers[n]
    if (dbg.api) {
      dbgs[n] = dbg
    }
  })
  return dbgs
}
export function getDebugger (name) {
  if (!store) {
    return null
  }
  const { selectedDebugger } = store.getState()
  if (!name) {
    name = selectedDebugger
  }
  const debuggers = getDebuggers()
  return debuggers[name]
}

export function indexOfBreakpoint (breakpoints, file, line) {
  return breakpoints.findIndex((bp) => bp.file === file && bp.line === line)
}
export function getBreakpoints (name, file) {
  const { breakpoints = [] } = getDebugger(name) || {}
  return !file ? breakpoints : breakpoints.filter((bp) => bp.file === file)
}
export function getBreakpoint (name, file, line) {
  const breakpoints = getBreakpoints(name, file)
  const index = indexOfBreakpoint(breakpoints, file, line)
  return index === -1 ? null : breakpoints[index]
}

export function addOutputMessage (name, message) {
  if (!store) {
    return
  }
  store.dispatch({ type: 'ADD_OUTPUT_MESSAGE', name, message })
}

export function updateConfigs (name, configs) {
  store.dispatch({ type: 'UPDATE_CONFIGS', name, configs })
}
