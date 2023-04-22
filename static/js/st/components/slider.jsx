import * as React from "react"
import classNames from "classnames"
import * as types from "prop-types"

export default class Slider extends React.PureComponent {
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
      let x = e.pageX
      let y = e.pageY
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

  startTouchDrag(startX, startY) {
    if (this.props.disabled) {
      return true;
    }

    let width = this.refs.track.clientWidth
    let startValue = this.currentValue()

    let moveListener = (e) => {
      let x = e.changedTouches[0].pageX
      let y = e.changedTouches[0].pageY
      let dx = x - startX

      let newValue = dx / width * (this.props.max - this.props.min) + startValue
      newValue = Math.min(this.props.max, Math.max(this.props.min, newValue))

      if (newValue != this.currentValue()) {
        this.onChange(newValue)
      }
    }

    let upListener = (e) => {
      document.body.removeEventListener("touchmove", moveListener)
      document.body.removeEventListener("touchend", upListener)
    }

    document.body.addEventListener("touchmove", moveListener)
    document.body.addEventListener("touchend", upListener)
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
    return <div
      onClick={e => {
        if (e.target == this.refs.sliderNub) {
          return
        }
        let rect = this.refs.track.getBoundingClientRect()
        let p = Math.min(rect.width, Math.max(0, e.pageX - rect.left)) / rect.width


        let newValue = this.props.min + p * (this.props.max - this.props.min)
        newValue = Math.min(this.props.max, Math.max(this.props.min, newValue))

        if (newValue != this.currentValue()) {
          this.onChange(newValue)
        }
      }}
      className={classNames("slider_component", {
        disabled: this.props.disabled
      })}
    >
      <div ref="track" className="slider_track">
        <button
          ref="sliderNub"
          onMouseDown={(e) => this.startDrag(e.pageX, e.pageY)}
          onTouchStart={(e) => this.startTouchDrag(e.changedTouches[0].pageX, e.changedTouches[0].pageY)}
          onKeyDown={e => {
            let delta = 0

            switch (e.keyCode) {
              case 37: // left
                delta = -1
                break
              case 39: // right
                delta = 1
                break
              case 38: // up
                delta = 10
                break
              case 40: // down
                delta = -10
                break
            }

            this.onChange(Math.max(this.props.min, Math.min(this.props.max, this.currentValue() + delta)))
          }}
          style={{
            left: this.percent() * 100 + "%"
          }}
          className="slider_nub"></button>
      </div>
    </div>
  }
}
