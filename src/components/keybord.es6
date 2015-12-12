
let {PropTypes: types} = React;

class Keyboard extends React.Component {
  static propTypes = {
    lower: types.oneOfType([types.string, types.number]),
    upper: types.oneOfType([types.string, types.number]),
    heldNotes: types.object,
  }

  defaultLower = "C5"
  defaultUpper = "B6"

  constructor(props) {
    super(props);
  }

  isBlack(pitch) {
    return LETTER_OFFSETS[pitch % 12] === undefined;
  }

  isC(pitch) {
    return LETTER_OFFSETS[pitch % 12] === 0;
  }

  onClickKey(e) {
    e.preventDefault();
    if (this.props.onClickKey) {
      this.props.onClickKey(e.target.dataset.note);
    }
  }

  onKeyDown(e) {
    e.preventDefault();
    let note = e.target.dataset.note;

    if (this.props.onKeyDown) {
      this.props.onKeyDown(note);
    }

    if (this.props.onKeyUp) {
      let onUp = function(e) {
        e.preventDefault();
        if (this.props.onKeyUp) {
          this.props.onKeyUp(note);
        }
        document.removeEventListener("mouseup", onUp);
      }.bind(this);
      document.addEventListener("mouseup", onUp);
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
        labeled: this.isC(pitch),
        white: !black,
        black: black,
        held: this.props.heldNotes && this.props.heldNotes[name]
      });

      keys.push(<div key={pitch} className="key_wrapper">
        <div
          onMouseDown={this.onKeyDown.bind(this)}
          data-note={name}
          className={classes} />
      </div>);
    }

    return <div className="keyboard">{keys}</div>
  }

}
