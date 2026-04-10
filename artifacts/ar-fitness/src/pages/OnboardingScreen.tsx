import { useState } from "react";
import type { UserProfile, FitnessGoal, ExperienceLevel } from "@/lib/fitness";

interface OnboardingScreenProps {
  onComplete: (profile: UserProfile) => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");
  const [goal, setGoal] = useState<FitnessGoal | null>(null);

  // Dynamic BMI Calculation
  const bmi = height && weight ? Number((Number(weight) / Math.pow(Number(height) / 100, 2)).toFixed(1)) : null;

  let bmiLabel = "";
  let bmiColor = "#94a3b8";
  if (bmi) {
    if (bmi < 18.5) { bmiLabel = "Underweight"; bmiColor = "#60a5fa"; }
    else if (bmi < 25) { bmiLabel = "Normal Weight"; bmiColor = "#4ade80"; }
    else if (bmi < 30) { bmiLabel = "Overweight"; bmiColor = "#fbbf24"; }
    else { bmiLabel = "Obese"; bmiColor = "#ef4444"; }
  }

  const handleComplete = (level: ExperienceLevel) => {
    onComplete({
      name,
      age: Number(age),
      height: Number(height),
      weight: Number(weight),
      bmi: bmi || 0,
      goal: goal!,
      level,
    });
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#0a0f1a", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      
      {/* Progress Bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "40px", width: "100%", maxWidth: "320px" }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: "4px", flex: 1, borderRadius: "2px", background: step >= i ? "#22c55e" : "#1e293b", transition: "0.3s" }} />
        ))}
      </div>

      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "24px", padding: "30px", width: "100%", maxWidth: "360px", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
        
        {/* STEP 1: Body Metrics */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 style={{ fontSize: "24px", fontWeight: "bold" }}>Let's build your profile</h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "10px" }}>Your metrics help AR Fit Guide tailor your perfect plan.</p>
            
            <input type="text" placeholder="First Name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-green-500 transition-colors" />
            <input type="number" placeholder="Age" value={age} onChange={e => setAge(e.target.value ? Number(e.target.value) : "")} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-green-500 transition-colors" />
            <div className="flex gap-3">
              <input type="number" placeholder="Height (cm)" value={height} onChange={e => setHeight(e.target.value ? Number(e.target.value) : "")} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-green-500" />
              <input type="number" placeholder="Weight (kg)" value={weight} onChange={e => setWeight(e.target.value ? Number(e.target.value) : "")} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-green-500" />
            </div>

            {/* Live BMI Display */}
            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "16px", marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>Current BMI</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: bmiColor }}>{bmiLabel || "Waiting for metrics..."}</div>
              </div>
              <div style={{ fontSize: "28px", fontWeight: "900", color: "#fff" }}>{bmi || "--"}</div>
            </div>

            <button disabled={!name || !age || !height || !weight} onClick={() => setStep(2)} style={{ width: "100%", padding: "14px", background: name && age && height && weight ? "#22c55e" : "#334155", color: "#fff", borderRadius: "12px", fontWeight: "bold", marginTop: "10px", transition: "0.2s" }}>Continue</button>
          </div>
        )}

        {/* STEP 2: Goal */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            <button onClick={() => setStep(1)} style={{ color: "#94a3b8", fontSize: "12px", textAlign: "left" }}>← Back</button>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px" }}>Hi {name}, what's your main goal?</h2>
            
            {[
              { id: "weight_loss", icon: "🔥", label: "Burn Fat" },
              { id: "strength", icon: "💪", label: "Build Strength" },
              { id: "flexibility", icon: "🧘", label: "Improve Flexibility" }
            ].map(g => (
              <button key={g.id} onClick={() => { setGoal(g.id as FitnessGoal); setStep(3); }} style={{ width: "100%", padding: "16px", background: "#1e293b", border: "2px solid transparent", borderRadius: "16px", display: "flex", alignItems: "center", gap: "16px", fontSize: "16px", fontWeight: "600", transition: "0.2s" }} className="hover:border-green-500 hover:bg-slate-800">
                <span style={{ fontSize: "24px" }}>{g.icon}</span> {g.label}
              </button>
            ))}
          </div>
        )}

        {/* STEP 3: Level */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            <button onClick={() => setStep(2)} style={{ color: "#94a3b8", fontSize: "12px", textAlign: "left" }}>← Back</button>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px" }}>Select your experience</h2>
            
            {[
              { id: "beginner", label: "Beginner", desc: "I'm just starting out" },
              { id: "intermediate", label: "Intermediate", desc: "I work out occasionally" },
              { id: "advanced", label: "Advanced", desc: "I exercise regularly" }
            ].map(l => (
              <button key={l.id} onClick={() => handleComplete(l.id as ExperienceLevel)} style={{ width: "100%", padding: "16px", background: "#1e293b", border: "2px solid transparent", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", transition: "0.2s" }} className="hover:border-green-500 hover:bg-slate-800">
                <span style={{ fontSize: "16px", fontWeight: "bold" }}>{l.label}</span>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>{l.desc}</span>
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}