/*
 * App.tsx — Root component and routing for the WebAR Fitness Assistant
 *
 * The app has three main phases:
 *   1. Onboarding  — collect user info and show exercise recommendations
 *   2. Dashboard   — profile overview, monthly calendar, today's workout
 *   3. AR Workout  — launch the camera, overlay the 3D skeleton, guide reps
 */
import { useState } from "react";
import { OnboardingScreen } from "@/pages/OnboardingScreen";
import { DashboardScreen }  from "@/pages/DashboardScreen";
import { WorkoutScreen }    from "@/pages/WorkoutScreen";
import type { UserProfile, ExercisePlan } from "@/lib/fitness";
import { buildExercisePlan } from "@/lib/fitness";

type AppPhase = "onboarding" | "dashboard" | "workout";

function App() {
  const [phase,   setPhase]   = useState<AppPhase>("onboarding");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan,    setPlan]    = useState<ExercisePlan | null>(null);

  function handleOnboardingComplete(userProfile: UserProfile) {
    const exercisePlan = buildExercisePlan(userProfile);
    setProfile(userProfile);
    setPlan(exercisePlan);
    setPhase("dashboard");
  }

  function handleStartWorkout() {
    setPhase("workout");
  }

  function handleBackToDashboard() {
    setPhase("dashboard");
  }

  function handleBackToOnboarding() {
    setPhase("onboarding");
    setProfile(null);
    setPlan(null);
  }

  return (
    <>
      {phase === "onboarding" && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}
      {phase === "dashboard" && profile && plan && (
        <DashboardScreen
          profile={profile}
          plan={plan}
          onStartWorkout={handleStartWorkout}
          onBack={handleBackToOnboarding}
        />
      )}
      {phase === "workout" && plan && (
        <WorkoutScreen plan={plan} onBack={handleBackToDashboard} />
      )}
    </>
  );
}

export default App;
