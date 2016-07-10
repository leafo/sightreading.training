
class RegisterPage extends React.Component {
  submitHandler(e) {
    e.preventDefault()
    console.log("do register...")
  }

  render() {
    return <div className="register_page page_container">
      <h2>Register</h2>

      <form ref="form" action="/register.json" method="post" onSubmit={this.submitHandler.bind(this)}>
        <TextInputRow name="username" required={true}>Username</TextInputRow>
        <TextInputRow name="username" type="email" required={true}>Email address</TextInputRow>
        <TextInputRow name="password" type="password" required={true}>Password</TextInputRow>
        <TextInputRow name="password_repeat" type="password" required={true}>Confirm password</TextInputRow>

        <div className="form_buttons">
          <button>Submit</button>
          {" or "}
          <Link to="/login">Log in to existing account</Link>
        </div>
      </form>
    </div>
  }
}
