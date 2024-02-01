import { WaveFile } from "https://code4fukui.github.io/wavefile-es/index.js";

export const i16_to_f32 = n => (n > 32767 ? n - 65536 : n) / 32768;

export const separateSamplesFloat = (data) => {
  const right = new Float32Array(data.length / 4);
  const left = new Float32Array(data.length / 4);
  for (let i = 0; i < right.length; i++) {
    const n = i * 4;
    right[i] = i16_to_f32(data[n] + (data[n + 1] << 8));
    left[i] = i16_to_f32(data[n + 2] + (data[n + 3] << 8));
  }
  return [right, left];
};

export class WindNode extends AudioWorkletNode {
  static async create(context) {
    await context.audioWorklet.addModule("wind-processor.js");
    return new WindNode(context);
  }
  constructor(context) {
    super(context, "wind-processor");
    this.pitch = -1;
    this.vol = -1;
  }
  setVolume(vol) {
    if (vol == this.vol) return;
    this.vol = vol;
    this.port.postMessage({ vol });
  }
  setPitch(pitch) {
    if (pitch == this.pitch) return;
    this.pitch = pitch;
    this.port.postMessage({ pitch });
  }
  setPitchVolume(pitch, vol) {
    if (vol == this.vol && pitch == this.pitch) return;
    this.vol = vol;
    this.pitch = pitch;
    this.port.postMessage({ pitch, vol });
  }
  setOverwrap(overwrap) {
    if (overwrap == this.overwrap) return;
    this.overwrap = overwrap;
    this.port.postMessage({ overwrap });
  }
  setSamples(samples) {
    this.port.postMessage({ samples });
  }
  async setWaveFile(fn) {
    const wavebuf = new Uint8Array(await (await fetch(fn)).arrayBuffer());
    const wav = new WaveFile();
    wav.fromBuffer(wavebuf);
    const samples = separateSamplesFloat(wav.data.samples);
    this.setSamples(samples);
  }
};
