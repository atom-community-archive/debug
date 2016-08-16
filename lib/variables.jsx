'use babel'

import { React } from 'react-for-atom'
import { connect } from 'react-redux'
import * as Debugger from './debugger'
import { getDebugger } from './store'

class Variables extends React.Component {
  render () {
    return <div className='debug-panel-variables' onClick={this.onToggleClick.bind(this)}>
             <Children variables={this.props.variables} path={""} expanded={this.props.expanded} />
           </div>
  }
  onToggleClick (ev) {
    const path = ev.target.dataset.path
    if (!path) {
      return
    }

    // update the store
    this.props.onToggle(path)

    // then load the variable if not done already
    const v = this.props.variables[path]
    if (v && !v.loaded) {
      this.props.loadVariable(path, v)
      return
    }
  }
}
Variables.propTypes = {
  variables: React.PropTypes.array,
  expanded: React.PropTypes.object,
  loadVariable: React.PropTypes.func,
  onToggle: React.PropTypes.func
}

export default connect(
  (state) => {
    const dbg = getDebugger()
    return {
      variables: dbg && (dbg.stacktrace[dbg.selectedStacktrace] || {}).variables,
      expanded: state.variables.expanded
    }
  },
  (dispatch) => {
    return {
      onToggle: (path) => {
        dispatch({ type: 'TOGGLE_VARIABLE', path })
      },
      loadVariable: (path, variable) => {
        Debugger.loadVariable(path, variable)
      }
    }
  }
)(Variables)

const Variable = (props) => {
  const { variables, path, expanded } = props
  const variable = variables[path]

  const name = renderValue(variable.name)
  const isExpanded = variable.hasChildren && expanded[path]
  let toggleClassName = 'debug-toggle' + (!variable.hasChildren ? ' debug-toggle-hidden' : '')
  toggleClassName += ' icon icon-chevron-' + (isExpanded ? 'down' : 'right')
  return <li>
           <span className={toggleClassName} data-path={path} />
           {variable.value
              ? <span tabIndex={-1} className='native-key-bindings'>{name}: {renderValue(variable.value)}</span>
              : <span tabIndex={-1} className='native-key-bindings'>{name}</span>}
           {isExpanded ? <Children variables={variables} path={path} expanded={expanded} /> : null}
         </li>
}
Variable.propTypes = {
  variables: React.PropTypes.object,
  path: React.PropTypes.string,
  expanded: React.PropTypes.object
}

const Children = (props) => {
  const { variables, path, expanded } = props
  const children = Object.keys(variables || {}).filter((p) => variables[p].parentPath === path).sort()
  if (!children.length) {
    return <div />
  }
  const vars = children.map((p, i) => {
    return <Variable
             key={i}
             path={p}
             variables={variables}
             expanded={expanded} />
  })
  return <ol>
           {vars}
         </ol>
}
Children.propTypes = {
  variables: React.PropTypes.object,
  path: React.PropTypes.string,
  expanded: React.PropTypes.object
}

function renderValue (value) {
  if (Array.isArray(value)) {
    return value.map((v, i) => <span key={i}>{renderValue(v)}</span>)
  }
  if (typeof value === 'object' && 'value' in value) {
    const v = renderValue(value.value)
    return value.className ? <span className={value.className}>{v}</span> : v
  }
  return (value === undefined || value === null) ? '' : value
}
