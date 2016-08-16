'use babel'

import * as Debugger from './debugger'
import * as Editors from './editors'
import { store, getDebugger } from './store'

function currentFile () {
  const editor = atom.workspace.getActiveTextEditor()
  return editor && editor.getPath()
}

function currentLine () {
  const editor = atom.workspace.getActiveTextEditor()
  return editor && editor.getCursorBufferPosition().row
}

function withDebugger (fn) {
  return () => {
    const dbg = getDebugger()
    if (!dbg) {
      return
    }
    fn(dbg)
  }
}

const commands = {
  'start': {
    cmd: 'start',
    text: 'Start',
    title: 'Start this configuration',
    action: withDebugger((dbg) => {
      if (!dbg.selectedConfig) {
        return // no config to start
      }
      Debugger.start(dbg.name, dbg.configs[dbg.selectedConfig], currentFile())
    })
  },
  'resume': {
    cmd: 'resume',
    icon: 'triangle-right',
    title: 'Resume',
    action: () => Debugger.resume()
  },
  'next': {
    cmd: 'next',
    icon: 'arrow-right',
    title: 'Next',
    action: () => Debugger.next()
  },
  'stepIn': {
    cmd: 'stepIn',
    icon: 'arrow-down',
    title: 'Step',
    action: () => Debugger.stepIn()
  },
  'stepOut': {
    cmd: 'stepOut',
    icon: 'arrow-up',
    title: 'Step',
    action: () => Debugger.stepOut()
  },
  'restart': {
    cmd: 'restart',
    icon: 'sync',
    title: 'Restart',
    action: () => Debugger.restart()
  },
  'stop': {
    cmd: 'stop',
    icon: 'primitive-square',
    title: 'Stop',
    action: withDebugger((dbg) => Debugger.stop(dbg.name))
  },
  'toggle-breakpoint': {
    action: () => Editors.toggleBreakpoint(currentFile(), currentLine())
  },
  'toggle-panel': {
    action: () => store.dispatch({ type: 'TOGGLE_PANEL' })
  }
}

export const keyboardCommands = {}

const toAdd = ['start', 'resume', 'next', 'stepIn', 'stepOut', 'restart', 'stop', 'toggle-breakpoint']
toAdd.forEach((cmd) => keyboardCommands['debug:' + cmd] = commands[cmd].action)

export const panelCommands = [
  commands.resume,
  commands.next,
  commands.stepIn,
  commands.stepOut,
  commands.restart,
  commands.stop
]

export const get = (cmd) => commands[cmd]
