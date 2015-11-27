
class NoteList {
  constructor(notes) {
    this.notes = notes || [];
  }

  push(column) {
    this.notes.push(column);
  }

  pushRandom() {
    let available = ["C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6", ["C5", "G5"]];
    this.generator = this.generator || new MersenneTwister();
    let idx = this.generator.int();
    return this.push(available[idx % available.length]);
  }

  shift() {
    return this.notes.shift();
  }

  map(callback) {
    return this.notes.map(callback);
  }

  // must be an array of notes
  matchesHead(notes) {
    let first = this.notes[0];
    if (Array.isArray(first)) {
      if (first.length != notes.length) {
        return false;
      }
      return first.every((n) => notes.indexOf(n) >= 0);
    } else {
      return notes.length == 1 && notes[0] == first;
    }
  }

  // if single note is in head
  inHead(note) {
    let first = this.notes[0];
    if (Array.isArray(first)) {
      return first.some((n) => n == note);
    } else {
      return note == first
    }
  }
}

class Page extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      midi: null,
      notes: new NoteList(),
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
      this.state.notes.pushRandom()
    }
    this.forceUpdate();
  }

  midiInputs() {
    if (!this.state.midi) return;
    return [...this.state.midi.inputs.values()];
  }

  // called when held notes reaches 0
  checkForMiss() {
    this.setState({
      misses: this.state.misses + 1,
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
    if (this.state.notes.matchesHead(touched)) {
      this.state.notes.shift();
      this.state.notes.pushRandom();

      this.setState({
        notes: this.state.notes,
        hits: this.state.hits + 1,
        noteOffset: this.state.noteOffset + NOTE_WIDTH,
        noteShaking: false,
        heldNotes: {},
        touchedNotes: {},
      });

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
      // note might no longer be considered held if we just moved to next note
      if (this.state.heldNotes[n]) {
        delete this.state.heldNotes[n];
        if (Object.keys(this.state.heldNotes).length == 0) {
          this.checkForMiss();
        }
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
          {this.renderNotes()}
          {this.renderHeld()}
        </div>

      </div>
    </div>
  }

  renderHeld(notes) {
    // notes that are held down but aren't correct
    return Object.keys(this.props.heldNotes).map((note, idx) =>
      !this.props.notes.inHead(note) && this.renderNote(note, {
        key: `ghost-${idx}`,
        classes: { ghost: true }
      })
    );
  }

  renderNotes() {
    return this.props.notes.map(function(note, idx) {
      let opts = {
        goal: true,
        offset: NOTE_WIDTH * idx + this.props.noteOffset,
        first: idx == 0,
      }

      if (Array.isArray(note)) {
        return note.map(function(sub_note, col_idx) {
          opts.key = `${idx}-${col_idx}`;
          return this.renderNote(sub_note, opts);
        }.bind(this));
      } else {
        opts.key = idx;
        return this.renderNote(note, opts);
      }

    }.bind(this));
  }

  renderNote(note, opts={}) {
    let pitch = parseNote(note);
    let fromTop = letterOffset(this.upperLedger) - letterOffset(pitch);

    let style = {
      top: `${Math.floor(fromTop * 25/2)}%`,
      left: `${opts.offset || 0}px`
    }

    let classes = classNames("whole_note", "note", {
      outside: pitch > this.upperLedger || pitch < this.lowerLedger,
      shake: this.props.noteShaking && opts.first,
      held: opts.goal && opts.first && this.props.heldNotes[note],
    }, opts.classes || {})

    return <img
      key={opts.key}
      style={style}
      data-note={note}
      data-midi-note={pitch}
      className={classes}
      src="svg/noteheads.s0.svg" />;
  }
}

