export interface PrdSectionMeta {
  id: string;
  number: string;
  title: string;
  summary: string;
}

export interface CorePillar {
  title: string;
  tagline: string;
  detail: string;
}

export interface PlayerMechanicSpec {
  mechanic: string;
  input: string;
  parameters: string;
  designIntent: string;
}

export interface AiStateSpec {
  id: 'LECTURING' | 'SUSPICIOUS' | 'INVESTIGATING' | 'PURSUIT' | 'SEARCHING';
  label: string;
  speed: string;
  entryTrigger: string;
  behavior: string;
  exitCondition: string;
  audioVisualCue: string;
}

export interface RoomZoneSpec {
  zone: string;
  dimensions: string;
  purpose: string;
  coverAndHiding: string;
  keyRisk: string;
}

export interface PuzzleStepSpec {
  step: string;
  location: string;
  requirement: string;
  riskProfile: string;
  reward: string;
}

export interface MilestoneSpec {
  phase: string;
  weeks: string;
  deliverable: string;
  exitGate: string;
}

export const PRD_META = {
  title: 'The Final Lecture',
  subtitle: 'First-Person 3D Stealth-Horror Escape Game — Product Requirements Document',
  version: '1.0',
  genre: 'First-Person Stealth Horror',
  targetEngine: 'Three.js / Unity URP',
  sessionLength: '12–18 min per run',
  platform: 'PC & WebGL (60 FPS)',
};

export const PRD_SECTIONS: PrdSectionMeta[] = [
  {
    id: 'overview',
    number: '01',
    title: 'Executive Overview & Vision',
    summary: 'High concept, target audience, core design pillars, and player fantasy.',
  },
  {
    id: 'mechanics',
    number: '02',
    title: 'Core Loop & Player Mechanics',
    summary: 'Movement kinematics, acoustic noise propagation, hiding nodes, and distraction tools.',
  },
  {
    id: 'lecturer-ai',
    number: '03',
    title: 'Antagonist AI: Prof. Alistair Vance',
    summary: 'Finite state machine, vision cone math, auditory triggers, and 3-bell escalation.',
  },
  {
    id: 'level-design',
    number: '04',
    title: 'Level Architecture & 3D Greybox',
    summary: 'Stepped lecture hall topology, sightlines, choke points, and live 3D spatial blockout.',
  },
  {
    id: 'progression',
    number: '05',
    title: 'Puzzles, Win & Loss Conditions',
    summary: 'Three-stage escape sequence, detention strike system, and mastery grading.',
  },
  {
    id: 'art-audio',
    number: '06',
    title: 'Art Direction, Audio & Minimal HUD',
    summary: 'Chiaroscuro lighting rig, binaural acoustic cues, and diegetic HUD discipline.',
  },
  {
    id: 'production',
    number: '07',
    title: 'Technical Spec & Production Roadmap',
    summary: 'Performance budgets, collision architecture, 12-week roadmap, and playtest KPIs.',
  },
];

export const CORE_PILLARS: CorePillar[] = [
  {
    title: 'Acoustic Tension Over Combat',
    tagline: 'Every step on old oak carries a radius.',
    detail:
      'The player has no weapons. Survival relies on reading floor surfaces, timing movement to ambient thunder or projector hum, and breaking line-of-sight behind tiered desks.',
  },
  {
    title: 'Academic Familiarity Twisted',
    tagline: 'A mundane lecture hall turned vertical labyrinth.',
    detail:
      'Stepped auditorium seating creates asymmetric elevation: crouching in Row D hides you from a floor-level sweep, while climbing to the projection booth exposes your silhouette against the lens.',
  },
  {
    title: 'The Lecture Never Stops',
    tagline: 'Diegetic monologue tracks AI awareness.',
    detail:
      'Prof. Vance recites unsettling philosophy while patrolling. When he pauses mid-sentence or taps his wooden pointer against a desk, the player knows his state shifted without needing wall-hacks.',
  },
];

export const PLAYER_MECHANICS: PlayerMechanicSpec[] = [
  {
    mechanic: 'First-Person Locomotion',
    input: 'WASD + Mouse Look',
    parameters: 'Walk 3.2 m/s · Sprint 5.4 m/s · Crouch 1.7 m/s',
    designIntent: 'Distinct pace tiers force deliberate choices between speed and acoustic stealth.',
  },
  {
    mechanic: 'Crouch & Desk Cover',
    input: 'Ctrl / C (Hold or Toggle)',
    parameters: 'Eye height 1.65m -> 0.88m · Vision range -18%',
    designIntent: 'Modesty panels on tiered oak desks fully occlude crouched players from lower aisles.',
  },
  {
    mechanic: 'Breath & Stamina Pool',
    input: 'Shift (Sprint) / Right-Click (Hold Breath)',
    parameters: '100 Stamina · 16/s sprint drain · 4.5s max breath hold',
    designIntent: 'Prevents infinite kiting; heavy exhales after exhaustion create a 4m audio pulse.',
  },
  {
    mechanic: 'Tactile Hide Nodes',
    input: 'E (Enter / Exit Lockers & Desk Wells)',
    parameters: '0.35s entry anim · Peep slit FOV 55° · Forced exit on Bell 3 sweep',
    designIntent: 'Creates claustrophobic peek-and-wait moments while preventing permanent camping.',
  },
  {
    mechanic: 'Acoustic Distractions',
    input: 'Q (Equip) + Left-Click (Toss Chalk / Textbook)',
    parameters: 'Chalk: 8.5m ring (3 charges) · Textbook: 14m ring (1-use)',
    designIntent: 'Lets the player pull Prof. Vance away from the lectern drawer or breaker panel.',
  },
  {
    mechanic: 'UV Penlight Inspection',
    input: 'F (Toggle Beam)',
    parameters: '10m narrow cone · Reveals UV syllabus ciphers · Detectable if aimed at Vance',
    designIntent: 'Trades stealth visibility for puzzle progression in unlit corners.',
  },
];

export const AI_STATE_SPECS: AiStateSpec[] = [
  {
    id: 'LECTURING',
    label: 'Lecturing Patrol',
    speed: '1.85 m/s (Bell 1) -> 2.85 m/s (Bell 3)',
    entryTrigger: 'Round start or after Search timer expires with zero contact.',
    behavior:
      'Follows a 6-node figure-eight loop across the lectern, chalkboard, and outer aisles while delivering calm academic monologue.',
    exitCondition: 'Player enters sight cone (>= 35% suspicion) or acoustic stimulus hits hearing radius.',
    audioVisualCue: 'Steady heeled footsteps · Warm brass lamp glint · Measured spoken cadence.',
  },
  {
    id: 'SUSPICIOUS',
    label: 'Suspicious Pause',
    speed: '0.0 m/s (1.4s orient turn)',
    entryTrigger: 'Brief peripheral glimpse (0.3s–0.7s) or faint low-decibel step inside edge of hearing.',
    behavior:
      'Freezes mid-stride, stops speaking abruptly, and rotates toward the last perceived azimuth.',
    exitCondition: 'Suspicion reaches 65% -> Investigating; drops to 0% after 2.5s -> Lecturing.',
    audioVisualCue: 'Sudden silence in monologue · Sharp chalk-snap or spectacle glint.',
  },
  {
    id: 'INVESTIGATING',
    label: 'Investigating Stimulus',
    speed: '1.25x Patrol Speed',
    entryTrigger: 'Thrown distraction prop, creaky floorboards, or unresolved Suspicious azimuth.',
    behavior:
      'Walks directly to stimulus coordinates, sweeps flashlight/gaze 60° left and right, and inspects nearby desk wells.',
    exitCondition: 'Direct line-of-sight -> Pursuit; arrives and finds nothing -> Searching.',
    audioVisualCue: 'Brisk double-time footsteps · "Who raised a hand?" line delivery.',
  },
  {
    id: 'PURSUIT',
    label: 'Active Pursuit',
    speed: '4.35 m/s (Bell 1) -> 5.20 m/s (Bell 3)',
    entryTrigger: 'Full sight cone lock (100% suspicion) or sprinting within 3.5m.',
    behavior:
      'Sprints along shortest navmesh path toward live player coordinates; cuts corners around aisles and vaults low steps.',
    exitCondition: 'Player within 1.4m -> Detention Strike; breaks LOS for 4.0s -> Searching at last seen point.',
    audioVisualCue: 'Dissonant bowed-string stinger · Heavy cane/pointer thuds · Vignette pulse.',
  },
  {
    id: 'SEARCHING',
    label: 'Tier Sweep Search',
    speed: '1.60 m/s',
    entryTrigger: 'Arrived at last known player position or investigation target with no visual contact.',
    behavior:
      'Checks adjacent desk rows and lockers for 3.2s with wide oscillating head scan before conceding.',
    exitCondition: 'Visual re-acquisition -> Pursuit; timer reaches 0 -> returns to Lecturing.',
    audioVisualCue: 'Slow rhythmic pointer taps on wood · Heavy breathing nearby.',
  },
];

export const ROOM_ZONES: RoomZoneSpec[] = [
  {
    zone: 'Lecture Hall A-104 (Main Well & Tiers)',
    dimensions: '18m × 22m · 4 stepped risers (+0.35m per tier)',
    purpose: 'Primary cat-and-mouse stealth arena containing 24 bolted desks, lectern, and chalkboard.',
    coverAndHiding: 'Oak modesty panels (crouch cover), 2 end-row lockers, center & side aisles (>= 2.2m wide).',
    keyRisk: 'Center aisle offers fastest rotation but zero lateral cover when projector strobe sweeps.',
  },
  {
    zone: 'Prep Lab & Breaker Alcove (West Wing)',
    dimensions: '6m × 8m · Single entry + rear crawl duct',
    purpose: 'Houses the Auxiliary Fuse Box required to power the corridor keypad and projection booth.',
    coverAndHiding: 'Steel specimen cabinets, tall shelving island for looping, narrow storage closet.',
    keyRisk: 'Throwing the breaker triggers a 2.5s mechanical clunk heard across half the lecture hall.',
  },
  {
    zone: 'Projection Booth (Upper Balcony)',
    dimensions: '7m × 4m · Overlooks entire auditorium',
    purpose: 'Vantage point to align the slide projector onto the chalkboard UV cipher and spot Vance.',
    coverAndHiding: 'Low parapet wall, projector housing block, locked rear stairwell.',
    keyRisk: 'Only one stair descent back to Tier 4; easily cornered if Vance climbs during Bell 2+.',
  },
  {
    zone: 'Faculty Exit Corridor (East Exit)',
    dimensions: '12m × 3.2m · Heavy reinforced oak doors',
    purpose: 'Final extraction zone housing the electronic attendance keypad and emergency exit bar.',
    coverAndHiding: 'Recessed coat alcove and pillar indentations.',
    keyRisk: 'Entering the 4-digit code takes 3.0s of stationary focus while exit alarm chirps.',
  },
];

export const PUZZLE_STEPS: PuzzleStepSpec[] = [
  {
    step: '01. Restore West Breaker',
    location: 'Prep Lab Alcove',
    requirement: 'Locate 2 blown ceramic fuses on lab shelves and flip main relay switch.',
    riskProfile: 'Emits 11m acoustic clunk; triggers Bell 2 escalation immediately upon power restoration.',
    reward: 'Powers the overhead Slide Projector and East Corridor Keypad.',
  },
  {
    step: '02. Decode Chalkboard Cipher',
    location: 'Projection Booth -> Main Chalkboard',
    requirement: 'Insert Lecture Slide #4 in upper booth, then read 4-digit UV seating cipher from floor level.',
    riskProfile: 'Requires descending from balcony into lit front well within Vance’s primary patrol zone.',
    reward: 'Reveals the dynamic 4-digit Detention Override Code.',
  },
  {
    step: '03. Steal Faculty Keycard & Escape',
    location: 'Front Lectern -> East Exit Door',
    requirement: 'Lure Vance away from lectern using chalk/textbook distraction, unlock lectern drawer, swipe & input code.',
    riskProfile: 'Opening the drawer initiates Bell 3 (Overtime Lockdown) with darkened hall.',
    reward: 'Unlocks East Exit Wing and triggers Run Escape Sequence.',
  },
];

export const MILESTONES: MilestoneSpec[] = [
  {
    phase: 'M1 · Greybox & Movement Core',
    weeks: 'Weeks 1–3',
    deliverable: 'Playable Lecture Hall A-104 blockout, crouch/sprint kinematics, acoustic ring debug.',
    exitGate: 'All 4 zones navigable at 60 FPS; player can crouch behind every desk row cleanly.',
  },
  {
    phase: 'M2 · Lecturer AI & Stealth Loop',
    weeks: 'Weeks 4–6',
    deliverable: '5-state FSM, LOS raycasts, Bell 1–3 escalation, chalk/book distractions, hide lockers.',
    exitGate: 'Zero stuck waypoints; 85% of playtesters understand detection cause without UI text.',
  },
  {
    phase: 'M3 · Vertical Slice Puzzles & Audio',
    weeks: 'Weeks 7–9',
    deliverable: '3-stage escape chain, binaural Web Audio / FMOD footsteps, volumetric projector, UV shader.',
    exitGate: 'Complete 15-minute run playable end-to-end with Victory & Detention Game Over screens.',
  },
  {
    phase: 'M4 · Polish, Balance & Release',
    weeks: 'Weeks 10–12',
    deliverable: 'Accessibility options (subtitles, photosensitive mode), telemetry tuning, WebGL & PC build.',
    exitGate: 'Frame budget <= 16.6ms; escape completion rate 55%–70% on Normal difficulty.',
  },
];

export function generateMarkdownPrd(): string {
  const lines: string[] = [
    `# ${PRD_META.title} — Product Requirements Document`,
    ``,
    `**Subtitle:** ${PRD_META.subtitle}`,
    `**Genre:** ${PRD_META.genre} | **Target Engine:** ${PRD_META.targetEngine} | **Session Length:** ${PRD_META.sessionLength}`,
    ``,
    `---`,
    ``,
    `## 01. Executive Overview & Pillars`,
    `Locked inside Lecture Hall A-104 after midnight, a student wakes after cramming to find the doors sealed and Professor Alistair Vance still pacing the podium—delivering an endless, obsessive final lecture. To escape before Overtime Lockdown completes, the player must restore wing power, decode a projected chalkboard cipher, steal the faculty keycard from the lectern, and unlock the east corridor without getting caught.`,
    ``,
    `### Design Pillars`,
    ...CORE_PILLARS.map((p) => `- **${p.title}** — *${p.tagline}* ${p.detail}`),
    ``,
    `## 02. Core Loop & Player Mechanics`,
    `1. **Observe** Prof. Vance's patrol rhythm and monologue pauses from behind tiered oak desks.`,
    `2. **Move & Manage Sound** across carpet, tile, and creaky floorboards while conserving sprint stamina.`,
    `3. **Distract & Exploit Windows** using thrown chalk or textbooks to pull Vance out of the front well.`,
    `4. **Solve & Extract** through the 3-part puzzle chain while surviving escalating Bell Phases.`,
    ``,
    `| Mechanic | Input | Parameters | Design Intent |`,
    `| :--- | :--- | :--- | :--- |`,
    ...PLAYER_MECHANICS.map(
      (m) => `| ${m.mechanic} | ${m.input} | ${m.parameters} | ${m.designIntent} |`,
    ),
    ``,
    `## 03. Antagonist AI: Prof. Alistair Vance`,
    `| State | Move Speed | Entry Trigger | Exit Condition |`,
    `| :--- | :--- | :--- | :--- |`,
    ...AI_STATE_SPECS.map(
      (s) => `| ${s.label} (\`${s.id}\`) | ${s.speed} | ${s.entryTrigger} | ${s.exitCondition} |`,
    ),
    ``,
    `### Escalating Bell Phases`,
    `- **Bell 1 (Late Seminar):** 1.85 m/s patrol, 12.5m lit sight cone, ceiling fluorescents flickering.`,
    `- **Bell 2 (Mandatory Attendance):** Triggered after restoring breaker. 2.35 m/s patrol, 14.5m vision, brownout + projector strobe.`,
    `- **Bell 3 (Overtime Lockdown):** Triggered on lectern keycard theft. 2.85 m/s patrol, 5.2 m/s pursuit, power cut + high-beam flashlight.`,
    ``,
    `## 04. Level Architecture`,
    ...ROOM_ZONES.map(
      (z) =>
        `### ${z.zone} (${z.dimensions})\n- **Purpose:** ${z.purpose}\n- **Cover & Hiding:** ${z.coverAndHiding}\n- **Primary Risk:** ${z.keyRisk}`,
    ),
    ``,
    `## 05. Puzzles, Win & Loss Conditions`,
    ...PUZZLE_STEPS.map(
      (p) =>
        `- **${p.step} (${p.location}):** ${p.requirement} *Risk:* ${p.riskProfile} *Reward:* ${p.reward}`,
    ),
    ``,
    `- **Win Condition:** Input the 4-digit dynamic code + swipe Faculty Keycard at East Exit Corridor and survive the 3.0s unlock chime.`,
    `- **Loss Condition (Detention Strikes):** 1st catch = Warning Strike & stun shove (player shoved back, 15s grace); 2nd catch = Final Detention Game Over (or instant Game Over during Bell 3).`,
    `- **Mastery Grading:** S/A/B/C rank calculated from Clear Time, Alarms Triggered, Strikes Taken, and Optional Syllabus Notes collected.`,
    ``,
    `## 06. Visual Direction, Audio & Minimal HUD`,
    `- **Palette:** Chiaroscuro obsidian shadows (#0E1114), weathered dark oak, slate green-black chalkboard, warm tungsten brass lamp (#D99B43), cold rain-lit gothic moonlight.`,
    `- **Spatial Audio:** Binaural HRTF footsteps, chalk-on-slate screech on suspicion, heartbeat & breath ducking during hide-node peeks.`,
    `- **HUD Discipline:** >= 85% unobstructed viewport; faint corner stamina bar (fades out at 100%), single bottom-right item slot, subtle edge vignette on suspicion/proximity.`,
    ``,
    `## 07. Technical Spec & Production Roadmap`,
    `- **Budgets:** 60 FPS target (<= 16.6ms frame time), <= 120 draw calls in main hall via instanced desk meshes, max 2 shadow-casting lights.`,
    ...MILESTONES.map(
      (m) => `- **${m.phase} (${m.weeks}):** ${m.deliverable} *Exit Gate:* ${m.exitGate}`,
    ),
  ];

  return lines.join('\n');
}
