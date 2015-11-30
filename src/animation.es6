// used to control animation outside of react
class SlideToZero {
  constructor(opts={}) {
    this.value = 0;
    this.speed = opts.speed || 100; // 100 pixels a second
    this.animating = false;
    this.onUpdate = opts.onUpdate || function() {}
  }

  cancel() {
    this.canceled = true
  }

  add(delta) {
    let wasZero = this.value == 0;

    this.value += delta;
    if (wasZero && this.value > 0) {
      let lastFrame = performance.now();
      this.animating = true;

      let frameUpdate = function(time) {
        let dt = (time - lastFrame) / 1000;
        lastFrame = time;

        if (dt == 0) {
          return;
        }

        this.value = Math.max(0, this.value - this.speed * dt);
        this.onUpdate(this.value);

        if (this.value > 0) {
          window.requestAnimationFrame(frameUpdate);
        } else {
          this.animating = false;
        }
      }.bind(this);

      window.requestAnimationFrame(frameUpdate)
    }
  }
}
