import * as React from "react"
import {classNames} from "window"

let {PropTypes: types} = React

export default class MidiSelector extends React.Component {
  static propTypes = {
    midiOptions: types.array.isRequired,
    selectedInput: types.func,
  }

  constructor(props) {
    super(props)

    this.state = {
      selected: null
    }
  }

  render() {
    let midiOptions = this.props.midiOptions

    if (!midiOptions.length) {
      return <p>No MIDI devices connected</p>
    }

    return <div className="midi_selector">
      {
        midiOptions.map((option, i) => {
          return <div
            key={i}
            className={classNames("midi_input_row", {
              selected: this.state.selected == i
            })}
            onClick={() => {
              this.setState({selected: i})
              if (this.props.selectedInput) {
                this.props.selectedInput(i);
              }
            }}
            >
            <img className="row_icon" src="/static/img/notes_icon.svg" alt="MIDI Device" />
            <div className="input_name">
              {option.name}
            </div>
          </div>
        })
      }
    </div>
  }

}
