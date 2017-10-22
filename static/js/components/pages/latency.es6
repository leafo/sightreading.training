import * as React from "react"

let {PropTypes: types} = React

export default class LatencyPage extends React.Component {
  render() {
    let metronomeButton = <button
      onClick={e => {
        e.preventDefault()
        this.props.midiOutput.getMetronome().start()
      }}>Start metronome</button>

    return <div className="latency_page">
      {this.props.midiOutput ? metronomeButton : "Configure output to test latency"}
    </div>
  }
}
