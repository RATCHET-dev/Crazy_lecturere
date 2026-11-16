import { LecturerId, SaveGamePayload } from './types';

const SAVE_STORAGE_KEY = 'blackwood_escape_save_v1';

const VALID_LECTURER_IDS = new Set<LecturerId>([
  'maduka',
  'misa',
  'balogun',
  'nwankwo',
  'babatunde',
  'osei',
  'danjuma',
  'adeyemi',
  'coker',
  'musa',
  'principal',
]);

export function isValidLecturerId(id: unknown): id is LecturerId {
  return typeof id === 'string' && VALID_LECTURER_IDS.has(id as LecturerId);
}

export function isLevelUnlocked(levelId: number, completedLevels: number[]): boolean {
  if (levelId <= 1) return true;
  const completed = new Set(completedLevels);
  for (let prev = 1; prev < levelId; prev++) {
    if (!completed.has(prev)) return false;
  }
  return true;
}

export function getHighestUnlockedLevel(completedLevels: number[], totalLevels: number): number {
  let highest = 1;
  for (let id = 2; id <= totalLevels; id++) {
    if (isLevelUnlocked(id, completedLevels)) {
      highest = id;
    } else {
      break;
    }
  }
  return highest;
}

export function createDefaultSave(): SaveGamePayload {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    profile: {
      avatarId: 'tunde',
      name: 'Tunde Adeyemi',
      jacketColor: '#2a7f86',
      rank: 'C',
    },
    difficulty: 'standard',
    lecturerId: 'maduka',
    chapterReached: 1,
    bestChapter1TimeSec: null,
    evidenceCollected: 0,
    completedLevels: [],
    bestTimesByLevel: {},
    tutorialCompleted: false,
  };
}

export function saveGameProgress(payload: SaveGamePayload, storage?: Storage): void {
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!target) return;
  try {
    target.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota restrictions
  }
}

export function loadGameProgress(storage?: Storage): SaveGamePayload | null {
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!target) return null;
  try {
    const raw = target.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SaveGamePayload>;
    if (parsed.version !== 1 || !parsed.profile) return null;
    return {
      version: 1,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
      profile: {
        avatarId: parsed.profile.avatarId ?? 'tunde',
        name: typeof parsed.profile.name === 'string' && parsed.profile.name.trim()
          ? parsed.profile.name.slice(0, 28)
          : 'Tunde Adeyemi',
        jacketColor: typeof parsed.profile.jacketColor === 'string'
          ? parsed.profile.jacketColor
          : '#2a7f86',
        rank: parsed.profile.rank ?? 'C',
      },
      difficulty: parsed.difficulty ?? 'standard',
      lecturerId: isValidLecturerId(parsed.lecturerId) ? parsed.lecturerId : 'maduka',
      chapterReached: typeof parsed.chapterReached === 'number' ? parsed.chapterReached : 1,
      bestChapter1TimeSec: typeof parsed.bestChapter1TimeSec === 'number' ? parsed.bestChapter1TimeSec : null,
      evidenceCollected: typeof parsed.evidenceCollected === 'number' ? parsed.evidenceCollected : 0,
      completedLevels: Array.isArray(parsed.completedLevels)
        ? parsed.completedLevels.filter((n): n is number => typeof n === 'number')
        : [],
      bestTimesByLevel:
        parsed.bestTimesByLevel && typeof parsed.bestTimesByLevel === 'object'
          ? parsed.bestTimesByLevel
          : {},
      tutorialCompleted: Boolean(parsed.tutorialCompleted),
    };
  } catch {
    return null;
  }
}
