import { jsPDF } from 'jspdf';
import {
  AI_STATE_SPECS,
  CORE_PILLARS,
  MILESTONES,
  PLAYER_MECHANICS,
  PRD_META,
  PUZZLE_STEPS,
  ROOM_ZONES,
} from './prdData';
import { getBellPhaseConfig } from './simulation';

const PAGE_WIDTH = 595.28; // A4 width in pt
const PAGE_HEIGHT = 841.89; // A4 height in pt
const MARGIN_X = 48;
const MARGIN_TOP = 54;
const MARGIN_BOTTOM = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

export function buildPrdPdf(): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  let y = MARGIN_TOP;

  const ensureSpace = (heightNeeded: number) => {
    if (y + heightNeeded > PAGE_HEIGHT - MARGIN_BOTTOM) {
      doc.addPage();
      y = MARGIN_TOP;
    }
  };

  const drawHairline = (gapBefore = 6, gapAfter = 14) => {
    y += gapBefore;
    doc.setDrawColor(214, 210, 200);
    doc.setLineWidth(0.75);
    doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
    y += gapAfter;
  };

  const writeWrapped = (
    text: string,
    opts?: {
      font?: 'helvetica' | 'times' | 'courier';
      style?: 'normal' | 'bold' | 'italic';
      size?: number;
      color?: [number, number, number];
      lineHeight?: number;
      indent?: number;
      maxWidth?: number;
    },
  ) => {
    const font = opts?.font ?? 'helvetica';
    const style = opts?.style ?? 'normal';
    const size = opts?.size ?? 10;
    const color = opts?.color ?? [42, 46, 52];
    const lineHeight = opts?.lineHeight ?? size * 1.45;
    const indent = opts?.indent ?? 0;
    const maxWidth = opts?.maxWidth ?? CONTENT_WIDTH - indent;

    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);

    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, MARGIN_X + indent, y);
      y += lineHeight;
    }
  };

  const writeSectionHeading = (num: string, title: string) => {
    ensureSpace(44);
    y += 8;
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(168, 108, 28);
    doc.text(`SECTION ${num}`, MARGIN_X, y);
    y += 16;

    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(20, 24, 28);
    doc.text(title, MARGIN_X, y);
    y += 8;
    drawHairline(2, 12);
  };

  const writeKeyValueBlock = (title: string, badge: string, rows: { label: string; value: string }[]) => {
    const estimatedHeight = 26 + rows.length * 26;
    ensureSpace(Math.min(estimatedHeight, 140));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 24, 28);
    doc.text(title, MARGIN_X, y);

    if (badge) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(150, 95, 24);
      doc.text(badge, PAGE_WIDTH - MARGIN_X, y, { align: 'right' });
    }
    y += 15;

    for (const row of rows) {
      writeWrapped(`${row.label}: ${row.value}`, {
        size: 9.5,
        color: [58, 64, 72],
        indent: 8,
        lineHeight: 13.5,
      });
    }
    y += 8;
  };

  // Title Header Block
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(168, 108, 28);
  doc.text(`PRODUCT REQUIREMENTS DOCUMENT · VERSION ${PRD_META.version}`, MARGIN_X, y);
  y += 24;

  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(16, 19, 24);
  doc.text(PRD_META.title, MARGIN_X, y);
  y += 20;

  writeWrapped(PRD_META.subtitle, {
    size: 11.5,
    color: [78, 84, 92],
    lineHeight: 16,
  });
  y += 4;

  writeWrapped(
    `Genre: ${PRD_META.genre}  |  Engine: ${PRD_META.targetEngine}  |  Session: ${PRD_META.sessionLength}  |  Target: ${PRD_META.platform}`,
    {
      font: 'courier',
      size: 8.5,
      color: [90, 96, 104],
      lineHeight: 13,
    },
  );
  drawHairline(4, 14);

  // Section 01
  writeSectionHeading('01', 'Executive Overview & Core Design Pillars');
  writeWrapped(
    'Locked inside Lecture Hall A-104 after midnight, a student wakes after cramming to find the exits chained and Professor Alistair Vance still pacing the podium—delivering an endless, obsessive final lecture. To escape before Overtime Lockdown completes, the player must restore wing power, decode a projected chalkboard cipher, steal the faculty keycard from the lectern, and unlock the east corridor without getting caught.',
    { size: 10.5, lineHeight: 15.5 },
  );
  y += 8;

  for (let i = 0; i < CORE_PILLARS.length; i++) {
    const p = CORE_PILLARS[i];
    writeKeyValueBlock(`Pillar 0${i + 1}: ${p.title}`, '', [
      { label: 'Premise', value: p.tagline },
      { label: 'Execution', value: p.detail },
    ]);
  }

  // Section 02
  writeSectionHeading('02', 'Core Gameplay Loop & Player Mechanics');
  writeWrapped(
    'Gameplay follows a four-beat stealth loop: (1) Observe Vance’s monologue cadence and sightlines, (2) Traverse quietly across aisle carpet while avoiding exposed hardwood sprints, (3) Distract Vance with thrown chalk or textbooks, and (4) Execute short puzzle interactions and extract.',
    { size: 10, lineHeight: 14.5 },
  );
  y += 8;

  for (const m of PLAYER_MECHANICS) {
    writeKeyValueBlock(m.mechanic, m.input, [
      { label: 'Parameters', value: m.parameters },
      { label: 'Design Intent', value: m.designIntent },
    ]);
  }

  // Section 03
  writeSectionHeading('03', 'Antagonist AI: Prof. Alistair Vance');
  writeWrapped(
    'Prof. Vance runs a deterministic 5-state Finite State Machine driven by a forward vision cone, raycast line-of-sight checks against oak desk modesty panels, and surface-weighted acoustic memory.',
    { size: 10, lineHeight: 14.5 },
  );
  y += 8;

  for (const state of AI_STATE_SPECS) {
    writeKeyValueBlock(`${state.label} (${state.id})`, state.speed, [
      { label: 'Entry Trigger', value: state.entryTrigger },
      { label: 'Behavior', value: state.behavior },
      { label: 'Exit & Cue', value: `${state.exitCondition} | ${state.audioVisualCue}` },
    ]);
  }

  y += 4;
  ensureSpace(90);
  writeWrapped('Three-Bell Escalation Profile', {
    font: 'times',
    style: 'bold',
    size: 12.5,
    color: [20, 24, 28],
    lineHeight: 18,
  });
  for (const phase of [1, 2, 3] as const) {
    const cfg = getBellPhaseConfig(phase);
    writeKeyValueBlock(cfg.label, `${cfg.fovDegrees}° FOV · ${cfg.hearingMultiplier}x Hearing`, [
      {
        label: 'Speeds & Range',
        value: `Patrol ${cfg.patrolSpeedMps} m/s · Pursuit ${cfg.pursuitSpeedMps} m/s · Lit Sight ${cfg.visionRangeLitM}m · Dark Sight ${cfg.visionRangeDarkM}m`,
      },
      { label: 'Environment', value: `${cfg.lightingState} (${cfg.doorLockState})` },
    ]);
  }

  // Section 04
  writeSectionHeading('04', 'Level Architecture & Spatial Flow');
  for (const z of ROOM_ZONES) {
    writeKeyValueBlock(z.zone, z.dimensions, [
      { label: 'Purpose', value: z.purpose },
      { label: 'Cover & Hiding', value: z.coverAndHiding },
      { label: 'Primary Risk', value: z.keyRisk },
    ]);
  }

  // Section 05
  writeSectionHeading('05', 'Puzzles, Win & Loss Conditions');
  for (const p of PUZZLE_STEPS) {
    writeKeyValueBlock(p.step, p.location, [
      { label: 'Requirement', value: p.requirement },
      { label: 'Risk Profile', value: p.riskProfile },
      { label: 'Reward', value: p.reward },
    ]);
  }

  writeKeyValueBlock('Victory, Detention Strikes & Mastery Grading', 'Win / Loss Rules', [
    {
      label: 'Victory Condition',
      value:
        'Swipe the Faculty Keycard and enter the dynamic 4-digit cipher on the East Corridor keypad, then survive the 3.0s unlock chime.',
    },
    {
      label: 'Two-Strike Detention',
      value:
        'First grab inflicts a Warning Strike with a brief shove escape; second grab (or any grab during Bell 3) ends the run in Detention.',
    },
    {
      label: 'Mastery Rank (S–C)',
      value:
        'Scored from Clear Time, Pursuit Triggers, Strikes Taken, and optional hidden attendance logs.',
    },
  ]);

  // Section 06
  writeSectionHeading('06', 'Visual Direction, Spatial Audio & Minimal HUD');
  writeKeyValueBlock('Chiaroscuro Lighting & Binaural Telemetry', '>= 85% Clear Viewport', [
    {
      label: 'Lighting Contrast',
      value:
        'Cool moonlight (#627C9C) through tall West gothic windows silhouettes safe aisles against Vance’s warm brass lectern lamp (#D99B43) and flashlight beam.',
    },
    {
      label: 'Spatial Audio',
      value:
        'HRTF occluded footsteps across risers; abrupt monologue silence telegraphs Suspicious state 0.8s before Vance turns.',
    },
    {
      label: 'Diegetic HUD',
      value:
        'No radar or floating arrows; displays only a fade-out stamina strip, single bottom-right item slot, and subtle peripheral breath vignette.',
    },
  ]);

  // Section 07
  writeSectionHeading('07', 'Technical Architecture & 12-Week Roadmap');
  writeKeyValueBlock('Performance & Playtest Budgets', '60 FPS / <= 16.6ms', [
    {
      label: 'Rendering Ceiling',
      value: '<= 120 draw calls via InstancedMesh auditorium desks, max 2 shadow-casting lights, shared PBR material library.',
    },
    {
      label: 'Target Playtest KPI',
      value: '55%–70% Normal escape completion rate; 85%+ clear attribution on first detection.',
    },
  ]);

  for (const m of MILESTONES) {
    writeKeyValueBlock(m.phase, m.weeks, [
      { label: 'Deliverable', value: m.deliverable },
      { label: 'Exit Gate', value: m.exitGate },
    ]);
  }

  // Stamp consistent footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(225, 222, 215);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_X, PAGE_HEIGHT - 36, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 36);

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 126, 134);
    doc.text(`${PRD_META.title} — Game Design PRD (v${PRD_META.version})`, MARGIN_X, PAGE_HEIGHT - 22);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 22, {
      align: 'right',
    });
  }

  return doc;
}

export function downloadPrdPdf(filename = 'the-final-lecture-prd.pdf'): void {
  const doc = buildPrdPdf();
  doc.save(filename);
}
