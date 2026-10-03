const dayKey = () => new Date().toISOString().slice(0, 10);

export class RateGate {
  constructor(cfg) {
    this.cfg = cfg;
    this.day = dayKey();
    this.reads = 0;
    this.writes = 0;
    this.lastWrite = 0;
  }

  roll() {
    const k = dayKey();
    if (k !== this.day) {
      this.day = k;
      this.reads = 0;
      this.writes = 0;
    }
  }

  canRead() {
    this.roll();
    return this.reads < this.cfg.maxReadRequestsPerDay;
  }

  noteRead() {
    this.reads += 1;
  }

  canWrite() {
    this.roll();
    return (
      this.writes < this.cfg.maxCommentsPerDay &&
      Date.now() - this.lastWrite >= this.cfg.minCommentIntervalMs
    );
  }

  noteWrite() {
    this.writes += 1;
    this.lastWrite = Date.now();
  }
}
