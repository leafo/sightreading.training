let {PropTypes: types} = React;

class Lightbox extends React.Component {
  static className = null
  static propTypes = {
    close: types.func.isRequired,
  }

  componentDidMount() {
    this.closeListener = e => {
      if (e.keyCode == 27) {
        if (this.callClose) {
          this.callClose()
        } else {
          this.close()
        }
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

  render() {
    return <div className={classNames("lightbox", this.constructor.className)}>
      {this.renderContent()}
    </div>
  }
}
