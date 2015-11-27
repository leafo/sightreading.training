
window.N = window.N || {};

let MIDDLE_C_PITCH = 60
let OCTAVE_SIZE = 12

let NOTE_WIDTH = 120

let NOTE_EVENTS = {
  [144]: "noteOn",
  [128]: "noteOff"
}

let OFFSETS = {
  [0]: "C",
  [2]: "D",
  [4]: "E",
  [5]: "F",
  [7]: "G",
  [9]: "A",
  [11]: "B",

  "C": 0,
  "D": 2,
  "E": 4,
  "F": 5,
  "G": 7,
  "A": 9,
  "B": 11
}

let LETTER_OFFSETS = {
  [0]: 0,
  [2]: 1,
  [4]: 2,
  [5]: 3,
  [7]: 4,
  [9]: 5,
  [11]: 6
}

let noteName = function(pitch) {
  let octave = Math.floor(pitch / OCTAVE_SIZE)
  let offset = pitch - octave * OCTAVE_SIZE

  let name = OFFSETS[offset]
  if (!name) {
    name = OFFSETS[offset - 1] + "#"
  }

  return `${name}${octave}`;
}

let parseNote = function(note) {
  let [, letter, accidental, octave] = note.match(/^(\w)(#|b)?(\d+)$/);
  if (OFFSETS[letter] == undefined) {
    throw `invalid note letter: ${letter}`
  }

  let n = OFFSETS[letter] + parseInt(octave, 10) * OCTAVE_SIZE;

  if (accidental == "#") {
    n += 1
  }

  if (accidental == "b") {
    n -= 1
  }

  return n;
}

let letterOffset = function(pitch) {
  let offset = 0

  while (pitch >= 12) {
    offset += 7
    pitch -= 12
  }

  while (LETTER_OFFSETS[pitch] == undefined) {
    pitch -= 1
  }

  return offset + LETTER_OFFSETS[pitch]
}

class Page extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      midi: null,
      notes: [],
      hits: 0,
      misses: 0,
      noteOffset: 0,
      noteShaking: false,
      heldNotes: {},
      touchedNotes: {},
    };
    navigator.requestMIDIAccess().then((midi) => this.setState({midi: midi}));
  }

  componentDidMount() {
    for (let i = 0; i < 6; i++) {
      this.pushRandomNote();
    }
  }

  midiInputs() {
    if (!this.state.midi) return;
    return [...this.state.midi.inputs.values()];
  }

  shiftNote() {
    this.state.notes.shift();
    this.forceUpdate();
  }

  pushRandomNote() {
    let available = ["C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6"];
    this.generator = this.generator || new MersenneTwister();
    let idx = this.generator.int() % 8;
    this.state.notes.push(available[idx]);
    this.forceUpdate();
  }

  // callend when held notes reaches 0
  checkForMiss() {
    this.setState({
      misses: this.state.misses + 1,
      noteShaking: true,
      heldNotes: {},
      touchedNotes: {},
    })
    setTimeout(() => this.setState({noteShaking: false}), 500);
    return true;
  }

  // called on every noteOn
  checkForHit() {
    let touched = Object.keys(this.state.touchedNotes);
    if (touched.length == 1 && touched[0] == this.state.notes[0]) {

      this.shiftNote();
      this.pushRandomNote();
      this.setState({
        hits: this.state.hits + 1,
        noteOffset: this.state.noteOffset + NOTE_WIDTH,
        noteShaking: false,
      })

      return true;
    } else {
      return false;
    }
  }

  componentDidUpdate() {
    if (this.state.noteOffset > 0 && !this.state.sliding) {
      let speed = 10;
      let start;

      let animate = function(time) {
        if (start == undefined) {
          start = time
        } else {
          let dt = (time - start) / 1000;
          this.setState({
            noteOffset: Math.max(0, this.state.noteOffset - dt * speed)
          });
        }

        if (this.state.noteOffset > 0) {
          window.requestAnimationFrame(animate);
        } else {
          this.setState({sliding: false});
        }
      }.bind(this);

      this.setState({sliding: true});
      window.requestAnimationFrame(animate)
    }
  }

  pickInput(e) {
    e.preventDefault();
    let idx = this.refs.inputPicker.value;
    idx = parseInt(idx, 10);
    let input = this.midiInputs()[idx]

    if (!input) {
      return;
    }
    
    console.log(`Binding to: ${input.name}`)
    input.onmidimessage = this.onMidiMessage.bind(this);
    this.setState({currentInput: input});
  }

  onMidiMessage(message) {
    let [raw, pitch, velocity] = message.data;

    let cmd = raw >> 4,
      channel = raw & 0xf,
      type = raw & 0xf0;


    let n = noteName(pitch)

    if (NOTE_EVENTS[type] == "noteOn") {
      this.state.heldNotes[n] = true;
      this.state.touchedNotes[n] = true;

      if (!this.checkForHit()) {
        this.forceUpdate();
      }
    }

    if (NOTE_EVENTS[type] == "noteOff") {
      delete this.state.heldNotes[n];
      if (Object.keys(this.state.heldNotes).length == 0) {
        this.checkForMiss();
      }
    }
  }

  render() {
    if (this.state.midi) {
      window.current_midi = this.state.midi;

      var inputSelect = <div className="input_picker">
        <select
          ref="inputPicker">
          {
            this.midiInputs().map((input, i) =>
              <option value={i} key={i}>{input.name}</option>)
          }
        </select>
        {" "}
        <button onClick={this.pickInput.bind(this)}>Connect</button>
        {this.state.currentInput ? <strong> Connected</strong> : null}
      </div>
    }

    return <div className="page_container">
      <div className="header">
        <div className="stats">

          <div className="stat_container">
            <div className="value">{this.state.hits}</div>
            <div className="label">hits</div>
          </div>

          <div className="stat_container">
            <div className="value">{this.state.misses}</div>
            <div className="label">misses</div>
          </div>
        </div>
        <h1>Sight reading trainer</h1>
      </div>

      <Staff {...this.state} />
      {inputSelect}

      <div className="debug">
        <pre>
          held: {JSON.stringify(this.state.heldNotes)}
          {" "}
          pressed: {JSON.stringify(this.state.touchedNotes)}
        </pre>
      </div>
    </div>;
  }
}

class Staff extends React.Component {
  constructor(props) {
    super(props);
    this.upperLedger = 77;
    this.lowerLedger = 64;
  }

  render() {
    return <div className="staff_wrapper">
      <div className="staff">
        <img className="g_cleff" src="svg/clefs.G.svg" />

        <div className="ledger_lines">
          <div className="ledger1 ledger"></div>
          <div className="ledger2 ledger"></div>
          <div className="ledger3 ledger"></div>
          <div className="ledger4 ledger"></div>
          <div className="ledger5 ledger"></div>
        </div>

        <div className="notes">
          {this.renderNotes(this.props.notes || [])}
        </div>

      </div>
    </div>
  }

  renderNotes(notes) {
    return notes.map(function(note, idx) {
      let pitch = parseNote(note);
      let fromTop = letterOffset(this.upperLedger) - letterOffset(pitch);

      let style = {
        top: `${Math.floor(fromTop * 25/2)}%`,
        left: `${NOTE_WIDTH * idx + this.props.noteOffset}px`
      }

      let classes = classNames("whole_note", "note", {
        outside: pitch > this.upperLedger || pitch < this.lowerLedger,
        shake: this.props.noteShaking && idx == 0
      })

      return <img
        key={idx}
        style={style}
        data-note={note}
        data-midi-note={pitch}
        className={classes}
        src="svg/noteheads.s0.svg" />

    }.bind(this));
  }
}

N.init = function() {
  ReactDOM.render(<Page/>, document.getElementById("page"));
}


