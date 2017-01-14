
let {Link} = ReactRouter

export default class RegisterPage extends React.Component {
  componentDidMount() {
    N.setTitle("Register Account")
  }

  afterSubmit(res) {
    if (res.errors) {
      this.setState({
        errorMessage: res.errors[0]
      })
      return
    }

    N.init(res)
    this.props.router.replace('/')
  }

  constructor() {
    super()
    this.state = {}
  }

  render() {
    return <div className="register_page page_container">
      <h2>Register</h2>
      <p>Create an account to keep track of your progress over time.</p>

      <JsonForm action="/register.json" afterSubmit={this.afterSubmit.bind(this)}>
        {this.state.errorMessage ? <div className="form_error">{this.state.errorMessage}</div> : null}
        <TextInputRow name="username" required={true}>Username</TextInputRow>
        <TextInputRow name="email" type="email" required={true}>Email address</TextInputRow>
        <TextInputRow name="password" type="password" required={true}>Password</TextInputRow>
        <TextInputRow name="password_repeat" type="password" required={true}>Confirm password</TextInputRow>

        <div className="form_buttons">
          <button>Submit</button>
          {" or "}
          <Link to="/login">Log in to existing account</Link>
        </div>
      </JsonForm>
    </div>
  }
}
