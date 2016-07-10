let {PropTypes: types} = React;

class TextInputRow extends React.Component {
  static propTypes = {
    name: types.string.isRequired,
  }

  render() {
    let inputProps = {
      type: this.props.type || "text",
      name: this.props.name,
    };

    (["onChange", "value", "required"]).forEach((k) => {
      if (k in this.props) {
        inputProps[k] = this.props[k]
      }
    })

    return <div className={classNames("input_row", this.props.className)}>
      <label>
        <div className="label">{this.props.children}</div>
        <input {...inputProps} />
      </label>
    </div>
  }
}
