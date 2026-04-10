/*
 * OnboardingScreen.tsx — Collects user profile and shows exercise recommendation
 *
 * Flow:
 *   Step 1: Age input
 *   Step 2: Fitness goal selection
 *   Step 3: Experience level selection
 *   Step 4: Recommendation screen → "Start Workout" launches AR
 */

import { useState } from "react";
import type { UserProfile, FitnessGoal, ExperienceLevel } from "@/lib/fitness";
import { buildExercisePlan } from "@/lib/fitness";

interface OnboardingScreenProps {
  onComplete: (profile: UserProfile) => void;
}

type Step = 1 | 2 | 3 | 4;

const GOAL_OPTIONS: { value: FitnessGoal; label: string; icon: string; desc: string }[] = [
  { value: "weight_loss", label: "Weight Loss",   icon: "🔥", desc: "Burn calories and improve cardio" },
  { value: "strength",    label: "Strength",      icon: "💪", desc: "Build muscle and functional power" },
  { value: "flexibility", label: "Flexibility",   icon: "🧘", desc: "Improve range of motion and posture" },
];

const LEVEL_OPTIONS: { value: ExperienceLevel; label: string; desc: string }[] = [
  { value: "beginner",     label: "Beginner",     desc: "New to fitness or returning after a long break" },
  { value: "intermediate", label: "Intermediate", desc: "Train regularly with moderate intensity" },
  { value: "advanced",     label: "Advanced",     desc: "High-intensity training 4+ days/week" },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<Step>(1);
  const [age, setAge] = useState<string>("");
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [level, setLevel] = useState<ExperienceLevel | null>(null);

  const ageNum = parseInt(age, 10);
  const ageValid = !isNaN(ageNum) && ageNum >= 13 && ageNum <= 99;

  function handleStartWorkout() {
    if (!goal || !level || !ageValid) return;
    onComplete({ age: ageNum, goal, level });
  }

  const plan = goal && level && ageValid
    ? buildExercisePlan({ age: ageNum, goal, level })
    : null;

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-4 overflow-y-auto onboarding-scroll">
      {/* Logo / title */}
      <div className="mb-6 text-center screen-transition-enter">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="text-3xl">🏋️</span>
          <h1 className="text-2xl font-bold text-white tracking-tight">AR FitCoach</h1>
        </div>
        <p className="text-sm text-muted-foreground">Augmented Reality Fitness Assistant</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: s <= step ? "2rem" : "0.5rem",
              background: s <= step
                ? "hsl(142 72% 49%)"
                : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>

      {/* Step 1: Age */}
      {step === 1 && (
        <div className="w-full max-w-sm glass-panel p-6 screen-transition-enter">
          <h2 className="text-lg font-semibold text-white mb-1">How old are you?</h2>
          <p className="text-sm text-muted-foreground mb-5">We'll tailor the workout to your age group.</p>
          <input
            type="number"
            min={13}
            max={99}
            placeholder="Enter your age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="fitness-input mb-2"
            autoFocus
          />
          {age && !ageValid && (
            <p className="text-xs posture-bad mb-3">Please enter a valid age between 13 and 99.</p>
          )}
          <button
            className="btn-primary w-full mt-4 py-3 rounded-xl text-base"
            disabled={!ageValid}
            onClick={() => setStep(2)}
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Goal */}
      {step === 2 && (
        <div className="w-full max-w-sm glass-panel p-6 screen-transition-enter">
          <h2 className="text-lg font-semibold text-white mb-1">What's your goal?</h2>
          <p className="text-sm text-muted-foreground mb-5">Select the goal that fits you best.</p>
          <div className="flex flex-col gap-3">
            {GOAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGoal(opt.value)}
                className="flex items-start gap-3 p-4 rounded-xl border transition-all text-left"
                style={{
                  borderColor: goal === opt.value ? "hsl(142 72% 49%)" : "rgba(255,255,255,0.1)",
                  background: goal === opt.value
                    ? "hsl(142 72% 49% / 0.15)"
                    : "rgba(255,255,255,0.04)",
                }}
              >
                <span className="text-2xl mt-0.5">{opt.icon}</span>
                <div>
                  <p className="font-medium text-white text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
                {goal === opt.value && (
                  <span className="ml-auto text-primary text-base">✓</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button className="btn-secondary flex-1 py-3 rounded-xl" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary flex-1 py-3 rounded-xl" disabled={!goal} onClick={() => setStep(3)}>Continue</button>
          </div>
        </div>
      )}

      {/* Step 3: Level */}
      {step === 3 && (
        <div className="w-full max-w-sm glass-panel p-6 screen-transition-enter">
          <h2 className="text-lg font-semibold text-white mb-1">Experience level</h2>
          <p className="text-sm text-muted-foreground mb-5">This helps us set the right exercise intensity.</p>
          <div className="flex flex-col gap-3">
            {LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLevel(opt.value)}
                className="flex items-start gap-3 p-4 rounded-xl border transition-all text-left"
                style={{
                  borderColor: level === opt.value ? "hsl(142 72% 49%)" : "rgba(255,255,255,0.1)",
                  background: level === opt.value
                    ? "hsl(142 72% 49% / 0.15)"
                    : "rgba(255,255,255,0.04)",
                }}
              >
                <div className="flex-1">
                  <p className="font-medium text-white text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
                {level === opt.value && (
                  <span className="text-primary text-base self-center">✓</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button className="btn-secondary flex-1 py-3 rounded-xl" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary flex-1 py-3 rounded-xl" disabled={!level} onClick={() => setStep(4)}>See plan</button>
          </div>
        </div>
      )}

      {/* Step 4: Recommendation */}
      {step === 4 && plan && (
        <div className="w-full max-w-sm glass-panel p-6 screen-transition-enter">
          <h2 className="text-lg font-semibold text-white mb-1">Your workout plan</h2>
          <p className="text-sm text-muted-foreground mb-4">Based on your profile, here's what we recommend:</p>

          {/* Recommendation text */}
          <div className="tip-box p-3 mb-5 text-sm text-muted-foreground leading-relaxed">
            {plan.recommendation}
          </div>

          {/* Exercises */}
          <div className="flex flex-col gap-3 mb-6">
            {plan.exercises.map((ex, i) => (
              <div
                key={ex.id}
                className="flex gap-3 items-start p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "hsl(142 72% 49%)", color: "#000" }}
                >
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{ex.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ex.muscleGroup} · {ex.targetReps} reps</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ex.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Marker tip */}
          <div className="rounded-xl p-3 mb-5 text-xs text-muted-foreground flex gap-2"
            style={{ background: "rgba(142,72,49,0.08)", border: "1px solid rgba(142,255,120,0.15)" }}>
            <span className="text-base flex-shrink-0">📍</span>
            <span>
              <strong className="text-white">Tip:</strong> Point your camera at a <strong className="text-white">Hiro AR marker</strong> to anchor the 3D figure.
              Search "Hiro marker" to print one, or use the demo view without a marker.
            </span>
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1 py-3 rounded-xl" onClick={() => setStep(3)}>Back</button>
            <button className="btn-primary flex-1 py-3 rounded-xl text-base font-semibold" onClick={handleStartWorkout}>
              Start Workout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
