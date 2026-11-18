import SlideToZero from "st/slide_to_zero"

describe("scroll animation timing", function() {
  let frames
  let nextId

  beforeEach(function() {
    frames = new Map()
    nextId = 0
    spyOn(window, "requestAnimationFrame").and.callFake(callback => {
      frames.set(++nextId, callback)
      return nextId
    })
    spyOn(window, "cancelAnimationFrame").and.callFake(id => frames.delete(id))
  })

  function frame(time) {
    const pending = [...frames.values()]
    frames.clear()
    for (const callback of pending) callback(time)
  }

  function scrollingSlider() {
    let slider
    slider = new SlideToZero({
      speed: 1,
      loopPhase: 1,
      initialValue: 4,
      onUpdate(value) {
        // Same boundary used by the staff trainer when the player falls behind.
        if (value < 0.5) {
          slider.value = 0.5
          slider.cancel()
        }
      }
    })
    return slider
  }

  for (const delay of [0, 60000]) {
    it(`resumes after falling behind and answering ${delay}ms later`, function() {
      const slider = scrollingSlider()
      frame(0)
      frame(3600)
      expect(slider.animating).toBeFalse()
      expect(frames.size).toBe(0)

      // Resume before another browser frame, or after a long pause.
      slider.add(1)
      expect(slider.animating).toBeTrue()
      expect(frames.size).toBe(1)
      frame(3600 + delay)
      expect(slider.value).toBe(1.5)
      frame(3700 + delay)
      expect(slider.value).toBeCloseTo(1.4, 6)

      // Falling behind again must still allow a fresh restart.
      frame(4700 + delay)
      expect(slider.animating).toBeFalse()
      slider.add(1)
      frame(4800 + delay)
      frame(4900 + delay)
      expect(slider.value).toBeCloseTo(1.4, 6)
      expect(frames.size).toBe(1)
    })
  }

  it("cancels a pending frame before restarting without duplicate movement", function() {
    const slider = new SlideToZero({speed: 1})
    slider.add(2)
    frame(0)
    slider.cancel()
    expect(frames.size).toBe(0)
    slider.add(1)
    expect(frames.size).toBe(1)
    frame(60000)
    frame(60100)
    expect(slider.value).toBeCloseTo(2.9, 6)
  })

  it("keeps the current clock when notes are answered during normal scrolling", function() {
    const onLoop = jasmine.createSpy("onLoop")
    const slider = new SlideToZero({speed: 2, loopPhase: 1, onLoop})
    frame(0)
    frame(250)
    slider.add(1)
    frame(500)
    expect(slider.value).toBe(1)
    expect(frames.size).toBe(1)
    frame(1000)
    expect(onLoop).toHaveBeenCalledTimes(1)
    expect(slider.value).toBe(1)
  })

  it("still finishes wait-mode movement and restarts on the next note", function() {
    const onStop = jasmine.createSpy("onStop")
    const slider = new SlideToZero({speed: 4, onStop})
    slider.add(1)
    frame(0)
    frame(250)
    expect(slider.value).toBe(0)
    expect(slider.animating).toBeFalse()
    expect(frames.size).toBe(0)
    expect(onStop).toHaveBeenCalledTimes(1)
    slider.add(1)
    frame(60000)
    frame(60100)
    expect(slider.value).toBeCloseTo(0.6, 6)
  })
})
