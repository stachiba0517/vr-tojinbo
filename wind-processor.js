class WindProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.vol = 0;
    this.samples = [[], []];
    this.p = 0;
    this.pitch = 1;
    this.overwrap = 0; // max 0.5
    this.port.onmessage = e => {
      if (e.data.samples) {
        this.samples = e.data.samples;
      }
      if (e.data.vol !== undefined) {
        this.vol = e.data.vol;
      }
      if (e.data.pitch !== undefined) {
        this.pitch = parseFloat(e.data.pitch);
      }
      if (e.data.overwrap !== undefined) {
        this.overwrap = parseFloat(e.data.overwrap);
      }
    };
  }
  process(inputs, outputs, parameters) {
    if (!this.pitch) return true;
    const output = outputs[0];
    const chlen = Math.min(output.length, this.samples.length);
    const len = output[0].length;
    const slen = this.samples[0].length;
    const olen = slen * this.overwrap;
    const slenw = slen - olen;
    for (let i = 0; i < len; i++) {
      for (let j = 0; j < chlen; j++) {
        let vol = this.samples[j][this.p >> 0];
        if (this.p < olen) {
          vol += this.samples[j][(slenw + this.p) >> 0];
        }
        output[j][i] = vol * this.vol;
      }
      this.p += this.pitch;
      if (this.p >= slenw) {
        this.p -= slenw;
      }
    }
    return true;
  }
}

registerProcessor("wind-processor", WindProcessor);
