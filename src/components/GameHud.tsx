import { AvatarEmoteId, getAvatarDef } from '../game/avatarSystem';
import { GameHudSnapshot, ProtagonistProfile } from '../game/types';
import { AvatarFaceBadge } from './AvatarFaceBadge';

interface GameHudProps {
  hud: GameHudSnapshot;
  profile: ProtagonistProfile;
  muted: boolean;
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
  onToggleMute,
  onPause,
  onToggleCamera,
  onTriggerEmote,
  onInteract,
  onToggleCrouch,
  onToggleSprint,
  onToggleFlashlight,
  onMobileMove,
  onJump,
  onRoll,
}: GameHudProps) {
  const avatarDef = getAvatarDef(profile.avatarId);

  const inDanger = hud.madukaState === 'CHASE';
  const alertBorderOpacity = inDanger
    ? 0.45
    : hud.madukaState === 'SUSPICIOUS' || hud.madukaState === 'INVESTIGATE'
      ? 0.2
      : 0;

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
      <div className="fixed top-3 sm:top-4 inset-x-3 sm:inset-x-4 flex items-start justify-between gap-2">
        <div className="min-w-0 max-w-sm bg-[#0c0f14]/90 border border-white/10 rounded-md px-2.5 py-2 sm:px-3.5 sm:py-2.5">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 sm:gap-1.5 text-[10px] sm:text-[11px] font-mono text-[#d99b43] min-w-0">
            <span className="shrink-0 font-semibold">LVL {hud.levelId}/{hud.totalLevels}</span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="truncate hidden sm:inline">{hud.levelTitle}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">RANK {hud.rank}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0 text-[#9aa3ad]">
              NPC {hud.npcsTalkedCount}/{hud.npcsTotalCount}
            </span>
          </div>
          <div className="text-xs sm:text-sm font-medium text-[#efece6] mt-0.5 leading-snug">
            {hud.objectiveText}
          </div>
        </div>

        {/* Top-Right: Compact Square SVG Utility Controls + Timer */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          <div className="bg-[#0c0f14]/90 border border-white/10 rounded-md px-2.5 sm:px-3 py-2 font-mono text-xs text-[#cfd4da] tabular-nums">
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
            className="h-9 px-2.5 flex items-center justify-center rounded-md bg-[#0c0f14]/90 border border-white/15 font-mono text-[11px] text-[#efece6] hover:border-[#d99b43] cursor-pointer"
          >
            {hud.cameraMode.toUpperCase()}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-9 h-9 flex items-center justify-center rounded-md bg-[#0c0f14]/90 border border-white/15 text-[#efece6] hover:border-[#d99b43] cursor-pointer"
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
            className="w-9 h-9 flex items-center justify-center rounded-md bg-[#0c0f14]/90 border border-white/15 text-[#efece6] hover:border-[#d99b43] cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>
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

      {/* Maduka Reactive Dialogue Subtitle */}
      {hud.dialogueText && (
        <div className="fixed bottom-64 md:bottom-20 left-1/2 -translate-x-1/2 w-[min(640px,92vw)] bg-[#0c0f14]/92 border border-white/15 rounded-md px-4 py-2.5 text-center">
          <div className="text-[11px] font-mono text-[#d99b43]">{hud.dialogueSpeaker}</div>
          <div className="text-xs sm:text-sm text-[#efece6] mt-0.5 italic">“{hud.dialogueText}”</div>
        </div>
      )}

      {/* Bottom-Left: Avatar Expression Badge + Stamina, Battery & Stealth State */}
      <div className="fixed bottom-36 md:bottom-4 left-3 md:left-4 bg-[#0c0f14]/90 border border-white/10 rounded-md px-3 py-2 md:px-3.5 md:py-2.5 w-48 md:w-64 space-y-1.5">
        <div className="flex items-center gap-2.5">
          <AvatarFaceBadge
            expression={hud.expression}
            hoodieColor={profile.jacketColor}
            skinColor={avatarDef.skinColor}
          />
          <div className="flex-1 min-w-0 space-y-1.5">
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

      {/* Desktop Bottom-Center: Playful Interactive & Mobility Action Dock */}
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

      {/* Bottom-Right: Inventory Bar (lifted above touch dock on mobile) */}
      <div className="fixed bottom-36 md:bottom-4 right-3 md:right-4 bg-[#0c0f14]/90 border border-white/10 rounded-md px-3 py-2 md:px-3.5 md:py-2.5 max-w-[152px] md:max-w-xs">
        <div className="text-[10px] md:text-[11px] font-mono text-[#9aa3ad] mb-1">
          INVENTORY ({hud.inventory.length})
        </div>
        {hud.inventory.length === 0 ? (
          <div className="text-[11px] md:text-xs text-[#707882]">Empty pockets</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {hud.inventory.map((item) => (
              <div
                key={item.id}
                title={item.description}
                className="px-2 py-0.5 md:py-1 text-[11px] md:text-xs bg-[#181d24] border border-white/10 rounded text-[#efece6] whitespace-nowrap"
              >
                {item.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Responsive Mobile Touch Dock (strictly below telemetry row, zero overlap) */}
      <div className="md:hidden fixed inset-x-3 bottom-3 flex items-end justify-between pointer-events-none">
        <div className="grid grid-cols-3 gap-1 w-[108px] pointer-events-auto touch-none">
          <div />
          <button
            type="button"
            aria-label="Move forward"
            onTouchStart={() => onMobileMove(0, 1)}
            onTouchEnd={() => onMobileMove(0, 0)}
            onTouchCancel={() => onMobileMove(0, 0)}
            className="h-9 rounded bg-[#0c0f14]/90 border border-white/20 text-xs text-[#efece6] touch-none"
          >
            W
          </button>
          <div />
          <button
            type="button"
            aria-label="Strafe left"
            onTouchStart={() => onMobileMove(-1, 0)}
            onTouchEnd={() => onMobileMove(0, 0)}
            onTouchCancel={() => onMobileMove(0, 0)}
            className="h-9 rounded bg-[#0c0f14]/90 border border-white/20 text-xs text-[#efece6] touch-none"
          >
            A
          </button>
          <button
            type="button"
            aria-label="Move back"
            onTouchStart={() => onMobileMove(0, -1)}
            onTouchEnd={() => onMobileMove(0, 0)}
            onTouchCancel={() => onMobileMove(0, 0)}
            className="h-9 rounded bg-[#0c0f14]/90 border border-white/20 text-xs text-[#efece6] touch-none"
          >
            S
          </button>
          <button
            type="button"
            aria-label="Strafe right"
            onTouchStart={() => onMobileMove(1, 0)}
            onTouchEnd={() => onMobileMove(0, 0)}
            onTouchCancel={() => onMobileMove(0, 0)}
            className="h-9 rounded bg-[#0c0f14]/90 border border-white/20 text-xs text-[#efece6] touch-none"
          >
            D
          </button>
        </div>

        <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onTriggerEmote('throw_plane')}
              className="px-2 py-1.5 text-[11px] rounded bg-[#0c0f14]/90 border border-white/20 text-[#efece6]"
            >
              Plane
            </button>
            <button
              type="button"
              onClick={() => onTriggerEmote('boogie')}
              className="px-2 py-1.5 text-[11px] rounded bg-[#0c0f14]/90 border border-white/20 text-[#efece6]"
            >
              Dance
            </button>
            <button
              type="button"
              onClick={onJump}
              className="px-2 py-1.5 text-[11px] rounded bg-[#0c0f14]/90 border border-white/20 text-[#efece6]"
            >
              Jump
            </button>
            <button
              type="button"
              onClick={onRoll}
              className={`px-2 py-1.5 text-[11px] rounded border ${
                hud.rolling
                  ? 'bg-[#efece6] text-[#0e1114] border-[#efece6]'
                  : 'bg-[#0c0f14]/90 border-white/20 text-[#efece6]'
              }`}
            >
              Roll
            </button>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              aria-pressed={hud.sprinting}
              onClick={onToggleSprint}
              className={`px-2 py-2 text-[11px] font-semibold rounded border ${
                hud.sprinting
                  ? 'bg-[#d99b43] text-[#0e1114] border-[#d99b43]'
                  : 'bg-[#0c0f14]/90 border-white/20 text-[#efece6]'
              }`}
            >
              Sprint
            </button>
            <button
              type="button"
              onClick={onToggleCrouch}
              className={`px-2 py-2 text-[11px] rounded border ${
                hud.crouching
                  ? 'bg-[#d99b43]/25 border-[#d99b43] text-[#efece6]'
                  : 'bg-[#0c0f14]/90 border-white/20 text-[#efece6]'
              }`}
            >
              Crouch
            </button>
            <button
              type="button"
              onClick={onToggleFlashlight}
              className="px-2 py-2 text-[11px] rounded bg-[#0c0f14]/90 border border-white/20 text-[#d99b43]"
            >
              Light
            </button>
            <button
              type="button"
              onClick={onInteract}
              className="px-2.5 py-2 text-[11px] font-semibold rounded bg-[#d99b43] text-[#0e1114]"
            >
              Use
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
