let {PropTypes: types} = React;

class IntroLightbox extends React.Component {
  static propTypes = {
    midi: types.object,
    close: types.func.isRequired,
  }

  constructor(props) {
    super(props)
  }

  render() {
    let midi_setup

    if (this.props.midi) {
      midi_setup = <div>
        <h4>Select your MIDI device:</h4>
        <MidiSelector midi={this.props.midi} />
      </div>
    } else {
      midi_setup = <p>MIDI support not detected on your computer. You'll only be able to use the on-srcreen keyboard.</p>
    }


    return <div className="lightbox_shroud">
      <div className="lightbox">
        <h2>Sight reading trainer</h2>
        <p>This tool gives you a way to practice sight reading randomly
        generated notes. It works best with Chrome and a MIDI keyboard
        plugged into your computer.</p>

        <p>You can customize how the notes are generated, and what staff you
        use from the settings menu.</p>

        {midi_setup}

        <p>
          <button onClick={this.props.close}>Continue</button>
        </p>
      </div>
    </div>
  }
}

class MidiSelector extends React.Component {
  static propTypes = {
    midi: types.object.isRequired,
  }

  constructor(props) {
    super(props)

    this.state = {
      selected: null
    }
  }

  render() {
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
            }}
            >
            <img className="row_icon" src="img/notes_icon.svg" alt="MIDI Device" />
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
