/*
 * MarkerGuideModal.tsx — Explains how to use the Hiro AR marker
 *
 * Shows an SVG rendering of the Hiro marker pattern plus instructions.
 * The Hiro marker is the default AR.js detection target.
 */

interface Props {
  onClose: () => void;
}

export function MarkerGuideModal({ onClose }: Props) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel p-6 w-full max-w-sm screen-transition-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Using the Hiro Marker</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* Hiro marker SVG preview */}
        <div className="flex justify-center mb-4">
          <div style={{ background: "white", padding: 12, borderRadius: 8, display: "inline-block" }}>
            <HiroMarkerSVG size={150} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mb-4">
          Print this marker or display it on another screen
        </p>

        <ol className="text-sm text-muted-foreground flex flex-col gap-2 mb-5 list-none">
          {[
            'Print the Hiro marker above, or search "Hiro AR marker" online.',
            "Lay the marker flat on a table in good lighting.",
            "Point your phone camera at the marker.",
            "The 3D fitness figure will appear on top of the marker.",
            "Move around the marker to see it from different angles.",
          ].map((step, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                style={{ background: "hsl(142 72% 49%)", color: "#000" }}
              >
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div
          className="rounded-lg p-3 text-xs text-muted-foreground mb-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <strong className="text-white">No marker?</strong> The app works in demo mode — the animated figure will still show and guide you through the exercises without a marker.
        </div>

        <button className="btn-primary w-full py-3 rounded-xl" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}

/* Simplified Hiro marker rendered as SVG (black/white grid pattern) */
function HiroMarkerSVG({ size }: { size: number }) {
  const cell = size / 7;

  // Hiro marker cell map (1 = black, 0 = white) — 7x7 grid
  const grid = [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,0,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1],
  ];

  // Inner Hiro pattern (rows 2-5, cols 2-5)
  const inner: number[][] = [
    [0,1,1,0],
    [1,0,0,1],
    [1,0,0,1],
    [0,1,1,0],
  ];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      {/* Outer border */}
      {grid.map((row, r) =>
        row.map((val, c) => (
          <rect
            key={`${r}-${c}`}
            x={c * cell}
            y={r * cell}
            width={cell}
            height={cell}
            fill={val ? "#000" : "#fff"}
          />
        ))
      )}
      {/* Inner Hiro pattern */}
      {inner.map((row, r) =>
        row.map((val, c) => (
          <rect
            key={`i${r}-${c}`}
            x={(c + 2) * cell + cell * 0.1}
            y={(r + 2) * cell + cell * 0.1}
            width={cell * 0.8}
            height={cell * 0.8}
            fill={val ? "#000" : "#fff"}
          />
        ))
      )}
    </svg>
  );
}
