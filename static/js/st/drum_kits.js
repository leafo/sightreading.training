export const DRUM_KITS = [
  {id: "classic", name: "Classic"},
  {id: "rock", name: "Heavy Rock"},
  {id: "wood", name: "Woodblocks"},
  {id: "jazz", name: "Jazz"},
  {id: "808", name: "808 / Hip-hop"},
  {id: "909", name: "909 / House"},
  {id: "industrial", name: "Industrial"},
  {id: "latin", name: "Latin Percussion", labels: {kick: "Tumba", snare: "Bongo slap", closedHat: "Shaker", openHat: "Maraca", clap: "Claves", lowTom: "Low conga", highTom: "High conga", ride: "Cowbell"}},
  {id: "lofi", name: "Lo-fi"},
  {id: "taiko", name: "Taiko / Cinematic", labels: {kick: "Grand drum", snare: "Rim strike", closedHat: "Stick click", openHat: "Rattle", clap: "Clappers", lowTom: "Low taiko", highTom: "High taiko", ride: "Gong"}}
]

const tone = (frequency, endFrequency, decay, gain, type = "sine") => ({type, frequency, endFrequency, decay, gain})
const noise = (decay, gain, filterFrequency, filter = "highpass", attack = 0) => ({type: "noise", decay, gain, filterFrequency, filter, attack})
const metal = (base, decay, gain) => [1, 1.47, 2.09, 2.71].map(ratio => tone(base * ratio, base * ratio, decay, gain / 4))

// Layered body/transient voices distinguish kits, rather than just changing pitch.
const ROCK = {
  kick: [tone(165, 42, 0.36, 0.65), tone(220, 65, 0.045, 0.14, "triangle"), noise(0.018, 0.07, 2500)],
  snare: [tone(210, 145, 0.14, 0.22, "triangle"), noise(0.22, 0.38, 1500)],
  closedHat: [noise(0.055, 0.19, 7200), ...metal(4300, 0.035, 0.045)],
  openHat: [noise(0.42, 0.19, 6000), ...metal(3800, 0.3, 0.05)],
  clap: [noise(0.025, 0.24, 1300), noise(0.16, 0.19, 1900, "bandpass", 0.018)],
  lowTom: [tone(145, 65, 0.4, 0.45), tone(220, 110, 0.14, 0.1, "triangle")],
  highTom: [tone(230, 120, 0.28, 0.38), tone(340, 190, 0.09, 0.09, "triangle")],
  ride: [...metal(2400, 0.7, 0.16), noise(0.5, 0.07, 5000)]
}

const WOOD = Object.fromEntries(Object.entries({kick: 330, snare: 650, closedHat: 1200, openHat: 950, clap: 800, lowTom: 440, highTom: 880, ride: 1550}).map(([id, pitch]) => [id, [
  tone(pitch, pitch * 0.98, id === "openHat" || id === "ride" ? 0.16 : 0.085, 0.35),
  tone(pitch * 2.37, pitch * 2.3, 0.035, 0.12, "triangle")
]]))

const JAZZ = {
  kick: [tone(105, 48, 0.18, 0.4), noise(0.018, 0.025, 700, "lowpass")],
  snare: [noise(0.3, 0.19, 2600, "bandpass", 0.008), tone(180, 150, 0.08, 0.06)],
  closedHat: [noise(0.035, 0.1, 8500), ...metal(5100, 0.04, 0.025)],
  openHat: [noise(0.19, 0.12, 7500), ...metal(4100, 0.24, 0.04)],
  clap: [tone(1050, 850, 0.035, 0.14, "triangle"), noise(0.045, 0.08, 1800, "bandpass")],
  lowTom: [tone(155, 110, 0.25, 0.26), tone(240, 220, 0.1, 0.045)],
  highTom: [tone(235, 175, 0.2, 0.24), tone(350, 330, 0.08, 0.04)],
  ride: [...metal(1900, 0.95, 0.2), noise(0.55, 0.035, 6500)]
}

const HIPHOP = {
  kick: [tone(145, 38, 0.8, 0.55), tone(190, 60, 0.025, 0.055)],
  snare: [tone(185, 165, 0.12, 0.16), noise(0.15, 0.22, 1900)],
  closedHat: [...metal(4900, 0.025, 0.09), noise(0.025, 0.09, 9000)],
  openHat: [...metal(4200, 0.28, 0.09), noise(0.25, 0.1, 7500)],
  clap: [noise(0.018, 0.18, 1400, "bandpass"), noise(0.04, 0.14, 1600, "bandpass", 0.012), noise(0.18, 0.12, 1200, "bandpass", 0.028)],
  lowTom: [tone(105, 55, 0.4, 0.34)],
  highTom: [tone(175, 95, 0.3, 0.29)],
  ride: [...metal(3200, 0.4, 0.12)]
}

const HOUSE = {
  kick: [tone(180, 48, 0.32, 0.58), tone(320, 90, 0.025, 0.09, "triangle"), noise(0.012, 0.065, 3500)],
  snare: [tone(240, 170, 0.1, 0.18, "triangle"), noise(0.17, 0.28, 1900)],
  closedHat: [noise(0.045, 0.15, 7800), ...metal(5300, 0.035, 0.05)],
  openHat: [noise(0.48, 0.18, 7000), ...metal(4700, 0.38, 0.06)],
  clap: [noise(0.022, 0.2, 1300, "bandpass"), noise(0.14, 0.18, 1800, "bandpass", 0.018)],
  lowTom: [tone(155, 70, 0.3, 0.36), tone(230, 150, 0.07, 0.045)],
  highTom: [tone(250, 130, 0.23, 0.31), tone(360, 230, 0.05, 0.04)],
  ride: [...metal(2700, 0.6, 0.14), noise(0.4, 0.04, 8000)]
}

const driven = (voice, drive) => ({...voice, drive})
const INDUSTRIAL = {
  kick: [driven(tone(130, 35, 0.42, 0.32, "sawtooth"), 8), noise(0.045, 0.12, 1500, "bandpass")],
  snare: [driven(noise(0.25, 0.23, 1300, "bandpass"), 12), driven(tone(310, 115, 0.15, 0.12, "square"), 6)],
  closedHat: [driven(noise(0.06, 0.12, 6500), 5)],
  openHat: [driven(noise(0.38, 0.14, 4300), 7)],
  clap: [driven(noise(0.19, 0.18, 2100, "bandpass"), 10), tone(780, 490, 0.07, 0.06, "square")],
  lowTom: [driven(tone(150, 55, 0.48, 0.26, "triangle"), 7)],
  highTom: [driven(tone(290, 100, 0.3, 0.22, "square"), 5)],
  ride: [...metal(980, 0.8, 0.15).map(voice => driven(voice, 4)), noise(0.45, 0.065, 3500, "bandpass")]
}

const LATIN = {
  kick: [tone(140, 95, 0.24, 0.35), tone(230, 205, 0.065, 0.045)],
  snare: [tone(520, 340, 0.09, 0.2), noise(0.035, 0.12, 2100, "bandpass")],
  closedHat: [noise(0.065, 0.12, 6200, "bandpass", 0.008)],
  openHat: [noise(0.16, 0.13, 4800, "bandpass", 0.025)],
  clap: [tone(2500, 2470, 0.045, 0.24), tone(3700, 3650, 0.018, 0.06)],
  lowTom: [tone(195, 150, 0.23, 0.31), tone(320, 295, 0.055, 0.055)],
  highTom: [tone(310, 230, 0.17, 0.28), tone(480, 440, 0.04, 0.05)],
  ride: [tone(540, 540, 0.15, 0.065, "square"), tone(800, 800, 0.12, 0.065, "square")]
}

const dark = (voice, cutoff) => ({...voice, filter: "lowpass", filterFrequency: cutoff})
const LOFI = {
  kick: [dark(tone(110, 43, 0.22, 0.43), 650), noise(0.025, 0.035, 800, "lowpass")],
  snare: [dark(tone(190, 135, 0.09, 0.12), 1600), noise(0.13, 0.22, 2500, "lowpass")],
  closedHat: [noise(0.035, 0.12, 4200, "bandpass")],
  openHat: [noise(0.16, 0.13, 3500, "bandpass", 0.005)],
  clap: [noise(0.1, 0.18, 1900, "lowpass", 0.006)],
  lowTom: [dark(tone(135, 85, 0.21, 0.28), 1000)],
  highTom: [dark(tone(210, 145, 0.16, 0.24), 1400)],
  ride: [...metal(1800, 0.35, 0.1).map(voice => dark(voice, 3800)), noise(0.2, 0.035, 2400, "lowpass")]
}

const TAIKO = {
  kick: [tone(95, 32, 1.1, 0.4), tone(155, 68, 0.5, 0.12), noise(0.04, 0.085, 1800, "bandpass")],
  snare: [tone(1100, 870, 0.065, 0.19, "triangle"), tone(1900, 1700, 0.035, 0.08)],
  closedHat: [tone(2100, 2050, 0.035, 0.17), tone(3250, 3200, 0.02, 0.04)],
  openHat: [noise(0.26, 0.11, 3400, "bandpass", 0.015)],
  clap: [tone(720, 650, 0.08, 0.15, "triangle"), noise(0.035, 0.07, 2200, "bandpass")],
  lowTom: [tone(130, 55, 0.8, 0.36), tone(195, 120, 0.3, 0.08), noise(0.025, 0.05, 1800, "bandpass")],
  highTom: [tone(215, 110, 0.5, 0.31), tone(320, 235, 0.2, 0.07), noise(0.02, 0.04, 2400, "bandpass")],
  ride: [...metal(330, 1.6, 0.22), noise(0.6, 0.04, 2100, "bandpass", 0.04)]
}

export const KIT_VOICES = {rock: ROCK, wood: WOOD, jazz: JAZZ, "808": HIPHOP, "909": HOUSE, industrial: INDUSTRIAL, latin: LATIN, lofi: LOFI, taiko: TAIKO}
