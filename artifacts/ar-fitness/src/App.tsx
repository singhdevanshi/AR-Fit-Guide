import { useState } from "react";
import type { UserProfile } from "@/lib/fitness";
import { buildExercisePlan } from "@/lib/fitness";
import { DashboardScreen } from "@/pages/DashboardScreen";
import { WorkoutScreen } from "@/pages/WorkoutScreen";
import { OnboardingScreen } from "@/pages/OnboardingScreen";
import { CelebrationScreen } from "@/pages/CelebrationScreen";

export default function App() {
  // Safe state persistence: Load from local storage if it exists!
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("ar-fit-profile");
    return saved ? JSON.parse(saved) : null;
  });
  
  // Manage which screen is active
  const [view, setView] = useState<"onboarding" | "dashboard" | "workout" | "celebration">(
    profile ? "dashboard" : "onboarding"
  );
  const [completedToday, setCompletedToday] = useState(false);

  const handleProfileComplete = (p: UserProfile) => {
    setProfile(p);
    localStorage.setItem("ar-fit-profile", JSON.stringify(p));
    setView("dashboard");
  };

  const plan = profile ? buildExercisePlan(profile) : null;

  if (!profile || view === "onboarding") {
    return <OnboardingScreen onComplete={handleProfileComplete} />;
  }

  if (view === "workout" && plan) {
    return (
      <WorkoutScreen
        plan={plan}
        onBack={() => setView("dashboard")} // Safely return to dashboard!
        onCompleteWorkout={() => {
          setCompletedToday(true);
          setView("celebration");
        }}
      />
    );
  }

  if (view === "celebration") {
    return <CelebrationScreen onFinish={() => setView("dashboard")} />;
  }

  return (
    <DashboardScreen
      profile={profile}
      plan={plan!}
      completedToday={completedToday}
      onStartWorkout={() => setView("workout")}
      onBack={() => {
        // Allow user to completely reset the app by hitting back on the dashboard
        localStorage.removeItem("ar-fit-profile");
        setProfile(null);
        setView("onboarding");
        setCompletedToday(false);
      }}
    />
  );
}