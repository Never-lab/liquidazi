/** Tiny Web Audio beeps — no asset files. */

let ctx: AudioContext | null = null;

const ac = () => {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  return ctx;
};

const tone = (freq: number, dur: number, type: OscillatorType, gain = 0.04) => {
  const c = ac();
  if (!c) return;
  void c.resume();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur);
};

export const sfxMonthClose = () => {
  tone(320, 0.08, "triangle", 0.035);
  setTimeout(() => tone(480, 0.1, "triangle", 0.03), 70);
};

export const sfxPay = () => {
  tone(520, 0.07, "sine", 0.04);
  setTimeout(() => tone(660, 0.09, "sine", 0.035), 60);
};

export const sfxBad = () => {
  tone(180, 0.18, "sawtooth", 0.03);
};

export const sfxGood = () => {
  tone(440, 0.06, "sine", 0.035);
  setTimeout(() => tone(660, 0.08, "sine", 0.03), 50);
};

/** Steam-like unlock sting (bottom-right trophy toast). */
export const sfxTrophy = () => {
  tone(523, 0.07, "sine", 0.04);
  setTimeout(() => tone(659, 0.08, "sine", 0.035), 70);
  setTimeout(() => tone(784, 0.12, "triangle", 0.03), 140);
};
