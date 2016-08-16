'use babel'

import { CompositeDisposable } from 'atom'
import { store, indexOfBreakpoint, getBreakpoints, getDebugger, getDebuggers } from './store'
import * as Debugger from './debugger'
import { debounce } from './utils'

let editors = {}

function getDebuggerNameByScope (editor) {
  const grammar = editor.getGrammar()
  const debuggers = getDebuggers()
  return Object.keys(debuggers).find((name) => {
    const { scopes } = debuggers[name]
    return scopes.includes(grammar.scopeName)
  })
}

function updateEditor (editor) {
  const file = editor.getPath()
  if (!file) {
    return null // ignore "new tabs", "settings", etc
  }

  const name = getDebuggerNameByScope(editor)

  let e = editors[file]
  if (!e) {
    editors[file] = e = {
      instance: editor,
      markers: [] // contains the breakpoint markers
    }
  }

  e.name = name
  if (name) {
    if (!e.gutter) {
      e.gutter = editor.addGutter({ name: 'debug', priority: -100 })
      const gutterView = atom.views.getView(e.gutter)
      gutterView.addEventListener('click', onGutterClick.bind(null, e))
    }
  } else {
    destroyGutter(e)
  }

  return e
}

function observeTextEditors (editor) {
  const e = updateEditor(editor)
  if (!e || !e.name) {
    return // no need to proceed
  }

  updateMarkers(e, editor.getPath())
}

function onWillDestroyPaneItem ({ item: editor }) {
  const file = editor && editor.getPath && editor.getPath()
  if (file) {
    destroyEditor(file)
    delete editors[file]
  }
}

let lastStackID

let lineMarker
const removeLineMarker = () => lineMarker && lineMarker.destroy()

function openAndHighlight (stack) {
  if (!stack) {
    // not start, finished or just started -> no line marker visible
    removeLineMarker()
    lastStackID = 0
    return
  }

  if (stack.id === lastStackID) {
    return
  }
  lastStackID = stack.id

  // remove any previous line marker
  removeLineMarker()

  // open the file
  const line = stack.line
  atom.workspace.open(stack.file, { initialLine: line, searchAllPanes: true }).then(() => {
    // create a new marker
    const editor = atom.workspace.getActiveTextEditor()
    lineMarker = editor.markBufferPosition({ row: line })
    editor.decorateMarker(lineMarker, { type: 'line', class: 'debug-debug-line' })

    // center the line
    editor.scrollToBufferPosition([line, 0], { center: true })
  })
}

function updateMarkers (editor, file) {
  const bps = getBreakpoints(editor.name, file)

  // update and add markers
  bps.forEach((bp) => updateMarker(editor, bp))

  // remove remaining
  const removeFromEditor = (file) => {
    const editorBps = editors[file] && editors[file].markers || []
    editorBps.forEach(({ bp }) => {
      const index = indexOfBreakpoint(bps, bp.file, bp.line)
      if (index === -1) {
        removeMarker(editor, bp)
      }
    })
  }
  if (file) {
    removeFromEditor(file)
  } else {
    Object.keys(editors).forEach(removeFromEditor)
  }
}

function updateMarker (editor, bp) {
  if (!editor) {
    return // editor not visible, nothing to show
  }

  const el = document.createElement('div')
  el.className = 'debug-breakpoint debug-breakpoint-state-' + bp.state
  el.dataset.state = bp.state
  el.title = bp.message || ''
  const decoration = {
    class: 'debug-gutter-breakpoint',
    item: el
  }

  const marker = editor.markers.find(({ bp: markerBP }) => markerBP.line === bp.line)
  if (!marker) {
    // create a new decoration
    const marker = editor.instance.markBufferPosition({ row: bp.line })
    marker.onDidChange(debounce(onMarkerDidChange.bind(null, { editor, file: bp.file, line: bp.line, marker }), 50))
    editor.markers.push({
      marker,
      bp,
      decoration: editor.gutter.decorateMarker(marker, decoration)
    })
  } else {
    // check if the breakpoint has even changed
    if (marker.bp === bp) {
      return
    }
    marker.bp = bp

    // update an existing decoration
    marker.decoration.setProperties(Object.assign(
      {},
      marker.decoration.getProperties(),
      decoration
    ))
  }
}

function removeMarker (editor, bp) {
  const index = editor.markers.findIndex(({ bp: markerBP }) => markerBP.line === bp.line)
  const marker = editor.markers[index]
  if (marker) {
    marker.decoration.getMarker().destroy()
  }
  editor.markers.splice(index, 1)
}

function onMarkerDidChange ({ editor, file, line, marker }, event) {
  // TODO: !!
  if (!event.isValid) {
    // marker is not valid anymore - text at marker got
    // replaced or was removed -> remove the breakpoint
    Debugger.removeBreakpoint(editor, file, line)
    return
  }

  Debugger.updateBreakpointLine(editor, file, line, marker.getStartBufferPosition().row)
}

const debouncedStoreChange = debounce(() => {
  Object.keys(editors).forEach((file) => {
    updateEditor(editors[file].instance)
    updateMarkers(editors[file], file)
  })

  // open the file of the selected stacktrace and highlight the current line
  const dbg = getDebugger()
  openAndHighlight(dbg && dbg.stacktrace[dbg.selectedStacktrace])
}, 50)

let subscriptions
export function init () {
  subscriptions = new CompositeDisposable(
    atom.workspace.observeTextEditors(observeTextEditors),
    atom.workspace.onWillDestroyPaneItem(onWillDestroyPaneItem),
    { dispose: store.subscribe(debouncedStoreChange) }
  )
}
export function dispose () {
  Object.keys(editors).forEach(destroyEditor)
  editors = {}

  removeLineMarker()
  lineMarker = null

  subscriptions.dispose()
  subscriptions = null
}

function destroyEditor (file) {
  const editor = editors[file]
  if (!editor) {
    return
  }

  destroyGutter(editor)
}

function destroyGutter (editor) {
  if (!editor.gutter) {
    return
  }

  try {
    editor.gutter.destroy()
  } catch (e) {
    console.warn('debug', e)
  }

  // remove all breakpoint decorations (marker)
  editor.markers.forEach((marker) => marker.decoration.getMarker().destroy())
}

function onGutterClick (editor, ev) {
  const editorView = atom.views.getView(editor.instance)
  let { row: line } = editorView.component.screenPositionForMouseEvent(ev)
  line = editor.instance.bufferRowForScreenRow(line)

  // TODO: conditions via right click menu!

  const file = editor.instance.getPath()
  _toggleBreakpoint(editor, file, line)
}

export function toggleBreakpoint (file, line) {
  const editor = editors[file]
  if (!editor) {
    return
  }
  _toggleBreakpoint(editor, file, line)
}

function _toggleBreakpoint (editor, file, line) {
  const deco = editor.markers.find(({ bp }) => bp.line === line)
  if (deco) {
    Debugger.removeBreakpoint(editor.name, file, line)
    return
  }

  Debugger.addBreakpoint(editor.name, file, line)
}
