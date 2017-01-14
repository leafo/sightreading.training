import * as React from "react"
import {classNames} from "window"
let {PropTypes: types} = React;

export default class Slider extends React.Component {
  static propTypes = {
    min: types.number,
    max: types.number,
    value: types.number,
    onChange: types.func,
    disabled: types.bool,
  }

  constructor(props) {
    super(props)
    this.state = {}
  }

  onChange(value) {
    value = Math.round(value)

    if (this.props.onChange) {
      if (value == this.props.value) {
        return
      }

      this.props.onChange(value)
    } else {
      if (value == this.state.value) {
        return
      }

      this.setState({value})
    }
  }

  startDrag(startX, startY) {
    if (this.props.disabled) {
      return true;
    }

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
    return (this.currentValue() - this.props.min) / (this.props.max - this.props.min)
  }

  render() {
    return <div className={classNames("slider_component", {
      disabled: this.props.disabled
    })}>
      <div ref="track" className="slider_track">
        <button
          onMouseDown={(e) => this.startDrag(e.pageX, e.pageY)}
          style={{
            left: this.percent() * 100 + "%"
          }}
          className="slider_nub"></button>
      </div>
    </div>
  }
}
