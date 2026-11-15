import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DifficultyLevel,
  GameHudSnapshot,
  GamePhase,
  LecturerId,
  ProtagonistProfile,
  SaveGamePayload,
} from './game/types';
import {
  createDefaultSave,
  getHighestUnlockedLevel,
  isLevelUnlocked,
  isValidLecturerId,
  loadGameProgress,
  saveGameProgress,
} from './game/saveSystem';
import { CAMPAIGN_LEVELS, getLevelDef } from './game/levels';
import { getLecturerDef } from './game/lecturers';
import {
  ControlSettings,
  loadControlSettings,
  saveControlSettings,
} from './game/controls';
import { GameEngineCanvas, GameEngineHandle } from './game/GameEngineCanvas';
import { TitleScreen } from './components/TitleScreen';
import { GameHud } from './components/GameHud';
import { GameModals } from './components/GameModals';

function buildInitialHudForLevel(
  levelId: number,
  rank: ProtagonistProfile['rank'] = 'C',
  lecturerId?: LecturerId,
): GameHudSnapshot {
  const lvl = getLevelDef(levelId);
  const lecturer = getLecturerDef(lecturerId ?? lvl.lecturerId);
  return {
    levelId: lvl.id,
    totalLevels: CAMPAIGN_LEVELS.length,
    levelTitle: lvl.title,
    crazyTwist: lvl.crazyTwist,
    chapterTitle: `${lvl.shortCode} · ${lvl.title}`,
    objectiveText: lvl.startsInLockdown
      ? `Find the 30A Ceramic Fuse · ${lvl.crazyTwist}`
      : `Collect your ${lecturer.courseCode} Assignment from ${lecturer.shortName}'s Office (North-East)`,
    stamina: 100,
    battery: 100,
    flashlightOn: true,
    crouching: false,
    sprinting: false,
    hiddenInLockerId: null,
    nearPrompt: null,
    nearInteractableId: null,
    inventory: [],
    powerRestored: false,
    lockdownTriggered: lvl.startsInLockdown,
    lecturerId: lecturer.id,
    lecturerName: lecturer.name,
    madukaState: 'PATROL',
    madukaDistance: 14,
    suspicionLevel: 0,
    dialogueSpeaker: null,
    dialogueText: null,
    elapsedSeconds: 0,
    alertsTriggered: 0,
    evidenceCollected: 0,
    npcsTalkedCount: 0,
    npcsTotalCount: lvl.npcs.length,
    rank,
    cameraMode: '3p',
    expression: 'neutral',
    activeEmote: null,
    planeReady: true,
    rolling: false,
    grounded: true,
    surface: 'carpet',
    endingKind: null,
  };
}

export default function App() {
  const [savedRun, setSavedRun] = useState<SaveGamePayload | null>(() => loadGameProgress());
  const [profile, setProfile] = useState<ProtagonistProfile>(
    () => savedRun?.profile ?? createDefaultSave().profile,
  );
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    () => savedRun?.difficulty ?? 'standard',
  );
  const [selectedLevelId, setSelectedLevelId] = useState<number>(() => {
    const completed = savedRun?.completedLevels ?? [];
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const lvlParam = Number(params.get('level'));
      if (
        lvlParam >= 1 &&
        lvlParam <= CAMPAIGN_LEVELS.length &&
        isLevelUnlocked(lvlParam, completed)
      ) {
        return lvlParam;
      }
    }
    return getHighestUnlockedLevel(completed, CAMPAIGN_LEVELS.length);
  });
  const [selectedLecturerId, setSelectedLecturerId] = useState<LecturerId>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const lecParam = params.get('lecturer');
      if (isValidLecturerId(lecParam)) return lecParam;
    }
    const completed = savedRun?.completedLevels ?? [];
    const initialLvl = getHighestUnlockedLevel(completed, CAMPAIGN_LEVELS.length);
    return getLevelDef(initialLvl).lecturerId;
  });
  const [phase, setPhase] = useState<GamePhase>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'playing';
    }
    return 'title';
  });
  const [runNonce, setRunNonce] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 1;
    }
    return 0;
  });
  const [hud, setHud] = useState<GameHudSnapshot>(() =>
    buildInitialHudForLevel(selectedLevelId, profile.rank, selectedLecturerId),
  );
  const [controlSettings, setControlSettings] = useState<ControlSettings>(() =>
    loadControlSettings(),
  );
  const [muted, setMuted] = useState(false);

  const handleControlSettingsChange = useCallback((next: ControlSettings) => {
    setControlSettings(next);
    saveControlSettings(next);
  }, []);

  const engineHandleRef = useRef<GameEngineHandle | null>(null);

  // Sync document.body.dataset.state per Game Shell contract
  useEffect(() => {
    const domState = phase === 'victory' ? 'gameover' : phase;
    document.body.dataset.state = domState;
  }, [phase]);

  const persistProgress = useCallback(
    (
      nextProfile: ProtagonistProfile,
      nextDiff: DifficultyLevel,
      nextLecturer: LecturerId,
      victorySnapshot?: GameHudSnapshot,
    ) => {
      const prev = loadGameProgress() ?? createDefaultSave();
      const updatedBestCh1 =
        victorySnapshot &&
        victorySnapshot.levelId === 1 &&
        (prev.bestChapter1TimeSec === null ||
          victorySnapshot.elapsedSeconds < prev.bestChapter1TimeSec)
          ? victorySnapshot.elapsedSeconds
          : prev.bestChapter1TimeSec;

      const completedSet = new Set(prev.completedLevels ?? []);
      const bestTimes = { ...(prev.bestTimesByLevel ?? {}) };
      if (victorySnapshot) {
        completedSet.add(victorySnapshot.levelId);
        const existingBest = bestTimes[victorySnapshot.levelId];
        if (existingBest === undefined || victorySnapshot.elapsedSeconds < existingBest) {
          bestTimes[victorySnapshot.levelId] = victorySnapshot.elapsedSeconds;
        }
      }

      const nextSave: SaveGamePayload = {
        version: 1,
        savedAt: new Date().toISOString(),
        profile: nextProfile,
        difficulty: nextDiff,
        lecturerId: nextLecturer,
        chapterReached: victorySnapshot
          ? Math.max(prev.chapterReached, Math.min(CAMPAIGN_LEVELS.length, victorySnapshot.levelId + 1))
          : prev.chapterReached,
        bestChapter1TimeSec: updatedBestCh1,
        evidenceCollected: Math.max(
          prev.evidenceCollected,
          victorySnapshot?.evidenceCollected ?? 0,
        ),
        completedLevels: Array.from(completedSet).sort((a, b) => a - b),
        bestTimesByLevel: bestTimes,
      };
      saveGameProgress(nextSave);
      setSavedRun(nextSave);
    },
    [],
  );

  const handleSelectLevel = useCallback(
    (levelId: number) => {
      const completed = savedRun?.completedLevels ?? [];
      if (!isLevelUnlocked(levelId, completed)) return;
      const lvlDef = getLevelDef(levelId);
      setSelectedLevelId(lvlDef.id);
      setSelectedLecturerId(lvlDef.lecturerId);
    },
    [savedRun],
  );

  const handleStartGame = useCallback(() => {
    const completed = savedRun?.completedLevels ?? [];
    const safeLevelId = isLevelUnlocked(selectedLevelId, completed)
      ? selectedLevelId
      : getHighestUnlockedLevel(completed, CAMPAIGN_LEVELS.length);
    const activeLecturer = getLevelDef(safeLevelId).lecturerId;
    const effectiveLecturer = selectedLecturerId || activeLecturer;
    persistProgress(profile, difficulty, effectiveLecturer);
    setSelectedLevelId(safeLevelId);
    setRunNonce((n) => n + 1);
    setHud(buildInitialHudForLevel(safeLevelId, profile.rank, effectiveLecturer));
    setPhase('playing');
  }, [profile, difficulty, selectedLecturerId, selectedLevelId, savedRun, persistProgress]);

  const handleRestart = useCallback(() => {
    setRunNonce((n) => n + 1);
    setHud(buildInitialHudForLevel(selectedLevelId, profile.rank, selectedLecturerId));
    setPhase('playing');
  }, [selectedLevelId, profile.rank, selectedLecturerId]);

  const handleNextLevel = useCallback(() => {
    const completed = savedRun?.completedLevels ?? [];
    const nextLvl = Math.min(CAMPAIGN_LEVELS.length, selectedLevelId + 1);
    if (!isLevelUnlocked(nextLvl, completed)) return;
    const nextLecturer = getLevelDef(nextLvl).lecturerId;
    setSelectedLevelId(nextLvl);
    setSelectedLecturerId(nextLecturer);
    setRunNonce((n) => n + 1);
    setHud(buildInitialHudForLevel(nextLvl, profile.rank, nextLecturer));
    setPhase('playing');
  }, [selectedLevelId, savedRun, profile.rank]);

  const handlePhaseChange = useCallback(
    (nextPhase: GamePhase, snapshot: GameHudSnapshot) => {
      setHud(snapshot);
      setPhase(nextPhase);
      if (nextPhase === 'victory') {
        persistProgress(profile, difficulty, selectedLecturerId, snapshot);
      }
    },
    [profile, difficulty, selectedLecturerId, persistProgress],
  );

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      engineHandleRef.current?.setMuted(next);
      return next;
    });
  }, []);

  // Global Pause (Esc / P) & Mute (M) listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.code === 'KeyM' && !e.repeat) {
        handleToggleMute();
      } else if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
        setPhase((cur) => {
          if (cur === 'playing') {
            document.exitPointerLock?.();
            return 'paused';
          }
          if (cur === 'paused') return 'playing';
          return cur;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleToggleMute]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0a0d12] text-[#efece6]">
      <GameEngineCanvas
        gamePhase={phase}
        difficulty={difficulty}
        profile={profile}
        levelId={selectedLevelId}
        lecturerId={selectedLecturerId}
        runNonce={runNonce}
        controlSettings={controlSettings}
        onHudUpdate={setHud}
        onPhaseChange={handlePhaseChange}
        engineHandleRef={engineHandleRef}
      />

      {phase === 'title' && (
        <TitleScreen
          profile={profile}
          difficulty={difficulty}
          selectedLevelId={selectedLevelId}
          selectedLecturerId={selectedLecturerId}
          savedRun={savedRun}
          controlSettings={controlSettings}
          onControlSettingsChange={handleControlSettingsChange}
          onProfileChange={setProfile}
          onDifficultyChange={setDifficulty}
          onLevelChange={handleSelectLevel}
          onLecturerChange={setSelectedLecturerId}
          onPreviewEmote={(em) => engineHandleRef.current?.triggerEmote(em)}
          onStartGame={handleStartGame}
        />
      )}

      {phase === 'playing' && (
        <GameHud
          hud={hud}
          profile={profile}
          muted={muted}
          controlSettings={controlSettings}
          onControlSettingsChange={handleControlSettingsChange}
          onToggleMute={handleToggleMute}
          onPause={() => {
            document.exitPointerLock?.();
            setPhase('paused');
          }}
          onToggleCamera={() => engineHandleRef.current?.toggleCameraMode()}
          onTriggerEmote={(em) => engineHandleRef.current?.triggerEmote(em)}
          onInteract={() => engineHandleRef.current?.triggerInteract()}
          onToggleCrouch={() => engineHandleRef.current?.toggleCrouch()}
          onToggleSprint={() => engineHandleRef.current?.toggleSprint()}
          onToggleFlashlight={() => engineHandleRef.current?.toggleFlashlight()}
          onMobileMove={(mx, my) => engineHandleRef.current?.setMobileMove(mx, my)}
          onMobileLook={(dx, dy) => engineHandleRef.current?.applyMobileLook(dx, dy)}
          onMobileSprint={(sprinting) => engineHandleRef.current?.setMobileSprint(sprinting)}
          onJump={() => engineHandleRef.current?.triggerJump()}
          onRoll={() => engineHandleRef.current?.triggerRoll()}
        />
      )}

      <GameModals
        phase={phase}
        hud={hud}
        onResume={() => setPhase('playing')}
        onRestart={handleRestart}
        onNextLevel={handleNextLevel}
        onMainMenu={() => {
          document.exitPointerLock?.();
          setPhase('title');
        }}
      />
    </main>
  );
}

