export interface ControlSettings {
  lookSensitivity: number; // Laptop mouse/trackpad/keyboard: 0.3 .. 2.0 (1.0 default)
  touchSensitivity: number; // Phone touch look: 0.3 .. 1.8 (0.75 default — smoother & steadier)
  invertY: boolean;
  autoSprintJoystick: boolean; // Push mobile thumbstick to outer rim to sprint
  sprintToggleMode: boolean; // Laptop comfort: tap Shift to toggle sprint instead of holding
}

const CONTROL_SETTINGS_KEY = 'blackwood_controls_v1';

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  lookSensitivity: 1.0,
  touchSensitivity: 0.75,
  invertY: false,
  autoSprintJoystick: true,
  sprintToggleMode: false,
};

export function clampSensitivity(value: number, min = 0.3, max = 2.0): number {
  if (!Number.isFinite(value)) return 1.0;
  return Math.max(min, Math.min(max, Math.round(value * 20) / 20));
}

export function loadControlSettings(storage?: Storage): ControlSettings {
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!target) return { ...DEFAULT_CONTROL_SETTINGS };
  try {
    const raw = target.getItem(CONTROL_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_CONTROL_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ControlSettings>;
    return {
      lookSensitivity: clampSensitivity(parsed.lookSensitivity ?? 1.0, 0.3, 2.0),
      touchSensitivity: clampSensitivity(parsed.touchSensitivity ?? 0.75, 0.3, 1.8),
      invertY: Boolean(parsed.invertY),
      autoSprintJoystick:
        typeof parsed.autoSprintJoystick === 'boolean' ? parsed.autoSprintJoystick : true,
      sprintToggleMode: Boolean(parsed.sprintToggleMode),
    };
  } catch {
    return { ...DEFAULT_CONTROL_SETTINGS };
  }
}

export function saveControlSettings(settings: ControlSettings, storage?: Storage): void {
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!target) return;
  try {
    target.setItem(CONTROL_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export interface JoystickOutput {
  moveX: number; // -1 (left) .. +1 (right)
  moveY: number; // -1 (back) .. +1 (forward)
  magnitude: number; // 0 .. 1 after deadzone & response curve
  knobOffsetX: number; // clamped pixel offset X for UI rendering
  knobOffsetY: number; // clamped pixel offset Y for UI rendering
  autoSprinting: boolean;
}

/**
 * Maps pointer offset (dx, dy in screen pixels from thumbstick center)
 * into deadzoned, progressive-curve movement + optional outer-rim auto-sprint.
 * Progressive curve keeps gentle nudges steady on narrow phone screens while hitting full speed at rim.
 */
export function computeJoystickVector(
  dx: number,
  dy: number,
  maxRadius = 42,
  deadzoneRatio = 0.16,
  autoSprintThreshold = 0.88,
  autoSprintEnabled = true,
): JoystickOutput {
  const safeRadius = Math.max(12, maxRadius);
  const rawDist = Math.hypot(dx, dy);
  if (rawDist <= 0.0001) {
    return {
      moveX: 0,
      moveY: 0,
      magnitude: 0,
      knobOffsetX: 0,
      knobOffsetY: 0,
      autoSprinting: false,
    };
  }

  const clampedDist = Math.min(safeRadius, rawDist);
  const ratio = clampedDist / safeRadius;
  const dirX = dx / rawDist;
  const dirY = dy / rawDist;
  const knobOffsetX = dirX * clampedDist;
  const knobOffsetY = dirY * clampedDist;

  if (ratio <= deadzoneRatio) {
    return {
      moveX: 0,
      moveY: 0,
      magnitude: 0,
      knobOffsetX,
      knobOffsetY,
      autoSprinting: false,
    };
  }

  const linearMag = Math.min(1, (ratio - deadzoneRatio) / (1 - deadzoneRatio));
  const curvedMag = Math.min(1, Math.pow(linearMag, 1.25));
  const moveX = Number((dirX * curvedMag).toFixed(4));
  // Screen +Y is downward, while game forward (+moveY) is upward (-dy)
  const moveY = Number((-dirY * curvedMag).toFixed(4));

  return {
    moveX,
    moveY,
    magnitude: Number(curvedMag.toFixed(4)),
    knobOffsetX,
    knobOffsetY,
    autoSprinting: autoSprintEnabled && ratio >= autoSprintThreshold,
  };
}

export type LookInputSource = 'pointer_lock' | 'mouse_drag' | 'wheel_trackpad' | 'touch';

export interface LookDeltaResult {
  dYaw: number;
  dPitch: number;
}

const SOURCE_SCALES: Record<LookInputSource, { yaw: number; pitch: number; maxStep: number }> = {
  pointer_lock: { yaw: 0.002, pitch: 0.0018, maxStep: 60 },
  mouse_drag: { yaw: 0.0036, pitch: 0.0026, maxStep: 55 },
  wheel_trackpad: { yaw: 0.0021, pitch: 0.0015, maxStep: 70 },
  touch: { yaw: 0.0036, pitch: 0.0022, maxStep: 42 },
};

export function computeLookDeltas(params: {
  rawDx: number;
  rawDy: number;
  sensitivity: number;
  invertY: boolean;
  source: LookInputSource;
}): LookDeltaResult {
  const cfg = SOURCE_SCALES[params.source];
  const sens = clampSensitivity(
    params.sensitivity,
    0.3,
    params.source === 'touch' ? 1.8 : 2.0,
  );
  const clampedDx = Math.max(-cfg.maxStep, Math.min(cfg.maxStep, params.rawDx));
  const clampedDy = Math.max(-cfg.maxStep, Math.min(cfg.maxStep, params.rawDy));
  const ySign = params.invertY ? -1 : 1;

  // Apply gentle non-linear precision curve on touchscreens so micro-aiming stays steady while swipes still turn cleanly
  const effectiveDx =
    params.source === 'touch'
      ? Math.sign(clampedDx) * Math.pow(Math.abs(clampedDx), 0.94)
      : clampedDx;
  const effectiveDy =
    params.source === 'touch'
      ? Math.sign(clampedDy) * Math.pow(Math.abs(clampedDy), 0.92)
      : clampedDy;

  return {
    dYaw: -effectiveDx * cfg.yaw * sens,
    dPitch: -effectiveDy * cfg.pitch * sens * ySign,
  };
}
