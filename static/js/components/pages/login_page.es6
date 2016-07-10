
class LoginPage extends React.Component {
  render() {
    return <div className="login_page">
      <form action="/login.json" method="post">
        <div className="input_row">
          <label>
            <div className="username">Username</div>
            <input type="text" name="username" />
          </label>
        </div>

        <div className="input_row">
          <label>
            <div className="password">Password</div>
            <input type="paassword" name="password" />
          </label>
        </div>

        <div className="form_buttons">
          <button type="button">Submit</button>
        </div>
      </form>
    </div>
  }
}
