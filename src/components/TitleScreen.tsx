import { useEffect, useState } from 'react';
import {
  AvatarEmoteId,
  PLAYABLE_AVATARS,
  getAvatarDef,
} from '../game/avatarSystem';
import { CAMPAIGN_LEVELS, getLevelDef } from '../game/levels';
import { LECTURERS, getLecturerDef } from '../game/lecturers';
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

export function TitleScreen({
  profile,
  difficulty,
  selectedLevelId,
  selectedLecturerId,
  savedRun,
  onProfileChange,
  onDifficultyChange,
  onLevelChange,
  onLecturerChange,
  onPreviewEmote,
  onStartGame,
}: TitleScreenProps) {
  const [showControls, setShowControls] = useState(false);
  const activeAvatar = getAvatarDef(profile.avatarId);
  const activeLevel = getLevelDef(selectedLevelId);
  const activeLecturer = getLecturerDef(selectedLecturerId);
  const completedSet = new Set(savedRun?.completedLevels ?? []);

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
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6 lg:p-8 overflow-y-auto bg-gradient-to-r from-[#0a0d12]/95 via-[#0a0d12]/72 to-[#0a0d12]/15">
      <div className="max-w-xl space-y-2.5 sm:space-y-3 my-auto pointer-events-auto">
        {/* Custom Inline SVG Academic Emblem & Title Lockup */}
        <div className="flex items-center gap-3.5">
          <svg
            viewBox="0 0 48 48"
            className="w-9 h-9 shrink-0"
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
            BLACKWOOD UNIVERSITY · 10 CRAZY LEVELS
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[#efece6] leading-[1.06] [text-wrap:balance]">
            Escape the Crazy Lecturer
          </h1>
          <p className="text-xs sm:text-sm text-[#b8c0c8] leading-relaxed">
            Outrun {activeLecturer.shortName} ({activeLecturer.department}) across 10 wild campus
            wings with Daniel, Amara, Nneka, Mr. Bako &amp; Victor.
          </p>
        </div>

        {/* Choose Lecturer (Antagonist) Section */}
        <section
          aria-label="Choose Lecturer"
          className="bg-[#0e1116]/94 border border-white/10 rounded-lg p-3 sm:p-3.5 space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-[#9aa3ad]">
            <span>Choose Lecturer (Hunter)</span>
            <span
              className="font-mono font-semibold"
              style={{ color: activeLecturer.accentColor }}
            >
              {activeLecturer.courseCode} · {activeLecturer.traitBadge}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LECTURERS.map((lec) => {
              const selected = lec.id === selectedLecturerId;
              const isMisa = lec.id === 'misa';
              return (
                <button
                  key={lec.id}
                  type="button"
                  data-lecturer-select={lec.id}
                  onClick={() => onLecturerChange(lec.id)}
                  className={`p-2.5 text-left rounded-md border transition-colors cursor-pointer ${
                    selected
                      ? isMisa
                        ? 'bg-[#2a0c14] border-[#ef4444] text-[#efece6]'
                        : 'bg-[#231b10] border-[#d99b43] text-[#efece6]'
                      : 'bg-[#090b0f] border-white/10 text-[#cfd4da] hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-5 h-5 shrink-0"
                        aria-hidden="true"
                      >
                        <rect
                          x="4"
                          y="4"
                          width="16"
                          height="16"
                          rx="3"
                          fill={isMisa ? '#351022' : '#26272c'}
                          stroke={lec.accentColor}
                          strokeWidth="1.5"
                        />
                        {isMisa && (
                          <circle cx="12" cy="3.5" r="2.5" fill="#140f17" />
                        )}
                        <rect
                          x="7.2"
                          y="10"
                          width="3.2"
                          height="2.2"
                          rx="0.5"
                          fill={isMisa ? '#ff1e2d' : '#ffffff'}
                        />
                        <rect
                          x="13.6"
                          y="10"
                          width="3.2"
                          height="2.2"
                          rx="0.5"
                          fill={isMisa ? '#ff1e2d' : '#ffffff'}
                        />
                        <path
                          d={isMisa ? 'M8 15.5q4 1.5 8-0.5' : 'M9 15.5h6'}
                          stroke={isMisa ? '#b91c1c' : '#d99b43'}
                          strokeWidth="1.4"
                          fill="none"
                        />
                      </svg>
                      <span className="text-xs font-semibold truncate">{lec.shortName}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        isMisa
                          ? 'bg-[#ef4444]/20 text-[#fca5a5]'
                          : 'bg-[#d99b43]/20 text-[#fcd34d]'
                      }`}
                    >
                      {lec.department}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#b8c0c8] mt-1 leading-snug">
                    {lec.description}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 10 Crazy Levels Selector */}
        <div className="bg-[#0e1116]/94 border border-white/10 rounded-lg p-3 sm:p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-[#9aa3ad]">
            <span>Select Level (1–10)</span>
            <span className="font-mono text-[#d99b43]">
              {activeLevel.gimmickTag} · {completedSet.size}/10 Cleared
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {CAMPAIGN_LEVELS.map((lvl) => {
              const selected = lvl.id === selectedLevelId;
              const cleared = completedSet.has(lvl.id);
              return (
                <button
                  key={lvl.id}
                  type="button"
                  data-level-select={lvl.id}
                  onClick={() => onLevelChange(lvl.id)}
                  className={`px-2 py-1.5 text-left rounded-md border transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#d99b43] text-[#0e1114] border-[#d99b43]'
                      : 'bg-[#090b0f] text-[#cfd4da] border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-semibold">
                    <span>{lvl.shortCode}</span>
                    {cleared && (
                      <span className={selected ? 'text-[#0e1114]' : 'text-[#34d399]'}>✓</span>
                    )}
                  </div>
                  <div className="text-[11px] font-medium truncate mt-0.5">{lvl.title}</div>
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-[#b8c0c8] leading-snug pt-0.5">
            <span className="text-[#efece6] font-medium">
              {selectedLevelId === 1 && selectedLecturerId === 'misa'
                ? '17 Minutes Late to SOC-204:'
                : `${activeLevel.subtitle}:`}
            </span>{' '}
            {selectedLevelId === 1 && selectedLecturerId === 'misa'
              ? 'Collect Mrs. Misa’s sociology folder to trigger lockdown—Daniel & Amara have campus tips!'
              : activeLevel.crazyTwist}{' '}
            <span className="text-[#d99b43] font-mono">
              [Cast: {activeLevel.npcs.map((n) => (n.name.startsWith('Mr.') ? n.name : n.name.split(' ')[0])).join(', ')}]
            </span>
          </div>
        </div>

        {/* Playable Student Avatar Picker + Customization */}
        <div className="bg-[#0e1116]/92 border border-white/10 rounded-lg p-3 sm:p-3.5 space-y-3">
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

        {/* Collapsible Controls & Field Abilities Section */}
        {showControls && (
          <section
            aria-label="Controls and Field Abilities"
            className="bg-[#0e1116]/94 border border-white/10 rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-[#9aa3ad]">
              <span>Controls &amp; Field Abilities</span>
              <span className="font-mono text-[#d99b43]">Desktop &amp; Mobile Touch</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
              {[
                { key: 'Shift / Sprint', action: 'Sprint (5.65 m/s)' },
                { key: 'WASD / Arrows', action: 'Move & Steer' },
                { key: 'Space', action: 'Jump / Vault Desks' },
                { key: 'R', action: 'Tactical Roll' },
                { key: 'C / Ctrl', action: 'Crouch Stealth' },
                { key: 'Q', action: 'Paper Plane Decoy' },
                { key: 'E / Use', action: 'Talk, Fuse & Lockers' },
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
        WASD Move · Shift Sprint · Space Jump · R Roll · Q Plane · 1-3 Emotes · G Taunt · V Camera · F Light · E Talk/Use
      </div>
    </div>
  );
}

