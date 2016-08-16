'use babel'

import { CompositeDisposable } from 'atom'
import { React, ReactDOM } from 'react-for-atom'
import { Provider, connect } from 'react-redux'

import Breakpoints from './breakpoints.jsx'
import Stacktrace from './stacktrace.jsx'
import Threads from './threads.jsx'
import Variables from './variables.jsx'

import { elementPropInHierarcy } from './utils'
import { store, getDebugger, getDebuggers } from './store'
import * as Debugger from './debugger'
import * as Commands from './commands'

class Panel extends React.Component {
  constructor (props) {
    super(props)

    ;[
      'onResizeStart', 'onResize', 'onResizeEnd', 'onCommandClick',
      'onSelectDebugger', 'onSelectConfig', 'onStartConfig'
    ].forEach((fn) => this[fn] = this[fn].bind(this))

    this.state = {
      expanded: {
        stacktrace: true,
        threads: true,
        variables: true,
        breakpoints: true
      }
    }
  }

  render () {
    return <div className='debug-panel-root' style={{width: this.props.width}}>
             <div className='debug-panel-resizer' onMouseDown={this.onResizeStart} />
             {this.renderHeader()}
             {this.renderContent()}
             <button type='button' onClick={this.props.onToggleOutput} className='btn debug-btn-flat debug-panel-showoutput'>
               Toggle output panel
             </button>
           </div>
  }

  renderHeader () {
    return <div className='debug-panel-header'>
             {this.renderDebuggers()}
             {this.renderConfigsOrCommands()}
           </div>
  }
  renderDebuggers () {
    const empty = <option key='empty' value=''>
                    Select a debugger
                  </option>
    const debuggers = Object.keys(this.props.debuggers)
      .sort()
      .map((name) => <option key={name} value={name}>
                       {name}
                     </option>)
    return <div>
             <select value={this.props.selectedDebugger} onChange={this.onSelectDebugger}>
               {[empty].concat(debuggers)}
             </select>
           </div>
  }
  renderConfigsOrCommands () {
    if (Debugger.isStarted()) {
      return this.renderCommands()
    }
    return this.renderConfigs()
  }
  renderConfigs () {
    let configs = this.getConfigs()
    const hasConfigs = configs && configs.length
    if (hasConfigs) {
      configs = [<option key='no config' value=''>
                   Select a config
                 </option>].concat(
        configs.map(({ name }) => <option key={name} value={name}>
                                    {name}
                                  </option>)
      )
    } else {
      configs = <option key='no debugger' value=''>
                  No configs available
                </option>
    }
    return <div>
             <select value={this.props.selectedConfig} onChange={this.onSelectConfig}>
               {configs}
             </select>
             {hasConfigs && this.props.selectedConfig
                ? <button type='button' className='btn debug-btn-flat' onClick={this.onStartConfig}>
                    Start
                  </button>
                : null}
           </div>
  }
  renderCommands () {
    if (Debugger.isStarted()) {
      const layout = Commands.panelCommands
      return <div className='debug-panel-commands'>
               {layout.map(this.renderCommand, this)}
             </div>
    }
    return null
  }
  renderCommand (cmd) {
    return <button
             key={cmd.cmd}
             type='button'
             className='btn debug-btn-flat'
             title={cmd.title}
             data-cmd={cmd.cmd}
             onClick={this.onCommandClick}>
             {cmd.icon ? <span className={'icon-' + cmd.icon} /> : null}
             {cmd.text}
           </button>
  }

  renderContent () {
    return <div className='debug-panel-content'>
             {this.renderExpandable('stacktrace', 'Stacktrace', <Stacktrace />)}
             {this.renderExpandable('threads', 'Threads', <Threads />)}
             {this.renderExpandable('variables', 'Variables', <Variables />)}
             {this.renderExpandable('breakpoints', 'Breakpoints', <Breakpoints />)}
           </div>
  }

  renderExpandable (name, text, content) {
    const expanded = this.state.expanded[name]
    return <div className='debug-expandable' data-expanded={expanded}>
             <div className='debug-expandable-header' onClick={this.onExpandChange.bind(this, name)}>
               <span className={'debug-toggle icon icon-chevron-' + (expanded ? 'down' : 'right')}></span>
               {text}
             </div>
             <div className='debug-expandable-body'>
               {content}
             </div>
           </div>
  }

  getConfigs () {
    const dbg = (this.props.debuggers || [])[this.props.selectedDebugger]
    if (!dbg) {
      return dbg
    }
    return dbg.configs || []
  }

  onResizeStart () {
    document.addEventListener('mousemove', this.onResize, false)
    document.addEventListener('mouseup', this.onResizeEnd, false)
    this.setState({ resizing: true })
  }
  onResize ({ pageX }) {
    if (!this.state.resizing) {
      return
    }
    const node = ReactDOM.findDOMNode(this).offsetParent
    this.props.onUpdateWidth(node.getBoundingClientRect().width + node.offsetLeft - pageX)
  }
  onResizeEnd () {
    if (!this.state.resizing) {
      return
    }
    document.removeEventListener('mousemove', this.onResize, false)
    document.removeEventListener('mouseup', this.onResizeEnd, false)
    this.setState({ resizing: false })
  }

  onExpandChange (name) {
    this.state.expanded[name] = !this.state.expanded[name]
    this.setState(this.state)
  }

  onSelectDebugger (ev) {
    this.props.onSelectDebugger(ev.target.value)
  }
  onSelectConfig (ev) {
    this.props.onSelectConfig(this.props.selectedDebugger, ev.target.value)
  }

  onStartConfig () {
    const configs = this.getConfigs()
    const config = configs.find(({ name }) => name === this.props.selectedConfig)
    const editor = atom.workspace.getActiveTextEditor()
    const file = editor && editor.getPath()
    this.props.onStartConfig(this.props.selectedDebugger, config, file)
  }

  onCommandClick (ev) {
    const command = elementPropInHierarcy(ev.target, 'dataset.cmd')
    if (command) {
      this.props.onCommandClick(command)
    }
  }
}
Panel.propTypes = {
  width: React.PropTypes.number,
  onToggleOutput: React.PropTypes.func,
  debuggers: React.PropTypes.object,
  selectedDebugger: React.PropTypes.string,
  selectedConfig: React.PropTypes.string,
  onUpdateWidth: React.PropTypes.func,
  onSelectDebugger: React.PropTypes.func,
  onSelectConfig: React.PropTypes.func,
  onStartConfig: React.PropTypes.func,
  onCommandClick: React.PropTypes.func
}

const PanelListener = connect(
  (state) => {
    const dbg = getDebugger()
    return {
      debuggers: getDebuggers(),
      selectedDebugger: state.selectedDebugger,
      width: state.panel.width,
      selectedConfig: dbg && dbg.selectedConfig || '',
      state: dbg && dbg.state
    }
  },
  (dispatch) => {
    return {
      onToggleOutput: () => {
        dispatch({ type: 'TOGGLE_OUTPUT' })
      },
      onUpdateWidth: (width) => {
        dispatch({ type: 'SET_PANEL_WIDTH', width })
      },
      onSelectDebugger: (name) => {
        dispatch({ type: 'SET_SELECTED_DEBUGGER', name })
      },
      onSelectConfig: (name, configName) => {
        dispatch({ type: 'SET_SELECTED_CONFIG', name, configName })
      },
      onStartConfig (name, config, file) {
        Debugger.start(name, config, file)
      },
      onCommandClick (command) {
        const cmd = Commands.execute(command)
        if (cmd) {
          cmd.action()
        }
      }
    }
  }
)(Panel)

let atomPanel

function onStoreChange () {
  const panelState = store.getState().panel
  if (panelState.visible !== atomPanel.isVisible()) {
    atomPanel[panelState.visible ? 'show' : 'hide']()
  }
}

let subscriptions
export default {
  init () {
    subscriptions = new CompositeDisposable(
      { dispose: store.subscribe(onStoreChange) }
    )

    const item = document.createElement('div')
    item.className = 'debug-panel'
    atomPanel = atom.workspace.addRightPanel({ item, visible: store.getState().panel.visible })

    ReactDOM.render(
      <Provider store={store}>
        <PanelListener />
      </Provider>,
      item
    )
  },
  dispose () {
    subscriptions.dispose()
    subscriptions = null

    ReactDOM.unmountComponentAtNode(atomPanel.getItem())

    atomPanel.destroy()
    atomPanel = null
  }
}
