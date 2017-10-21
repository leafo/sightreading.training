/*global N*/

import NoteList from "st/note_list"
import ChordList from "st/chord_list"
import NoteStats from "st/note_stats"
import SlideToZero from "st/slide_to_zero"
import Slider from "st/components/slider"
import Keyboard from "st/components/keyboard"
import StatsLightbox from "st/components/sight_reading/stats_lightbox"

import {KeySignature, noteName} from "st/music"
import {STAVES, GENERATORS} from "st/data"
import {GeneratorSettings, SettingsPanel} from "st/components/sight_reading/settings_panel"
import {setTitle, gaEvent, csrfToken} from "st/globals"
import {dispatch, trigger} from "st/events"
import {NOTE_EVENTS} from "st/midi"
import {generatorDefaultSettings} from "st/generators"

import * as React from "react"
import {classNames, NoSleep} from "lib"

import {isMobile} from "st/browser"

let {PropTypes: types} = React
let {CSSTransitionGroup} = React.addons || {}

const DEFAULT_NOTE_WIDTH = 100
const DEFAULT_SPEED = 4

export default class SightReadingPage extends React.Component {
  constructor(props) {
    super(props);

    this.pressNote = this.pressNote.bind(this)
    this.releaseNote = this.releaseNote.bind(this)
    this.onFullscreenChange = this.onFullscreenChange.bind(this)

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
      scale: window.innerWidth < 1000 ? 0.8 : 1,
      stats: new NoteStats(N.session.currentUser),
      keySignature: new KeySignature(0),
    }
  }

  componentWillMount() {
    let state = this.setStaff(STAVES[0])

    // manually copy state because set state hasn't applied yet
    for (let key in state) {
      this.state[key] = state[key]
    }

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
    setTitle()
    dispatch(this, {
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
        data.append("csrf_token", csrfToken())
        data.append("preset", preset)
        request.send(data)

        request.onload = (e) => {
          let res = JSON.parse(request.responseText)
          this.setState({savingPreset: false})
        }
      }
    })

    document.addEventListener("webkitfullscreenchange", this.onFullscreenChange)
  }

  componentWillUnmount() {
    document.removeEventListener("webkitfullscreenchange", this.onFullscreenChange)

    if (this.nosleep && this.state.fullscreen) {
      this.nosleep.disable()
    }
  }

  onFullscreenChange(event) {
    if (document.webkitIsFullScreen) {
      console.log("is mobile", isMobile())
      if (isMobile()) {
        this.nosleep = this.nosleep || new NoSleep()
        this.nosleep.enable()
      }
    } else {
      if (this.nosleep) {
        this.nosleep.disable()
      }
    }

    this.setState({
      fullscreen: document.webkitIsFullScreen
    })
  }

  refreshNoteList() {
    let generator = this.state.currentGenerator

    let generatorSettings = {
      ...generatorDefaultSettings(
        generator,
        this.state.currentStaff
      ),
      ...this.state.currentGeneratorSettings
    }

    let generatorInstance = generator.create.call(
      generator,
      this.state.currentStaff,
      this.state.keySignature,
      generatorSettings
    )

    var notes

    switch (generator.mode) {
      case "notes":
        notes = new NoteList([], { generator: generatorInstance })
        break
      case "chords":
        notes = new ChordList([], { generator: generatorInstance })
        break
    }

    if (!notes) {
      throw new Error(`unknown generator mode: ${generator.mode}`)
    }

    notes.fillBuffer(this.state.bufferSize)
    return this.setState({ notes: notes })
  }

  // called when held notes reaches 0
  checkRelease() {
    switch (this.state.currentGenerator.mode) {
      case "notes": {
        let missed = this.state.notes.currentColumn()
          .filter((n) => !this.state.heldNotes[n]);

        gaEvent("sight_reading", "note", "miss");
        this.state.stats.missNotes(missed);

        this.setState({
          noteShaking: true,
          heldNotes: {},
          touchedNotes: {},
        });

        setTimeout(() => this.setState({noteShaking: false}), 500);
        break
      }

      case "chords": {
        let touched = Object.keys(this.state.touchedNotes);

        if (this.state.notes.matchesHead(touched) && touched.length > 2) {
          gaEvent("sight_reading", "chord", "hit");
          this.state.notes.shift()
          this.state.notes.pushRandom()

          this.state.stats.hitNotes([])

          this.setState({
            notes: this.state.notes,
            noteShaking: false,
            heldNotes: {},
            touchedNotes: {},
          })

          this.state.slider.add(1)
        } else {
          gaEvent("sight_reading", "chord", "miss");

          this.state.stats.missNotes([])

          this.setState({
            noteShaking: true,
            heldNotes: {},
            touchedNotes: {},
          })

          setTimeout(() => this.setState({noteShaking: false}), 500);
        }
        break
      }
    }
  }

  // called on every noteOn
  // return true to trigger redraw
  checkPress() {
    switch (this.state.currentGenerator.mode) {
      case "notes": {
        let touched = Object.keys(this.state.touchedNotes);
        if (this.state.notes.matchesHead(touched, this.state.anyOctave)) {
          gaEvent("sight_reading", "note", "hit");

          this.state.notes.shift();
          this.state.notes.pushRandom();
          this.state.stats.hitNotes(touched);

          this.setState({
            notes: this.state.notes,
            noteShaking: false,
            heldNotes: {},
            touchedNotes: {},
          });

          this.state.slider.add(1)

          return true
        } else {
          return false
        }
      }

      case "chords": {
        // chords only check on release
        return false
      }
    }
  }

  pressNote(note) {
    this.state.heldNotes[note] = true;
    this.state.touchedNotes[note] = true;

    if (!this.checkPress()) {
      this.forceUpdate();
    }
  }

  releaseNote(note) {
    // note might no longer be considered held if we just moved to next note
    if (this.state.heldNotes[note]) {
      delete this.state.heldNotes[note];
      if (Object.keys(this.state.heldNotes).length == 0) {
        this.checkRelease();
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
      } else if (!document.hidden) { // ignore when the browser tab isn't active
        this.pressNote(n);
      }
    }

    if (NOTE_EVENTS[type] == "noteOff") {
      this.releaseNote(n);
    }
  }

  toggleMode() {
    if (this.state.mode == "wait") {
      this.enterScrollMode();
    } else {
      this.enterWaitMode();
    }
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

  enterScrollMode() {
    let noteWidth = DEFAULT_NOTE_WIDTH * 2;

    if (this.state.slider) {
      this.state.slider.cancel();
    }

    this.setState({
      mode: "scroll",
      noteWidth: noteWidth,
      slider: new SlideToZero({
        speed: this.state.scrollSpeed / 100,
        loopPhase: 1,
        initialValue: 4,
        onUpdate: value => {
          if (value < 0.5) {
            this.state.slider.value = 0.5
            this.state.slider.cancel()
          }

          this.setOffset(value)
        },
        onLoop: function() {
          this.state.stats.missNotes(this.state.notes.currentColumn());
          this.state.notes.shift();
          this.state.notes.pushRandom();
          this.forceUpdate();
        }.bind(this)
      })
    });
  }

  setStaff(staff) {
    let update = {currentStaff: staff}

    // if the current generator is not compatible with new staff change it
    if (!this.state.currentGenerator || (this.state.currentGenerator.mode != staff.mode)) {
      let newGenerator = GENERATORS.find(g => staff.mode == g.mode)
      update.currentGenerator = newGenerator
      update.currentGeneratorSettings = {}
    }

    this.setState(update)
    return update
  }

  setOffset(value) {
    if (!this.staff) { return; }
    this.staff.setOffset(value);
  }

  toggleFullscreen() {
    let el = this.refs.page_container
    if (el.webkitRequestFullscreen) {
      if (this.state.fullscreen) {
        document.webkitExitFullscreen()
        return
      }

      el.webkitRequestFullscreen()
      if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
        window.screen.orientation.lock("landscape")
      }
    }
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
    trigger(this, "showLightbox",
      <StatsLightbox
        resetStats={() => this.setState({stats: new NoteStats()})}
        stats={this.state.stats} />)
  }

  render() {
    return <div
      ref="page_container"
      className={classNames("sight_reading_page", {
        fullscreen: this.state.fullscreen,
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
      staves={STAVES}
      generators={GENERATORS}
      saveGeneratorPreset={this.state.savingPreset}

      currentGenerator={this.state.currentGenerator}
      currentGeneratorSettings={this.state.currentGeneratorSettings}
      currentStaff={this.state.currentStaff}
      currentKey={this.state.keySignature}

      setGenerator={(g, settings) => this.setState({
        currentGenerator: g,
        currentGeneratorSettings: settings,
      })}

      setStaff={this.setStaff.bind(this)}
      setKeySignature={k => this.setState({keySignature: k})}
    />
  }

  renderKeyboard() {
    if (this.state.currentStaff.mode != "notes") { return }
    if (!this.state.keyboardOpen) { return }

    let [lower, upper] = this.state.currentStaff.range;

    return <Keyboard
      lower={lower}
      upper={upper}
      heldNotes={this.state.heldNotes}
      onKeyDown={this.pressNote}
      onKeyUp={this.releaseNote} />;
  }

  renderWorkspace() {
    if (this.state.stats.streak) {
      var streak = <div className="stat_container">
        <div className="value">{this.state.stats.streak}</div>
        <div className="label">streak</div>
      </div>
    }

    let fullscreenButton
    if (document.body.webkitRequestFullscreen && !this.state.fullscreen) {
      fullscreenButton = <button
        type="button"
        onClick={e => this.toggleFullscreen()}
      >Fullscreen</button>
    }

    let header = <div className="workspace_header">
      <button
        onClick={this.toggleSettings.bind(this)}
        className="settings_toggle">
        Configure
      </button>

      {" "}

      {fullscreenButton}

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

      <span className="speed_picker slider_input">
        <span className="slider_label">Speed</span>
        <Slider
          min={50}
          max={300}
          disabled={this.state.mode == "scroll"}
          onChange={(value) => this.setState({
            scrollSpeed: Math.round(value)
          })}
          value={+this.state.scrollSpeed} />
        <span className="slider_value">{ this.state.scrollSpeed }</span>
      </span>
    </div>

    let staff
    if (this.state.currentStaff) {
      staff = this.state.currentStaff.render.call(this, {
        heldNotes: this.state.heldNotes,
        notes: this.state.notes,
        keySignature: this.state.keySignature,
        noteWidth: this.state.noteWidth,
        noteShaking: this.state.noteShaking,
        scale: this.state.scale,
      })
    }

    return <div ref="workspace" className="workspace">
      <div className="workspace_wrapper">
        {header}
        <div className="staff_wrapper">
          {staff}
        </div>
        <div className="toolbar">
          {modeToggle}
        </div>
      </div>
    </div>;
  }

}
