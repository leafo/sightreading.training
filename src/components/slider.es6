let {PropTypes: types} = React;

class Slider extends React.Component {
  static propTypes = {
    min: types.number,
    max: types.number,
    value: types.number,
    onChange: types.func,
  }

  constructor(props) {
    super(props)
    this.state = {}
  }

  onChange(value) {
    if (this.props.onChange) {
      this.props.onChange(value)
    } else {
      this.setState({value: value})
    }
  }

  startDrag(startX, startY) {
    // width of slider
    let width = this.refs.track.clientWidth
    let startValue = this.currentValue()

    let moveListener = (e) => {
      let x = e.pageX, y = e.pageX
      let dx = x - startX

      let newValue = dx / width * (this.props.max - this.props.min) + startValue
      newValue = Math.min(this.props.max, Math.max(this.props.min, newValue))

      if (newValue != this.currentValue()) {
        this.onChange(newValue)
      }
    }

    let upListener = (e) => {
      document.body.removeEventListener("mousemove", moveListener)
      document.body.removeEventListener("mouseup", upListener)
    }

    document.body.addEventListener("mousemove", moveListener)
    document.body.addEventListener("mouseup", upListener)
  }

  currentValue() {
    if ("value" in this.state) {
      return this.state.value
    } else {
      return this.props.value
    }
  }

  percent() {
    return this.state.value / (this.props.max - this.props.min)
  }

  render() {
    return <div className="slider_component">
      <div ref="track" className="slider_track"></div>
      <button
        onMouseDown={(e) => this.startDrag(e.pageX, e.pageY)}
        style={{
          left: this.percent() * 100 + "%"
        }}
        className="slider_nub"></button>
    </div>
  }
}
