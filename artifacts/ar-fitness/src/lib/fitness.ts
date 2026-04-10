/*
 * fitness.ts — Core fitness logic: profiles, exercise library, and plan builder
 *
 * All fitness recommendations are rule-based (no AI model required).
 * Animations and rep counting are simulated for demo purposes.
 */

export type FitnessGoal = "weight_loss" | "strength" | "flexibility";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface UserProfile {
  age: number;
  goal: FitnessGoal;
  level: ExperienceLevel;
}

// ----- Exercise definitions -----

export type ExerciseId = "squats" | "arm_raises" | "lunges" | "push_ups" | "hip_flexor" | "shoulder_circles";

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
      exerciseIds = ["squats", "arm_raises"];
      recommendation = "Great starting combo! Squats burn calories while building lower body strength, and lateral arm raises target your shoulders. Focus on form over speed.";
    } else if (level === "intermediate") {
      exerciseIds = ["lunges", "squats"];
      recommendation = "These compound movements maximize calorie burn. Maintain control through each rep for best results.";
    } else {
      exerciseIds = ["lunges", "push_ups"];
      recommendation = "Intense compound work for maximum fat burn. Keep rest periods short between sets.";
    }
  } else if (goal === "strength") {
    if (level === "beginner") {
      exerciseIds = ["squats", "push_ups"];
      recommendation = "The classic strength foundation. Master squat and push-up form before adding load. Quality first!";
    } else if (level === "intermediate") {
      exerciseIds = ["push_ups", "lunges"];
      recommendation = "Push your upper and lower body with these strength builders. Go slow on the descent for maximum muscle engagement.";
    } else {
      exerciseIds = ["push_ups", "squats"];
      recommendation = "Advanced strength combo. Try tempo reps (3 seconds down, 1 second up) to increase difficulty without equipment.";
    }
  } else {
    // flexibility
    if (level === "beginner") {
      exerciseIds = ["hip_flexor", "shoulder_circles"];
      recommendation = "Perfect flexibility starters! These open up the two most commonly tight areas. Move slowly and breathe deeply.";
    } else if (level === "intermediate") {
      exerciseIds = ["hip_flexor", "arm_raises"];
      recommendation = "Great for improving overall mobility. Hold each stretch position for 2-3 seconds at peak range.";
    } else {
      exerciseIds = ["shoulder_circles", "hip_flexor"];
      recommendation = "Focus on maximizing your range of motion. Each circle should feel like you're drawing the largest possible arc.";
    }
  }

  // Age adjustment: suggest lower impact for age 60+
  if (age >= 60 && !["hip_flexor", "shoulder_circles", "arm_raises"].includes(exerciseIds[0])) {
    recommendation += " Take your time between reps — slow, controlled movement is safer and just as effective.";
  }

  return {
    exercises: exerciseIds.map((id) => EXERCISES[id]),
    recommendation,
  };
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

// Arms-raised pose
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
      // 0→0.5: stand → squat, 0.5→1: squat → stand
      const phase = t < 0.5 ? t * 2 : (1 - t) * 2;
      const pose = lerpPose(STAND, SQUAT_DEEP, phase);
      const angle = Math.round(180 - 90 * phase); // 180° standing → 90° at bottom
      return { pose, angleValue: angle, postureOk: angle >= 85 && angle <= 175 };
    }
    case "arm_raises": {
      const phase = t < 0.5 ? t * 2 : (1 - t) * 2;
      const pose = lerpPose(STAND, ARM_RAISE_UP, phase);
      const angle = Math.round(180 * phase); // 0° at side → 90° raised
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
      const phase = Math.sin(t * Math.PI); // ease in out
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
  }
}
