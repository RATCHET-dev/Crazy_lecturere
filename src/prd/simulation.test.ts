import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNoiseRadius,
  createInitialLecturerState,
  evaluateVisionDetection,
  getBellPhaseConfig,
  stepLecturerState,
  triggerNoiseStimulus,
} from './simulation';
import { generateMarkdownPrd, PRD_SECTIONS } from './prdData';
import { buildPrdPdf } from './pdfExport';

test('calculateNoiseRadius scales logically across stance, surface, and weight', () => {
  const quiet = calculateNoiseRadius({
    stance: 'crouch',
    surface: 'carpet',
    carryingHeavyProp: false,
  });
  const walkTile = calculateNoiseRadius({
    stance: 'walk',
    surface: 'tile',
    carryingHeavyProp: false,
  });
  const sprintWoodHeavy = calculateNoiseRadius({
    stance: 'sprint',
    surface: 'creaky_wood',
    carryingHeavyProp: true,
  });

  assert.equal(quiet.tier, 'Silent');
  assert.ok(quiet.radiusMeters < walkTile.radiusMeters);
  assert.ok(walkTile.radiusMeters < sprintWoodHeavy.radiusMeters);
  assert.equal(sprintWoodHeavy.tier, 'Alerting');
});

test('evaluateVisionDetection respects FOV cone and desk crouch occlusion', () => {
  // Lecturer at origin facing +Z (yaw = 0), player straight ahead at 6m
  const exposed = evaluateVisionDetection({
    lecturerX: 0,
    lecturerZ: 0,
    lecturerYaw: 0,
    playerX: 0,
    playerZ: 6,
    playerCrouched: false,
    inShadow: false,
    hasDeskCover: false,
    bellPhase: 1,
  });
  assert.equal(exposed.withinCone, true);
  assert.equal(exposed.detected, true);
  assert.ok(exposed.suspicionPerSecond > 40);

  // Same position, crouched behind oak desk modesty panel
  const hidden = evaluateVisionDetection({
    lecturerX: 0,
    lecturerZ: 0,
    lecturerYaw: 0,
    playerX: 0,
    playerZ: 6,
    playerCrouched: true,
    inShadow: false,
    hasDeskCover: true,
    bellPhase: 1,
  });
  assert.equal(hidden.withinCone, true);
  assert.equal(hidden.occluded, true);
  assert.equal(hidden.detected, false);
  assert.equal(hidden.suspicionPerSecond, 0);

  // Behind the lecturer
  const behind = evaluateVisionDetection({
    lecturerX: 0,
    lecturerZ: 0,
    lecturerYaw: 0,
    playerX: 0,
    playerZ: -4,
    playerCrouched: false,
    inShadow: false,
    hasDeskCover: false,
    bellPhase: 1,
  });
  assert.equal(behind.withinCone, false);
  assert.equal(behind.detected, false);
});

test('triggerNoiseStimulus and stepLecturerState transition cleanly through AI states', () => {
  const initial = createInitialLecturerState(1);
  assert.equal(initial.aiState, 'LECTURING');

  // Out of hearing range noise does not alert
  const ignored = triggerNoiseStimulus(initial, 15, 15, 5.0);
  assert.equal(ignored.aiState, 'LECTURING');

  // In-range noise shifts to INVESTIGATING
  const investigating = triggerNoiseStimulus(initial, 2.5, -1.0, 9.0);
  assert.equal(investigating.aiState, 'INVESTIGATING');
  assert.equal(investigating.targetX, 2.5);

  // Stepping until arrival transitions to SEARCHING, then back to LECTURING
  let current = investigating;
  for (let i = 0; i < 120; i++) {
    current = stepLecturerState(current, 0.1);
  }
  assert.equal(current.aiState, 'LECTURING');
});

test('getBellPhaseConfig escalates speed, FOV, and range across Bells 1-3', () => {
  const b1 = getBellPhaseConfig(1);
  const b2 = getBellPhaseConfig(2);
  const b3 = getBellPhaseConfig(3);

  assert.ok(b1.patrolSpeedMps < b2.patrolSpeedMps && b2.patrolSpeedMps < b3.patrolSpeedMps);
  assert.ok(b1.visionRangeLitM < b2.visionRangeLitM && b2.visionRangeLitM < b3.visionRangeLitM);
  assert.ok(b1.fovDegrees < b2.fovDegrees && b2.fovDegrees < b3.fovDegrees);
});

test('generateMarkdownPrd includes all 7 PRD chapters', () => {
  const md = generateMarkdownPrd();
  for (const section of PRD_SECTIONS) {
    assert.ok(md.includes(section.number), `Missing section ${section.number}`);
  }
  assert.ok(md.includes('Prof. Alistair Vance'));
  assert.ok(md.includes('Lecture Hall A-104'));
});

test('buildPrdPdf produces a valid multi-page PDF document', () => {
  const doc = buildPrdPdf();
  const pageCount = doc.getNumberOfPages();
  assert.ok(pageCount >= 3, `Expected >= 3 PDF pages, got ${pageCount}`);
  const raw = doc.output('datauristring');
  assert.ok(raw.startsWith('data:application/pdf'));
  const bytes = doc.output('arraybuffer');
  const header = new TextDecoder().decode(new Uint8Array(bytes).slice(0, 5));
  assert.equal(header, '%PDF-');
});
