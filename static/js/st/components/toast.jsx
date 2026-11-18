import * as React from "react"
import styles from "./toast.module.css"

// A status update that does not reserve space in the page layout.
export default class Toast extends React.Component {
  componentDidMount() { this.scheduleDismissal() }

  componentDidUpdate(previous) {
    if (previous.message !== this.props.message || previous.notificationId !== this.props.notificationId) this.scheduleDismissal()
  }

  componentWillUnmount() { clearTimeout(this.timer) }

  scheduleDismissal() {
    clearTimeout(this.timer)
    if (this.props.message) this.timer = setTimeout(() => this.props.onDismiss(), this.props.duration || 5000)
  }

  render() {
    return <div className={styles.region} role="status" aria-live="polite" aria-atomic="true">
      {this.props.message && <div className={styles.toast}>
        <span>{this.props.message}</span>
        <button type="button" aria-label="Dismiss notification" onClick={this.props.onDismiss}>×</button>
      </div>}
    </div>
  }
}
