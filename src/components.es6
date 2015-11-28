
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
      this.pressNote(n);
    }

    if (NOTE_EVENTS[type] == "noteOff") {
      this.releaseNote(n);
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

      <Keyboard onClickKey={function(note) {
        console.log("")
        this.pressNote(note);
        setTimeout(function() {
          this.releaseNote(note);
        }.bind(this), 100);
      }.bind(this)} />
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

class Keyboard extends React.Component {
  constructor(props) {
    super(props);
    this.defaultLower = "C4";
    this.defaultUpper = "C6";
  }

  isBlack(pitch) {
    return LETTER_OFFSETS[pitch % 12] == undefined;
  }

  onClickKey(e) {
    e.preventDefault();
    if (this.props.onClickKey) {
      this.props.onClickKey(e.target.dataset.note);
    }
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

    for (let pitch = lower; pitch <= upper; pitch++) {
      let black = this.isBlack(pitch);
      let name = noteName(pitch);

      let classes = classNames("key", {
        white: !black,
        black: black
      });

      keys.push(<div key={pitch} className="key_wrapper">
        <div
          onClick={this.onClickKey.bind(this)}
          data-note={name}
          className={classes} />
      </div>);
    }

    return <div className="keyboard">{keys}</div>
  }
}
