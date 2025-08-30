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
    // Show the dialog as modal
    if (this.dialogRef.current) {
      this.dialogRef.current.showModal()
    }

    // Handle close events from the dialog
    this.closeListener = () => {
      this.close()
    }

    // Handle cancel event (ESC key)
    this.cancelListener = (e) => {
      e.preventDefault() // Prevent default close behavior
      this.close()
    }

    if (this.dialogRef.current) {
      this.dialogRef.current.addEventListener("close", this.closeListener)
      this.dialogRef.current.addEventListener("cancel", this.cancelListener)
    }
  }

  componentWillUnmount() {
    if (this.dialogRef.current) {
      this.dialogRef.current.removeEventListener("close", this.closeListener)
      this.dialogRef.current.removeEventListener("cancel", this.cancelListener)

      // Close dialog if it's still open
      if (this.dialogRef.current.open) {
        this.dialogRef.current.close()
      }
    }
  }

  renderContent() {
    return this.props.children
  }

  close() {
    if (!this.canClose()) { return }

    if (this.dialogRef.current && this.dialogRef.current.open) {
      this.dialogRef.current.close()
    }

    trigger(this, "lightboxClosed")
    if (this.props.onClose) {
      this.props.onClose(this)
    }
  }

  canClose() {
    return true
  }

  render() {
    return <dialog
      ref={this.dialogRef ||= React.createRef()}
      className={classNames("lightbox", this.constructor.className, this.props.className)}
      onClick={(e) => {
        // Close when clicking on backdrop (the dialog element itself, not its content)
        if (e.target === this.dialogRef.current) {
          this.close()
        }
        if (this.props.onClick) {
          this.props.onClick(e)
        }
      }}>
      <div className="lightbox_content">
        {this.renderContent()}
      </div>
    </dialog>
  }
}
