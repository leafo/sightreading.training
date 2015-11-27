
window.N = window.N || {};

let NOTE_EVENTS = {
  [144]: "noteOn",
  [128]: "noteOff"
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
    let [noteEvent, key, velocity] = message.data;
    if (NOTE_EVENTS[noteEvent] == "noteOn") {
      console.log("note on: ", key);
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

      </div>
    </div>
  }
}

N.init = function() {
  ReactDOM.render(<Page/>, document.getElementById("page"));
}


