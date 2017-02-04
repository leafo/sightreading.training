import * as React from "react"
import * as ReactDOM from "react-dom"

import {classNames} from "lib"
let {PropTypes: types} = React;

export default class Draggable extends React.Component {
  constructor(props) {
    super(props)
  }

  componentDidMount() {
    const node = ReactDOM.findDOMNode(this)
    if (!node) {
      console.error("Failed to bind mouse drag method due to null children")
    }

    node.addEventListener("mousedown", e => {
      this.startDrag(e.pageX, e.pageY)
    })
  }

  startDrag(startX, startY) {
    if (this.props.disabled) {
      return true;
    }

    if (this.props.startDrag) {
      this.props.startDrag()
    }

    let upListener = (e) => {
      document.body.removeEventListener("mousemove", moveListener)
      document.body.removeEventListener("mouseup", upListener)

      if (this.props.stopDrag) {
        this.props.stopDrag()
      }
    }

    let moveListener = (e) => {
      let x = e.pageX, y = e.pageX
      let dx = x - startX
      let dy = y - startX


      if (e.buttons == 0) {
        upListener()
        return
      }

      startX = x
      startY = y

      if (this.props.onDrag) {
        this.props.onDrag(dx, dy)
      }

      e.preventDefault()
    }

    document.body.addEventListener("mousemove", moveListener)
    document.body.addEventListener("mouseup", upListener)
  }


  render() {
    return this.props.children
  }
}
