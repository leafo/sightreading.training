import * as React from "react"
import {keyCodeToChar, noteForKey} from "st/keyboard_input"

let {PropTypes: types} = React

export default class Hotkeys extends React.Component {
  static propTypes = {
    onDown: types.func,
    onUp: types.func
  }

  constructor(props) {
    super(props)
    this.state = {
      heldKeys: {}
    }
  }

  componentDidMount()  {
    this.downListener = event => {
      if (event.shiftKey || event.altKey || event.ctrlKey) {
        return
      }

      if (this.state.heldKeys[event.keyCode]) {
        // ignore keyboard repeat
        return
      }

      this.state.heldKeys[event.keyCode] = true
      const key = keyCodeToChar(event.keyCode)

      if (this.props.onDown) {
        this.props.onDown(key, event)
      }
    }

    this.upListener = event => {
      const key = keyCodeToChar(event.keyCode)
      
      if (!this.state.heldKeys[event.keyCode]) {
        return 
      }

      delete this.state.heldKeys[event.keyCode]

      if (this.props.onUp) {
        this.props.onUp(key, event)
      }
    }

    window.addEventListener("keydown", this.downListener)
    window.addEventListener("keyup", this.upListener)
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.downListener)
    window.removeEventListener("keyup", this.upListener)
  }

  render() {
    // placholder element
    return <span className="hotkeys" style={{ display: "none" }}></span>
  }
}
