let {PropTypes: types} = React;

class StatsLightbox extends React.Component {
  static propTypes = {
    noteStats: types.object.isRequired,
    close: types.func.isRequired,
  }

  render() {
    let availableNotes = Object.keys(this.props.noteStats);
    availableNotes.sort();

    if (availableNotes.length) {
      var statsContent = availableNotes.map(function (note) {
        let stats = this.props.noteStats[note]
        let hits = stats.hits || 0;
        let misses = stats.misses || 0;

        let hit_rate = hits / (hits + misses) * 100
        let miss_rate = misses / (hits + misses) * 100

        if (hit_rate > 0) {
          var hit_bar = <div className="hit_bar" style={{ width: `${hit_rate}%`}}>
            {hits}
          </div>;
        }

        if (miss_rate > 0) {
          var miss_bar = <div className="miss_bar" style={{ width: `${miss_rate}%`}}>
            {misses}
          </div>;
        }

        return <div key={note} className="note_stat_row">
          <div className="note_name">{note}</div>
          <div className="note_rates">
            {hit_bar}
            {miss_bar}
          </div>
        </div>
      }.bind(this));

      statsContent = <div className="note_bars_container">{statsContent}</div>;
    } else {
      var statsContent = <p className="empty_message">
        You don't have any stats yet. Try playing some notes first.
      </p>;
    }

    return <div className="lightbox_shroud">
      <div className="lightbox stats_lightbox">
        <h2>Session stats</h2>
        {statsContent}
        <p>
          <button onClick={this.props.close}>Close</button>
        </p>
      </div>
    </div>;
  }

  close() {
    alert("close me");
  }
}
