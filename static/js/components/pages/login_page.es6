
class LoginPage extends React.Component {
  submitHandler(e) {
    e.preventDefault()
    console.log("do login...")
  }

  render() {
    return <div className="login_page">
      <h2>Login</h2>

      <form ref="form" action="/login.json" method="post" onSubmit={this.submitHandler.bind(this)}>
        <TextInputRow name="username" required={true}>Username</TextInputRow>
        <TextInputRow name="password" type="password" required={true}>Password</TextInputRow>

        <div className="form_buttons">
          <button>Submit</button>
        </div>
      </form>
    </div>
  }
}
