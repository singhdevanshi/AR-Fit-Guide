/*
 * App.tsx — Root component and routing for the WebAR Fitness Assistant
 *
 * The app has two main phases:
 *   1. Onboarding — collect user info and show exercise recommendations
 *   2. AR Workout — launch the camera, overlay the 3D skeleton, guide reps
 *
 * No routing library is used (no page transitions needed for a 2-phase app).
 */
import { useState } from "react";
import { OnboardingScreen } from "@/pages/OnboardingScreen";
import { WorkoutScreen } from "@/pages/WorkoutScreen";
import type { UserProfile, ExercisePlan } from "@/lib/fitness";
import { buildExercisePlan } from "@/lib/fitness";

type AppPhase = "onboarding" | "workout";

function App() {
  const [phase, setPhase] = useState<AppPhase>("onboarding");
  const [plan, setPlan] = useState<ExercisePlan | null>(null);

  function handleOnboardingComplete(profile: UserProfile) {
    const exercisePlan = buildExercisePlan(profile);
    setPlan(exercisePlan);
    setPhase("workout");
  }

  function handleBackToOnboarding() {
    setPhase("onboarding");
    setPlan(null);
  }

  return (
    <>
      {phase === "onboarding" && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}
      {phase === "workout" && plan && (
        <WorkoutScreen plan={plan} onBack={handleBackToOnboarding} />
      )}
    </>
  );
}

export default App;
