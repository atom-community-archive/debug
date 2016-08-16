'use babel'

import { CompositeDisposable } from 'atom'
import { React, ReactDOM } from 'react-for-atom'
import { Provider, connect } from 'react-redux'

import { store } from './store'
import Message from './output-message'

// const filterText = (t) => t[0].toUpperCase() + t.substr(1)

class Output extends React.Component {
  componentDidUpdate () {
    this.refs.list.scrollTop = this.refs.list.scrollHeight
  }
  render () {
    // const { filters } = this.props
    const items = this.props.messages
      // .filter((msg) => filters[msg.name] !== false)
      .map((msg, i) => {
        return <Message key={i} message={msg.message} />
      })
    /* TODO: add a "settings" button that opens a popup to toggle the filters
    const filterKeys = Object.keys(filters).sort()
    <div className="btn-group">
      {filterKeys.map((filter) =>
        <button key={filter} className={"btn" + (filters[filter] ? " selected" : "")}
          onClick={this.props.onFilterClick} data-filter={filter}>{filterText(filter)}</button>
      )}
    </div>*/
    return <div className='debug-output'>
             <div className='debug-output-header'>
               <h5 className='text'>Output messages</h5>
               <button type='button' className='btn debug-btn-flat' onClick={this.props.onCleanClick}>
                 <span className='icon-circle-slash' title='Clean'></span>
               </button>
               <button type='button' className='btn debug-btn-flat' onClick={this.props.onCloseClick}>
                 <span className='icon-x' title='Close'></span>
               </button>
             </div>
             <div className='debug-output-list native-key-bindings' ref='list' tabIndex={-1}>
               {items}
             </div>
           </div>
  }
}
Output.propTypes = {
  messages: React.PropTypes.array,
  onCleanClick: React.PropTypes.func,
  onCloseClick: React.PropTypes.func
}

const OutputListener = connect(
  (state) => {
    return state.output
  },
  (dispatch) => {
    return {
      onCleanClick () {
        dispatch({ type: 'CLEAN_OUTPUT' })
      },
      onCloseClick () {
        dispatch({ type: 'TOGGLE_OUTPUT', visible: false })
      },
      onFilterClick (ev) {
        const { filter } = ev.target.dataset
        if (filter) {
          dispatch({ type: 'TOGGLE_OUTPUT_FILTER', filter })
        }
      }
    }
  }
)(Output)

let atomPanel

function onStoreChange () {
  const outputState = store.getState().output
  if (outputState.visible !== atomPanel.isVisible()) {
    atomPanel[outputState.visible ? 'show' : 'hide']()
  }
}

let subscriptions
export default {
  init () {
    subscriptions = new CompositeDisposable(
      { dispose: store.subscribe(onStoreChange) }
    )

    const item = document.createElement('div')
    atomPanel = atom.workspace.addBottomPanel({ item, visible: false })

    ReactDOM.render(
      <Provider store={store}>
        <OutputListener />
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
