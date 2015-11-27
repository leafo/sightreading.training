
window.N = window.N || {};

class Page extends React.Component {
  render() {
    return <div>Hello world</div>;
  }
}

N.init = function() {
  ReactDOM.render(<Page/>, document.getElementById("page"));
}

