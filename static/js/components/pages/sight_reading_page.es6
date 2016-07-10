
let {PropTypes: types} = React
let {CSSTransitionGroup} = React.addons || {}
let {Link} = ReactRouter

const DEFAULT_NOTE_WIDTH = 100
const DEFAULT_SPEED = 400

class SightReadingPage extends React.Component {
  constructor(props) {
    super(props);

    let defaultGenerator = N.GENERATORS[0]

    this.state = {
      midi: null,
      noteShaking: false,
      anyOctave: false,

      heldNotes: {},
      touchedNotes: {},
      scrollSpeed: 100,

      noteWidth: DEFAULT_NOTE_WIDTH,
      statsLightboxOpen: false,
      introLightboxOpen: false,

      bufferSize: 10,
      keyboardOpen: true,
      settingsOpen: false,
      currentStaff: N.STAVES[0],
      currentGenerator: defaultGenerator,
      currentGeneratorSettings: GeneratorSettings.inputDefaults(defaultGenerator),
      stats: new NoteStats(),
      keySignature: new KeySignature(0),
    }

    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(midi => this.setState({midi: midi}))
    }
  }

  componentWillMount() {
    this.refreshNoteList()
    this.enterWaitMode()
    this.setState({introLightboxOpen: true})
  }

  componentDidMount() {
  }

  componentDidUpdate(prevProps, prevState) {
    // transitioning to new staff or generator or key signature
    if (prevState.currentStaff != this.state.currentStaff ||
        prevState.currentGenerator != this.state.currentGenerator ||
        prevState.currentGeneratorSettings != this.state.currentGeneratorSettings ||
        prevState.keySignature != this.state.keySignature)
    {
      this.refreshNoteList()
    }
  }

  refreshNoteList() {
    let generator = this.state.currentGenerator

    let notes = new NoteList([], {
      generator: generator.create.call(generator,
        this.state.currentStaff,
        this.state.keySignature,
        this.state.currentGeneratorSettings),
    });

    notes.fillBuffer(this.state.bufferSize);

    this.setState({
      notes: notes
    })

  }

  midiInputs() {
    if (!this.state.midi) return;
    return [...this.state.midi.inputs.values()];
  }

  // called when held notes reaches 0
  checkForMiss() {
    N.event("sight_reading", "note", "miss");

    let missed = this.state.notes.currentColumn()
      .filter((n) => !this.state.heldNotes[n]);

    this.state.stats.missNotes(missed);

    this.setState({
      noteShaking: true,
      heldNotes: {},
      touchedNotes: {},
    });

    setTimeout(() => this.setState({noteShaking: false}), 500);
    return true;
  }

  // called on every noteOn
  checkForHit() {
    let touched = Object.keys(this.state.touchedNotes);
    if (this.state.notes.matchesHead(touched, this.state.anyOctave)) {
      N.event("sight_reading", "note", "hit");

      this.state.notes.shift();
      this.state.notes.pushRandom();
      this.state.stats.hitNotes(touched);

      this.setState({
        notes: this.state.notes,
        noteShaking: false,
        heldNotes: {},
        touchedNotes: {},
      });

      this.state.slider.add(this.state.noteWidth);

      return true;
    } else {
      return false;
    }
  }

  pickInput(idx) {
    let input = this.midiInputs()[idx]
    if (!input) { return; }
    console.log(`Binding to: ${input.name}`)
    input.onmidimessage = this.onMidiMessage.bind(this);
    this.setState({currentInput: input});
  }

  pressNote(note) {
    this.state.heldNotes[note] = true;
    this.state.touchedNotes[note] = true;

    if (!this.checkForHit()) {
      this.forceUpdate();
    }
  }

  releaseNote(note) {
    // note might no longer be considered held if we just moved to next note
    if (this.state.heldNotes[note]) {
      delete this.state.heldNotes[note];
      if (Object.keys(this.state.heldNotes).length == 0) {
        this.checkForMiss();
      }
    }
  }

  onMidiMessage(message) {
    let [raw, pitch, velocity] = message.data;

    let cmd = raw >> 4,
      channel = raw & 0xf,
      type = raw & 0xf0;

    let n = noteName(pitch)

    if (NOTE_EVENTS[type] == "noteOn") {
      if (velocity == 0) {
        this.releaseNote(n);
      } else {
        this.pressNote(n);
      }
    }

    if (NOTE_EVENTS[type] == "noteOff") {
      this.releaseNote(n);
    }
  }

  render() {
    let currentLightbox

    if (this.state.statsLightboxOpen) {
      currentLightbox = <StatsLightbox
        ref="currentLightbox"
        resetStats={() => this.setState({stats: new NoteStats()})}
        close={() => this.setState({statsLightboxOpen: false})}
        stats={this.state.stats} />;
    }

    if (this.state.introLightboxOpen) {
      currentLightbox = <IntroLightbox
        ref="currentLightbox"
        midi={this.state.midi}
        close={(opts) => {
          this.setState({introLightboxOpen: false})
          if (opts.input != null) {
            this.pickInput(opts.input);
          }
        }} />;
    }

    if (currentLightbox) {
      currentLightbox = <div
        className="lightbox_shroud"
        onClick={function(e) {
          if (e.target.classList.contains("lightbox_shroud")) {
            if (this.refs.currentLightbox.close) {
              this.refs.currentLightbox.close()
            }
            e.preventDefault();
          }
        }.bind(this)}
        >{currentLightbox}</div>
    }

    return <div
      className={classNames({
        keyboard_open: this.state.keyboardOpen,
        settings_open: this.state.settingsOpen,
        scroll_mode: this.state.mode == "scroll",
        wait_mode: this.state.mode == "wait",
    })}>
      {this.renderWorkspace()}
      {this.renderKeyboard()}
      <CSSTransitionGroup transitionName="slide_right" transitionEnterTimeout={200} transitionLeaveTimeout={100}>
        {this.renderSettings()}
      </CSSTransitionGroup>

      <button
        onClick={this.toggleKeyboard.bind(this)}
        className="keyboard_toggle">
        {this.state.keyboardOpen ? "Hide Keyboard" : "Show Keyboard"}
      </button>

      <CSSTransitionGroup transitionName="show_lightbox" transitionEnterTimeout={200} transitionLeaveTimeout={100}>
        {currentLightbox}
      </CSSTransitionGroup>
    </div>;
  }

  renderSettings() {
    if (!this.state.settingsOpen) {
      return;
    }

    return <SettingsPanel
      close={this.toggleSettings.bind(this)}
      staves={N.STAVES}
      generators={N.GENERATORS}

      currentGenerator={this.state.currentGenerator}
      currentStaff={this.state.currentStaff}
      currentKey={this.state.keySignature}

      setGenerator={(g, settings) => this.setState({
        currentGenerator: g,
        currentGeneratorSettings: settings,
      })}

      setStaff={s => this.setState({currentStaff: s})}
      setKeySignature={k => this.setState({keySignature: k})}
    />
  }

  renderKeyboard() {
    if (!this.state.keyboardOpen) {
      return;
    }

    let [lower, upper] = this.state.currentStaff.range;

    return <Keyboard
      lower={lower}
      upper={upper}
      heldNotes={this.state.heldNotes}
      onKeyDown={this.pressNote.bind(this)}
      onKeyUp={this.releaseNote.bind(this)} />;
  }

  toggleMode() {
    if (this.state.mode == "wait") {
      this.enterScrollMode();
    } else {
      this.enterWaitMode();
    }
  }

  enterScrollMode() {
    let noteWidth = DEFAULT_NOTE_WIDTH * 2;

    if (this.state.slider) {
      this.state.slider.cancel();
    }

    this.setState({
      mode: "scroll",
      noteWidth: noteWidth,
      slider: new SlideToZero({
        speed: this.state.scrollSpeed,
        loopPhase: noteWidth,
        initialValue: noteWidth * 3,
        onUpdate: this.setOffset.bind(this),
        onLoop: function() {
          this.state.stats.missNotes(this.state.notes.currentColumn());
          this.state.notes.shift();
          this.state.notes.pushRandom();
          this.forceUpdate();
        }.bind(this)
      })
    });
  }

  enterWaitMode() {
    if (this.state.slider) {
      this.state.slider.cancel();
    }

    this.setState({
      mode: "wait",
      noteWidth: DEFAULT_NOTE_WIDTH,
      slider: new SlideToZero({
        speed: DEFAULT_SPEED,
        onUpdate: this.setOffset.bind(this)
      })
    })
  }

  setOffset(value) {
    if (!this.staff) { return; }
    this.staff.setOffset(value);
  }

  toggleSettings() {
    this.setState({
      settingsOpen: !this.state.settingsOpen
    });
    this.recalcFlex();
  }

  toggleKeyboard() {
    this.setState({keyboardOpen: !this.state.keyboardOpen});
    this.recalcFlex();
  }

  recalcFlex() {
    this.refs.workspace.style.height = "0px";
    this.refs.workspace.offsetHeight;
    this.refs.workspace.style.height = "auto";
  }

  renderWorkspace() {
    if (this.state.stats.streak) {
      var streak = <div className="stat_container">
        <div className="value">{this.state.stats.streak}</div>
        <div className="label">streak</div>
      </div>;
    }

    let openStats = () => this.setState({statsLightboxOpen: true})

    let header = <div className="workspace_header">
      <button
        onClick={this.toggleSettings.bind(this)}
        className="settings_toggle">
        Configure
      </button>

      <div className="stats">
        {streak}

        <div className="stat_container" onClick={openStats}>
          <div className="value">{this.state.stats.hits}</div>
          <div className="label">hits</div>
        </div>

        <div className="stat_container" onClick={openStats}>
          <div className="value">{this.state.stats.misses}</div>
          <div className="label">misses</div>
        </div>
      </div>
    </div>;

    let debug = <div className="debug">
      <pre>
        held: {JSON.stringify(this.state.heldNotes)}
        {" "}
        pressed: {JSON.stringify(this.state.touchedNotes)}
      </pre>
    </div>;


    let modeToggle = <div className="tool">
      <span className="label">Mode</span>
      <div
        onClick={this.toggleMode.bind(this)}
        className={classNames("toggle_switch", {
          first: this.state.mode == "wait",
          second: this.state.mode == "scroll",
        })}>
        <span className="toggle_option">Wait</span>
        <span className="toggle_option">Scroll</span>
      </div>

      <span className="speed_picker">
        <span className="speed_label">Speed</span>
        <Slider
          min={50}
          max={300}
          disabled={this.state.mode == "scroll"}
          onChange={(value) => this.setState({
            scrollSpeed: Math.round(value)
          })}
          value={+this.state.scrollSpeed} />
        <span className="speed_value">{ this.state.scrollSpeed }</span>
      </span>
    </div>

    let staff = this.state.currentStaff && this.state.currentStaff.render.call(this);

    return <div ref="workspace" className="workspace">
      <div className="workspace_wrapper">
        {header}
        <div className="staff_wrapper">
          {staff}
        </div>
        <div className="toolbar">
          <div className="left_tools">
          </div>
          {modeToggle}
        </div>
      </div>
    </div>;
  }

}
