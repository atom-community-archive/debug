'use babel'

import { React } from 'react-for-atom'
import { connect } from 'react-redux'

import * as Debugger from './debugger'
import { getDebugger, getBreakpoints } from './store'
import { elementPropInHierarcy, shortenPath } from './utils'

import * as fs from 'fs'

const Breakpoints = (props) => {
  const { breakpoints = [] } = props
  const items = breakpoints.map(({ file, line, state, message }) => {
    return <div
             key={file + '|' + line}
             data-file={file}
             data-line={line}
             title={message || ''}
             onClick={props.onBreakpointClick}>
             <span className='icon-x' onClick={props.onRemoveBreakpointClick} />
             <span className={'debug-breakpoint debug-breakpoint-state-' + state} />
             {shortenPath(file)}:
             {line + 1}
           </div>
  })
  return <div className='debug-panel-breakpoints'>
           {items}
         </div>
}
Breakpoints.propTypes = {
  breakpoints: React.PropTypes.array,
  onBreakpointClick: React.PropTypes.func,
  onRemoveBreakpointClick: React.PropTypes.func
}

export default connect(
  () => {
    const dbg = getDebugger()
    return {
      breakpoints: dbg && dbg.breakpoints
    }
  },
  () => {
    return {
      onBreakpointClick (ev) {
        const file = elementPropInHierarcy(ev.target, 'dataset.file')
        if (file) {
          const line = +elementPropInHierarcy(ev.target, 'dataset.line')
          // check if the file even exists
          fileExists(file)
            .then(() => {
              atom.workspace.open(file, { initialLine: line, searchAllPanes: true }).then(() => {
                const editor = atom.workspace.getActiveTextEditor()
                editor.scrollToBufferPosition([line, 0], { center: true })
              })
            })
            .catch(() => removeBreakpoints(file))
        }
      },
      onRemoveBreakpointClick (ev) {
        const file = elementPropInHierarcy(ev.target, 'dataset.file')
        if (file) {
          const line = +elementPropInHierarcy(ev.target, 'dataset.line')
          Debugger.removeBreakpoint(getDebugger().name, file, line)
          ev.preventDefault()
          ev.stopPropagation()
        }
      }
    }
  }
)(Breakpoints)

function fileExists (file) {
  return new Promise(function (resolve, reject) {
    fs.exists(file, (exists) => {
      exists ? resolve() : reject()
    })
  })
}

function removeBreakpoints (file) {
  const noti = atom.notifications.addWarning(
    `The file ${file} does not exist anymore.`,
    {
      dismissable: true,
      detail: 'Remove all breakpoints for this file?',
      buttons: [{
        text: 'Yes',
        onDidClick: () => {
          noti.dismiss()
          getBreakpoints(file).forEach((bp) => Debugger.removeBreakpoint(getDebugger().name, file, bp.line))
        }
      }, {
        text: 'No',
        onDidClick: () => noti.dismiss()
      }]
    }
  )
}
