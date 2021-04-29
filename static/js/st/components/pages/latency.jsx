import * as React from "react"
import {NOTE_EVENTS} from "st/midi"
import * as types from "prop-types"

export default class LatencyPage extends React.Component {
  render() {
    let metronomeButton = <button
      onClick={e => {
        e.preventDefault()
        let metronome = this.props.midiOutput.getMetronome()
        this.setState({ metronome })
        metronome.start(60)
      }}>Start metronome</button>

    return <div className="latency_page">
      {this.props.midiOutput ? metronomeButton : "Configure output to test latency"}
    </div>
  }

  onMidiMessage(message) {
    if (!this.state.metronome) {
      return
    }

    let [raw, pitch, velocity] = message.data;

    let cmd = raw >> 4,
      channel = raw & 0xf,
      type = raw & 0xf0;

    if (NOTE_EVENTS[type] == "noteOn") {
      if (velocity != 0) {
        console.log(this.state.metronome.getLatency())
      }
    }
  }
}
