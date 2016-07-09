
let {Router, Route, IndexRoute, browserHistory} = ReactRouter

class Layout extends React.Component {
  render() {
    return <div className="page_layout">
      {this.props.children}
    </div>
  }
}

class App extends React.Component {
  render() {
    return <Router history={browserHistory}>
      <Route path="/notes/" component={Layout}>
        <IndexRoute component={Page}></IndexRoute>
        <Route path="test" component={TestPage}></Route>
      </Route>
    </Router>
  }
}
