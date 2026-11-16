import { useEffect, useState } from 'react';
import {
  AvatarEmoteId,
  PLAYABLE_AVATARS,
  getAvatarDef,
} from '../game/avatarSystem';
import { CAMPAIGN_LEVELS, getLevelDef } from '../game/levels';
import { LECTURERS, LecturerDef, getLecturerDef } from '../game/lecturers';
import { isLevelUnlocked } from '../game/saveSystem';
import { ControlSettings } from '../game/controls';
import {
  DifficultyLevel,
  LecturerId,
  ProtagonistProfile,
  SaveGamePayload,
} from '../game/types';
import { downloadPrdPdf } from '../prd/pdfExport';

interface TitleScreenProps {
  profile: ProtagonistProfile;
  difficulty: DifficultyLevel;
  selectedLevelId: number;
  selectedLecturerId: LecturerId;
  savedRun: SaveGamePayload | null;
  controlSettings: ControlSettings;
  onControlSettingsChange: (next: ControlSettings) => void;
  onProfileChange: (profile: ProtagonistProfile) => void;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  onLevelChange: (levelId: number) => void;
  onLecturerChange: (lecturerId: LecturerId) => void;
  onPreviewEmote: (emote: AvatarEmoteId) => void;
  onStartGame: () => void;
}

const JACKET_SWATCHES = [
  { label: 'Blackwood Teal', color: '#2a7f86' },
  { label: 'CS Cobalt', color: '#2563eb' },
  { label: 'Merit Crimson', color: '#991b1b' },
  { label: 'Library Emerald', color: '#246b5c' },
];

function hexFromInt(colorInt: number): string {
  return `#${colorInt.toString(16).padStart(6, '0')}`;
}

function LecturerPortraitSvg({ lecturer }: { lecturer: LecturerDef }) {
  const { visual, accentColor } = lecturer;
  const jacketHex = hexFromInt(visual.jacketColor);
  const eyeHex = visual.eyeGlowColor ? hexFromInt(visual.eyeGlowColor) : '#ffffff';
  const mouthHex = visual.eyeGlowColor ? eyeHex : accentColor;

  return (
    <svg viewBox="0 0 28 28" className="w-7 h-7 shrink-0" aria-hidden="true">
      <rect
        x="4"
        y="6"
        width="20"
        height="18"
        rx="4"
        fill={jacketHex}
        stroke={accentColor}
        strokeWidth="1.6"
      />
      {visual.silhouette === 'principal' && (
        <path
          d="M7 6l3-3.5 4 2.5 4-2.5L21 6z"
          fill="#fbbf24"
          stroke="#fef08a"
          strokeWidth="0.8"
        />
      )}
      {visual.hasBun && <circle cx="14" cy="4.2" r="2.8" fill={hexFromInt(visual.hairColor)} />}
      {visual.hasCapOrCrown && visual.silhouette !== 'principal' && (
        <rect x="6" y="3.5" width="16" height="3" rx="1" fill={accentColor} />
      )}
      <rect x="7.8" y="12.2" width="3.8" height="2.4" rx="0.6" fill={eyeHex} />
      <rect x="16.4" y="12.2" width="3.8" height="2.4" rx="0.6" fill={eyeHex} />
      {visual.hasGlasses && (
        <g stroke="#d4d4d8" strokeWidth="0.9" fill="none">
          <rect x="7.1" y="11.5" width="5.2" height="3.8" rx="0.8" />
          <rect x="15.7" y="11.5" width="5.2" height="3.8" rx="0.8" />
          <line x1="12.3" y1="13.2" x2="15.7" y2="13.2" />
        </g>
      )}
      <path
        d={visual.silhouette === 'female' ? 'M9.5 18.5q4.5 1.8 9-0.4' : 'M10 18.5h8'}
        stroke={mouthHex}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function TitleScreen({
  profile,
  difficulty,
  selectedLevelId,
  selectedLecturerId,
  savedRun,
  controlSettings,
  onControlSettingsChange,
  onProfileChange,
  onDifficultyChange,
  onLevelChange,
  onLecturerChange,
  onPreviewEmote,
  onStartGame,
}: TitleScreenProps) {
  const [showControls, setShowControls] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const activeAvatar = getAvatarDef(profile.avatarId);
  const activeLevel = getLevelDef(selectedLevelId);
  const activeLecturer = getLecturerDef(selectedLecturerId);
  const completedLevels = savedRun?.completedLevels ?? [];
  const completedSet = new Set(completedLevels);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStartGame]);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-5 lg:p-6 overflow-y-auto bg-gradient-to-r from-[#0a0d12]/95 via-[#0a0d12]/72 to-[#0a0d12]/15">
      <div className="max-w-2xl space-y-2 sm:space-y-2.5 my-auto pointer-events-auto">
        {/* Custom Inline SVG Academic Emblem & Title Lockup */}
        <div className="flex items-center gap-3">
          <svg
            viewBox="0 0 48 48"
            className="w-8 h-8 shrink-0"
            aria-hidden="true"
          >
            <path
              d="M8 7h32v17c0 10-7.2 16.2-16 19C15.2 40.2 8 34 8 24V7z"
              fill="#151a22"
              stroke="#d99b43"
              strokeWidth="2"
            />
            <path
              d="M17 17h14M24 14v18M17 28l7-4 7 4"
              stroke="#efece6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="24" cy="14" r="2.2" fill="#d99b43" />
          </svg>
          <div className="text-xs font-mono tracking-wider text-[#d99b43]">
            BLACKWOOD UNIVERSITY · 10 LECTURERS + THE PRINCIPAL
          </div>
        </div>

        <div className="space-y-0.5">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[#efece6] leading-[1.06] [text-wrap:balance]">
            Escape the Crazy Lecturer
          </h1>
          <p className="text-xs sm:text-sm text-[#b8c0c8] leading-relaxed">
            Outrun the professors of each class to graduate.
          </p>
        </div>

        {/* Active Class Hunter Dossier + Collapsible 10 Lecturers + Principal Roster */}
        <section
          aria-label="Class Hunter and Story"
          className="bg-[#0e1116]/94 border border-white/10 rounded-lg p-2.5 sm:p-3 space-y-2"
        >
          <div className="flex items-center justify-between gap-2 text-xs text-[#9aa3ad]">
            <span>Class Hunter &amp; Story</span>
            <div className="flex items-center gap-2">
              <span
                className="font-mono font-semibold"
                style={{ color: activeLecturer.accentColor }}
              >
                {activeLecturer.courseCode} · {activeLecturer.traitBadge}
              </span>
              <button
                type="button"
                data-roster-toggle="true"
                aria-expanded={showRoster}
                onClick={() => setShowRoster((v) => !v)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors cursor-pointer ${
                  showRoster
                    ? 'bg-[#231b10] border-[#d99b43] text-[#efece6]'
                    : 'bg-[#090b0f] border-white/15 text-[#cfd4da] hover:border-white/35'
                }`}
              >
                {showRoster ? 'Hide Roster' : 'Roster (10 + Principal)'}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2 rounded-md bg-[#090b0f]/90 border border-white/10">
            <LecturerPortraitSvg lecturer={activeLecturer} />
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="text-xs sm:text-sm font-semibold text-[#efece6]">
                  {activeLecturer.name}
                </span>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${activeLecturer.accentColor}24`,
                    color: activeLecturer.accentColor,
                  }}
                >
                  {activeLecturer.isPrincipal ? 'FINAL BOSS · PRINCIPAL' : `LVL ${String(activeLecturer.assignedLevelId).padStart(2, '0')} · ${activeLecturer.department}`}
                </span>
              </div>
              <p className="text-[11px] text-[#cfd4da] leading-snug">
                {activeLecturer.storyHook}
              </p>
            </div>
          </div>

          {showRoster && (
            <div
              data-roster-drawer="true"
              className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border-t border-white/10 pt-2"
            >
              {LECTURERS.map((lec) => {
                const unlocked = isLevelUnlocked(lec.assignedLevelId, completedLevels);
                const cleared = completedSet.has(lec.assignedLevelId);
                const selected = lec.assignedLevelId === selectedLevelId;
                return (
                  <button
                    key={lec.id}
                    type="button"
                    disabled={!unlocked}
                    data-roster-lecturer={lec.id}
                    data-roster-locked={String(!unlocked)}
                    onClick={() => {
                      onLevelChange(lec.assignedLevelId);
                      onLecturerChange(lec.id);
                    }}
                    className={`w-full flex items-start gap-2.5 p-2 text-left rounded-md border transition-colors ${
                      !unlocked
                        ? 'bg-[#080a0e] border-white/5 text-[#7a828c] opacity-60 cursor-not-allowed'
                        : selected
                          ? 'bg-[#231b10] border-[#d99b43] text-[#efece6] cursor-pointer'
                          : 'bg-[#090b0f] border-white/10 text-[#cfd4da] hover:border-white/30 cursor-pointer'
                    }`}
                  >
                    <LecturerPortraitSvg lecturer={lec} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">
                          {lec.isPrincipal
                            ? `BOSS 11 · ${lec.shortName}`
                            : `LVL ${String(lec.assignedLevelId).padStart(2, '0')} · ${lec.shortName}`}
                        </span>
                        <span className="text-[10px] font-mono shrink-0">
                          {!unlocked
                            ? `🔒 Clear LVL ${String(lec.assignedLevelId - 1).padStart(2, '0')}`
                            : cleared
                              ? '✓ Cleared'
                              : `${lec.courseCode} · ${lec.department}`}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9aa3ad] leading-snug mt-0.5">
                        {lec.storyHook}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Tutorial + 10 Class Levels + Principal Finale Selector (Sequential Locking) */}
        <div className="bg-[#0e1116]/94 border border-white/10 rounded-lg p-2.5 sm:p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-[#9aa3ad]">
            <span>Select Level (Tutorial + 1–10 + Principal)</span>
            <span className="font-mono text-[#d99b43]">
              {completedSet.size}/{CAMPAIGN_LEVELS.length} Cleared · Pass each class to unlock the next
            </span>
          </div>
          <button
            type="button"
            data-level-select={0}
            data-level-locked="false"
            onClick={() => onLevelChange(0)}
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left rounded-md border transition-colors cursor-pointer ${
              selectedLevelId === 0
                ? 'bg-[#d99b43] text-[#0e1114] border-[#d99b43]'
                : 'bg-[#121920] text-[#efece6] border-[#2dd4bf]/35 hover:border-[#2dd4bf]'
            }`}
          >
            <div className="min-w-0 flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  selectedLevelId === 0
                    ? 'bg-[#0e1114]/15 text-[#0e1114]'
                    : 'bg-[#2dd4bf]/15 text-[#5eead4]'
                }`}
              >
                LVL 00 · TUTORIAL
              </span>
              <span className="text-xs font-semibold truncate">
                Campus Orientation — Practice Controls, Jumping, Stealth &amp; Exit Loop
              </span>
            </div>
            <span
              className={`text-[10px] font-mono shrink-0 ${
                selectedLevelId === 0
                  ? 'text-[#0e1114] font-semibold'
                  : savedRun?.tutorialCompleted
                    ? 'text-[#34d399]'
                    : 'text-[#5eead4]'
              }`}
            >
              {savedRun?.tutorialCompleted ? '✓ Completed' : 'Start Here'}
            </span>
          </button>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
            {CAMPAIGN_LEVELS.map((lvl) => {
              const unlocked = isLevelUnlocked(lvl.id, completedLevels);
              const selected = lvl.id === selectedLevelId;
              const cleared = completedSet.has(lvl.id);
              const lvlLecturer = getLecturerDef(lvl.lecturerId);
              const isPrincipal = Boolean(lvlLecturer.isPrincipal);

              return (
                <button
                  key={lvl.id}
                  type="button"
                  disabled={!unlocked}
                  data-level-select={lvl.id}
                  data-level-locked={String(!unlocked)}
                  aria-label={
                    unlocked
                      ? `${lvl.shortCode} ${lvl.title} — ${lvlLecturer.shortName}`
                      : `${lvl.shortCode} ${lvl.title} — Locked until LVL ${String(lvl.id - 1).padStart(2, '0')} cleared`
                  }
                  onClick={() => onLevelChange(lvl.id)}
                  className={`px-2 py-1.5 text-left rounded-md border transition-colors ${
                    !unlocked
                      ? 'bg-[#080a0e] text-[#6d7580] border-white/5 opacity-55 cursor-not-allowed'
                      : selected
                        ? isPrincipal
                          ? 'bg-[#fbbf24] text-[#0e1114] border-[#fbbf24] cursor-pointer'
                          : 'bg-[#d99b43] text-[#0e1114] border-[#d99b43] cursor-pointer'
                        : isPrincipal
                          ? 'bg-[#1a150b] text-[#fde68a] border-[#fbbf24]/35 hover:border-[#fbbf24] cursor-pointer'
                          : 'bg-[#090b0f] text-[#cfd4da] border-white/10 hover:border-white/30 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-semibold">
                    <span>{lvl.shortCode}</span>
                    {cleared ? (
                      <span className={selected ? 'text-[#0e1114]' : 'text-[#34d399]'}>✓</span>
                    ) : !unlocked ? (
                      <span aria-hidden="true">🔒</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] font-medium truncate mt-0.5">{lvl.title}</div>
                  <div
                    className={`text-[10px] truncate ${
                      selected
                        ? 'text-[#0e1114]/80 font-medium'
                        : unlocked
                          ? 'text-[#9aa3ad]'
                          : 'text-[#5b626c]'
                    }`}
                  >
                    {lvlLecturer.shortName}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-[#b8c0c8] leading-snug">
            <span className="text-[#efece6] font-medium">{activeLevel.subtitle}:</span>{' '}
            {activeLevel.crazyTwist}{' '}
            <span className="text-[#d99b43] font-mono">
              [Cast: {activeLevel.npcs.map((n) => (n.name.startsWith('Mr.') ? n.name : n.name.split(' ')[0])).join(', ')}]
            </span>
          </div>
        </div>

        {/* Playable Student Avatar Picker + Customization */}
        <div className="bg-[#0e1116]/92 border border-white/10 rounded-lg p-2.5 sm:p-3 space-y-2.5">
          <div>
            <div className="flex items-center justify-between text-xs text-[#9aa3ad] mb-1.5">
              <span>Playable Student Avatar</span>
              <span className="font-mono text-[#d99b43]">
                {activeAvatar.roleLabel} · Rank {profile.rank}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {PLAYABLE_AVATARS.map((av) => {
                const selected = profile.avatarId === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() =>
                      onProfileChange({
                        avatarId: av.id,
                        name: av.defaultName,
                        jacketColor: av.hoodieColor,
                        rank: av.startingRank,
                      })
                    }
                    className={`py-1.5 px-2 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap truncate ${
                      selected
                        ? 'bg-[#d99b43] text-[#0e1114] border-[#d99b43]'
                        : 'bg-[#090b0f] text-[#cfd4da] border-white/10 hover:border-white/25'
                    }`}
                  >
                    {av.defaultName.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="student-name-input"
                className="block text-xs text-[#9aa3ad] mb-1"
              >
                Student Name
              </label>
              <input
                id="student-name-input"
                type="text"
                maxLength={26}
                value={profile.name}
                onChange={(e) =>
                  onProfileChange({ ...profile, name: e.target.value })
                }
                className="w-full px-3 py-1.5 text-sm bg-[#090b0f] border border-white/15 rounded-md text-[#efece6] focus:outline-none focus:border-[#d99b43]"
              />
            </div>

            <div>
              <span className="block text-xs text-[#9aa3ad] mb-1">
                Campus Hoodie
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                {JACKET_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.color}
                    type="button"
                    aria-label={swatch.label}
                    onClick={() =>
                      onProfileChange({ ...profile, jacketColor: swatch.color })
                    }
                    className={`w-7 h-7 rounded-md border transition-transform cursor-pointer ${
                      profile.jacketColor === swatch.color
                        ? 'border-[#efece6] scale-110'
                        : 'border-white/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch.color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
            <div>
              <span className="block text-xs text-[#9aa3ad] mb-1">
                AI Difficulty
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['relaxed', 'standard', 'honors'] as DifficultyLevel[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onDifficultyChange(d)}
                    className={`py-1.5 px-2 text-xs font-medium rounded-md border capitalize transition-colors cursor-pointer whitespace-nowrap ${
                      difficulty === d
                        ? 'bg-[#d99b43] text-[#0e1114] border-[#d99b43]'
                        : 'bg-[#090b0f] text-[#cfd4da] border-white/10 hover:border-white/25'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs text-[#9aa3ad] mb-1">
                Test Avatar Playfulness
              </span>
              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: 'wave', label: 'Wave' },
                    { id: 'boogie', label: 'Dance' },
                    { id: 'spin', label: 'Spin' },
                    { id: 'throw_plane', label: 'Plane' },
                  ] as const
                ).map((em) => (
                  <button
                    key={em.id}
                    type="button"
                    onClick={() => onPreviewEmote(em.id)}
                    className="py-1.5 px-1 text-[11px] font-medium rounded-md border border-white/15 bg-[#151a22] text-[#efece6] hover:border-[#d99b43] hover:text-[#d99b43] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {em.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Phone & Laptop Controls Section */}
        {showControls && (
          <section
            aria-label="Phone and Laptop Controls"
            className="bg-[#0e1116]/94 border border-white/10 rounded-lg p-3 space-y-2.5"
          >
            <div className="flex items-center justify-between text-xs text-[#9aa3ad]">
              <span>Phone &amp; Laptop Controls</span>
              <span className="font-mono text-[#d99b43]">Touch · Trackpad · Keyboard</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
              {[
                { key: 'Phone Thumbstick', action: '360° Move + Rim Sprint' },
                { key: 'Drag Right Screen', action: 'Phone Camera Look' },
                { key: 'Trackpad / J·L·I·K', action: '2-Finger or Key Look' },
                { key: 'WASD / Arrows', action: 'Laptop Move & Steer' },
                { key: 'Shift / Sprint', action: 'Sprint (5.65 m/s)' },
                { key: 'Space / R', action: 'Jump Desks · Roll' },
                { key: 'C · Q · E', action: 'Crouch · Plane · Use' },
                { key: 'F · V', action: 'Flashlight · 1P/3P' },
              ].map((item) => (
                <div
                  key={item.key}
                  className="px-2 py-1.5 rounded bg-[#090b0f] border border-white/10 leading-tight"
                >
                  <div className="font-mono text-[10px] font-semibold text-[#d99b43]">
                    {item.key}
                  </div>
                  <div className="text-[#cfd4da] truncate mt-0.5">{item.action}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 border-t border-white/10 text-[11px]">
              <label className="space-y-1">
                <div className="flex justify-between text-[#cfd4da]">
                  <span>Phone Touch Look</span>
                  <span className="font-mono text-[#d99b43] tabular-nums">
                    {controlSettings.touchSensitivity.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
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

              <label className="space-y-1">
                <div className="flex justify-between text-[#cfd4da]">
                  <span>Laptop Look Speed</span>
                  <span className="font-mono text-[#d99b43] tabular-nums">
                    {controlSettings.lookSensitivity.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
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

              <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-[#090b0f] border border-white/10 text-[#cfd4da] cursor-pointer">
                <span>Phone Rim Sprint</span>
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

              <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-[#090b0f] border border-white/10 text-[#cfd4da] cursor-pointer">
                <span>Laptop Shift Toggle</span>
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
            </div>
          </section>
        )}

        {/* Menu Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartGame();
            }}
            className="px-5 py-2.5 text-sm font-semibold rounded-md bg-[#d99b43] text-[#0e1114] hover:bg-[#e7ac58] transition-colors cursor-pointer whitespace-nowrap"
          >
            Enter {activeLevel.shortCode}: {activeLevel.title}
          </button>

          <button
            type="button"
            aria-expanded={showControls}
            onClick={() => setShowControls((v) => !v)}
            className={`px-3.5 py-2.5 text-sm font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
              showControls
                ? 'border-[#d99b43] bg-[#231b10] text-[#efece6]'
                : 'border-white/15 bg-[#0e1116]/90 text-[#cfd4da] hover:border-white/35 hover:text-[#efece6]'
            }`}
          >
            {showControls ? 'Hide Controls' : 'Controls'}
          </button>

          <button
            type="button"
            onClick={() => downloadPrdPdf('the-final-lecture-prd.pdf')}
            className="px-3.5 py-2.5 text-sm font-medium rounded-md border border-white/15 bg-[#0e1116]/90 text-[#cfd4da] hover:border-white/35 hover:text-[#efece6] transition-colors cursor-pointer whitespace-nowrap"
          >
            Export PRD PDF
          </button>
        </div>

        {savedRun?.bestTimesByLevel?.[selectedLevelId] !== undefined && (
          <div className="text-xs font-mono text-[#9aa3ad] tabular-nums">
            Best {activeLevel.shortCode} Clear: {Math.round(savedRun.bestTimesByLevel[selectedLevelId])}s
          </div>
        )}
      </div>

      {/* Single flat borderless control hint line */}
      <div className="text-[11px] sm:text-xs font-mono text-[#9aa3ad] tracking-wide pointer-events-auto pt-2">
        Laptop: WASD · Trackpad 2-Finger / Drag / J·L Look · Shift Sprint · Space Jump · R Roll · E Use | Phone: Thumbstick + Drag Look
      </div>
    </div>
  );
}

