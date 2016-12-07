let {PropTypes: types} = React;

class MidiSelector extends React.Component {
  static propTypes = {
    midi: types.object.isRequired,
    selectedInput: types.func,
  }

  constructor(props) {
    super(props)

    this.state = {
      selected: null
    }
  }

  render() {
    let midiInputs = this.midiInputs()
    if (!midiInputs.length) {
      return <p>No MIDI devices connected</p>
    }

    return <div className="midi_selector">
      {
        this.midiInputs().map((input, i) => {
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
              {input.name}
            </div>
          </div>
        })
      }
    </div>
  }

  midiInputs() {
    if (!this.props.midi) return;
    return [...this.props.midi.inputs.values()];
  }
}
