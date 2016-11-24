
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

      bufferSize: 10,
      keyboardOpen: true,
      settingsOpen: false,
      currentStaff: N.STAVES[0],
      currentGenerator: defaultGenerator,
      currentGeneratorSettings: GeneratorSettings.inputDefaults(defaultGenerator),
      stats: new NoteStats(N.session.currentUser),
      keySignature: new KeySignature(0),
    }
  }

  componentWillMount() {
    this.refreshNoteList()
    this.enterWaitMode()
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

  componentDidMount() {
    N.dispatch(this, {
      saveGeneratorPreset: (e, form) => {
        if (this.state.savingPreset) {
          return;
        }

        let preset = JSON.stringify({
          type: "notes",
          name: this.state.currentGenerator.name,
          settings: this.state.currentGeneratorSettings,
        })

        this.setState({savingPreset: true})

        let request = new XMLHttpRequest()
        request.open("POST", "/new-preset.json")
        let data = new FormData(form)
        data.append("csrf_token", N.csrf_token())
        data.append("preset", preset)
        request.send(data)

        request.onload = (e) => {
          let res = JSON.parse(request.responseText)
          this.setState({savingPreset: false})
        }
      }
    })
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

      {this.renderKeyboardToggle()}
    </div>;
  }

  renderKeyboardToggle() {
    if (this.state.currentStaff.mode != "notes") { return }

    return <button
      onClick={this.toggleKeyboard.bind(this)}
      className="keyboard_toggle">
      {this.state.keyboardOpen ? "Hide Keyboard" : "Show Keyboard"}
    </button>
  }

  renderSettings() {
    if (!this.state.settingsOpen) {
      return;
    }

    return <SettingsPanel
      close={this.toggleSettings.bind(this)}
      staves={N.STAVES}
      generators={N.GENERATORS}
      saveGeneratorPreset={this.state.savingPreset}

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
    console.log(this.state.currentStaff)

    if (this.state.currentStaff.mode != "notes") { return }
    if (!this.state.keyboardOpen) { return }

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

  openStatsLightbox() {
    N.trigger(this, "showLightbox",
      <StatsLightbox
        resetStats={() => this.setState({stats: new NoteStats()})}
        close={() => alert("close the lightbox") }
        stats={this.state.stats} />)
  }

  renderWorkspace() {
    if (this.state.stats.streak) {
      var streak = <div className="stat_container">
        <div className="value">{this.state.stats.streak}</div>
        <div className="label">streak</div>
      </div>
    }

    let header = <div className="workspace_header">
      <button
        onClick={this.toggleSettings.bind(this)}
        className="settings_toggle">
        Configure
      </button>

      <div className="stats">
        {streak}

        <div className="stat_container" onClick={this.openStatsLightbox.bind(this)}>
          <div className="value">{this.state.stats.hits}</div>
          <div className="label">hits</div>
        </div>

        <div className="stat_container" onClick={this.openStatsLightbox.bind(this)}>
          <div className="value">{this.state.stats.misses}</div>
          <div className="label">misses</div>
        </div>
      </div>
    </div>

    let debug = <div className="debug">
      <pre>
        held: {JSON.stringify(this.state.heldNotes)}
        {" "}
        pressed: {JSON.stringify(this.state.touchedNotes)}
      </pre>
    </div>

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
