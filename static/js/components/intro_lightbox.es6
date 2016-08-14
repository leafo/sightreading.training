let {PropTypes: types} = React;

class IntroLightbox extends Lightbox {
  static className = "intro_lightbox"

  static propTypes = {
    midi: types.object,
    close: types.func.isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {}
  }

  callClose() {
    this.props.close({
      input: this.state.selectedInput
    })
  }

  renderContent() {
    let midiSetup

    if (this.props.midi) {
      midiSetup = <div>
        <h4>Select your MIDI device:</h4>
        <MidiSelector
          selectedInput={(idx) => {
            this.setState({selectedInput: idx})
          }}
          midi={this.props.midi} />
      </div>
    } else {
      midiSetup = <p>MIDI support not detected on your computer. You'll only be able to use the on-srcreen keyboard.</p>
    }

    return <div>
      <h2>Sight reading trainer</h2>
      <p>This tool gives you a way to practice sight reading randomly
      generated notes. It works best with Chrome and a MIDI keyboard
      plugged into your computer.</p>

      <p>You can customize how the notes are generated, and what staff you
      use from the settings menu.</p>

      {midiSetup}

      <p>
        <button onClick={this.callClose.bind(this)}>Continue</button>
      </p>
    </div>
  }

}

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
