export class NoteStats {
  constructor() {
    this.noteHitStats = {};
    this.streak = 0;
    this.hits = 0;
    this.misses = 0;

    this.lastHitTime = undefined;
    this.averageHitTime = 0;
  }

  hitNotes(notes) {
    for (let note of notes) {
      this.incrementNote(note, 1);
    }

    let now = +new Date;

    if (this.lastHitTime) {
      let timeTaken = now - this.lastHitTime;

      if (!this.isOutlierTime(timeTaken)) {
        this.averageHitTime = (this.averageHitTime * this.hits + timeTaken) / (this.hits + 1);
      }
    }

    this.lastHitTime = now

    this.streak += 1;
    this.hits += 1;
  }

  missNotes(notes) {
    for (let note of notes) {
      this.incrementNote(note, -1);
    }

    this.streak = 0;
    this.misses += 1;
  }

  incrementNote(note, val) {
    note = this.normalizeNote(note);
    let stats = this.noteHitStats[note] = this.noteHitStats[note] || {};

    if (val > 0) {
      stats.hits = (stats.hits || 0) + val;
    } else if (val < 0){
      stats.misses = (stats.misses || 0) - val;
    }
  }


  isOutlierTime(timeTaken) {
    if (this.averageHitTime == 0) {
      return false;
    }

    return timeTaken > this.averageHitTime * 10 + 1000;
  }

  normalizeNote(note) {
    return note.replace(/\d+$/, "");
  }
}
