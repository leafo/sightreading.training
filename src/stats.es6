export class NoteStats {
  constructor() {
    this.noteHitStats = {};
    this.streak = 0;
    this.hits = 0;
    this.misses = 0;
  }

  hitNote(note) {
    this.incrementNote(note, 1);
    this.streak += 1;
    this.hits += 1
  }

  missNote(note) {
    this.incrementNote(note, -1);
    this.streak = 0;
    this.misses += 1
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

  normalizeNote(note) {
    return note.replace(/\d+$/, "");
  }
}
