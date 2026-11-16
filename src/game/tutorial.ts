export interface TutorialProgressState {
  movedDistance: number;
  lookedRadians: number;
  sprinted: boolean;
  jumped: boolean;
  rolled: boolean;
  crouched: boolean;
  hidInLocker: boolean;
  talkedAlly: boolean;
  collectedFuse: boolean;
  restoredPower: boolean;
  collectedKey: boolean;
}

export interface TutorialStepView {
  id: 'move_look' | 'mobility' | 'stealth_ally' | 'escape_loop';
  title: string;
  phoneHint: string;
  laptopHint: string;
  done: boolean;
}

export interface TutorialSummary {
  steps: TutorialStepView[];
  completedCount: number;
  totalCount: number;
  activeStep: TutorialStepView;
  allPreExitDone: boolean;
}

export function createInitialTutorialState(): TutorialProgressState {
  return {
    movedDistance: 0,
    lookedRadians: 0,
    sprinted: false,
    jumped: false,
    rolled: false,
    crouched: false,
    hidInLocker: false,
    talkedAlly: false,
    collectedFuse: false,
    restoredPower: false,
    collectedKey: false,
  };
}

export function getTutorialSummary(state: TutorialProgressState): TutorialSummary {
  const step1Done = state.movedDistance >= 1.8 && state.lookedRadians >= 0.35;
  const step2Done = state.jumped && (state.sprinted || state.rolled);
  const step3Done = state.talkedAlly && (state.crouched || state.hidInLocker);
  const step4Done = state.collectedFuse && state.restoredPower && state.collectedKey;

  const steps: TutorialStepView[] = [
    {
      id: 'move_look',
      title: 'Move & Look Around',
      phoneHint: 'Drag Left Thumbstick to walk · Drag anywhere on Right Screen to look.',
      laptopHint: 'Use WASD / Arrows to walk · Swipe trackpad (2 fingers), drag mouse, or J/L to look.',
      done: step1Done,
    },
    {
      id: 'mobility',
      title: 'Sprint, Jump & Roll',
      phoneHint: 'Push thumbstick to the gold rim (or Sprint) · Tap Jump over the practice desk & Roll!',
      laptopHint: 'Hold/Tap Shift to Sprint · Press Space to Jump over the practice desk & R to Roll.',
      done: step2Done,
    },
    {
      id: 'stealth_ally',
      title: 'Talk to Ally & Stealth',
      phoneHint: 'Approach Daniel/Amara and tap Use · Try Crouch or hide inside the West Locker.',
      laptopHint: 'Walk to Daniel/Amara and press E · Try Crouch [C] or hide in the Locker [E].',
      done: step3Done,
    },
    {
      id: 'escape_loop',
      title: 'Fuse, Breaker & Exit Key',
      phoneHint: 'Grab the glowing Fuse -> tap Use at West Breaker -> grab Exit Key -> unlock South Door!',
      laptopHint: 'Grab the 30A Fuse [E] -> restore West Breaker [E] -> grab Key -> unlock South Exit!',
      done: step4Done,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const activeStep = steps.find((s) => !s.done) ?? steps[steps.length - 1];

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    activeStep,
    allPreExitDone: step1Done && step2Done && step3Done && step4Done,
  };
}
