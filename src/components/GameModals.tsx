import { getLevelDef } from '../game/levels';
import { getLecturerDef } from '../game/lecturers';
import { GameHudSnapshot, GamePhase } from '../game/types';

interface GameModalsProps {
  phase: GamePhase;
  hud: GameHudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onNextLevel: () => void;
  onMainMenu: () => void;
}

export function GameModals({
  phase,
  hud,
  onResume,
  onRestart,
  onNextLevel,
  onMainMenu,
}: GameModalsProps) {
  if (phase !== 'paused' && phase !== 'victory' && phase !== 'gameover') {
    return null;
  }

  const isVictory = phase === 'victory';
  const isCaught = phase === 'gameover';
  const levelDef = getLevelDef(hud.levelId);
  const lecturerDef = getLecturerDef(hud.lecturerId);
  const hasNextLevel = hud.levelId < hud.totalLevels;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#07090d]/85">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md bg-[#11151b] border border-white/15 rounded-lg p-6 sm:p-8 space-y-6"
      >
        <div className="space-y-2">
          <div className="text-xs font-mono text-[#d99b43]">
            {isVictory
              ? `${levelDef.shortCode} OF ${hud.totalLevels} COMPLETE · ${levelDef.gimmickTag}`
              : isCaught
                ? `${levelDef.shortCode} · ${lecturerDef.courseCode} DETENTION`
                : `${levelDef.shortCode} · GAME PAUSED`}
          </div>
          <h2 className="font-serif text-3xl font-semibold text-[#efece6]">
            {isVictory
              ? levelDef.victoryTitle
              : isCaught
                ? `Caught by ${lecturerDef.shortName}`
                : 'Class Suspended'}
          </h2>
          <p className="text-sm text-[#b8c0c8] leading-relaxed">
            {isVictory
              ? levelDef.victorySummary
              : isCaught
                ? `“${lecturerDef.lines.caught}”`
                : `Tip: ${levelDef.crazyTwist} (Hunter: ${lecturerDef.name})`}
          </p>
        </div>

        {/* Run Metrics (tabular-nums) */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0a0d12] border border-white/10 rounded p-3">
            <div className="text-[11px] font-mono text-[#89929c]">TIME</div>
            <div className="font-mono text-lg font-medium text-[#efece6] tabular-nums mt-0.5">
              {hud.elapsedSeconds}s
            </div>
          </div>
          <div className="bg-[#0a0d12] border border-white/10 rounded p-3">
            <div className="text-[11px] font-mono text-[#89929c]">ALERTS</div>
            <div className="font-mono text-lg font-medium text-[#d99b43] tabular-nums mt-0.5">
              {hud.alertsTriggered}
            </div>
          </div>
          <div className="bg-[#0a0d12] border border-white/10 rounded p-3">
            <div className="text-[11px] font-mono text-[#89929c]">ALLIES</div>
            <div className="font-mono text-lg font-medium text-[#efece6] tabular-nums mt-0.5">
              {hud.npcsTalkedCount}/{hud.npcsTotalCount}
            </div>
          </div>
        </div>

        {phase === 'paused' && (
          <section
            aria-label="Controls Reference"
            className="bg-[#0a0d12] border border-white/10 rounded p-3 space-y-2"
          >
            <div className="text-[11px] font-mono text-[#d99b43]">CONTROLS &amp; ABILITIES</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#cfd4da]">
              <div>
                <span className="font-mono text-[#efece6]">Shift / Btn</span> — Sprint
              </div>
              <div>
                <span className="font-mono text-[#efece6]">Space</span> — Jump / Vault
              </div>
              <div>
                <span className="font-mono text-[#efece6]">R</span> — Dodge Roll
              </div>
              <div>
                <span className="font-mono text-[#efece6]">C</span> — Crouch Stealth
              </div>
              <div>
                <span className="font-mono text-[#efece6]">Q</span> — Paper Plane
              </div>
              <div>
                <span className="font-mono text-[#efece6]">E · F · V</span> — Use · Light · Cam
              </div>
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {phase === 'paused' ? (
            <button
              type="button"
              onClick={onResume}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-md bg-[#d99b43] text-[#0e1114] hover:bg-[#e5aa54] transition-colors cursor-pointer whitespace-nowrap"
            >
              Resume Class
            </button>
          ) : isVictory && hasNextLevel ? (
            <button
              type="button"
              data-start="true"
              onClick={onNextLevel}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-md bg-[#d99b43] text-[#0e1114] hover:bg-[#e5aa54] transition-colors cursor-pointer whitespace-nowrap"
            >
              Next: Level {hud.levelId + 1}
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-md bg-[#d99b43] text-[#0e1114] hover:bg-[#e5aa54] transition-colors cursor-pointer whitespace-nowrap"
            >
              {isVictory ? 'Replay Finale' : 'Try Again'}
            </button>
          )}

          {(phase === 'paused' || (isVictory && hasNextLevel)) && (
            <button
              type="button"
              onClick={onRestart}
              className="px-4 py-2.5 text-sm font-medium rounded-md border border-white/15 text-[#efece6] hover:border-white/35 transition-colors cursor-pointer whitespace-nowrap"
            >
              Restart
            </button>
          )}

          <button
            type="button"
            onClick={onMainMenu}
            className="px-4 py-2.5 text-sm font-medium rounded-md border border-white/15 text-[#cfd4da] hover:border-white/35 hover:text-[#efece6] transition-colors cursor-pointer whitespace-nowrap"
          >
            Title Menu
          </button>
        </div>
      </div>
    </div>
  );
}

