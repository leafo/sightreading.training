
let {Link} = ReactRouter

class RegisterPage extends React.Component {
  afterSubmit(res) {
    console.warn("submitted", res)
  }

  render() {
    return <div className="register_page page_container">
      <h2>Register</h2>
      <p>Create an account to keep track of your progress over time.</p>

      <JsonForm action="/register.json" afterSubmit={this.afterSubmit.bind(this)}>
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
