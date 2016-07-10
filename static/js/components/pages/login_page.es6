
class LoginPage extends React.Component {
  submitHandler(e) {
    e.preventDefault()
    console.log("do login...")
  }

  render() {
    return <div className="login_page page_container">
      <h2>Log in</h2>

      <form ref="form" action="/login.json" method="post" onSubmit={this.submitHandler.bind(this)}>
        <TextInputRow name="username" required={true}>Username</TextInputRow>
        <TextInputRow name="password" type="password" required={true}>Password</TextInputRow>

        <div className="form_buttons">
          <button>Submit</button>
          {" or "}
          <Link to="/register">Register</Link>
        </div>
      </form>
    </div>
  }
}
