
let {PropTypes: types} = React;

class SettingsPanel extends React.Component {
  static propTypes = {
    close: types.func.isRequired,
    staves: types.array.isRequired,
    generators: types.array.isRequired,
  }

  render() {
    return <div className="settings_panel">
      <div className="settings_header">
        <button onClick={this.props.close}>Close</button>
        <h3>Settings</h3>
      </div>

      <div className="settings_group">
        <h4>Staff</h4>
        {this.renderStaves()}
      </div>

      <div className="settings_group">
        <h4>Generator</h4>
        {this.renderGenerators()}
      </div>
    </div>
  }

  renderStaves() {
    return this.props.staves.map((staff, i) => {
      return <div
        key={staff.name}
        onClick={(e) => {
          e.preventDefault();
          this.props.setStaff(staff);
        }}
        className={classNames("toggle_option", {
          active: this.props.currentStaff == staff
        })}>
        {staff.name}</div>;
    })
  }

  renderGenerators() {
    return this.props.generators.map((generator, i) => {
      if (generator.debug) {
        return;
      }

      return <div
        key={generator.name}
        onClick={(e) => {
          e.preventDefault();
          this.props.setGenerator(generator);
        }}
        
        className={classNames("toggle_option", {
          active: this.props.currentGenerator == generator
        })}>
        {generator.name}</div>;
    })
  }
}
