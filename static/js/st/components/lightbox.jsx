import * as React from "react"
import classNames from "classnames"
import * as types from "prop-types"

import {trigger} from "st/events"

export default class Lightbox extends React.Component {
  static className = null

  static propTypes = {
    onClose: types.func,
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
    return this.props.children
  }

  close() {
    if (!this.canClose()) { return }
    trigger(this, "lightboxClosed")
    if (this.props.onClose) {
      this.props.onClose(this)
    }
  }

  canClose() {
    return true
  }

  render() {
    return <div className={classNames("lightbox", this.constructor.className, this.props.className)}>
      {this.renderContent()}
    </div>
  }
}
