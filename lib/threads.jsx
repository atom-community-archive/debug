'use babel'

import { React } from 'react-for-atom'
import { connect } from 'react-redux'

import * as Debugger from './debugger'
import { getDebugger } from './store'
import { elementPropInHierarcy, shortenPath } from './utils'

const Threads = (props) => {
  const { selectedThread, threads = [] } = props
  const items = threads.map((t) => {
    const className = selectedThread === t.id ? 'selected' : null
    const file = shortenPath(t.file)
    return <div
             key={t.id}
             className={className}
             data-id={t.id}
             onClick={props.onThreadClick}>
             <div>
               {t.func}
             </div>
             <div>
               @
               {file}:
               {t.line + 1}
             </div>
           </div>
  })
  return <div className='debug-panel-threads'>
           {items}
         </div>
}

Threads.propTypes = {
  selectedThread: React.PropTypes.number,
  threads: React.PropTypes.array,
  onThreadClick: React.PropTypes.func
}

export default connect(
  () => {
    const dbg = getDebugger()
    return {
      threads: dbg && dbg.threads,
      selectedThread: dbg && dbg.selectedThread
    }
  },
  () => {
    return {
      onThreadClick: (ev) => {
        const id = elementPropInHierarcy(ev.target, 'dataset.id')
        if (id) {
          Debugger.selectThread(+id)
        }
      }
    }
  }
)(Threads)
