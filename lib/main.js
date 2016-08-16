'use babel'

import { CompositeDisposable } from 'atom'

let subscriptions
let editors, output, panel, store, commands
let Debugger

export default {
  activate (state) {
    store = require('./store')
    store.init(state)
    this.start()
  },
  deactivate () {
    if (Debugger) {
      // stop all debuggers
      const debuggers = store.getDebuggers()
      Object.keys(debuggers).forEach((name) => Debugger.stop(name))
    }

    if (subscriptions) {
      subscriptions.dispose()
      subscriptions = null
    }
  },
  serialize () {
    return store.serialize()
  },

  provide () {
    return {
      /**
       * Adds a new debugger
       * @param {string} name A unique name
       * @param {object} dbg
       */
      addDebugger (name, dbg) {
        store.store.dispatch({ type: 'ADD_DEBUGGER', name, dbg })
      },
      /**
       * Removes a debugger
       * @param {string} name The unqiue name of the debugger
       */
      removeDebugger (name) {
        store.store && store.store.dispatch({ type: 'REMOVE_DEBUGGER', name })
      },
      /**
       * Adds a message to the output panel
       * @param {string} name    The unqiue name of the debugger the output message is for
       * @param {string} message The message
       */
      addOutputMessage (name, message) {
        store.addOutputMessage(name, message)
      },
      /**
       * Updates the existing configs for the specified debugger
       * @param  {string} name    The unqiue name of the debugger the configs are for
       * @param  {object} configs The configs
       */
      updateConfigs (name, configs) {
        store.updateConfigs(name, configs)
      }
    }
  },

  start () {
    Debugger = require('./debugger')
    commands = require('./commands')
    editors = require('./editors')
    panel = require('./panel.jsx')
    output = require('./output.jsx')

    panel.init()
    editors.init()
    output.init()

    subscriptions = new CompositeDisposable(
      atom.commands.add('atom-text-editor', commands.keyboardCommands),
      atom.commands.add('atom-workspace', {
        'debug:toggle-panel': commands.get('toggle-panel').action
      }),
      store,
      editors,
      panel,
      output
    )
  }
}
