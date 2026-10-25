/** Mic capture with a level meter. Falls back to a synthetic level when the mic is unavailable. */
export class Take {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private buf = new Uint8Array(512)
  started = 0

  /** Resolves false when the mic is blocked or missing; the take then records nothing. */
  async start() {
    this.chunks = []
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.recorder = new MediaRecorder(this.stream)
      this.recorder.ondataavailable = (e) => this.chunks.push(e.data)
      this.recorder.start()
      this.ctx = new AudioContext()
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 512
      this.ctx.createMediaStreamSource(this.stream).connect(this.analyser)
    } catch {
      this.release()
      this.recorder = null
    }
    this.started = performance.now()
    return this.recorder !== null
  }

  level() {
    if (!this.analyser) return Math.max(0, 0.35 + Math.sin(performance.now() / 260) * 0.25 + (Math.random() - 0.5) * 0.4)
    this.analyser.getByteTimeDomainData(this.buf)
    let sum = 0
    for (const b of this.buf) sum += ((b - 128) / 128) ** 2
    return Math.min(1, Math.sqrt(sum / this.buf.length) * 5)
  }

  seconds() {
    return (performance.now() - this.started) / 1000
  }

  /** Resolves with the recorded audio, or null for a stand-in take. */
  stop(): Promise<Blob | null> {
    const rec = this.recorder
    if (!rec || rec.state === 'inactive') {
      this.release()
      return Promise.resolve(null)
    }
    return new Promise((resolve) => {
      rec.onstop = () => {
        resolve(new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' }))
        this.release()
      }
      rec.stop()
    })
  }

  cancel() {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.onstop = null
      this.recorder.stop()
    }
    this.recorder = null
    this.release()
  }

  private release() {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.ctx?.close().catch(() => undefined)
    this.ctx = null
    this.analyser = null
  }
}
