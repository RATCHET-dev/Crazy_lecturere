import { LecturerId } from './types';

export interface LecturerDialogueSet {
  patrol: string[];
  suspicious: string[];
  investigate: string[];
  chase: string[];
  search: string[];
  returnToPatrol: string[];
  caught: string;
  lockdown: string;
  playfulReact: string;
  tripwireHit: string;
  snitchAlert: string;
}

export interface LecturerVisualStyle {
  silhouette: 'male' | 'female' | 'principal';
  jacketColor: number;
  shirtColor: number;
  pantsOrSkirtColor: number;
  tieOrAccentColor: number;
  skinColor: number;
  hairColor: number;
  eyeGlowColor: number | null;
  hasGlasses: boolean;
  hasBun: boolean;
  hasCapOrCrown: boolean;
  prop: 'ruler' | 'baton' | 'whistle' | 'gavel' | 'tablet' | 'ladle' | 'ledger' | 'stun_rod' | 'clipboard' | 'hourglass' | 'scepter';
  spotlightColor: number;
}

export interface LecturerDef {
  id: LecturerId;
  assignedLevelId: number;
  isPrincipal?: boolean;
  name: string;
  shortName: string;
  department: string;
  courseCode: string;
  traitBadge: string;
  description: string;
  storyHook: string;
  signatureQuote: string;
  accentColor: string;
  eyeColor: string;
  speedMultiplier: number;
  visual: LecturerVisualStyle;
  lines: LecturerDialogueSet;
}

export const LECTURERS: LecturerDef[] = [
  {
    id: 'maduka',
    assignedLevelId: 1,
    name: 'Prof. Augustus B. Maduka',
    shortName: 'Prof. Maduka',
    department: 'Computer Science',
    courseCode: 'CS-301',
    traitBadge: 'Strict Disciplinarian',
    description:
      'Eccentric CS-301 mastermind obsessed with punctuality, pop quizzes, and Project Merit.',
    storyHook:
      'Seventeen minutes late to 8:00 AM algorithms: Maduka locks Lecture Hall A-104 and turns your missing assignment into a live survival algorithm.',
    signatureQuote: 'In my class, even the clock must seek permission to stop.',
    accentColor: '#d99b43',
    eyeColor: '#111111',
    speedMultiplier: 1.0,
    visual: {
      silhouette: 'male',
      jacketColor: 0x26272c,
      shirtColor: 0xe9e4d8,
      pantsOrSkirtColor: 0x33353b,
      tieOrAccentColor: 0x6a1b25,
      skinColor: 0x8a5a3c,
      hairColor: 0x1e1e22,
      eyeGlowColor: null,
      hasGlasses: true,
      hasBun: false,
      hasCapOrCrown: false,
      prop: 'ruler',
      spotlightColor: 0xffe1a6,
    },
    lines: {
      patrol: [
        'In my class, even the clock must seek permission to stop.',
        'Attendance is a moral contract. Nobody leaves CS-301 ungraded.',
        'Keep quiet. I can hear careless footnotes from across the aisle.',
      ],
      suspicious: [
        'WHO IS MAKING THAT NOISE?',
        'A movement in Row B? Show your student ID.',
        'Do not test my peripheral vision.',
      ],
      investigate: [
        'Interesting. Let us inspect that disturbance personally.',
        'Hiding under an oak desk is a Rank C strategy.',
      ],
      chase: [
        'You are late. Your survival is now an assignment.',
        'Intelligence is knowing the answer. Wisdom is knowing when to run.',
        'You may escape this building, but you cannot escape your academic responsibilities!',
      ],
      search: [
        'Come out. Your GPA drops every second you waste my time.',
        'Lockers are for textbooks, not terrified undergraduates.',
      ],
      returnToPatrol: [
        'Tch. Disorganized, undisciplined... back to the podium.',
        'The syllabus waits for no coward.',
      ],
      caught:
        'Since you seem to enjoy my company, we shall have another semester together.',
      lockdown:
        'Power grid locked! Attendance is now mandatory for survival.',
      playfulReact:
        'UNORTHODOX CLASSROOM CONDUCT?! STOP THAT NONSENSE AT ONCE!',
      tripwireHit:
        'SECURITY TRIPWIRE BREACH?! WHO DID NOT CROUCH OR JUMP?!',
      snitchAlert:
        'VICTOR REPORTS AN INTRUDER! SHOW YOURSELF IMMEDIATELY!',
    },
  },
  {
    id: 'misa',
    assignedLevelId: 2,
    name: 'Mrs. Misa',
    shortName: 'Mrs. Misa',
    department: 'Sociology',
    courseCode: 'SOC-204',
    traitBadge: 'Wicked · Red Eyes',
    description:
      'A ruthless, red-eyed Sociology lecturer who treats terrified students like deviant lab specimens.',
    storyHook:
      'In the Whisper Library Stacks, Mrs. Misa conducts a midnight obedience study—one echoing footstep on marble marks you as a target for permanent expulsion.',
    signatureQuote: 'Society does not forgive latecomers—and neither do I.',
    accentColor: '#ef4444',
    eyeColor: '#ff1e2d',
    speedMultiplier: 1.07,
    visual: {
      silhouette: 'female',
      jacketColor: 0x351022,
      shirtColor: 0x8f1d32,
      pantsOrSkirtColor: 0x210b16,
      tieOrAccentColor: 0xb91c1c,
      skinColor: 0x845238,
      hairColor: 0x140f17,
      eyeGlowColor: 0xff1e2d,
      hasGlasses: false,
      hasBun: true,
      hasCapOrCrown: false,
      prop: 'baton',
      spotlightColor: 0xffb4b4,
    },
    lines: {
      patrol: [
        'Observe the herd instinct... terrified students scattering in the dark.',
        'In SOC-204, deviance is punished before the bell even rings.',
        'My red eyes see every crack in your fragile social order.',
      ],
      suspicious: [
        'A deviant footstep in my sociology hall? How wickedly delicious.',
        'Freeze right there, little specimen. I heard your shoes.',
        'Whispering against authority? Let me examine your conduct.',
      ],
      investigate: [
        'Come out, specimen—Mrs. Misa has a special fieldwork penalty waiting!',
        'Trying to blend into the background? Sociologically pathetic.',
      ],
      chase: [
        'RUN! Your sheer panic is going straight into my wickedness case study!',
        'Deviant behavior detected! Nobody escapes Sociology 204 unpunished!',
        'Look into my red eyes and accept your permanent failing grade!',
      ],
      search: [
        'Come out now, or I will fail your entire social circle for ten semesters!',
        'Lockers are merely tiny prisons for guilty undergraduates.',
      ],
      returnToPatrol: [
        'Cowardly conformity... yet my crimson gaze never truly leaves you.',
        'Returning to the lectern. Next time, there will be zero mercy.',
      ],
      caught:
        'Caught red-handed! A permanent F—and indefinite detention in Mrs. Misa’s sociology lab!',
      lockdown:
        'Doors bolted! Welcome to Mrs. Misa’s Sociology of Suffering—run if you dare!',
      playfulReact:
        'ORIGAMI AND DANCING IN SOC-204?! SUCH WICKED REBELLION EARNS DOUBLE DETENTION!',
      tripwireHit:
        'TRIPWIRE TRIGGERED! SOCIAL DEVIANCE CONFIRMED—I AM COMING FOR YOU!',
      snitchAlert:
        'VICTOR INFORMED ME OF YOUR EXACT POSITION! THANK YOU, GOOD CITIZEN!',
    },
  },
  {
    id: 'balogun',
    assignedLevelId: 3,
    name: 'Prof. Kolawole Balogun',
    shortName: 'Prof. Balogun',
    department: 'Applied Kinematics',
    courseCode: 'PHY-108',
    traitBadge: 'Desk-Hurdle Fanatic',
    description:
      'Relentless physical mechanics coach who wired his gauntlet with ankle lasers and desk hurdles.',
    storyHook:
      'After claiming modern students lack kinetic grit, Balogun suspended floor passes—you must sprint-vault 0.95m oak desks while dodging his sweeping red beams.',
    signatureQuote: 'Velocity equals courage divided by hesitation—JUMP!',
    accentColor: '#f97316',
    eyeColor: '#fb923c',
    speedMultiplier: 1.09,
    visual: {
      silhouette: 'male',
      jacketColor: 0x1e3a5f,
      shirtColor: 0xf97316,
      pantsOrSkirtColor: 0x172030,
      tieOrAccentColor: 0xfbbf24,
      skinColor: 0x7c4c30,
      hairColor: 0x121215,
      eyeGlowColor: null,
      hasGlasses: false,
      hasBun: false,
      hasCapOrCrown: true,
      prop: 'whistle',
      spotlightColor: 0xffd18c,
    },
    lines: {
      patrol: [
        'Show me clean vertical clearance or repeat PHY-108 until dawn!',
        'Low gravity excuses are rejected in my kinematics arena.',
        'Vault the oak bridges—weak calves earn immediate detention!',
      ],
      suspicious: [
        'A scuff on the gym wax? Somebody dropped off the desk!',
        'I hear heavy breathing near Row 2—sound off!',
      ],
      investigate: [
        'Checking the landing zone. Nobody hides from kinetic tracking!',
        'Let us measure your reaction time up close!',
      ],
      chase: [
        'SPRINT! Let us calculate your terminal escape velocity!',
        'No shortcut can beat pure momentum—I AM ON YOUR HEELS!',
        'Jump or roll all you want—you cannot out-physics Balogun!',
      ],
      search: [
        'Locker rest breaks are strictly unauthorized mid-drill!',
        'Come out and run another lap!',
      ],
      returnToPatrol: [
        'Sloppy form. Resetting stopwatch on the perimeter.',
        'You stalled—back to patrolling the desk bridges.',
      ],
      caught:
        'Time expired! Twenty thousand wind sprints in Saturday detention!',
      lockdown:
        'Arena shutters sealed! The floor is officially detention!',
      playfulReact:
        'STOP DANCING AND GIVE ME TEN DESK VAULTS RIGHT NOW!',
      tripwireHit:
        'LASER TRIPPED! DID YOU FORGET HOW TO JUMP?!',
      snitchAlert:
        'VICTOR CALLED YOUR SPLIT TIME—INTERCEPTING NOW!',
    },
  },
  {
    id: 'nwankwo',
    assignedLevelId: 4,
    name: 'Dr. Ngozi Nwankwo',
    shortName: 'Dr. Nwankwo',
    department: 'Campus Law',
    courseCode: 'LAW-215',
    traitBadge: 'Iron Prosecutor',
    description:
      'Razor-sharp Constitutional Law professor who turned Security Sector B into an ambush courtroom.',
    storyHook:
      'Accused of leaking Project Merit bylaws, Dr. Nwankwo bolted the twin security partitions—only Mr. Bako’s night intercoms can slip you past her verdict.',
    signatureQuote: 'Silence is not your right in Sector B—it is your confession.',
    accentColor: '#60a5fa',
    eyeColor: '#93c5fd',
    speedMultiplier: 1.1,
    visual: {
      silhouette: 'female',
      jacketColor: 0x172554,
      shirtColor: 0xf8fafc,
      pantsOrSkirtColor: 0x0f172a,
      tieOrAccentColor: 0x60a5fa,
      skinColor: 0x8f5a38,
      hairColor: 0x111827,
      eyeGlowColor: 0x60a5fa,
      hasGlasses: true,
      hasBun: true,
      hasCapOrCrown: false,
      prop: 'gavel',
      spotlightColor: 0xbfdbfe,
    },
    lines: {
      patrol: [
        'Section 9 of Blackwood Law grants me full lockdown authority.',
        'Every doorway in Sector B is logged under my jurisdiction.',
        'Objections are overruled before you open your mouth.',
      ],
      suspicious: [
        'Somebody tampered with the East wing partition?',
        'State your alibi—I heard footsteps behind the booth.',
      ],
      investigate: [
        'Issuing an immediate bench warrant for that corridor.',
        'Approaching the witness booth now.',
      ],
      chase: [
        'CONTEMPT OF COURT! STAND STILL FOR SENTENCING!',
        'You are fleeing an officer of Blackwood Law—guilty as charged!',
        'No appeal can save you once my gavel lands!',
      ],
      search: [
        'Hiding inside a guard locker constitutes obstruction of justice!',
        'Surrender the keycard and accept probation.',
      ],
      returnToPatrol: [
        'Case adjourned temporarily. Resuming perimeter surveillance.',
        'The law never sleeps in Sector B.',
      ],
      caught:
        'VERDICT: GUILTY! Expelled straight to midnight court archives!',
      lockdown:
        'Writ of Lockdown executed! Nobody exits Sector B!',
      playfulReact:
        'DISORDERLY CONDUCT IN MY TRIBUNAL?! CONTEMPT CHARGE ADDED!',
      tripwireHit:
        'PERIMETER ALARM BREACH—PROBABLE CAUSE CONFIRMED!',
      snitchAlert:
        'SWORN TESTIMONY RECEIVED FROM VICTOR—EXECUTING ARREST!',
    },
  },
  {
    id: 'babatunde',
    assignedLevelId: 5,
    name: 'Engr. Tobi Babatunde',
    shortName: 'Engr. Babatunde',
    department: 'Cybernetics & Robotics',
    courseCode: 'ENG-310',
    traitBadge: 'Cyber Visor',
    description:
      'Sleepless robotics prodigy armed with glowing cyan telemetry visors and router-linked lasers.',
    storyHook:
      'When Babatunde discovered someone hacked his Wi-Fi blackout experiment, he locked Computer Lab B-202 and linked sweeping cyan scanners to track every heartbeat.',
    signatureQuote: 'Your pulse rate is broadcasting in plain text, undergraduate.',
    accentColor: '#38bdf8',
    eyeColor: '#22d3ee',
    speedMultiplier: 1.12,
    visual: {
      silhouette: 'male',
      jacketColor: 0x0f172a,
      shirtColor: 0x0ea5e9,
      pantsOrSkirtColor: 0x1e293b,
      tieOrAccentColor: 0x22d3ee,
      skinColor: 0x7a4e32,
      hairColor: 0x090d16,
      eyeGlowColor: 0x22d3ee,
      hasGlasses: true,
      hasBun: false,
      hasCapOrCrown: false,
      prop: 'tablet',
      spotlightColor: 0x67e8f9,
    },
    lines: {
      patrol: [
        'Scanning Lab B-202 racks... latency unacceptable, intruders probable.',
        'Who killed the router firewall? My telemetry never lies.',
        'Stay out of my cyan sweep arcs if you value your transcript.',
      ],
      suspicious: [
        'Packet spike detected near Rack 3! Isolating source...',
        'Acoustic anomaly logged. Recalibrating optics.',
      ],
      investigate: [
        'Running physical diagnostic on that suspect coordinate.',
        'My visor locks onto movement faster than human eyes.',
      ],
      chase: [
        'TARGET ACQUIRED! EXECUTING HIGH-SPEED INTERCEPT!',
        'You cannot out-roll a cybernetics engineer—COMPUTING PATH!',
        'Firewall breached—terminating student session NOW!',
      ],
      search: [
        'Cable closets do not block thermal telemetry forever.',
        'Ping! Where did your signal disappear?',
      ],
      returnToPatrol: [
        'Signal lost. Returning to automated rack loop.',
        'Rebooting patrol subroutine.',
      ],
      caught:
        'Session terminated! Welcome to firmware debugging duty until sunrise!',
      lockdown:
        'Biometric server lockdown active—cyan scanners at 100% sweep!',
      playfulReact:
        'PAPER AIRPLANES IN A CLEANROOM SERVER LAB?!',
      tripwireHit:
        'CYAN SCANNER TRIPPED! INTRUDER PING LOCKED!',
      snitchAlert:
        'ADMIN PING FROM VICTOR—ROUTING TO YOUR COORDINATES!',
    },
  },
  {
    id: 'osei',
    assignedLevelId: 6,
    name: 'Prof. Mama Grace Osei',
    shortName: 'Prof. Osei',
    department: 'Culinary Chemistry',
    courseCode: 'NUT-201',
    traitBadge: 'Banquet Warden',
    description:
      'Fierce, booming Food Chemistry professor armed with an iron ladle and zero tolerance for food critics.',
    storyHook:
      'Outraged by anonymous cafeteria soup reviews, Mama Grace sealed the Banquet Hall—vault over long dining islands before she serves you raw detention.',
    signatureQuote: 'Criticize my banquet emulsion once more and you are on the menu!',
    accentColor: '#fb923c',
    eyeColor: '#111111',
    speedMultiplier: 1.14,
    visual: {
      silhouette: 'female',
      jacketColor: 0x7c2d12,
      shirtColor: 0xfef3c7,
      pantsOrSkirtColor: 0x451a03,
      tieOrAccentColor: 0xf59e0b,
      skinColor: 0x79482e,
      hairColor: 0x1c1917,
      eyeGlowColor: null,
      hasGlasses: false,
      hasBun: true,
      hasCapOrCrown: true,
      prop: 'ladle',
      spotlightColor: 0xfdba74,
    },
    lines: {
      patrol: [
        'Nobody leaves my cafeteria without praising the NUT-201 stew!',
        'Keep your dirty sneakers off my banquet tables!',
        'The freezer fuse stays hidden while dinner detention runs.',
      ],
      suspicious: [
        'Did somebody touch the serving counter?!',
        'I hear plates rattling near the pantry—who is sneaking snacks?!',
      ],
      investigate: [
        'Let Mama Grace check what is simmering over there!',
        'Inspecting the kitchen aisle with extreme prejudice.',
      ],
      chase: [
        'COME BACK HERE, UNGRATEFUL FOOD CRITIC!',
        'Vault all the banquet tables you want—Mama Grace moves FAST!',
        'Wait until my iron ladle grades your terrible manners!',
      ],
      search: [
        'Hiding in the pantry closet like stale bread?! Come out!',
        'Wait till I check every dishwasher cabinet in this hall!',
      ],
      returnToPatrol: [
        'Hmph. Dinner rush calmed down... back to the serving line.',
        'Returning to inspect the buffet counter.',
      ],
      caught:
        'Caught! You are peeling ten thousand yams in kitchen detention!',
      lockdown:
        'Cafeteria shutters slammed! No courtyard passes until dawn!',
      playfulReact:
        'NO DANCING ON MY BANQUET FLOOR WHILE SOUP IS SERVED!',
      tripwireHit:
        'KITCHEN ALARM RINGING—WHO TOUCHED THE THERMOSTAT?!',
      snitchAlert:
        'VICTOR SPOTTED THE SNACK THIEF! RUNNING OVER NOW!',
    },
  },
  {
    id: 'danjuma',
    assignedLevelId: 7,
    name: 'Prof. Ibrahim Danjuma',
    shortName: 'Prof. Danjuma',
    department: 'Forensic Economics',
    courseCode: 'ECO-402',
    traitBadge: 'Vault Auditor',
    description:
      'Calculating velvet-suited Economics professor guarding Blackwood’s secret Project Merit financial charter.',
    storyHook:
      'Every scholarship and bribe inside the Dean’s Trophy Vault bears Danjuma’s seal—slip past dual-height vault lasers to steal the Merit Charter under his nose.',
    signatureQuote: 'Every trespass has a price, and your interest compounds by the second.',
    accentColor: '#c084fc',
    eyeColor: '#e9d5ff',
    speedMultiplier: 1.15,
    visual: {
      silhouette: 'male',
      jacketColor: 0x3b0764,
      shirtColor: 0xfaf5ff,
      pantsOrSkirtColor: 0x1e1b4b,
      tieOrAccentColor: 0xfbbf24,
      skinColor: 0x86563a,
      hairColor: 0x27272a,
      eyeGlowColor: 0xc084fc,
      hasGlasses: true,
      hasBun: false,
      hasCapOrCrown: false,
      prop: 'ledger',
      spotlightColor: 0xe9d5ff,
    },
    lines: {
      patrol: [
        'Auditing vault inventory... the Project Merit Charter must remain sealed.',
        'Risk without collateral is foolishness, student.',
        'Every plinth in this vault is insured against Rank C thieves.',
      ],
      suspicious: [
        'An unauthorized withdrawal near the center plinth?',
        'Someone just disturbed my laser ledger.',
      ],
      investigate: [
        'Auditing that corridor right now.',
        'Let us verify the balance sheet in person.',
      ],
      chase: [
        'THIEF! RETURN THE CHARTER OR PAY WITH YOUR DEGREE!',
        'Bankruptcy of spirit—RUN BEFORE I SEIZE YOUR TRANSCRIPT!',
        'My compound interest runs faster than you do!',
      ],
      search: [
        'A trophy cabinet cannot shelter a fugitive from an audit.',
        'Show yourself and settle your tuition debt!',
      ],
      returnToPatrol: [
        'Loss mitigated. Resuming vault audit cycle.',
        'Returning to monitor the central charter.',
      ],
      caught:
        'Foreclosed! Your entire academic career is now under receivership!',
      lockdown:
        'Vault seals magnetized! No assets leave this room!',
      playfulReact:
        'TAUNTING AN AUDITOR INSIDE THE DEAN’S VAULT?!',
      tripwireHit:
        'DUAL LASER TRIPPED—SECURITY DEPOSIT FORFEITED!',
      snitchAlert:
        'INSIDER TIP FROM VICTOR—AUDITING YOUR POSITION NOW!',
    },
  },
  {
    id: 'adeyemi',
    assignedLevelId: 8,
    name: 'Dr. Evelyn Adeyemi',
    shortName: 'Dr. Adeyemi',
    department: 'High-Voltage Physics',
    courseCode: 'ELC-305',
    traitBadge: 'Blackout Stalker',
    description:
      'Eerie High-Voltage specialist who plunged Sector 8 into midnight darkness with glowing violet eyes.',
    storyHook:
      'Dr. Adeyemi killed the campus transformers to study panic in pitch-dark corridors—save your flashlight battery while hunting the reserve fuse through her labyrinth.',
    signatureQuote: 'Turn off your little lantern if you wish—I still hear sparks in your fear.',
    accentColor: '#a855f7',
    eyeColor: '#c084fc',
    speedMultiplier: 1.17,
    visual: {
      silhouette: 'female',
      jacketColor: 0x18181b,
      shirtColor: 0x581c87,
      pantsOrSkirtColor: 0x09090b,
      tieOrAccentColor: 0xa855f7,
      skinColor: 0x7b4c32,
      hairColor: 0x0f0f14,
      eyeGlowColor: 0xc084fc,
      hasGlasses: false,
      hasBun: true,
      hasCapOrCrown: false,
      prop: 'stun_rod',
      spotlightColor: 0xd8b4fe,
    },
    lines: {
      patrol: [
        'Zero voltage on the grid... listen to the concrete hum.',
        'Flashlights die fast in my blackout maze, student.',
        'Every partition bend hides another dark surprise.',
      ],
      suspicious: [
        'A faint beam of light cutting through the West corridor?',
        'Someone’s shoes clicked in the dark...',
      ],
      investigate: [
        'Following the residual static toward that turn.',
        'No lantern can save you in these S-corridors.',
      ],
      chase: [
        'LIGHTS OUT! RUN THROUGH THE LABYRINTH!',
        'High-voltage penalty coming straight behind you!',
        'Your battery is fading—AND I AM GAINING!',
      ],
      search: [
        'Utility lockers smell of cheap fear and dead batteries.',
        'Come out into the dark with Dr. Adeyemi.',
      ],
      returnToPatrol: [
        'Darkness settles again. Returning to patrol the grid.',
        'Conserving energy along the partition wall.',
      ],
      caught:
        'Short-circuited! Zero volts, zero escape, full detention!',
      lockdown:
        'Main breaker cut! Welcome to the Midnight Blackout Maze!',
      playfulReact:
        'MAKING NOISE IN A PITCH-DARK LABYRINTH?! FOOLISH!',
      tripwireHit:
        'GRID SURGE DETECTED—I SEE YOUR SILHOUETTE!',
      snitchAlert:
        'SIGNAL RELAYED FROM VICTOR—CLOSING IN THROUGH THE DARK!',
    },
  },
  {
    id: 'coker',
    assignedLevelId: 9,
    name: 'Prof. Desmond Coker',
    shortName: 'Prof. Coker',
    department: 'Behavioral Manipulation',
    courseCode: 'PSY-410',
    traitBadge: 'Merit Architect',
    description:
      'Machiavellian psychology professor who weaponized student rankings and turned Victor into an active snitch.',
    storyHook:
      'Coker promised Victor Adebayo automatic Rank S immunity to hunt his classmates down—use [Q] Paper Airplanes to break Victor’s patrol and survive the arena.',
    signatureQuote: 'Every student betrays their peers once Rank S is dangling over their head.',
    accentColor: '#f43f5e',
    eyeColor: '#fb7185',
    speedMultiplier: 1.19,
    visual: {
      silhouette: 'male',
      jacketColor: 0x3f0e1c,
      shirtColor: 0x18181b,
      pantsOrSkirtColor: 0x1f1218,
      tieOrAccentColor: 0xf43f5e,
      skinColor: 0x89593e,
      hairColor: 0x1c1917,
      eyeGlowColor: 0xf43f5e,
      hasGlasses: true,
      hasBun: false,
      hasCapOrCrown: false,
      prop: 'clipboard',
      spotlightColor: 0xfda4af,
    },
    lines: {
      patrol: [
        'Rank C resists, Rank A informs—pure behavioral symmetry.',
        'Victor, sweep the center carpet while I flank the pillars.',
        'Project Merit proves loyalty is purely transactional.',
      ],
      suspicious: [
        'A tremor behind the East pillar? Fascinating stress response.',
        'Do not bother hiding—your rival is watching too.',
      ],
      investigate: [
        'Approaching subject for live psychological observation.',
        'Let us test your flight reflex.',
      ],
      chase: [
        'BETRAYAL COMPLETE! NOW OUTRUN BOTH MENTOR AND RIVAL!',
        'No Rank C rebel survives PSY-410’s final evaluation!',
        'Panic makes your choices wonderfully predictable!',
      ],
      search: [
        'Honor lockers were built for broken alliances.',
        'Step out and sign your Rank D demotion.',
      ],
      returnToPatrol: [
        'Subject evaded contact. Adjusting behavioral model.',
        'Victor, resume center-lane sweep.',
      ],
      caught:
        'Experiment concluded: Rank C defeated by pure hierarchy!',
      lockdown:
        'Merit Arena sealed! Watch out for Victor on patrol!',
      playfulReact:
        'DEFIANT HUMOR UNDER PSYCHOLOGICAL PRESSURE?! NOTE THAT DOWN!',
      tripwireHit:
        'PERIMETER BREACH—SUBJECT CORNERED!',
      snitchAlert:
        'EXCELLENT WORK, VICTOR! CLOSING ON THE REBEL RIGHT NOW!',
    },
  },
  {
    id: 'musa',
    assignedLevelId: 10,
    name: 'Dr. Zainab Musa',
    shortName: 'Dr. Musa',
    department: 'Blackwood History',
    courseCode: 'HIS-499',
    traitBadge: 'Clocktower Keeper',
    description:
      'Obsessive Clocktower archivist guarding the bridge to the Principal’s Sanctum.',
    storyHook:
      'Before any student can face the Principal, Dr. Musa guards the Clocktower Penthouse archives—clear three sweeping alarms and seize the Sanctum Bridge Key.',
    signatureQuote: 'History belongs to those who lock the archive doors—and throw away the key.',
    accentColor: '#eab308',
    eyeColor: '#fde047',
    speedMultiplier: 1.22,
    visual: {
      silhouette: 'female',
      jacketColor: 0x2c2238,
      shirtColor: 0x78350f,
      pantsOrSkirtColor: 0x1c1917,
      tieOrAccentColor: 0xeab308,
      skinColor: 0x875538,
      hairColor: 0x111115,
      eyeGlowColor: 0xfde047,
      hasGlasses: true,
      hasBun: true,
      hasCapOrCrown: false,
      prop: 'hourglass',
      spotlightColor: 0xfef08a,
    },
    lines: {
      patrol: [
        'Ten wings behind you, yet the Clocktower stands unyielded.',
        'Nobody crosses to the Principal’s Sanctum without passing my archive!',
        'Watch the sweeping chimes—every second belongs to HIS-499.',
      ],
      suspicious: [
        'Clock gears clicking near the catwalk? Who dares?!',
        'A shadow crossed the brass handrail!',
      ],
      investigate: [
        'Climbing the catwalk to verify the disturbance.',
        'You will not rewrite Blackwood’s history tonight!',
      ],
      chase: [
        'YOUR FINAL HOUR HAS STRUCK! YOU SHALL NOT MEET THE PRINCIPAL!',
        'Run across the catwalk—my hourglass runs faster!',
        'Ten classes survived, yet Dr. Musa ends your streak HERE!',
      ],
      search: [
        'Clock gear closets have no exit to the courtyard!',
        'Step out before midnight chimes!',
      ],
      returnToPatrol: [
        'Pendulum steady. Returning to guard the Sanctum key.',
        'History remains safely under lock.',
      ],
      caught:
        'Archived forever! Stranded one floor shy of the Principal!',
      lockdown:
        'Clocktower bell struck! Only the Principal waits beyond this door!',
      playfulReact:
        'SHENANIGANS AT THE TOP OF THE CLOCKTOWER?! UNFORGIVABLE!',
      tripwireHit:
        'CLOCKTOWER LASER TRIPPED—INTERCEPTING ON THE CATWALK!',
      snitchAlert:
        'ALERT CONFIRMED—CHASING UP THE PENTHOUSE AISLE!',
    },
  },
  {
    id: 'principal',
    assignedLevelId: 11,
    isPrincipal: true,
    name: 'Principal Chief O. Blackwood',
    shortName: 'Principal Blackwood',
    department: 'Office of the Principal',
    courseCode: 'GRAD-500',
    traitBadge: 'THE PRINCIPAL · FINAL BOSS',
    description:
      'The supreme architect of Blackwood University and Project Merit—fast, ruthless, and adorned in ceremonial gold robes.',
    storyHook:
      'You outran all 10 crazy lecturers—now only Principal Chief Blackwood stands between you and Graduation. Unite Daniel, Amara, Nneka & Mr. Bako, clear 4 sanctum beams, and claim your diploma!',
    signatureQuote: 'I built these halls, I wrote the rankings, and I alone sign your graduation!',
    accentColor: '#fbbf24',
    eyeColor: '#fde047',
    speedMultiplier: 1.26,
    visual: {
      silhouette: 'principal',
      jacketColor: 0x0b0e14,
      shirtColor: 0xfef3c7,
      pantsOrSkirtColor: 0x111827,
      tieOrAccentColor: 0xfbbf24,
      skinColor: 0x79482d,
      hairColor: 0x9ca3af,
      eyeGlowColor: 0xfde047,
      hasGlasses: false,
      hasBun: false,
      hasCapOrCrown: true,
      prop: 'scepter',
      spotlightColor: 0xfde047,
    },
    lines: {
      patrol: [
        'Ten lecturers fell behind you... yet you dare enter the Principal’s Sanctum?',
        'Project Merit was never an experiment—it was my crucible.',
        'Nobody graduates from Blackwood University unless they outsmart ME.',
      ],
      suspicious: [
        'A Rank C student creeping near my ceremonial lectern?!',
        'I heard footsteps on my marble carpet. Reveal yourself!',
      ],
      investigate: [
        'Let the Principal personally audit this insolent graduate!',
        'Closing on your position—there is nowhere left to transfer!',
      ],
      chase: [
        'RUN FOR YOUR DIPLOMA! THE PRINCIPAL SHOWS ZERO MERCY!',
        'Outrun ALL TEN LECTURERS IF YOU MUST—YOU CANNOT ESCAPE BLACKWOOD!',
        'Your allies, your sprints, your rolls—NONE OF IT WILL SAVE YOUR GRADUATION!',
      ],
      search: [
        'No locker inside my sanctum hides a student from expulsion!',
        'Come out and face your final oral defense!',
      ],
      returnToPatrol: [
        'Hiding in shadows will not earn a diploma. Returning to the Grand Seal.',
        'Patrolling the Graduation Gate.',
      ],
      caught:
        'EXPELLED AT THE FINISH LINE! Blackwood University claims another permanent freshman!',
      lockdown:
        'SANCTUM SEALED! Outrun the Principal and unlock the Graduation Gate!',
      playfulReact:
        'THROWING PAPER PLANES AT THE PRINCIPAL OF BLACKWOOD UNIVERSITY?! EXPULSION!',
      tripwireHit:
        'SANCTUM LASER BREACH! PRINCIPAL INTERCEPT ENGAGED!',
      snitchAlert:
        'SECURITY ALERT LOGGED—THE PRINCIPAL IS HUNTING YOU!',
    },
  },
];

export function getLecturerDef(lecturerId: LecturerId): LecturerDef {
  return LECTURERS.find((l) => l.id === lecturerId) ?? LECTURERS[0];
}

export function getLecturerForLevel(levelId: number): LecturerDef {
  return LECTURERS.find((l) => l.assignedLevelId === levelId) ?? LECTURERS[0];
}
