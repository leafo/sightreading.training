
import * as React from "react"
import classNames from "classnames"

import {parseNote, noteName, LETTER_OFFSETS} from "st/music"
import {keyCodeToChar, noteForKey} from "st/keyboard_input"
import * as types from "prop-types"

export default class Keyboard extends React.PureComponent {
  static propTypes = {
    lower: types.oneOfType([types.string, types.number]),
    upper: types.oneOfType([types.string, types.number]),
    heldNotes: types.object,
  }

  defaultLower = "C5"
  defaultUpper = "B6"

  constructor(props) {
    super(props);
    this.state = {
      isActive: false,
      // used for showing :active effect on keys when using touch device
      activeNotes: {}
    }
    this.heldKeyboardKeys = {}
    this.activeTouches = {}

    this.keyboardRef = React.createRef()

    this.pressCount = 0;
  }

  isBlack(pitch) {
    return LETTER_OFFSETS[pitch % 12] === undefined;
  }

  isC(pitch) {
    return LETTER_OFFSETS[pitch % 12] === 0;
  }

  incrementPressCount = () => {
    this.pressCount++;
    if (this.pressCount == 1) {
      this.setState({ isActive: true })
    }
  }

  decrementPressCount = () => {
    this.pressCount = Math.max(this.pressCount - 1, 0);
    if (this.pressCount == 0) {
      this.setState({ isActive: false })
    }
  }

  incrementNote = (noteName) => {
    this.setState((state) => {
      const newValue = (state.activeNotes[noteName] || 0) + 1;
      
      if (newValue === 1) {
        this.triggerNoteDown(noteName)
      }

      return {
        activeNotes: {
          ...state.activeNotes,
          [noteName]: newValue
        }
      };
    });
  }

  decrementNote = (noteName) => {
    this.setState((state) => {
      const currentValue = state.activeNotes[noteName] || 0;
      const newValue = Math.max(currentValue - 1, 0);
      const newActiveNotes = { ...state.activeNotes, [noteName]: newValue };
      
      if (newValue === 0) {
        delete newActiveNotes[noteName];
        this.triggerNoteUp(noteName)
      }
      
      return { activeNotes: newActiveNotes };
    });
  }



  componentDidMount() {
    this.downListener = event => {
      if (event.shiftKey || event.altKey || event.ctrlKey) {
        return
      }

      if (event.target.matches("input")) {
        return
      }

      const key = keyCodeToChar(event.keyCode)
      const note = noteForKey("C5", key)

      if (note && !this.heldKeyboardKeys[note]) {
        this.heldKeyboardKeys[note] = true
        this.triggerNoteDown(note)
      }
    }

    this.upListener = event => {
      const key = keyCodeToChar(event.keyCode)
      const note = noteForKey("C5", key)

      if (note && this.heldKeyboardKeys[note]) {
        this.heldKeyboardKeys[note] = false
        this.triggerNoteUp(note)
      }
    }

    window.addEventListener("keydown", this.downListener)
    window.addEventListener("keyup", this.upListener)
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.downListener)
    window.removeEventListener("keyup", this.upListener)
  }

  triggerNoteDown(note) {
    if (this.props.onKeyDown) {
      this.props.onKeyDown(note);
    }

    if (this.props.midiOutput) {
      this.props.midiOutput.noteOn(parseNote(note), 100)
    }
  }

  triggerNoteUp(note) {
    if (this.props.onKeyUp) {
      this.props.onKeyUp(note);
    }

    if (this.props.midiOutput) {
      this.props.midiOutput.noteOff(parseNote(note), 100)
    }
  }

  onTouchStart = (e) => {
    let note = e.target.dataset.note;

    this.setState((s) => ({
      activeNotes: Object.assign({}, s.activeNotes, { [note]: true })
    }))

    for (let i = 0; i < e.changedTouches.length; i++) {
      let touch = e.changedTouches[i]
      this.activeTouches[note] = touch.identifier
    }

    this.triggerNoteDown(note)
  }

  onTouchEnd = (e) => {
    e.preventDefault()

    for (let i = 0; i < e.changedTouches.length; i++) {
      let touch = e.changedTouches[i]
      for (let [note, tid] of Object.entries(this.activeTouches)) {
        if (tid == touch.identifier) {
          delete this.activeTouches[note]

          this.setState((s) => {
            let activeNotes = Object.assign({}, s.activeNotes)
            delete activeNotes[note]
            return { activeNotes }
          })

          this.triggerNoteUp(note)
        }
      }
    }
  }

  onKeyboardPointerDown = (e) => {
    const keyboardEl = this.keyboardRef.current;
    keyboardEl.setPointerCapture(e.pointerId);
    this.pressCount++;
  }

  onKeyboardPointerUp = (e) => {
    const keyboardEl = this.keyboardRef.current;
    keyboardEl.releasePointerCapture(e.pointerId);
    this.pressCount--;
  }

  // TOOD: do we want this approach?
  onPointerMove = (e) => {
    const element = document.elementFromPoint(e.clientX, e.clientY);
    console.log(element);
  }

  onPointerEnter = (e) => {
    const keyEl = e.target
    const note = keyEl.dataset.note
    this.incrementNote(note)
  }

  onPointerLeave = (e) => {
    const keyEl = e.target
    const note = keyEl.dataset.note
    this.decrementNote(note)
  }

  onMouseDown = (e) => {
    e.preventDefault();
    let note = e.target.dataset.note;
    this.triggerNoteDown(note)

    // register mouse move and up listeners


    if (this.props.onKeyUp) {
      let onUp = e => {
        e.preventDefault();
        this.triggerNoteUp(note)

        document.removeEventListener("mouseup", onUp);
      }

      document.addEventListener("mouseup", onUp);
    }
  }

  onMouseMove = (e) => {
    // find out what element we're over
    console.log(e)
  }

  render() {
    let keys = [];
    let lower = this.props.lower || this.defaultLower;
    let upper = this.props.upper || this.defaultUpper;

    if (typeof lower == "string") {
      lower = parseNote(lower);
    }

    if (typeof upper == "string") {
      upper = parseNote(upper);
    }

    if (lower >= upper) {
      throw "lower must be less than upper for keyboard";
    }
    console.log(this.state.activeNotes)

    for (let pitch = lower; pitch <= upper; pitch++) {
      let black = this.isBlack(pitch);
      let name = noteName(pitch);
      
      const keyIsActive = this.state.activeNotes[name];

      let classes = classNames("key", {
        labeled: this.isC(pitch),
        white: !black,
        black: black,
        held: this.props.heldNotes && this.props.heldNotes[name],
        active: keyIsActive
      })

      keys.push(<div key={pitch} className="key_wrapper">
        <div
          onPointerLeave={keyIsActive ? this.onPointerLeave : null}
          onPointerEnter={this.state.isActive ? this.onPointerEnter : null}

          // onMouseDown={this.onMouseDown}
          // onTouchStart={this.onTouchStart}
          // onTouchEnd={this.onTouchEnd}
          data-note={name}
          className={classes} />
      </div>)
    }

    return <div
      onPointerDown={this.onKeyboardPointerDown}
      onPointerUp={this.onKeyboardPointerUp}
      className="keyboard" ref={this.keyboardRef}>{keys}</div>
  }

}
