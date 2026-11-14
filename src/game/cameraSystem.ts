import { GamePhase } from './types';

export interface CameraFovParams {
  phase: GamePhase;
  mode: '1p' | '3p';
  aspect: number;
  sprinting: boolean;
  crouching: boolean;
}

export interface CameraRigParams {
  mode: '1p' | '3p';
  aspect: number;
  pitch: number;
  crouching: boolean;
}

export interface CameraRigOffsets {
  offsetBack: number;
  offsetRight: number;
  offsetUp: number;
}

export interface HeadBobParams {
  walkPhase: number;
  intensity: number;
  mode: '1p' | '3p';
}

export interface HeadBobOffsets {
  vertical: number;
  horizontal: number;
  roll: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Computes target vertical FOV in degrees with:
 * - Wider 1P spatial awareness (76 deg base vs 66 deg 3P)
 * - Dynamic sprint peripheral expansion (+4 deg) and subtle crouch focus (-2 deg)
 * - Portrait/mobile aspect compensation so narrow screens retain horizontal sightlines
 */
export function computeTargetCameraFov({
  phase,
  mode,
  aspect,
  sprinting,
  crouching,
}: CameraFovParams): number {
  const safeAspect = Number.isFinite(aspect) && aspect > 0.2 ? aspect : 1.6;
  const portraitBoost =
    safeAspect < 1 ? clamp((1 - safeAspect) * 32, 0, 18) : 0;

  if (phase === 'title') {
    return 56 + portraitBoost * 0.85;
  }

  const baseFov = mode === '1p' ? 76 : 66;
  const speedKick = sprinting ? 4 : crouching ? -2 : 0;
  return clamp(baseFov + speedKick + portraitBoost, 54, 96);
}

/**
 * Computes smooth local camera rig offsets relative to player eye position.
 * Adapts 3P over-the-shoulder framing on narrow mobile portrait viewports so
 * the protagonist stays cleanly framed rather than drifting off the left edge.
 */
export function computeTargetCameraRig({
  mode,
  aspect,
  pitch,
  crouching,
}: CameraRigParams): CameraRigOffsets {
  const safeAspect = Number.isFinite(aspect) && aspect > 0.2 ? aspect : 1.6;

  if (mode === '1p') {
    return {
      offsetBack: -0.12, // Subtle forward eye offset for crisp spatial framing
      offsetRight: 0,
      offsetUp: 0.02,
    };
  }

  const isNarrowPortrait = safeAspect < 0.85;
  return {
    offsetBack: isNarrowPortrait ? 2.6 : 2.35,
    offsetRight: isNarrowPortrait ? 0.34 : 0.56,
    offsetUp: (crouching ? 0.38 : 0.23) - Math.sin(pitch) * 0.85,
  };
}

/**
 * Computes subtle, natural 1P head-bob & stride sway scaled by damped bob intensity.
 */
export function computeHeadBobOffsets({
  walkPhase,
  intensity,
  mode,
}: HeadBobParams): HeadBobOffsets {
  if (mode !== '1p' || intensity <= 0.001) {
    return { vertical: 0, horizontal: 0, roll: 0 };
  }
  const amp = clamp(intensity, 0, 1.6);
  return {
    vertical: Math.sin(walkPhase * 2) * 0.032 * amp,
    horizontal: Math.cos(walkPhase) * 0.016 * amp,
    roll: Math.cos(walkPhase) * 0.008 * amp,
  };
}
