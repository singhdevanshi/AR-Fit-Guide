/*
 * fitness.ts — Core fitness logic: profiles, exercise library, and plan builder
 *
 * All fitness recommendations are rule-based (no AI model required).
 * Animations and rep counting are simulated for demo purposes.
 */

export type FitnessGoal = "weight_loss" | "strength" | "flexibility";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface UserProfile {
  name: string;
  age: number;
  height: number; // in cm
  weight: number; // in kg
  bmi: number;
  goal: FitnessGoal;
  level: ExperienceLevel;
}

// ----- Exercise definitions -----

export type ExerciseId =
  | "squats"
  | "arm_raises"
  | "lunges"
  | "push_ups"
  | "hip_flexor"
  | "shoulder_circles"
  | "bicep_curls"
  | "tricep_extensions"
  | "front_raises"
  | "overhead_press"
  | "chest_squeeze";

export interface PostureGuide {
  jointLabel: string;  // e.g. "Knee angle"
  targetAngle: number; // degrees
  tip: string;
}

export interface Exercise {
  id: ExerciseId;
  name: string;
  description: string;
  targetReps: number;
  repDurationMs: number; // how long one simulated rep takes in ms
  postureGuide: PostureGuide;
  muscleGroup: string;
}

export const EXERCISES: Record<ExerciseId, Exercise> = {
  squats: {
    id: "squats",
    name: "Squats",
    description: "Stand with feet shoulder-width apart. Lower your hips until thighs are parallel to the floor, then push back up.",
    targetReps: 12,
    repDurationMs: 2500,
    muscleGroup: "Legs & Glutes",
    postureGuide: {
      jointLabel: "Knee angle",
      targetAngle: 90,
      tip: "Keep knees behind toes. Drive through your heels as you rise.",
    },
  },
  arm_raises: {
    id: "arm_raises",
    name: "Lateral Arm Raises",
    description: "Stand tall, arms at sides. Raise both arms out to shoulder height, hold 1 second, then lower slowly.",
    targetReps: 15,
    repDurationMs: 2000,
    muscleGroup: "Shoulders",
    postureGuide: {
      jointLabel: "Shoulder angle",
      targetAngle: 90,
      tip: "Keep a slight bend at the elbow. Don't shrug your shoulders.",
    },
  },
  lunges: {
    id: "lunges",
    name: "Reverse Lunges",
    description: "Stand upright. Step one foot back and lower your rear knee toward the floor, then return to start.",
    targetReps: 10,
    repDurationMs: 3000,
    muscleGroup: "Legs & Core",
    postureGuide: {
      jointLabel: "Front knee angle",
      targetAngle: 90,
      tip: "Keep your torso upright. Front knee should stay above your ankle.",
    },
  },
  push_ups: {
    id: "push_ups",
    name: "Push-Ups",
    description: "Start in a plank position. Lower chest to the floor while keeping your body straight, then push back up.",
    targetReps: 10,
    repDurationMs: 2800,
    muscleGroup: "Chest & Triceps",
    postureGuide: {
      jointLabel: "Elbow angle",
      targetAngle: 90,
      tip: "Keep core tight. Don't let your hips sag or pike up.",
    },
  },
  hip_flexor: {
    id: "hip_flexor",
    name: "Hip Flexor Stretch",
    description: "Kneel on one knee, other foot forward. Gently push hips forward until you feel a stretch in the front of your hip.",
    targetReps: 8,
    repDurationMs: 4000,
    muscleGroup: "Hip Flexors",
    postureGuide: {
      jointLabel: "Hip angle",
      targetAngle: 110,
      tip: "Keep your torso upright. Breathe into the stretch — don't rush.",
    },
  },
  shoulder_circles: {
    id: "shoulder_circles",
    name: "Shoulder Circles",
    description: "Stand tall and rotate both shoulders in large, slow circles — forward 10 times, then backward 10 times.",
    targetReps: 20,
    repDurationMs: 1500,
    muscleGroup: "Shoulder Mobility",
    postureGuide: {
      jointLabel: "Arm arc",
      targetAngle: 180,
      tip: "Make the circles as large as comfortable. Roll fully through the range of motion.",
    },
  },
  bicep_curls: {
    id: "bicep_curls",
    name: "Bicep Curls",
    description: "Stand tall, arms at sides, palms facing forward. Curl both forearms up toward your shoulders, squeezing the biceps, then lower slowly.",
    targetReps: 15,
    repDurationMs: 2200,
    muscleGroup: "Biceps",
    postureGuide: {
      jointLabel: "Elbow angle",
      targetAngle: 45,
      tip: "Keep elbows pinned at your sides — only your forearms should move. Squeeze at the top.",
    },
  },
  tricep_extensions: {
    id: "tricep_extensions",
    name: "Overhead Tricep Extensions",
    description: "Stand tall, clasp hands and raise both arms overhead. Slowly lower your forearms behind your head, then extend back up.",
    targetReps: 12,
    repDurationMs: 2500,
    muscleGroup: "Triceps",
    postureGuide: {
      jointLabel: "Elbow angle",
      targetAngle: 90,
      tip: "Keep upper arms stationary and close to your ears. Don't flare the elbows out.",
    },
  },
  front_raises: {
    id: "front_raises",
    name: "Front Raises",
    description: "Stand tall, arms hanging in front. Raise both arms straight forward to shoulder height, hold briefly, then lower with control.",
    targetReps: 15,
    repDurationMs: 2000,
    muscleGroup: "Front Deltoids",
    postureGuide: {
      jointLabel: "Shoulder angle",
      targetAngle: 90,
      tip: "Raise arms to shoulder height only. Keep a slight bend at the elbows and avoid swinging.",
    },
  },
  overhead_press: {
    id: "overhead_press",
    name: "Overhead Press",
    description: "Start with arms at shoulder height, elbows bent. Press both arms fully overhead until elbows are locked out, then lower back down.",
    targetReps: 12,
    repDurationMs: 2300,
    muscleGroup: "Shoulders & Triceps",
    postureGuide: {
      jointLabel: "Arm extension",
      targetAngle: 170,
      tip: "Lock out overhead fully. Keep your core braced — don't arch your lower back.",
    },
  },
  chest_squeeze: {
    id: "chest_squeeze",
    name: "Chest Squeeze",
    description: "Stand tall, arms outstretched to the sides at chest height. Sweep both arms together in front of your chest, squeezing hard, then open wide.",
    targetReps: 15,
    repDurationMs: 2000,
    muscleGroup: "Chest & Shoulders",
    postureGuide: {
      jointLabel: "Arm spread",
      targetAngle: 60,
      tip: "Imagine hugging a barrel. Squeeze the chest at the peak and maintain a slight bend at the elbow.",
    },
  },
};

// ----- Plan builder -----

export interface ExercisePlan {
  exercises: Exercise[];
  recommendation: string;
}

export function buildExercisePlan(profile: UserProfile): ExercisePlan {
  const { goal, level, age } = profile;
  let exerciseIds: ExerciseId[] = [];
  let recommendation = "";

  // Rule-based selection: goal × level matrix
  if (goal === "weight_loss") {
    if (level === "beginner") {
      exerciseIds = ["bicep_curls", "arm_raises"];
      recommendation = "Great start! Bicep curls and lateral raises work your arms while keeping things low-impact. Focus on controlled movement over speed.";
    } else if (level === "intermediate") {
      exerciseIds = ["front_raises", "squats"];
      recommendation = "This combo targets shoulders and legs for a calorie-burning full-body effect. Maintain good form throughout each set.";
    } else {
      exerciseIds = ["overhead_press", "lunges"];
      recommendation = "Intense full-body work for maximum fat burn. Keep rest periods short and drive through every rep.";
    }
  } else if (goal === "strength") {
    if (level === "beginner") {
      exerciseIds = ["bicep_curls", "overhead_press"];
      recommendation = "Classic arm strength starters. Master the curl and press form before adding load — quality builds results!";
    } else if (level === "intermediate") {
      exerciseIds = ["tricep_extensions", "bicep_curls"];
      recommendation = "Superset your biceps and triceps for maximum arm strength gains. Go slow on the eccentric (lowering) phase.";
    } else {
      exerciseIds = ["overhead_press", "push_ups"];
      recommendation = "Advanced upper-body combo. Try slow negatives (3 sec down, 1 sec up) to maximize tension without equipment.";
    }
  } else {
    // flexibility
    if (level === "beginner") {
      exerciseIds = ["hip_flexor", "shoulder_circles"];
      recommendation = "Perfect flexibility starters! These open the two most commonly tight areas. Move slowly and breathe deeply.";
    } else if (level === "intermediate") {
      exerciseIds = ["chest_squeeze", "arm_raises"];
      recommendation = "Great for shoulder and chest mobility. Hold each end-range position for 2–3 seconds to build lasting flexibility.";
    } else {
      exerciseIds = ["shoulder_circles", "chest_squeeze"];
      recommendation = "Focus on maximizing your range of motion. Each movement should feel like you're reaching the edge of your comfortable range.";
    }
  }

  // Age adjustment: suggest lower impact for age 60+
  if (age >= 60 && !["hip_flexor", "shoulder_circles", "arm_raises", "bicep_curls", "front_raises", "chest_squeeze"].includes(exerciseIds[0])) {
    recommendation += " Take your time between reps — slow, controlled movement is safer and just as effective.";
  }

  return {
    exercises: exerciseIds.map((id) => EXERCISES[id]),
    recommendation,
  };
}

// ----- Weekly schedule builder -----

// The pool of exercises recommended for each goal
export const GOAL_EXERCISE_POOL: Record<FitnessGoal, ExerciseId[]> = {
  weight_loss: ["squats", "lunges", "arm_raises", "front_raises", "bicep_curls", "chest_squeeze", "overhead_press"],
  strength:    ["push_ups", "squats", "bicep_curls", "tricep_extensions", "overhead_press", "lunges", "chest_squeeze"],
  flexibility: ["hip_flexor", "shoulder_circles", "arm_raises", "front_raises", "chest_squeeze", "bicep_curls"],
};

// Days of week (0=Sun…6=Sat) on which workouts are scheduled per goal
export const GOAL_WORKOUT_DAYS: Record<FitnessGoal, number[]> = {
  weight_loss: [1, 2, 3, 4, 5],      // Mon–Fri (5 days)
  strength:    [1, 3, 5],            // Mon, Wed, Fri (3 days)
  flexibility: [0, 1, 2, 3, 4, 5, 6], // Every day
};

/**
 * Return 2 exercise IDs for a given day-of-month within the schedule,
 * cycling through the exercise pool.
 */
export function getExercisesForDay(goal: FitnessGoal, dayOfMonth: number): Exercise[] {
  const pool = GOAL_EXERCISE_POOL[goal];
  const idx = (dayOfMonth - 1) % Math.floor(pool.length / 2);
  return [EXERCISES[pool[idx * 2 % pool.length]], EXERCISES[pool[(idx * 2 + 1) % pool.length]]];
}

/**
 * Returns true if the given day-of-week is a workout day for the goal.
 */
export function isWorkoutDay(goal: FitnessGoal, dayOfWeek: number): boolean {
  return GOAL_WORKOUT_DAYS[goal].includes(dayOfWeek);
}

// ----- Animation frame data for stick figure -----

/*
 * Each exercise has animation keyframes that control joint positions.
 * Values are in normalized units (0–1) that the AR renderer maps to actual 3D coordinates.
 *
 * Joints tracked:
 *   - head, neck, leftShoulder, rightShoulder
 *   - leftElbow, rightElbow, leftHand, rightHand
 *   - hip, leftKnee, rightKnee, leftFoot, rightFoot
 */
export type JointName =
  | "head" | "neck"
  | "leftShoulder" | "rightShoulder"
  | "leftElbow" | "rightElbow"
  | "leftHand" | "rightHand"
  | "hip" | "leftKnee" | "rightKnee"
  | "leftFoot" | "rightFoot";

export type Pose = Record<JointName, [number, number, number]>; // [x, y, z]

export interface AnimationKeyframe {
  t: number; // 0–1 within the rep cycle
  pose: Pose;
  angleValue: number; // current angle at the target joint (degrees)
  postureOk: boolean; // is the user in correct posture at this frame?
}

// Standing neutral pose
const STAND: Pose = {
  head:          [ 0,  2.2,  0],
  neck:          [ 0,  1.9,  0],
  leftShoulder:  [-0.3, 1.7, 0],
  rightShoulder: [ 0.3, 1.7, 0],
  leftElbow:     [-0.45, 1.3, 0],
  rightElbow:    [ 0.45, 1.3, 0],
  leftHand:      [-0.5, 0.95, 0],
  rightHand:     [ 0.5, 0.95, 0],
  hip:           [ 0,  1.15, 0],
  leftKnee:      [-0.2, 0.6, 0],
  rightKnee:     [ 0.2, 0.6, 0],
  leftFoot:      [-0.25, 0.0, 0],
  rightFoot:     [ 0.25, 0.0, 0],
};

// Deep squat pose
const SQUAT_DEEP: Pose = {
  head:          [ 0,  1.4, 0.1],
  neck:          [ 0,  1.2, 0.1],
  leftShoulder:  [-0.3, 1.05, 0.1],
  rightShoulder: [ 0.3, 1.05, 0.1],
  leftElbow:     [-0.4, 0.85, 0.15],
  rightElbow:    [ 0.4, 0.85, 0.15],
  leftHand:      [-0.35, 0.65, 0.2],
  rightHand:     [ 0.35, 0.65, 0.2],
  hip:           [ 0,  0.55, 0],
  leftKnee:      [-0.3, 0.28, 0.12],
  rightKnee:     [ 0.3, 0.28, 0.12],
  leftFoot:      [-0.3, 0.0, 0],
  rightFoot:     [ 0.3, 0.0, 0],
};

// Arms-raised pose (lateral raise)
const ARM_RAISE_UP: Pose = {
  ...STAND,
  leftElbow:  [-0.55, 1.7, 0],
  rightElbow: [ 0.55, 1.7, 0],
  leftHand:   [-0.7,  1.72, 0],
  rightHand:  [ 0.7,  1.72, 0],
};

// Lunge bottom pose
const LUNGE_DOWN: Pose = {
  head:          [ 0.1, 1.6, 0],
  neck:          [ 0.1, 1.35, 0],
  leftShoulder:  [-0.2, 1.2, 0],
  rightShoulder: [ 0.35, 1.2, 0],
  leftElbow:     [-0.3, 0.9, 0],
  rightElbow:    [ 0.45, 0.9, 0],
  leftHand:      [-0.35, 0.6, 0],
  rightHand:     [ 0.5, 0.6, 0],
  hip:           [ 0.1, 0.75, 0],
  leftKnee:      [-0.1, 0.5, -0.3],
  rightKnee:     [ 0.3, 0.35, 0.3],
  leftFoot:      [-0.1, 0.0, -0.5],
  rightFoot:     [ 0.35, 0.0, 0.3],
};

// Push-up bottom pose
const PUSHUP_DOWN: Pose = {
  head:          [ 0,  0.6,  0.7],
  neck:          [ 0,  0.5,  0.5],
  leftShoulder:  [-0.3, 0.6, 0.3],
  rightShoulder: [ 0.3, 0.6, 0.3],
  leftElbow:     [-0.4, 0.35, 0.1],
  rightElbow:    [ 0.4, 0.35, 0.1],
  leftHand:      [-0.4, 0.05, -0.1],
  rightHand:     [ 0.4, 0.05, -0.1],
  hip:           [ 0,  0.55, -0.1],
  leftKnee:      [-0.2, 0.3, -0.5],
  rightKnee:     [ 0.2, 0.3, -0.5],
  leftFoot:      [-0.2, 0.05,-0.9],
  rightFoot:     [ 0.2, 0.05,-0.9],
};

// Push-up top pose (arms extended)
const PUSHUP_UP: Pose = {
  ...PUSHUP_DOWN,
  head:          [ 0,  0.9,  0.65],
  neck:          [ 0,  0.75, 0.5],
  leftShoulder:  [-0.3, 0.85, 0.25],
  rightShoulder: [ 0.3, 0.85, 0.25],
  leftElbow:     [-0.4, 0.7, 0],
  rightElbow:    [ 0.4, 0.7, 0],
};

// Hip flexor stretch
const HIP_STRETCH: Pose = {
  head:          [ 0,  1.9, 0],
  neck:          [ 0,  1.7, 0],
  leftShoulder:  [-0.3, 1.5, 0],
  rightShoulder: [ 0.3, 1.5, 0],
  leftElbow:     [-0.45, 1.15, 0],
  rightElbow:    [ 0.45, 1.15, 0],
  leftHand:      [-0.5, 0.8, 0],
  rightHand:     [ 0.5, 0.8, 0],
  hip:           [ 0.1,  0.75, 0],
  leftKnee:      [-0.2, 0.0,  0],
  rightKnee:     [ 0.35, 0.4,  0.4],
  leftFoot:      [-0.2, 0.0, -0.1],
  rightFoot:     [ 0.4, 0.0,  0.7],
};

// Shoulder circle: arm sweeping up
const SHOULDER_UP: Pose = {
  ...STAND,
  leftElbow:  [-0.55, 2.05, 0],
  rightElbow: [ 0.55, 2.05, 0],
  leftHand:   [-0.5,  2.3, 0],
  rightHand:  [ 0.5,  2.3, 0],
};

// Bicep curl — top (arms curled up toward shoulders)
const BICEP_CURL_TOP: Pose = {
  ...STAND,
  leftElbow:  [-0.35, 1.55, 0.1],
  rightElbow: [ 0.35, 1.55, 0.1],
  leftHand:   [-0.3,  1.82, 0.18],
  rightHand:  [ 0.3,  1.82, 0.18],
};

// Tricep extension — top (arms extended straight overhead)
const TRICEP_TOP: Pose = {
  ...STAND,
  leftElbow:  [-0.22, 2.15, 0],
  rightElbow: [ 0.22, 2.15, 0],
  leftHand:   [-0.18, 2.45, 0],
  rightHand:  [ 0.18, 2.45, 0],
};

// Tricep extension — bottom (forearms behind head)
const TRICEP_BOTTOM: Pose = {
  ...STAND,
  leftElbow:  [-0.22, 2.1, 0],
  rightElbow: [ 0.22, 2.1, 0],
  leftHand:   [-0.15, 1.62, -0.12],
  rightHand:  [ 0.15, 1.62, -0.12],
};

// Front raises — arms raised forward to shoulder height
const FRONT_RAISE_UP: Pose = {
  ...STAND,
  leftElbow:  [-0.32, 1.7, 0.28],
  rightElbow: [ 0.32, 1.7, 0.28],
  leftHand:   [-0.3,  1.72, 0.52],
  rightHand:  [ 0.3,  1.72, 0.52],
};

// Overhead press — start (hands at shoulder level, elbows bent)
const OVERHEAD_PRESS_START: Pose = {
  ...STAND,
  leftElbow:  [-0.42, 1.7, 0],
  rightElbow: [ 0.42, 1.7, 0],
  leftHand:   [-0.38, 1.92, 0],
  rightHand:  [ 0.38, 1.92, 0],
};

// Overhead press — top (arms fully extended overhead)
const OVERHEAD_PRESS_TOP: Pose = {
  ...STAND,
  leftElbow:  [-0.28, 2.12, 0],
  rightElbow: [ 0.28, 2.12, 0],
  leftHand:   [-0.22, 2.42, 0],
  rightHand:  [ 0.22, 2.42, 0],
};

// Chest squeeze — open (arms spread wide at chest height)
const CHEST_OPEN: Pose = {
  ...STAND,
  leftElbow:  [-0.72, 1.62, 0],
  rightElbow: [ 0.72, 1.62, 0],
  leftHand:   [-0.92, 1.55, 0],
  rightHand:  [ 0.92, 1.55, 0],
};

// Chest squeeze — closed (arms pulled in front of chest)
const CHEST_CLOSED: Pose = {
  ...STAND,
  leftElbow:  [-0.2,  1.62, 0.32],
  rightElbow: [ 0.2,  1.62, 0.32],
  leftHand:   [-0.08, 1.55, 0.45],
  rightHand:  [ 0.08, 1.55, 0.45],
};

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const result: Partial<Pose> = {};
  for (const key of Object.keys(a) as JointName[]) {
    result[key] = [
      a[key][0] + (b[key][0] - a[key][0]) * t,
      a[key][1] + (b[key][1] - a[key][1]) * t,
      a[key][2] + (b[key][2] - a[key][2]) * t,
    ];
  }
  return result as Pose;
}

export function getPoseAtTime(exerciseId: ExerciseId, t: number): { pose: Pose; angleValue: number; postureOk: boolean } {
  /*
   * t is 0–1 within one rep cycle.
   * Each exercise returns an interpolated pose and current angle.
   */
  switch (exerciseId) {
    case "squats": {
      const phase = t < 0.5 ? t * 2 : (1 - t) * 2;
      const pose = lerpPose(STAND, SQUAT_DEEP, phase);
      const angle = Math.round(180 - 90 * phase);
      return { pose, angleValue: angle, postureOk: angle >= 85 && angle <= 175 };
    }
    case "arm_raises": {
      const phase = t < 0.5 ? t * 2 : (1 - t) * 2;
      const pose = lerpPose(STAND, ARM_RAISE_UP, phase);
      const angle = Math.round(180 * phase);
      return { pose, angleValue: angle, postureOk: angle >= 75 && angle <= 95 };
    }
    case "lunges": {
      const phase = t < 0.5 ? t * 2 : (1 - t) * 2;
      const pose = lerpPose(STAND, LUNGE_DOWN, phase);
      const angle = Math.round(180 - 90 * phase);
      return { pose, angleValue: angle, postureOk: angle >= 80 && angle <= 100 };
    }
    case "push_ups": {
      const phase = t < 0.5 ? t * 2 : (1 - t) * 2;
      const pose = lerpPose(PUSHUP_UP, PUSHUP_DOWN, phase);
      const angle = Math.round(180 - 90 * phase);
      return { pose, angleValue: angle, postureOk: angle >= 80 && angle <= 100 };
    }
    case "hip_flexor": {
      const phase = Math.sin(t * Math.PI);
      const pose = lerpPose(STAND, HIP_STRETCH, phase);
      const angle = Math.round(180 - 70 * phase);
      return { pose, angleValue: angle, postureOk: angle >= 100 && angle <= 130 };
    }
    case "shoulder_circles": {
      const phase = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
      const pose = lerpPose(STAND, SHOULDER_UP, phase);
      const angle = Math.round(360 * t);
      return { pose, angleValue: angle % 360, postureOk: true };
    }
    case "bicep_curls": {
      // 0→0.5: arms down → curled up, 0.5→1: curled → back down
      const phase = t < 0.5 ? t * 2 : (1 - t) * 2;
      const pose = lerpPose(STAND, BICEP_CURL_TOP, phase);
      const angle = Math.round(180 - 135 * phase); // 180° extended → ~45° curled
      return { pose, angleValue: angle, postureOk: angle >= 30 && angle <= 60 };
    }
    case "tricep_extensions": {
      // 0→0.5: top → bottom (lower behind head), 0.5→1: bottom → top
      const phase = t < 0.5 ? t * 2 : (1 - t) * 2;
      const pose = lerpPose(TRICEP_TOP, TRICEP_BOTTOM, phase);
      const angle = Math.round(170 - 80 * phase); // 170° extended → 90° bent
      return { pose, angleValue: angle, postureOk: angle >= 80 && angle <= 105 };
    }
    case "front_raises": {
      const phase = t < 0.5 ? t * 2 : (1 - t) * 2;
      const pose = lerpPose(STAND, FRONT_RAISE_UP, phase);
      const angle = Math.round(90 * phase); // 0° at side → 90° in front
      return { pose, angleValue: angle, postureOk: angle >= 80 && angle <= 100 };
    }
    case "overhead_press": {
      const phase = t < 0.5 ? t * 2 : (1 - t) * 2;
      const pose = lerpPose(OVERHEAD_PRESS_START, OVERHEAD_PRESS_TOP, phase);
      const angle = Math.round(90 + 80 * phase); // 90° start → 170° lockout
      return { pose, angleValue: angle, postureOk: angle >= 155 && angle <= 175 };
    }
    case "chest_squeeze": {
      // 0→0.5: open → squeeze, 0.5→1: squeeze → open
      const phase = t < 0.5 ? t * 2 : (1 - t) * 2;
      const pose = lerpPose(CHEST_OPEN, CHEST_CLOSED, phase);
      const angle = Math.round(180 - 120 * phase); // 180° open → 60° squeezed
      return { pose, angleValue: angle, postureOk: angle >= 50 && angle <= 75 };
    }
  }
}
