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

export interface LecturerDef {
  id: LecturerId;
  name: string;
  shortName: string;
  department: string;
  courseCode: string;
  traitBadge: string;
  description: string;
  signatureQuote: string;
  accentColor: string;
  eyeColor: string;
  speedMultiplier: number;
  lines: LecturerDialogueSet;
}

export const LECTURERS: LecturerDef[] = [
  {
    id: 'maduka',
    name: 'Prof. Augustus B. Maduka',
    shortName: 'Prof. Maduka',
    department: 'Computer Science',
    courseCode: 'CS-301',
    traitBadge: 'Strict Disciplinarian',
    description:
      'Eccentric CS-301 mastermind obsessed with punctuality, pop quizzes, and Project Merit.',
    signatureQuote: 'In my class, even the clock must seek permission to stop.',
    accentColor: '#d99b43',
    eyeColor: '#111111',
    speedMultiplier: 1.0,
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
    name: 'Mrs. Misa',
    shortName: 'Mrs. Misa',
    department: 'Sociology',
    courseCode: 'SOC-204',
    traitBadge: 'Wicked · Red Eyes',
    description:
      'A ruthless, red-eyed Sociology lecturer who treats terrified students like deviant lab specimens.',
    signatureQuote: 'Society does not forgive latecomers—and neither do I.',
    accentColor: '#ef4444',
    eyeColor: '#ff1e2d',
    speedMultiplier: 1.07,
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
];

export function getLecturerDef(lecturerId: LecturerId): LecturerDef {
  return LECTURERS.find((l) => l.id === lecturerId) ?? LECTURERS[0];
}
