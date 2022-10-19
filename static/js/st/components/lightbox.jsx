import * as React from "react"
import classNames from "classnames"
import * as types from "prop-types"

import {trigger} from "st/events"

let currentFocusTrap = null

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

    if (!currentFocusTrap) {
      // detect if focus has left the lightbox so it can be restored
      this.detectFocusListener = e => {
        const container = this.containerRef.current
        if (e.target != container && !container.contains(e.target)) {
          container.focus()
        }
      }

      document.body.addEventListener("focusin", this.detectFocusListener)
      currentFocusTrap = this
    }

    this.containerRef.current.focus()
  }

  componentWillUnmount() {
    document.body.removeEventListener("keydown", this.closeListener)
    if (this.detectFocusListener) {
      document.body.removeEventListener("focusin", this.detectFocusListener)
    }

    if (currentFocusTrap == this) {
      currentFocusTrap = null
    }
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
    return <div
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      onClick={this.props.onClick}
      ref={this.containerRef ||= React.createRef()}
      className={classNames("lightbox", this.constructor.className, this.props.className)}>
      {this.renderContent()}
    </div>
  }
}
