import type { SurfaceMaterial } from './physics';

export interface DynamicFootstepParams {
  surface: SurfaceMaterial;
  speedRatio: number; // ~0.4 crouch .. 1.0 walk .. 1.6 sprint
  crouching: boolean;
  sprinting: boolean;
}

export class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.noiseBuffer) {
      const length = Math.floor(this.ctx.sampleRate * 0.35);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.ctx;
  }

  private playFilteredNoise(
    ctx: AudioContext,
    filterType: BiquadFilterType,
    freqHz: number,
    q: number,
    volume: number,
    durationSec: number,
  ): void {
    if (!this.noiseBuffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freqHz, now);
    filter.Q.setValueAtTime(q, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.001, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + durationSec);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + durationSec + 0.01);
  }

  public playDynamicFootstep({
    surface,
    speedRatio,
    crouching,
    sprinting,
  }: DynamicFootstepParams): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const clampedSpeed = Math.max(0.35, Math.min(1.65, speedRatio));
    const variance = 0.92 + Math.random() * 0.16;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (surface === 'carpet') {
      // Muffled wool/fabric runner: warm low thud + soft lowpass brush
      osc.type = 'sine';
      osc.frequency.setValueAtTime(72 * (0.8 + clampedSpeed * 0.2) * variance, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.065);

      const vol = (crouching ? 0.022 : sprinting ? 0.075 : 0.045) * Math.min(1.2, clampedSpeed);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.075);

      this.playFilteredNoise(
        ctx,
        'lowpass',
        (crouching ? 340 : sprinting ? 580 : 440) * variance,
        0.7,
        crouching ? 0.014 : sprinting ? 0.042 : 0.024,
        0.07,
      );
    } else if (surface === 'wood_desk') {
      // Hollow resonant oak tabletop knock
      osc.type = 'triangle';
      osc.frequency.setValueAtTime((165 + clampedSpeed * 32) * variance, now);
      osc.frequency.exponentialRampToValueAtTime(68, now + 0.085);

      const vol = crouching ? 0.045 : sprinting ? 0.145 : 0.09;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.095);

      this.playFilteredNoise(
        ctx,
        'bandpass',
        (760 + clampedSpeed * 120) * variance,
        2.2,
        crouching ? 0.016 : sprinting ? 0.055 : 0.032,
        0.055,
      );
    } else {
      // Concrete / terrazzo corridor tile: crisp heel tap + hard grit transient
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(
        (crouching ? 88 : 112 + clampedSpeed * 28) * variance,
        now,
      );
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.075);

      const vol = (crouching ? 0.032 : sprinting ? 0.135 : 0.078) * Math.min(1.25, clampedSpeed);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);

      this.playFilteredNoise(
        ctx,
        'bandpass',
        (crouching ? 1100 : sprinting ? 1850 : 1480) * variance,
        1.6,
        crouching ? 0.014 : sprinting ? 0.068 : 0.036,
        0.05,
      );
    }
  }

  public playFootstep(sprinting: boolean, crouching: boolean): void {
    this.playDynamicFootstep({
      surface: 'concrete_tile',
      speedRatio: crouching ? 0.55 : sprinting ? 1.5 : 1.0,
      crouching,
      sprinting,
    });
  }

  public playJumpPush(surface: SurfaceMaterial): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(surface === 'carpet' ? 95 : 125, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.105);

    this.playFilteredNoise(ctx, 'bandpass', surface === 'carpet' ? 520 : 1100, 1.0, 0.035, 0.09);
  }

  public playLandImpact(impactSpeed: number, surface: SurfaceMaterial): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const strength = Math.max(0.25, Math.min(1.3, impactSpeed / 5.5));
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = surface === 'wood_desk' ? 'triangle' : 'sine';
    const startFreq = surface === 'wood_desk' ? 165 : surface === 'carpet' ? 76 : 112;
    osc.frequency.setValueAtTime(startFreq * (0.9 + strength * 0.2), now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.12);
    gain.gain.setValueAtTime(0.12 * strength, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);

    const filterFreq = surface === 'carpet' ? 420 : surface === 'wood_desk' ? 840 : 1380;
    this.playFilteredNoise(ctx, surface === 'carpet' ? 'lowpass' : 'bandpass', filterFreq, 1.2, 0.065 * strength, 0.09);
  }

  public playRollWhoosh(surface: SurfaceMaterial): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.playFilteredNoise(
      ctx,
      'bandpass',
      surface === 'carpet' ? 540 : 880,
      0.9,
      0.085,
      0.24,
    );
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.22);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.035);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.08, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.19);
    });
  }

  public playLockdownBell(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [220, 277.18, 164.81].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.08, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.58);
    });
  }

  public playAlertStinger(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(420, now + 0.25);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playVictoryChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.09, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.48);
    });
  }

  public playPaperWhoosh(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.16);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playBoogiePop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [392, 523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.075);
      gain.gain.setValueAtTime(0.075, now + i * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.075 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.075);
      osc.stop(now + i * 0.075 + 0.15);
    });
  }

  public playSpinWhoosh(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.18);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playTauntAhem(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [330, 440].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.045, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.08);
    });
  }

  public dispose(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
