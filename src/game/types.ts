import type { AvatarEmoteId, AvatarExpression, AvatarId } from './avatarSystem';
import type { SurfaceMaterial } from './physics';

export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';
export type DifficultyLevel = 'relaxed' | 'standard' | 'honors';
export type StudentRank = 'S' | 'A' | 'B' | 'C';
export type LecturerId =
  | 'maduka'
  | 'misa'
  | 'balogun'
  | 'nwankwo'
  | 'babatunde'
  | 'osei'
  | 'danjuma'
  | 'adeyemi'
  | 'coker'
  | 'musa'
  | 'principal';

export type MadukaAiState =
  | 'PATROL'
  | 'SUSPICIOUS'
  | 'INVESTIGATE'
  | 'CHASE'
  | 'SEARCH'
  | 'RETURN_TO_PATROL';

export type ItemId =
  | 'assignment_note'
  | 'breaker_fuse'
  | 'rear_exit_key'
  | 'merit_dossier'
  | 'battery_pack';

export interface InventoryItem {
  id: ItemId;
  name: string;
  description: string;
}

export interface AabbBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  kind: 'wall' | 'desk' | 'pillar' | 'door_locked' | 'locker';
}

export interface InteractableDef {
  id: string;
  kind: 'pickup' | 'breaker' | 'locker' | 'exit_door' | 'office_desk' | 'npc_note';
  label: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  itemId?: ItemId;
}

export type NpcId = 'daniel' | 'amara' | 'victor' | 'nneka' | 'bako';

export interface CarpetZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  color?: number;
}

export interface HazardBeamDef {
  id: string;
  baseX: number;
  baseZ: number;
  length: number;
  orientation: 'x' | 'z'; // 'x' = beam spans along X, sweeps along Z; 'z' = spans along Z, sweeps along X
  sweepAmplitude: number;
  sweepSpeed: number;
  beamHeight: number; // <= 0.55 means jump over; 0.95..1.25 means crouch/roll under
  color?: number;
}

export interface NpcDef {
  id: NpcId;
  name: string;
  role: string;
  x: number;
  z: number;
  yaw: number;
  behavior: 'ally' | 'rival_snitch' | 'guard_helper';
  dialogueLines: string[];
  rewardType?: 'battery_boost' | 'distract_maduka' | 'power_assist' | 'merit_clue';
  rewardText?: string;
  patrolAxis?: 'x' | 'z';
  patrolSpan?: number;
  patrolSpeed?: number;
}

export interface LevelTheme {
  floorColor: number;
  wallColor: number;
  deskColor: number;
  fogColor: number;
  fogDensity: number;
  hemiIntensity: number;
  lampColor: number;
  chalkboardHeading: string;
  chalkboardLines: string[];
  plaqueText: string;
}

export interface LevelWaypoint {
  x: number;
  z: number;
  lookYaw: number;
  dwellSeconds: number;
}

export interface LevelDef {
  id: number;
  shortCode: string;
  title: string;
  subtitle: string;
  crazyTwist: string;
  gimmickTag: string;
  lecturerId: LecturerId;
  startsInLockdown: boolean;
  requiresPowerRestore: boolean;
  madukaSpeedMultiplier: number;
  playerSpawn: { x: number; z: number; yaw: number };
  madukaSpawn: { x: number; z: number; yaw: number };
  patrolRoute: LevelWaypoint[];
  colliders: AabbBox[];
  carpetZones: CarpetZone[];
  interactables: InteractableDef[];
  npcs: NpcDef[];
  hazardBeams: HazardBeamDef[];
  theme: LevelTheme;
  victoryTitle: string;
  victorySummary: string;
}

export interface ProtagonistProfile {
  avatarId: AvatarId;
  name: string;
  jacketColor: string;
  rank: StudentRank;
}

export interface GameHudSnapshot {
  levelId: number;
  totalLevels: number;
  levelTitle: string;
  crazyTwist: string;
  chapterTitle: string;
  objectiveText: string;
  stamina: number;
  battery: number;
  flashlightOn: boolean;
  crouching: boolean;
  sprinting: boolean;
  hiddenInLockerId: string | null;
  nearPrompt: string | null;
  nearInteractableId: string | null;
  inventory: InventoryItem[];
  powerRestored: boolean;
  lockdownTriggered: boolean;
  lecturerId: LecturerId;
  lecturerName: string;
  madukaState: MadukaAiState;
  madukaDistance: number;
  suspicionLevel: number;
  dialogueSpeaker: string | null;
  dialogueText: string | null;
  elapsedSeconds: number;
  alertsTriggered: number;
  evidenceCollected: number;
  npcsTalkedCount: number;
  npcsTotalCount: number;
  rank: StudentRank;
  cameraMode: '1p' | '3p';
  expression: AvatarExpression;
  activeEmote: AvatarEmoteId | null;
  planeReady: boolean;
  rolling: boolean;
  grounded: boolean;
  surface: SurfaceMaterial;
  endingKind: 'freedom_ch1' | 'caught' | null;
}

export interface SaveGamePayload {
  version: 1;
  savedAt: string;
  profile: ProtagonistProfile;
  difficulty: DifficultyLevel;
  lecturerId: LecturerId;
  chapterReached: number;
  bestChapter1TimeSec: number | null;
  evidenceCollected: number;
  completedLevels: number[];
  bestTimesByLevel: Record<number, number>;
}

