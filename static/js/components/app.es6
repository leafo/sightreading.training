
let {Router, Route, IndexRoute, Link, browserHistory, withRouter} = ReactRouter

class Layout extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  componentDidMount() {
    N.dispatch(this, {
      "closeLightbox": (e) => this.setState({currentLightbox: null}),
      "showLightbox": (e, lb) => {
        this.setState({
          currentLightbox: lb
        })
      }
    })
  }

  render() {
    return <div className="page_layout">
      <div className="header_spacer">
        {this.renderHeader()}
      </div>
      {this.props.children}

      <CSSTransitionGroup transitionName="show_lightbox" transitionEnterTimeout={200} transitionLeaveTimeout={100}>
        {this.renderCurrentLightbox()}
      </CSSTransitionGroup>
    </div>
  }

  renderCurrentLightbox() {
    if (!this.state.currentLightbox) { return }

    // we clone to add ref
    let lb = React.cloneElement(this.state.currentLightbox, {
      ref: "currentLightbox"
    })

    return <div
      className="lightbox_shroud"
      onClick={(e) => {
        if (e.target.classList.contains("lightbox_shroud")) {
          this.refs.currentLightbox.close()
          e.preventDefault();
        }
      }}
      >{lb}</div>
  }

  doLogout() {
    let request = new XMLHttpRequest()
    request.open("POST", "/logout.json")
    let data = new FormData()
    data.append("csrf_token", N.csrf_token())
    request.send(data)

    request.onload = (e) => {
      let res = JSON.parse(request.responseText)
      N.init(res)
    }
  }

  renderHeader() {
    let userLinks = [
      <Link key="root" onlyActiveOnIndex to="/" activeClassName="active">Staff</Link>,
      <Link key="flash-cards" to="/flash-cards" activeClassName="active">Flash cards</Link>
    ]

    if (N.session.currentUser) {
      var userPanel = <div className="right_section">
        {N.session.currentUser.username}
        {" " }
        <a href="#" onClick={this.doLogout.bind(this)}>Log out</a>
      </div>

      userLinks.push(<Link
          key="stats"
          to="/stats"
          activeClassName="active">Stats</Link>)

    } else {
      var userPanel = <div className="right_section">
        <Link to="/login" activeClassName="active">Log in</Link>
        {" or "}
        <Link to="/register" activeClassName="active">Register</Link>
      </div>
    }
    return <div className="header">
      <img className="logo" src="/static/img/logo.svg" height="40" alt="" />

      <h1>
        <Link to="/">Sight reading trainer</Link>
      </h1>

      {userLinks}
      {userPanel}
    </div>
  }
}

class App extends React.Component {
  constructor() {
    super()
    this.state = {
      routes: <Route path="/" component={withRouter(Layout)}>
        <IndexRoute component={withRouter(SightReadingPage)}></IndexRoute>
        <Route path="login" component={withRouter(LoginPage)}></Route>
        <Route path="register" component={withRouter(RegisterPage)}></Route>
        <Route path="about" component={withRouter(AboutPage)}></Route>
        <Route path="stats" component={withRouter(StatsPage)}></Route>
        <Route path="flash-cards" component={withRouter(FlashCardPage)}></Route>
      </Route>
    }
  }

  render() {
    return <Router history={browserHistory}>{this.state.routes}</Router>
  }
}
