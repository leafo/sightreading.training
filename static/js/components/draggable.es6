import * as React from "react"
import * as ReactDOM from "react-dom"

import {classNames} from "lib"
import * as types from "prop-types"

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

    node.addEventListener("touchstart", e => {
      let {pageX: x, pageY: y} = e.targetTouches[0]
      this.startTouchDrag(x, y)
    })
  }

  startTouchDrag(startX, startY) {
    if (this.props.disabled) {
      return true;
    }

    if (this.props.startDrag) {
      this.props.startDrag()
    }

    let upListener = (e) => {
      document.body.removeEventListener("touchmove", moveListener)
      document.body.removeEventListener("touchend", upListener)

      if (this.props.stopDrag) {
        this.props.stopDrag()
      }
    }

    let moveListener = (e) => {
      let {pageX: x, pageY: y} = e.targetTouches[0]

      let dx = x - startX
      let dy = y - startX

      startX = x
      startY = y

      if (this.props.onDrag) {
        this.props.onDrag(dx, dy)
      }
    }

    document.body.addEventListener("touchmove", moveListener)
    document.body.addEventListener("touchend", upListener)

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
    return <div className="draggable">
      {this.props.children}
    </div>
  }
}
