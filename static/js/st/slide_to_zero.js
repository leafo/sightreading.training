// used to control animation outside of react
export default class SlideToZero {
  constructor(opts={}) {
    this.value = 0;
    this.speed = opts.speed || 1; // 1 unit a second
    this.animating = false;

    this.onUpdate = opts.onUpdate || function() {}
    this.onStop = opts.onStop || function() {}
    this.onStart = opts.onStart || function() {}
    this.onLoop = opts.onLoop || function() {}

    if (opts.loopPhase) {
      this.looping = true;
      this.loopPhase = opts.loopPhase;
      this.add(opts.initialValue || this.loopPhase);
    }
  }

  cancel() {
    this.canceled = true
  }

  add(delta) {
    this.value += delta;
    this.checkAndStart();
  }

  checkAndStart() {
    if (this.animating || this.value == 0) {
      return
    }

    let lastFrame = null;
    this.animating = true
    this.canceled = false
    this.onStart();
    this.onUpdate(this.value);

    let frameUpdate = time => {
      if (this.canceled) {
        this.animating = false;
        return;
      }

      if (lastFrame === null) {
        lastFrame = time;
        window.requestAnimationFrame(frameUpdate);
        return;
      }

      let dt = (time - lastFrame) / 1000;
      lastFrame = time;

      if (dt == 0) {
        window.requestAnimationFrame(frameUpdate);
        return;
      }

      this.value = this.value - this.speed * dt;

      if (this.looping) {
        if (this.value <= 0) {
          this.value += this.loopPhase;
          this.onLoop();
        }
      } else {
        this.value = Math.max(0, this.value);
      }

      this.onUpdate(this.value);

      if (this.value > 0) {
        window.requestAnimationFrame(frameUpdate);
      } else {
        this.animating = false;
        this.onStop();
      }
    }

    window.requestAnimationFrame(frameUpdate);
  }
}
