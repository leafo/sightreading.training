import * as React from "react"
import {classNames} from "lib"

let {PropTypes: types} = React

import {trigger} from "st/events"

export default class Lightbox extends React.Component {
  static className = null

  static propTypes = {
    close: types.func.isRequired,
  }

  componentDidMount() {
    this.closeListener = e => {
      if (e.keyCode == 27) {
        this.close()
      }
    }

    document.body.addEventListener("keydown", this.closeListener)
  }

  componentWillUnmount() {
    document.body.removeEventListener("keydown", this.closeListener)
  }

  renderContent() {
    throw new Error("override me")
  }

  close() {
    if (!this.canClose()) { return }
    trigger(this, "closeLightbox")
  }

  canClose() {
    return true
  }

  render() {
    return <div className={classNames("lightbox", this.constructor.className)}>
      {this.renderContent()}
    </div>
  }
}
