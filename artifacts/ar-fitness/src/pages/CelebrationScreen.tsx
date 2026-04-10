import { useEffect, useState } from "react";

interface CelebrationScreenProps {
  onFinish: () => void;
}

export function CelebrationScreen({ onFinish }: CelebrationScreenProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      minHeight: "100dvh", background: "#0a0f1a", color: "#fff", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center"
    }}>
      <div style={{
        transform: show ? "scale(1)" : "scale(0.5)", opacity: show ? 1 : 0, transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
      }}>
        <div style={{ fontSize: "5rem", marginBottom: "20px" }}>🏆</div>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 900, background: "linear-gradient(135deg, #4ade80, #3b82f6)", WebkitBackgroundClip: "text", color: "transparent", marginBottom: "10px" }}>
          WORKOUT COMPLETE!
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#94a3b8", marginBottom: "8px" }}>
          Day 1 is in the books. You crushed it.
        </p>
        <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid #22c55e", color: "#4ade80", padding: "8px 16px", borderRadius: "20px", display: "inline-block", fontWeight: "bold", marginBottom: "40px" }}>
          🔥 Streak Maintained!
        </div>
      </div>

      <p style={{ color: "#64748b", marginBottom: "20px", opacity: show ? 1 : 0, transition: "opacity 1s ease 1s" }}>
        Come back tomorrow to keep the momentum going.
      </p>

      <button
        onClick={onFinish}
        style={{
          padding: "16px 32px", background: "#22c55e", color: "#fff", borderRadius: "12px", fontSize: "1.1rem", fontWeight: "bold", border: "none", cursor: "pointer",
          opacity: show ? 1 : 0, transition: "opacity 1s ease 1.5s", boxShadow: "0 10px 25px rgba(34, 197, 94, 0.4)"
        }}
      >
        Return to Dashboard →
      </button>
    </div>
  );
}