
window.N = window.N || {};

let MIDDLE_C_PITCH = 60
let OCTAVE_SIZE = 12

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
    this.state = { midi: null };
    navigator.requestMIDIAccess().then((midi) => this.setState({midi: midi}));
  }

  midiInputs() {
    if (!this.state.midi) return;
    return [...this.state.midi.inputs.values()];
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

    if (NOTE_EVENTS[type] == "noteOn") {
      let n = noteName(pitch)
      console.log("original:", pitch);
      console.log("Got note:", n);
      console.log("parsed:", parseNote(n));
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

    return <div>
      <Staff />
      {inputSelect}
    </div>;
  }
}

class Staff extends React.Component {
  constructor(props) {
    super(props);

    this.upperLedger = 77;
    this.lowerLedger = 62;
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
          {this.renderNotes(["F6", "E6", "D6", "C6", "B5", "A5", "G5", "F5", "E5", "D5", "C5"])}
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
        left: `${60 * idx}px`
      }

      return <img
        key={idx}
        style={style}
        title={note}
        className="whote_note note"
        src="svg/noteheads.s0.svg" />

    }.bind(this));
  }
}

N.init = function() {
  ReactDOM.render(<Page/>, document.getElementById("page"));
}


