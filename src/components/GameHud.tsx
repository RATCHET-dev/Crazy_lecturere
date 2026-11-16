import { useEffect, useRef, useState } from 'react';
import { AvatarEmoteId, getAvatarDef } from '../game/avatarSystem';
import { ControlSettings, computeJoystickVector } from '../game/controls';
import { GameHudSnapshot, ProtagonistProfile } from '../game/types';
import { AvatarFaceBadge } from './AvatarFaceBadge';

interface GameHudProps {
  hud: GameHudSnapshot;
  profile: ProtagonistProfile;
  muted: boolean;
  controlSettings: ControlSettings;
  onControlSettingsChange: (next: ControlSettings) => void;
  onToggleMute: () => void;
  onPause: () => void;
  onToggleCamera: () => void;
  onTriggerEmote: (emote: AvatarEmoteId) => void;
  onInteract: () => void;
  onToggleCrouch: () => void;
  onToggleSprint: () => void;
  onToggleFlashlight: () => void;
  onMobileMove: (mx: number, my: number) => void;
  onMobileLook: (dx: number, dy: number) => void;
  onMobileSprint: (sprinting: boolean) => void;
  onJump: () => void;
  onRoll: () => void;
}

export function GameHud({
  hud,
  profile,
  muted,
  controlSettings,
  onControlSettingsChange,
  onToggleMute,
  onPause,
  onToggleCamera,
  onTriggerEmote,
  onInteract,
  onToggleCrouch,
  onToggleSprint,
  onToggleFlashlight,
  onMobileMove,
  onMobileSprint,
  onJump,
  onRoll,
}: GameHudProps) {
  const avatarDef = getAvatarDef(profile.avatarId);
  const [showSettings, setShowSettings] = useState(false);
  const [isCoarseTouchDevice, setIsCoarseTouchDevice] = useState(false);
  const [forceTouchHud, setForceTouchHud] = useState(false);

  // Virtual Analog Thumbstick state
  const stickRef = useRef<HTMLDivElement | null>(null);
  const stickPointerIdRef = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [stickAutoSprint, setStickAutoSprint] = useState(false);
  const [stickActive, setStickActive] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia?.('(pointer: coarse)');
    const update = () => {
      const coarse = Boolean(mq?.matches) || navigator.maxTouchPoints > 0;
      setIsCoarseTouchDevice(coarse);
    };
    update();
    mq?.addEventListener?.('change', update);
    return () => mq?.removeEventListener?.('change', update);
  }, []);

  const updateStickFromPointer = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxRadius = rect.width * 0.36;
    const out = computeJoystickVector(
      clientX - cx,
      clientY - cy,
      maxRadius,
      0.16,
      0.88,
      controlSettings.autoSprintJoystick,
    );
    setKnobOffset({ x: out.knobOffsetX, y: out.knobOffsetY });
    setStickAutoSprint(out.autoSprinting);
    onMobileMove(out.moveX, out.moveY);
    onMobileSprint(out.autoSprinting);
  };

  const resetStick = () => {
    stickPointerIdRef.current = null;
    setStickActive(false);
    setKnobOffset({ x: 0, y: 0 });
    setStickAutoSprint(false);
    onMobileMove(0, 0);
    onMobileSprint(false);
  };

  const inDanger = hud.madukaState === 'CHASE';
  const alertBorderOpacity = inDanger
    ? 0.45
    : hud.madukaState === 'SUSPICIOUS' || hud.madukaState === 'INVESTIGATE'
      ? 0.2
      : 0;

  const touchDockVisibilityClass =
    forceTouchHud || isCoarseTouchDevice ? 'flex' : 'flex md:hidden';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Subtle Danger Peripheral Border Tint */}
      {alertBorderOpacity > 0 && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-200"
          style={{
            boxShadow: `inset 0 0 90px rgba(200, 55, 55, ${alertBorderOpacity})`,
          }}
        />
      )}

      {/* Top Bar: Responsive Flex Row so Objective Card never collides with Timer/Utility buttons */}
      <div className="fixed top-2.5 sm:top-4 inset-x-2.5 sm:inset-x-4 flex items-start justify-between gap-2">
        <div className="flex-1 sm:flex-initial min-w-0 max-w-sm flex flex-col gap-1.5">
          <div className="bg-[#0c0f14]/90 border border-white/10 rounded-md px-2.5 py-1.5 sm:px-3.5 sm:py-2.5">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 sm:gap-1.5 text-[10px] sm:text-[11px] font-mono text-[#d99b43] min-w-0">
              <span className="shrink-0 font-semibold">
                {hud.levelId === 0 ? 'LVL 00 · TUTORIAL' : `LVL ${hud.levelId}/${hud.totalLevels}`}
              </span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="truncate hidden sm:inline">{hud.levelTitle}</span>
              <span aria-hidden="true">·</span>
              <span className="shrink-0">RANK {hud.rank}</span>
              <span aria-hidden="true">·</span>
              <span className="shrink-0 text-[#9aa3ad]">
                NPC {hud.npcsTalkedCount}/{hud.npcsTotalCount}
              </span>
            </div>
            <div className="text-[11px] sm:text-sm font-medium text-[#efece6] mt-0.5 leading-snug">
              {hud.objectiveText}
            </div>
          </div>

          {hud.tutorial && (
            <div
              data-testid="tutorial-orientation-card"
              className="bg-[#0c1419]/94 border border-[#2dd4bf]/40 rounded-md px-2.5 py-1.5 sm:px-3 sm:py-2 space-y-1"
            >
              <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                <span className="text-[#5eead4] font-semibold">
                  ORIENTATION · {hud.tutorial.activeStepTitle}
                </span>
                <span className="text-[#d99b43] tabular-nums shrink-0">
                  {hud.tutorial.completedCount}/{hud.tutorial.totalCount} DONE
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {hud.tutorial.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`px-1 py-0.5 rounded text-[10px] font-mono text-center whitespace-nowrap border ${
                      step.done
                        ? 'bg-[#102924] border-[#34d399]/60 text-[#34d399]'
                        : 'bg-[#090e13] border-white/10 text-[#9aa3ad]'
                    }`}
                  >
                    {step.done ? `✓ ${idx + 1}` : `${idx + 1}`}
                  </div>
                ))}
              </div>

              {forceTouchHud || isCoarseTouchDevice ? (
                <div className="text-[11px] text-[#e2e8f0] leading-snug">
                  {hud.tutorial.phoneHint}
                </div>
              ) : (
                <>
                  <div className="block md:hidden text-[11px] text-[#e2e8f0] leading-snug">
                    {hud.tutorial.phoneHint}
                  </div>
                  <div className="hidden md:block text-[11px] text-[#e2e8f0] leading-snug">
                    {hud.tutorial.laptopHint}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Top-Right: Compact Square SVG Utility Controls + Timer + Controls Settings */}
        <div className="shrink-0 flex items-center gap-1 sm:gap-2 pointer-events-auto relative">
          <div className="bg-[#0c0f14]/90 border border-white/10 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 font-mono text-[11px] sm:text-xs text-[#cfd4da] tabular-nums">
            {Math.floor(hud.elapsedSeconds / 60)}:
            {String(hud.elapsedSeconds % 60).padStart(2, '0')}
          </div>

          <button
            type="button"
            tabIndex={-1}
            aria-label={`Switch camera view (V) — currently ${hud.cameraMode.toUpperCase()}`}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleCamera();
            }}
            className="h-8 sm:h-9 px-2 sm:px-2.5 flex items-center justify-center rounded-md bg-[#0c0f14]/90 border border-white/15 font-mono text-[11px] text-[#efece6] hover:border-[#d99b43] cursor-pointer"
          >
            {hud.cameraMode.toUpperCase()}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Control settings for Phone and Laptop"
            aria-expanded={showSettings}
            data-testid="hud-controls-settings-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              setShowSettings((v) => !v);
            }}
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md border cursor-pointer transition-colors ${
              showSettings
                ? 'bg-[#231b10] border-[#d99b43] text-[#d99b43]'
                : 'bg-[#0c0f14]/90 border-white/15 text-[#efece6] hover:border-[#d99b43]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md bg-[#0c0f14]/90 border border-white/15 text-[#efece6] hover:border-[#d99b43] cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              {muted ? (
                <path d="M22 9l-6 6M16 9l6 6" />
              ) : (
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              )}
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause game (Esc or P)"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md bg-[#0c0f14]/90 border border-white/15 text-[#efece6] hover:border-[#d99b43] cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>

          {/* Phone & Laptop Controls Popover */}
          {showSettings && (
            <div
              role="dialog"
              aria-label="Phone and Laptop Control Settings"
              className="absolute right-0 top-11 w-64 sm:w-72 bg-[#0c0f14]/96 border border-white/15 rounded-lg p-3 space-y-2.5 text-xs shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <span className="font-semibold text-[#efece6]">Phone &amp; Laptop Controls</span>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="text-[11px] font-mono text-[#9aa3ad] hover:text-[#efece6] cursor-pointer"
                >
                  Done
                </button>
              </div>

              <label className="block space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[#cfd4da]">
                  <span>Phone Touch Look</span>
                  <span className="font-mono text-[#d99b43] tabular-nums">
                    {controlSettings.touchSensitivity.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Phone Touch Look Sensitivity"
                  min={0.3}
                  max={1.8}
                  step={0.05}
                  value={controlSettings.touchSensitivity}
                  onChange={(e) =>
                    onControlSettingsChange({
                      ...controlSettings,
                      touchSensitivity: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#d99b43] cursor-pointer"
                />
              </label>

              <label className="block space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[#cfd4da]">
                  <span>Laptop Look Speed</span>
                  <span className="font-mono text-[#d99b43] tabular-nums">
                    {controlSettings.lookSensitivity.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Laptop Look Sensitivity"
                  min={0.3}
                  max={2.0}
                  step={0.1}
                  value={controlSettings.lookSensitivity}
                  onChange={(e) =>
                    onControlSettingsChange({
                      ...controlSettings,
                      lookSensitivity: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#d99b43] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between gap-2 text-[11px] text-[#cfd4da] cursor-pointer">
                <span>Phone Rim Auto-Sprint</span>
                <input
                  type="checkbox"
                  checked={controlSettings.autoSprintJoystick}
                  onChange={(e) =>
                    onControlSettingsChange({
                      ...controlSettings,
                      autoSprintJoystick: e.target.checked,
                    })
                  }
                  className="accent-[#d99b43]"
                />
              </label>

              <label className="flex items-center justify-between gap-2 text-[11px] text-[#cfd4da] cursor-pointer">
                <span>Laptop Tap-Shift Sprint</span>
                <input
                  type="checkbox"
                  checked={controlSettings.sprintToggleMode}
                  onChange={(e) =>
                    onControlSettingsChange({
                      ...controlSettings,
                      sprintToggleMode: e.target.checked,
                    })
                  }
                  className="accent-[#d99b43]"
                />
              </label>

              <label className="flex items-center justify-between gap-2 text-[11px] text-[#cfd4da] cursor-pointer">
                <span>Invert Look Y-Axis</span>
                <input
                  type="checkbox"
                  checked={controlSettings.invertY}
                  onChange={(e) =>
                    onControlSettingsChange({
                      ...controlSettings,
                      invertY: e.target.checked,
                    })
                  }
                  className="accent-[#d99b43]"
                />
              </label>

              <label className="hidden md:flex items-center justify-between gap-2 text-[11px] text-[#cfd4da] cursor-pointer">
                <span>Show Touch Controls Overlay</span>
                <input
                  type="checkbox"
                  checked={forceTouchHud}
                  onChange={(e) => setForceTouchHud(e.target.checked)}
                  className="accent-[#d99b43]"
                />
              </label>

              <div className="pt-1 border-t border-white/10 text-[10px] font-mono text-[#9aa3ad] leading-relaxed">
                Laptop: WASD Move · Trackpad 2-finger / Drag / J·L·I·K Look · Shift Sprint
                <br />
                Phone: Left Thumbstick Move/Sprint · Drag Right Screen to Look
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exact Center Crosshair & Interaction Prompt */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            hud.nearPrompt ? 'bg-[#d99b43] scale-150' : 'bg-[#efece6]/70'
          } transition-transform`}
        />
        {hud.nearPrompt && (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onInteract();
            }}
            className="pointer-events-auto px-3.5 py-1.5 text-xs font-medium bg-[#0c0f14]/92 border border-[#d99b43]/60 text-[#efece6] rounded-md whitespace-nowrap cursor-pointer"
          >
            {hud.nearPrompt}
          </button>
        )}
      </div>

      {/* Active Lecturer / NPC Reactive Dialogue Subtitle */}
      {hud.dialogueText && (
        <div className="fixed bottom-64 md:bottom-20 left-1/2 -translate-x-1/2 w-[min(640px,92vw)] bg-[#0c0f14]/92 border border-white/15 rounded-md px-4 py-2 text-center">
          <div className="text-[11px] font-mono text-[#d99b43]">{hud.dialogueSpeaker}</div>
          <div className="text-xs sm:text-sm text-[#efece6] mt-0.5 italic">“{hud.dialogueText}”</div>
        </div>
      )}

      {/* Bottom-Left Telemetry: Avatar Expression Badge + Stamina, Battery & Stealth State */}
      <div className="fixed bottom-36 md:bottom-4 left-2.5 md:left-4 bg-[#0c0f14]/90 border border-white/10 rounded-md px-2.5 py-1.5 md:px-3.5 md:py-2.5 w-44 md:w-64 space-y-1">
        <div className="flex items-center gap-2 md:gap-2.5">
          <AvatarFaceBadge
            expression={hud.expression}
            hoodieColor={profile.jacketColor}
            skinColor={avatarDef.skinColor}
          />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between text-[10px] md:text-[11px] font-mono text-[#9aa3ad]">
              <span className={hud.sprinting ? 'text-[#d99b43] font-semibold' : undefined}>
                {hud.sprinting ? 'SPRINT' : 'STAMINA'}
              </span>
              <span className="tabular-nums text-[#efece6]">{hud.stamina}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  hud.sprinting
                    ? 'bg-[#d99b43]'
                    : hud.stamina < 20
                      ? 'bg-[#ef4444]'
                      : 'bg-[#efece6]'
                }`}
                style={{ width: `${hud.stamina}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] md:text-[11px] font-mono text-[#9aa3ad]">
              <span>LIGHT {hud.flashlightOn ? 'ON' : 'OFF'}</span>
              <span className="tabular-nums text-[#d99b43]">{hud.battery}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-sm overflow-hidden">
              <div
                className="h-full bg-[#d99b43] transition-all duration-100"
                style={{ width: `${hud.battery}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] md:text-[11px] font-mono pt-0.5">
          <span className={hud.sprinting ? 'text-[#d99b43] uppercase font-semibold' : 'text-[#9aa3ad] uppercase'}>
            {hud.rolling
              ? 'ROLLING'
              : !hud.grounded
                ? 'AIRBORNE'
                : hud.activeEmote
                  ? hud.activeEmote.replace('_', ' ')
                  : hud.hiddenInLockerId
                    ? 'IN LOCKER'
                    : hud.crouching
                      ? 'CROUCHED'
                      : hud.sprinting
                        ? 'SPRINTING'
                        : hud.surface === 'carpet'
                          ? 'CARPET'
                          : hud.surface === 'wood_desk'
                            ? 'DESK TOP'
                            : 'CORRIDOR'}
          </span>
          <span
            data-testid="hud-maduka-state"
            className={
              hud.madukaState === 'CHASE'
                ? 'text-[#ef4444]'
                : hud.madukaState === 'SUSPICIOUS' || hud.madukaState === 'INVESTIGATE'
                  ? 'text-[#d99b43]'
                  : 'text-[#9aa3ad]'
            }
          >
            {hud.lockdownTriggered ? hud.madukaState : 'LECTURING'}
          </span>
        </div>
      </div>

      {/* Desktop/Laptop Bottom-Center: Mobility & Playful Action Dock */}
      {!forceTouchHud && !isCoarseTouchDevice && (
        <div className="hidden md:flex fixed bottom-4 left-1/2 -translate-x-1/2 items-center gap-1.5 bg-[#0c0f14]/90 border border-white/10 rounded-md p-1.5 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-pressed={hud.sprinting}
            disabled={Boolean(hud.hiddenInLockerId) || (!hud.sprinting && hud.stamina < 18)}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleSprint();
            }}
            className={`px-2.5 py-1.5 text-xs font-mono rounded transition-colors cursor-pointer whitespace-nowrap border ${
              hud.sprinting
                ? 'bg-[#d99b43] text-[#0e1114] border-[#d99b43] font-semibold'
                : !hud.hiddenInLockerId && hud.stamina >= 18
                  ? 'bg-[#151a22] text-[#efece6] border-white/10 hover:border-[#d99b43]'
                  : 'bg-[#0e1116] text-[#5c6570] border-white/5 cursor-not-allowed'
            }`}
          >
            [Shift] Sprint
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={hud.stamina < 18 || hud.rolling || Boolean(hud.hiddenInLockerId)}
            onClick={(e) => {
              e.currentTarget.blur();
              onRoll();
            }}
            className={`px-2.5 py-1.5 text-xs font-mono rounded transition-colors cursor-pointer whitespace-nowrap border ${
              hud.rolling
                ? 'bg-[#efece6] text-[#0e1114] border-[#efece6]'
                : hud.stamina >= 18 && !hud.hiddenInLockerId
                  ? 'bg-[#151a22] text-[#efece6] border-white/10 hover:border-[#d99b43]'
                  : 'bg-[#0e1116] text-[#5c6570] border-white/5 cursor-not-allowed'
            }`}
          >
            [R] Roll
          </button>
          {(
            [
              { id: 'throw_plane', keyLabel: 'Q', label: 'Plane', enabled: hud.planeReady },
              { id: 'wave', keyLabel: '1', label: 'Wave', enabled: true },
              { id: 'boogie', keyLabel: '2', label: 'Dance', enabled: true },
              { id: 'spin', keyLabel: '3', label: 'Spin', enabled: hud.stamina >= 16 },
              { id: 'taunt', keyLabel: 'G', label: 'Taunt', enabled: true },
            ] as const
          ).map((act) => (
            <button
              key={act.id}
              type="button"
              tabIndex={-1}
              disabled={!act.enabled}
              onClick={(e) => {
                e.currentTarget.blur();
                onTriggerEmote(act.id);
              }}
              className={`px-2.5 py-1.5 text-xs font-mono rounded transition-colors cursor-pointer whitespace-nowrap border ${
                hud.activeEmote === act.id
                  ? 'bg-[#d99b43] text-[#0e1114] border-[#d99b43]'
                  : act.enabled
                    ? 'bg-[#151a22] text-[#efece6] border-white/10 hover:border-[#d99b43]'
                    : 'bg-[#0e1116] text-[#5c6570] border-white/5 cursor-not-allowed'
              }`}
            >
              [{act.keyLabel}] {act.label}
            </button>
          ))}
        </div>
      )}

      {/* Bottom-Right: Inventory Bar (lifted cleanly above mobile touch arc) */}
      <div className="fixed bottom-36 md:bottom-4 right-2.5 md:right-4 bg-[#0c0f14]/90 border border-white/10 rounded-md px-2.5 py-1.5 md:px-3.5 md:py-2.5 max-w-[144px] md:max-w-xs">
        <div className="text-[10px] md:text-[11px] font-mono text-[#9aa3ad] mb-0.5">
          INVENTORY ({hud.inventory.length})
        </div>
        {hud.inventory.length === 0 ? (
          <div className="text-[11px] md:text-xs text-[#707882]">Empty pockets</div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {hud.inventory.map((item) => (
              <div
                key={item.id}
                title={item.description}
                className="px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs bg-[#181d24] border border-white/10 rounded text-[#efece6] whitespace-nowrap"
              >
                {item.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Responsive Phone & Touch Device Controls (Analog Thumbstick + Ergonomic Thumb Arc) */}
      <div className={`${touchDockVisibilityClass} fixed inset-x-3 bottom-3 items-end justify-between pointer-events-none`}>
        {/* Left: Smooth 360° Virtual Analog Thumbstick with Rim Auto-Sprint */}
        <div
          ref={stickRef}
          data-testid="mobile-thumbstick"
          role="application"
          aria-label="Virtual movement thumbstick — drag rim to sprint"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            stickPointerIdRef.current = e.pointerId;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            setStickActive(true);
            updateStickFromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (stickPointerIdRef.current !== e.pointerId) return;
            e.preventDefault();
            updateStickFromPointer(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (stickPointerIdRef.current !== e.pointerId) return;
            e.preventDefault();
            resetStick();
          }}
          onPointerCancel={(e) => {
            if (stickPointerIdRef.current !== e.pointerId) return;
            resetStick();
          }}
          className={`relative w-28 h-28 rounded-full pointer-events-auto touch-none flex items-center justify-center border-2 transition-colors ${
            stickAutoSprint
              ? 'bg-[#231b10]/85 border-[#d99b43]'
              : stickActive
                ? 'bg-[#0c0f14]/85 border-white/40'
                : 'bg-[#0c0f14]/75 border-white/20'
          }`}
        >
          {/* Subtle Directional Guide Crosshair */}
          <div className="absolute inset-x-4 h-px bg-white/10 pointer-events-none" />
          <div className="absolute inset-y-4 w-px bg-white/10 pointer-events-none" />
          <span
            className={`absolute top-1.5 text-[9px] font-mono tracking-wider pointer-events-none ${
              stickAutoSprint ? 'text-[#d99b43] font-bold' : 'text-[#9aa3ad]/75'
            }`}
          >
            {stickAutoSprint ? 'SPRINT' : 'MOVE'}
          </span>

          {/* Draggable Thumb Knob */}
          <div
            className={`w-11 h-11 rounded-full border shadow-lg pointer-events-none transition-colors ${
              stickAutoSprint
                ? 'bg-[#d99b43] border-[#fef3c7]'
                : stickActive
                  ? 'bg-[#efece6] border-[#d99b43]'
                  : 'bg-[#262d38] border-white/35'
            }`}
            style={{
              transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
            }}
          />
        </div>

        {/* Right: Ergonomic Instant-Response Thumb Action Cluster (onPointerDown for 0ms latency) */}
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto touch-none">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onTriggerEmote('throw_plane');
              }}
              className="h-9 px-2.5 text-[11px] font-medium rounded-md bg-[#0c0f14]/90 border border-white/20 text-[#efece6] active:scale-95 touch-none"
            >
              Plane
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onToggleFlashlight();
              }}
              className="h-9 px-2.5 text-[11px] font-medium rounded-md bg-[#0c0f14]/90 border border-white/20 text-[#d99b43] active:scale-95 touch-none"
            >
              Light
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onRoll();
              }}
              className={`h-9 min-w-[46px] px-2.5 text-[11px] font-medium rounded-md border active:scale-95 touch-none ${
                hud.rolling
                  ? 'bg-[#efece6] text-[#0e1114] border-[#efece6]'
                  : 'bg-[#0c0f14]/90 border-white/20 text-[#efece6]'
              }`}
            >
              Roll
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onJump();
              }}
              className="h-10 min-w-[52px] px-2.5 text-xs font-semibold rounded-md bg-[#151a22]/95 border border-white/25 text-[#efece6] active:scale-95 touch-none"
            >
              Jump
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onToggleCrouch();
              }}
              className={`h-11 min-w-[56px] px-2.5 text-xs font-medium rounded-md border active:scale-95 touch-none ${
                hud.crouching
                  ? 'bg-[#d99b43]/25 border-[#d99b43] text-[#efece6]'
                  : 'bg-[#0c0f14]/90 border-white/20 text-[#efece6]'
              }`}
            >
              Crouch
            </button>
            <button
              type="button"
              aria-pressed={hud.sprinting}
              onPointerDown={(e) => {
                e.preventDefault();
                onToggleSprint();
              }}
              className={`h-11 min-w-[58px] px-2.5 text-xs font-semibold rounded-md border active:scale-95 touch-none ${
                hud.sprinting
                  ? 'bg-[#d99b43] text-[#0e1114] border-[#d99b43]'
                  : 'bg-[#0c0f14]/90 border-white/20 text-[#efece6]'
              }`}
            >
              Sprint
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onInteract();
              }}
              className={`h-12 min-w-[62px] px-3 text-xs font-bold rounded-md border active:scale-95 touch-none transition-colors ${
                hud.nearPrompt
                  ? 'bg-[#d99b43] text-[#0e1114] border-[#fef3c7] shadow-md'
                  : 'bg-[#2a2216]/95 text-[#d99b43] border-[#d99b43]/50'
              }`}
            >
              Use
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
