/*
 * DashboardScreen.tsx — Profile overview and monthly workout calendar
 *
 * Shows:
 *  - Profile card (age, goal, experience level)
 *  - Today's recommended exercises
 *  - Monthly calendar with workout days highlighted
 *  - Navigation to start AR workout or go back to onboarding
 */

import { useMemo, useState } from "react";
import type { UserProfile, ExercisePlan } from "@/lib/fitness";
import { getExercisesForDay, isWorkoutDay } from "@/lib/fitness";

interface DashboardScreenProps {
  profile: UserProfile;
  plan: ExercisePlan;
  onStartWorkout: () => void;
  onBack: () => void;
}

const GOAL_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  weight_loss: { label: "Weight Loss",   icon: "🔥", color: "#f97316" },
  strength:    { label: "Strength",      icon: "💪", color: "#22c55e" },
  flexibility: { label: "Flexibility",   icon: "🧘", color: "#a78bfa" },
};

const LEVEL_LABELS: Record<string, { label: string; badge: string }> = {
  beginner:     { label: "Beginner",     badge: "#3b82f6" },
  intermediate: { label: "Intermediate", badge: "#f59e0b" },
  advanced:     { label: "Advanced",     badge: "#ef4444" },
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function DashboardScreen({ profile, plan, onStartWorkout, onBack }: DashboardScreenProps) {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth();

  const goalInfo  = GOAL_LABELS[profile.goal];
  const levelInfo = LEVEL_LABELS[profile.level];

  // Build calendar data for the current month
  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{
      day: number | null;
      isToday: boolean;
      isWorkout: boolean;
      exercises: string[];
    }> = [];

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, isToday: false, isWorkout: false, exercises: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(year, month, d).getDay();
      const workout   = isWorkoutDay(profile.goal, dayOfWeek);
      const exList    = workout ? getExercisesForDay(profile.goal, d) : [];
      cells.push({
        day: d,
        isToday: d === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
        isWorkout: workout,
        exercises: exList.map((e) => e.name),
      });
    }

    return cells;
  }, [profile.goal, year, month, today]);

  // Today's workout exercises from the plan
  const todayDayOfWeek = today.getDay();
  const todayIsWorkout = isWorkoutDay(profile.goal, todayDayOfWeek);

  // Count workouts remaining this month
  const workoutsThisMonth = calendarData.filter((c) => c.day !== null && c.isWorkout).length;
  const workoutsDone = calendarData.filter(
    (c) => c.day !== null && c.isWorkout && c.day < today.getDate(),
  ).length;
  const workoutsLeft = workoutsThisMonth - workoutsDone;

  const [showSettings, setShowSettings] = useState(false);
  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(160deg, #0a0f1a 0%, #0d1828 60%, #0a1a14 100%)",
      color: "#f0f4f8",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
{/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(10,15,26,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} className="btn-secondary rounded-lg px-3 py-1 text-sm text-muted-foreground">← Back</button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#f0f4f8" }}>My Dashboard</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{MONTH_NAMES[month]} {year}</div>
          </div>
        </div>
        
        {/* Fake Profile/Settings Button */}
        <button 
          onClick={() => setShowSettings(!showSettings)}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            border: "2px solid #ffffff33", display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          ⚙️
        </button>
      </div>

      {/* Fake Settings Modal */}
      {showSettings && (
        <div style={{
          position: "absolute", top: 70, right: 20, width: 220, zIndex: 50,
          background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: 16,
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 12 }}>Account Settings</h3>
          <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="text-left hover:text-white transition-colors">👤 Edit Profile</button>
            <button className="text-left hover:text-white transition-colors">🔔 Notifications</button>
            <button className="text-left hover:text-white transition-colors">🔒 Privacy</button>
            <hr style={{ borderColor: "#334155", margin: "4px 0" }} />
            <button className="text-left text-red-400 hover:text-red-300">Sign Out</button>
          </div>
        </div>
      )}

      <div style={{ padding: "16px 16px 32px" }}>

        {/* ── Profile Card ── */}
        <div style={{
          background: "rgba(15,20,35,0.85)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: "18px 20px",
          marginBottom: 16,
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}>
          {/* Avatar circle */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${goalInfo.color}33, ${goalInfo.color}11)`,
            border: `2px solid ${goalInfo.color}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            flexShrink: 0,
          }}>
            {goalInfo.icon}
          </div>

          {/* Profile details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Fitness Profile</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {/* Age */}
              <span style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                padding: "2px 9px",
                fontSize: 12,
                color: "#94a3b8",
              }}>
                Age {profile.age}
              </span>
              {/* Goal */}
              <span style={{
                background: `${goalInfo.color}22`,
                border: `1px solid ${goalInfo.color}44`,
                borderRadius: 6,
                padding: "2px 9px",
                fontSize: 12,
                color: goalInfo.color,
                fontWeight: 600,
              }}>
                {goalInfo.label}
              </span>
              {/* Level */}
              <span style={{
                background: `${levelInfo.badge}22`,
                border: `1px solid ${levelInfo.badge}44`,
                borderRadius: 6,
                padding: "2px 9px",
                fontSize: 12,
                color: levelInfo.badge,
                fontWeight: 600,
              }}>
                {levelInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
          marginBottom: 16,
        }}>
          {[
            { label: "This Month", value: workoutsThisMonth, unit: "workouts", color: "#22c55e" },
            { label: "Completed",  value: workoutsDone,      unit: "sessions", color: "#3b82f6" },
            { label: "Remaining",  value: workoutsLeft,      unit: "sessions", color: "#f59e0b" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "rgba(15,20,35,0.85)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12,
              padding: "14px 12px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {stat.unit}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Today's Workout ── */}
        <div style={{
          background: "rgba(15,20,35,0.85)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: "18px 20px",
          marginBottom: 16,
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Today's Workout</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </div>
            </div>
            {todayIsWorkout ? (
              <span style={{
                background: "#22c55e22",
                border: "1px solid #22c55e44",
                color: "#22c55e",
                borderRadius: 20,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 600,
              }}>Active Day</span>
            ) : (
              <span style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#64748b",
                borderRadius: 20,
                padding: "3px 10px",
                fontSize: 11,
              }}>Rest Day</span>
            )}
          </div>

          {/* Exercise list from plan */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {plan.exercises.map((ex, i) => (
              <div key={ex.id} style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
                padding: "12px 14px",
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: i === 0 ? "#22c55e22" : "#3b82f622",
                  border: `1px solid ${i === 0 ? "#22c55e44" : "#3b82f644"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  flexShrink: 0,
                }}>
                  {i === 0 ? "①" : "②"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {ex.muscleGroup} · {ex.targetReps} reps
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onStartWorkout}
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            Start AR Workout →
          </button>
        </div>

        {/* ── Monthly Calendar ── */}
        <div style={{
          background: "rgba(15,20,35,0.85)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: "18px 16px",
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Monthly Plan</div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
            {MONTH_NAMES[month]} {year}
          </div>

          {/* Weekday headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 3,
            marginBottom: 4,
          }}>
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} style={{
                textAlign: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                paddingBottom: 6,
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 3,
          }}>
            {calendarData.map((cell, idx) => {
              if (!cell.day) {
                return <div key={idx} />;
              }

              const isPast = cell.day < today.getDate() && !cell.isToday;

              return (
                <div
                  key={idx}
                  title={cell.isWorkout ? cell.exercises.join(" + ") : "Rest day"}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 8,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    background: cell.isToday
                      ? "linear-gradient(135deg, #22c55e, #16a34a)"
                      : cell.isWorkout
                        ? isPast
                          ? "rgba(34,197,94,0.12)"
                          : "rgba(34,197,94,0.18)"
                        : "rgba(255,255,255,0.03)",
                    border: cell.isToday
                      ? "2px solid #22c55e"
                      : cell.isWorkout
                        ? `1px solid ${isPast ? "rgba(34,197,94,0.25)" : "rgba(34,197,94,0.4)"}`
                        : "1px solid rgba(255,255,255,0.05)",
                    cursor: cell.isWorkout ? "pointer" : "default",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    fontWeight: cell.isToday ? 800 : cell.isWorkout ? 600 : 400,
                    color: cell.isToday
                      ? "#fff"
                      : cell.isWorkout
                        ? isPast ? "#4ade80" : "#86efac"
                        : "#334155",
                    lineHeight: 1,
                  }}>
                    {cell.day}
                  </span>
                  {/* Workout indicator dot */}
                  {cell.isWorkout && !cell.isToday && (
                    <div style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: isPast ? "#4ade8066" : "#4ade80",
                      marginTop: 3,
                    }} />
                  )}
                  {/* Past workout checkmark */}
                  {cell.isWorkout && isPast && (
                    <div style={{
                      position: "absolute",
                      top: 2,
                      right: 3,
                      fontSize: 7,
                      color: "#4ade8099",
                    }}>✓</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{
            display: "flex",
            gap: 16,
            marginTop: 14,
            flexWrap: "wrap",
          }}>
            {[
              { color: "#22c55e", label: "Today" },
              { color: "rgba(34,197,94,0.4)", label: "Workout day" },
              { color: "rgba(255,255,255,0.05)", label: "Rest day" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: item.color,
                  border: `1px solid ${item.color}`,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 11, color: "#64748b" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Recommendation card ── */}
        <div style={{
          marginTop: 16,
          background: "rgba(34,197,94,0.07)",
          border: "1px solid rgba(34,197,94,0.2)",
          borderLeft: "3px solid #22c55e",
          borderRadius: "0 12px 12px 0",
          padding: "14px 16px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#4ade80", marginBottom: 4 }}>
            Coach Tip
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
            {plan.recommendation}
          </div>
        </div>

      </div>
    </div>
  );
}
