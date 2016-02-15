let {PropTypes: types} = React;

class IntroLightbox extends React.Component {
  static propTypes = {
    close: types.func.isRequired,
  }

  constructor(props) {
    super(props)
  }

  render() {
    return <div className="lightbox_shroud">
      <div className="lightbox">
        <h2>Sight reading trainer</h2>
        <p>This tool gives you a way to practice sight reading randomly
        generated notes. It works best with Chrome and a MIDI keyboard
        plugged into your computer. If you don't have those available, you can
        use the on-screen keyboard to enter notes.</p>
        <p>
          <button onClick={this.props.close}>Get started</button>
        </p>
      </div>
    </div>
  }
}
