import { useEffect, useState } from "react";

const COLORS = ["#D95E25", "#F2894A", "#2A7A4A", "#0284c7", "#8b5cf6", "#eab308", "#ec4899"];

// Deterministic particles blueprint (clean pure render without Math.random in component)
const STATIC_PARTICLES = Array.from({ length: 40 }).map((_, i) => ({
  id: i,
  left: ((i * 17 + 7) % 96) + 2, // distributes 2% to 98%
  size: (i % 5) + 7, // 7px to 11px
  color: COLORS[i % COLORS.length],
  delay: ((i % 8) * 0.05).toFixed(2),
  duration: (2.0 + ((i % 6) * 0.25)).toFixed(2),
  rotation: (i * 47) % 360,
  shape: i % 2 === 0 ? "rect" : "circle",
}));

export default function ConfettiBurst({ triggerKey }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!triggerKey) return;
    const timer = setTimeout(() => setActive(true), 10);
    const endTimer = setTimeout(() => setActive(false), 3400);

    return () => {
      clearTimeout(timer);
      clearTimeout(endTimer);
    };
  }, [triggerKey]);

  if (!active || !triggerKey) return null;

  return (
    <div className="confetti-overlay" aria-hidden="true">
      {STATIC_PARTICLES.map((p) => (
        <span
          key={`${triggerKey}-${p.id}`}
          className={`confetti-particle ${p.shape}`}
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * (p.shape === "rect" ? 1.6 : 1)}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
