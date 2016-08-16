'use babel'

import { React } from 'react-for-atom'
import { connect } from 'react-redux'

import * as Debugger from './debugger'
import { getDebugger } from './store'
import { elementPropInHierarcy, shortenPath } from './utils'

const Stacktrace = (props) => {
  const { selectedStacktrace, stacktrace = [] } = props
  const items = stacktrace.map((st, index) => {
    const className = selectedStacktrace === index ? 'selected' : null
    const file = shortenPath(st.file)
    return <div
             key={index}
             className={className}
             data-index={index}
             onClick={props.onStacktraceClick}>
             <div>
               {st.func}
             </div>
             <div>
               @
               {file}:
               {st.line + 1}
             </div>
           </div>
  })
  return <div className='debug-panel-stacktrace'>
           {items}
         </div>
}
Stacktrace.propTypes = {
  selectedStacktrace: React.PropTypes.number,
  stacktrace: React.PropTypes.array,
  onStacktraceClick: React.PropTypes.func
}

export default connect(
  () => {
    const dbg = getDebugger()
    return {
      stacktrace: dbg && dbg.stacktrace,
      selectedStacktrace: dbg && dbg.selectedStacktrace
    }
  },
  () => {
    return {
      onStacktraceClick: (ev) => {
        const index = elementPropInHierarcy(ev.target, 'dataset.index')
        if (index) {
          Debugger.selectStacktrace(+index)
        }
      }
    }
  }
)(Stacktrace)
