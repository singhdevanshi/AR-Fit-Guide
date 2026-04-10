/*
 * WorkoutScreen.tsx — Main AR workout view
 *
 * Layout:
 *   - Full-screen canvas for Three.js (behind everything)
 *   - AR.js injects its own video element into the DOM (also behind canvas)
 *   - HTML overlay with: exercise panel (top), posture guide (middle), controls (bottom)
 *
 * The ARRenderer class drives the Three.js scene imperatively.
 * React state drives the UI overlay independently.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { ExercisePlan, ExerciseId } from "@/lib/fitness";
import { ARRenderer } from "@/lib/arRenderer";
import { MarkerGuideModal } from "@/components/MarkerGuideModal";

interface WorkoutScreenProps {
  plan: ExercisePlan;
  onBack: () => void;
}

export function WorkoutScreen({ plan, onBack }: WorkoutScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ARRenderer | null>(null);
  const repTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [reps, setReps] = useState(0);
  const [currentAngle, setCurrentAngle] = useState(90);
  const [postureOk, setPostureOk] = useState(true);
  const [showMarkerGuide, setShowMarkerGuide] = useState(false);
  const [arStatus, setArStatus] = useState<"loading" | "ready" | "demo">("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [previewing, setPreviewing] = useState(true);

  const currentExercise = plan.exercises[exerciseIndex];
  const targetReps = currentExercise.targetReps;
  const done = reps >= targetReps;

  const isSecureHost =
    typeof window !== "undefined" &&
    (window.isSecureContext ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  // ── Initialize ARRenderer once the canvas mounts ──────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;

    setArStatus("loading");
    rendererRef.current?.destroy();
    rendererRef.current = null;

    const renderer = new ARRenderer(canvasRef.current, currentExercise.id as ExerciseId, currentExercise.repDurationMs);
    rendererRef.current = renderer;

    let active = true;
    renderer.waitForReady().then((mode) => {
      if (!active) return;
      setArStatus(mode === "demo" ? "demo" : "ready");
    }).catch((err) => {
      if (!active) return;
      console.warn("AR renderer startup failed:", err);
      setArStatus("demo");
    });

    return () => {
      active = false;
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [retryKey]);

  useEffect(() => {
    setPreviewing(true);
    setIsRunning(false);
    setReps(0);
    const timer = window.setTimeout(() => setPreviewing(false), 2200);
    return () => window.clearTimeout(timer);
  }, [currentExercise.id, retryKey]);

  // ── Sync exercise to renderer when it changes ──────────────────────────
  useEffect(() => {
    rendererRef.current?.setExercise(
      currentExercise.id as ExerciseId,
      currentExercise.repDurationMs,
    );
  }, [currentExercise]);

  useEffect(() => {
    rendererRef.current?.setRunning(isRunning);
  }, [isRunning]);

  // ── Live pose tracker polling ─────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || done) {
      if (repTimerRef.current) clearInterval(repTimerRef.current);
      return;
    }

    repTimerRef.current = setInterval(() => {
      const renderer = rendererRef.current;
      if (!renderer) return;

      const currentReps = renderer.getRepCount();
      setReps(Math.min(currentReps, targetReps));
      setCurrentAngle(renderer.getCurrentAngle());
      setPostureOk(renderer.getCurrentPostureOk());
    }, 80);

    return () => {
      if (repTimerRef.current) clearInterval(repTimerRef.current);
    };
  }, [isRunning, done, targetReps]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleStartStop = useCallback(() => {
    if (previewing) return;
    if (done) {
      // Reset for next set
      setReps(0);
      rendererRef.current?.resetReps();
      setIsRunning(true);
      return;
    }
    setIsRunning((r) => !r);
  }, [done, previewing]);

  const handleSwitch = useCallback(() => {
    const next = (exerciseIndex + 1) % plan.exercises.length;
    setExerciseIndex(next);
    setReps(0);
    setIsRunning(false);
    rendererRef.current?.resetReps();
  }, [exerciseIndex, plan.exercises.length]);

  // ── Posture quality label ──────────────────────────────────────────────
  const postureLabel = postureOk ? "Good form" : "Adjust form";
  const postureClass = postureOk ? "posture-good" : "posture-warn";

  // ── Rep ring progress ─────────────────────────────────────────────────
  const progress = Math.min(reps / targetReps, 1);
  const circum = 2 * Math.PI * 38;
  const strokeDash = circum * (1 - progress);

  return (
    <>
      {/*
        ── Three.js canvas (full screen behind everything) ──
        In AR mode the canvas background must be transparent so the AR.js
        camera video element (injected into <body> with z-index: -1) is
        visible through the canvas. Only in demo/fallback mode (no camera)
        do we set an opaque dark background. The arRenderer itself controls
        setClearColor — we set the CSS background to match.
      */}
      <canvas
        ref={canvasRef}
        id="ar-canvas"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          background: "transparent",
        }}
      />

      {/* ── AR status banner ── */}
      {arStatus === "loading" && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 20,
          background: "rgba(0,0,0,0.7)", textAlign: "center", padding: "0.5rem",
          fontSize: "0.8rem", color: "hsl(215 20% 65%)",
        }}>
          Initializing camera...
        </div>
      )}
      {arStatus === "demo" && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 20,
          background: "rgba(142,100,0,0.55)", textAlign: "center", padding: "0.4rem",
          fontSize: "0.75rem", color: "#ffe",
        }}>
          <div>
            Demo mode — camera unavailable or permission denied. Showing animated figure.
          </div>
          <div style={{ marginTop: "0.25rem", color: "#ffecb3" }}>
            The live camera feed appears behind the guide. This app currently simulates rep counting and posture using a preset exercise animation, not live body tracking.
          </div>
          {!isSecureHost && (
            <div style={{ marginTop: "0.25rem", color: "#ffecb3" }}>
              Camera access requires a secure origin. Use localhost or HTTPS to enable the webcam.
            </div>
          )}
          <button
            onClick={() => setRetryKey((key) => key + 1)}
            style={{
              marginTop: "0.35rem",
              border: "1px solid rgba(255,255,255,0.8)",
              borderRadius: "0.6rem",
              padding: "0.35rem 0.8rem",
              color: "#fff",
              background: "rgba(0,0,0,0.2)",
              cursor: "pointer",
              fontSize: "0.75rem",
            }}
          >
            Retry camera
          </button>
        </div>
      )}

      {/* ── HTML overlay ── */}
      <div className="ar-overlay">

        {/* ── TOP: Exercise header ── */}
        <div style={{ position: "absolute", top: arStatus === "demo" ? "2.2rem" : "1rem", left: "1rem", right: "1rem" }}>
          <div className="glass-panel p-4 flex items-center gap-3">
            {/* Back button */}
            <button
              onClick={onBack}
              className="btn-secondary rounded-lg px-3 py-2 text-xs flex-shrink-0"
            >
              ← Exit
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Now exercising</p>
              <h2 className="text-base font-bold text-white truncate">{currentExercise.name}</h2>
              <p className="text-xs text-muted-foreground">{currentExercise.muscleGroup}</p>
            </div>

            {/* Rep ring */}
            <div className="flex-shrink-0 relative" style={{ width: 64, height: 64 }}>
              <svg width={64} height={64} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={32} cy={32} r={26} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
                <circle
                  cx={32} cy={32} r={26}
                  fill="none"
                  stroke="hsl(142 72% 49%)"
                  strokeWidth={4}
                  strokeDasharray={circum}
                  strokeDashoffset={strokeDash}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.4s ease" }}
                />
              </svg>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
              }}>
                <span className="text-white font-bold text-sm leading-none">{reps}</span>
                <span className="text-muted-foreground text-xs leading-none">/{targetReps}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── MIDDLE: Posture guide ── */}
        {isRunning && (
          <div style={{ position: "absolute", top: "50%", right: "1rem", transform: "translateY(-50%)" }}>
            <div className="glass-panel p-3 flex flex-col gap-2" style={{ maxWidth: 140 }}>
              <p className="text-xs text-muted-foreground">{currentExercise.postureGuide.jointLabel}</p>
              <p className="text-2xl font-bold text-white leading-none">{currentAngle}°</p>
              <p className={`text-xs font-medium ${postureClass}`}>{postureLabel}</p>
              <p className="text-[0.65rem] text-muted-foreground leading-snug" style={{ marginTop: 2 }}>
                Target: {currentExercise.postureGuide.targetAngle}°
              </p>
            </div>
          </div>
        )}

        {/* ── BOTTOM: Controls and tip ── */}
        <div style={{ position: "absolute", bottom: "1.5rem", left: "1rem", right: "1rem" }}>

          {/* Posture tip */}
          <div className="tip-box p-3 mb-3 text-xs text-muted-foreground leading-snug">
            <span className="text-primary font-medium">Tip: </span>
            {currentExercise.postureGuide.tip}
          </div>

          {/* Done state */}
          {done && (
            <div className="glass-panel p-3 mb-3 text-center">
              <p className="text-primary font-bold text-base">Set complete!</p>
              <p className="text-muted-foreground text-xs mt-1">
                You completed {targetReps} reps. Rest 30–60 seconds, then continue.
              </p>
            </div>
          )}

          {/* Button row */}
          <div className="flex gap-3">
            <button
              className="btn-secondary rounded-xl px-4 py-3 text-sm flex-shrink-0"
              onClick={() => setShowMarkerGuide(true)}
              title="Show Hiro marker guide"
            >
              📍 Marker
            </button>

            <button
              className="btn-primary flex-1 rounded-xl py-3 text-sm font-semibold"
              onClick={handleStartStop}
              disabled={previewing}
              style={{ opacity: previewing ? 0.6 : 1, cursor: previewing ? "not-allowed" : "pointer" }}
            >
              {previewing ? "Watching demo..." : done ? "Restart Set" : isRunning ? "Pause" : "Start Workout"}
            </button>

            {plan.exercises.length > 1 && (
              <button
                className="btn-secondary rounded-xl px-4 py-3 text-sm flex-shrink-0"
                onClick={handleSwitch}
              >
                Switch
              </button>
            )}
          </div>

          {/* Preview reminder */}
          {previewing && (
            <div className="glass-panel p-3 mb-3 text-center">
              <p className="text-sm font-semibold text-white">Exercise demonstration</p>
              <p className="text-xs text-muted-foreground mt-1">
                Watch the figure move first, then tap Start Workout when the button appears.
              </p>
            </div>
          )}

          {/* Exercise switcher dots */}
          {plan.exercises.length > 1 && (
            <div className="flex gap-1.5 justify-center mt-3">
              {plan.exercises.map((ex, i) => (
                <button
                  key={ex.id}
                  onClick={() => {
                    setExerciseIndex(i);
                    setReps(0);
                    setIsRunning(false);
                    rendererRef.current?.resetReps();
                  }}
                  className="rounded-full transition-all"
                  style={{
                    width: i === exerciseIndex ? "1.5rem" : "0.5rem",
                    height: "0.5rem",
                    background: i === exerciseIndex
                      ? "hsl(142 72% 49%)"
                      : "rgba(255,255,255,0.2)",
                  }}
                  title={ex.name}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Marker guide modal ── */}
      {showMarkerGuide && <MarkerGuideModal onClose={() => setShowMarkerGuide(false)} />}
    </>
  );
}

// Expose animation frame data globally so the interval can read it without React re-renders
declare global {
  interface Window {
    __ARFitnessFrameData?: { angleValue: number; postureOk: boolean };
  }
}
