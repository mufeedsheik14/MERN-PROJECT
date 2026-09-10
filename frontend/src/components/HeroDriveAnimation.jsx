import { useState, useEffect } from "react";

/**
 * HeroDriveAnimation — Prominent automotive entrance for the Home page.
 *
 * A large, clearly visible modern vehicle drives LEFT → RIGHT across the
 * hero section on first load. Simultaneously, hero text elements fade/slide
 * in with a staggered reveal (heading → description → button).
 *
 * Plays ONCE. Unmounts cleanly. Fully GPU-accelerated (translateX/opacity).
 * Respects prefers-reduced-motion.
 */
export default function HeroDriveAnimation() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      return;
    }
    const t = setTimeout(() => setDone(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (done) return null;

  return (
    <div
      className="hda-stage"
      aria-hidden="true"
      role="presentation"
      onTransitionEnd={() => {}}
    >
      {/* Road surface stripe */}
      <div className="hda-road" />

      {/* Ground contact shadow (moves with car via animation) */}
      <div className="hda-shadow" />

      {/* The vehicle */}
      <div
        className="hda-car-wrap"
        onAnimationEnd={(e) => {
          if (e.animationName === "hdaDrive") setDone(true);
        }}
      >
        {/* Forward headlight cone */}
        <div className="hda-headlight-cone" />

        {/* SVG Modern Sedan — drawn for clarity at any size */}
        <svg
          className="hda-car"
          viewBox="0 0 440 130"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Deep midnight metallic paint */}
            <linearGradient id="hdaPaint" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%"  stopColor="#1A1F2E" />
              <stop offset="22%" stopColor="#2E3650" />
              <stop offset="50%" stopColor="#404E72" />
              <stop offset="78%" stopColor="#2E3650" />
              <stop offset="100%" stopColor="#141824" />
            </linearGradient>

            {/* Specular shoulder shine */}
            <linearGradient id="hdaShine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0)"    />
              <stop offset="20%"  stopColor="rgba(255,255,255,0.12)" />
              <stop offset="50%"  stopColor="rgba(255,255,255,0.72)" />
              <stop offset="80%"  stopColor="rgba(255,255,255,0.18)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)"    />
            </linearGradient>

            {/* Privacy glass with sky tint */}
            <linearGradient id="hdaGlass" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%"   stopColor="#1B2336" />
              <stop offset="40%"  stopColor="#2C4068" />
              <stop offset="50%"  stopColor="#4E6DA8" />
              <stop offset="55%"  stopColor="#1E2D46" />
              <stop offset="100%" stopColor="#111820" />
            </linearGradient>

            {/* Alloy wheel radial */}
            <radialGradient id="hdaRim" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#F1F5F9" />
              <stop offset="40%"  stopColor="#94A3B8" />
              <stop offset="75%"  stopColor="#475569" />
              <stop offset="100%" stopColor="#1E293B" />
            </radialGradient>

            {/* Brake caliper accent */}
            <radialGradient id="hdaCaliper" cx="50%" cy="35%" r="60%">
              <stop offset="0%"   stopColor="#F2894A" />
              <stop offset="100%" stopColor="#D95E25" />
            </radialGradient>

            {/* LED headlight beam */}
            <linearGradient id="hdaLED" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#BAE6FD" stopOpacity="0.9" />
              <stop offset="60%"  stopColor="#E0F2FE"                   />
              <stop offset="100%" stopColor="#FFFFFF"                   />
            </linearGradient>

            {/* Rear brake light */}
            <linearGradient id="hdaTail" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#FCA5A5" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>

          {/* ── Main aerodynamic body shell ── */}
          <path
            d="M20 84
               C20 74 28 67 42 65
               L70 63
               C108 62 138 46 164 29
               C188 14 220 11 256 13
               C284 15 308 24 330 40
               L374 61
               C400 65 420 73 428 82
               C432 88 430 96 422 98
               C414 100 396 100 380 100
               C376 84 360 75 342 75
               C324 75 308 84 304 100
               L130 100
               C126 84 110 75 92 75
               C74 75 58 84 54 100
               L30 100
               C23 100 20 93 20 84 Z"
            fill="url(#hdaPaint)"
          />

          {/* Lower body crease / side skirt */}
          <path
            d="M22 92 L52 92 M132 100 L302 100 M382 100 L424 96"
            stroke="#0D1117"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Shoulder highlight ribbon */}
          <path
            d="M36 67 Q180 62 340 58 Q390 68 420 81"
            stroke="url(#hdaShine)"
            strokeWidth="2.5"
            fill="none"
          />

          {/* ── Cabin glass (windshield + side windows) ── */}
          {/* Front windshield */}
          <path
            d="M164 31
               C188 17 218 14 252 16
               C276 18 296 27 312 40
               L348 61
               L216 61 Z"
            fill="url(#hdaGlass)"
            stroke="#374151"
            strokeWidth="1.5"
          />

          {/* Rear passenger window */}
          <path
            d="M100 63 L156 35 L206 63 Z"
            fill="url(#hdaGlass)"
            stroke="#374151"
            strokeWidth="1.5"
          />

          {/* B-pillar */}
          <rect x="208" y="18" width="6" height="43" rx="2" fill="#0D1117" />
          {/* C-pillar */}
          <rect x="152" y="36" width="5" height="27" rx="2" fill="#0D1117" />

          {/* Roof edge chrome line */}
          <path
            d="M104 62 Q230 56 346 60"
            stroke="rgba(148,163,184,0.5)"
            strokeWidth="1.2"
            fill="none"
          />

          {/* ── Wing mirror (driver side) ── */}
          <path
            d="M316 55 C326 52 336 54 334 60 C329 63 314 62 312 58 Z"
            fill="#1A1F2E"
            stroke="#475569"
            strokeWidth="1"
          />
          {/* Mirror indicator */}
          <path d="M320 56 L329 59" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />

          {/* ── Door panel seams ── */}
          <line x1="212" y1="62" x2="208" y2="96" stroke="#0D1117" strokeWidth="1.5" />
          <line x1="132" y1="63" x2="126" y2="96" stroke="#0D1117" strokeWidth="1.5" />

          {/* Door handles (flush) */}
          <rect x="168" y="70" width="22" height="4" rx="2" fill="#4B5563" />
          <rect x="268" y="70" width="22" height="4" rx="2" fill="#4B5563" />

          {/* ── Front LED matrix headlight cluster ── */}
          <path
            d="M396 72 L424 79 C420 86 410 88 396 85 Z"
            fill="url(#hdaLED)"
          />
          {/* DRL brow strip */}
          <path
            d="M388 69 Q408 73 428 78"
            stroke="#E0F2FE"
            strokeWidth="2.8"
            strokeLinecap="round"
            opacity="0.95"
          />
          {/* Lower fog lamp */}
          <ellipse cx="414" cy="90" rx="8" ry="3" fill="#FEF3C7" opacity="0.7" />

          {/* ── Rear tail light strip ── */}
          <path
            d="M20 73 C20 68 26 65 34 66 L50 68 C38 72 24 73 20 73 Z"
            fill="url(#hdaTail)"
          />
          {/* Brake LED strip */}
          <path
            d="M20 68 L48 68"
            stroke="#FF3B30"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* ── REAR WHEEL — cx=92 cy=100 r=25 ── */}
          <g className="hda-wheel-rear">
            {/* Tyre */}
            <circle cx="92" cy="100" r="25" fill="#0D1117" />
            {/* Sidewall */}
            <circle cx="92" cy="100" r="20" fill="#1C2333" stroke="#334155" strokeWidth="1.2" />
            {/* Rotor */}
            <circle cx="92" cy="100" r="15" fill="#64748B" opacity="0.55" />
            {/* Caliper */}
            <path d="M80 90 A15 15 0 0 1 92 84 L92 90 Z" fill="url(#hdaCaliper)" />
            {/* 5-spoke alloy */}
            <g className="hda-spokes">
              <circle cx="92" cy="100" r="14" fill="none" stroke="url(#hdaRim)" strokeWidth="2.5" />
              <circle cx="92" cy="100" r="5"  fill="#CBD5E1" />
              <line x1="92" y1="100" x2="92"  y2="86"  stroke="#F1F5F9" strokeWidth="2.5" />
              <line x1="92" y1="100" x2="105" y2="95"  stroke="#F1F5F9" strokeWidth="2.5" />
              <line x1="92" y1="100" x2="101" y2="113" stroke="#F1F5F9" strokeWidth="2.5" />
              <line x1="92" y1="100" x2="83"  y2="113" stroke="#F1F5F9" strokeWidth="2.5" />
              <line x1="92" y1="100" x2="79"  y2="95"  stroke="#F1F5F9" strokeWidth="2.5" />
            </g>
          </g>

          {/* ── FRONT WHEEL — cx=342 cy=100 r=25 ── */}
          <g className="hda-wheel-front">
            <circle cx="342" cy="100" r="25" fill="#0D1117" />
            <circle cx="342" cy="100" r="20" fill="#1C2333" stroke="#334155" strokeWidth="1.2" />
            <circle cx="342" cy="100" r="15" fill="#64748B" opacity="0.55" />
            <path d="M330 90 A15 15 0 0 1 342 84 L342 90 Z" fill="url(#hdaCaliper)" />
            <g className="hda-spokes">
              <circle cx="342" cy="100" r="14" fill="none" stroke="url(#hdaRim)" strokeWidth="2.5" />
              <circle cx="342" cy="100" r="5"  fill="#CBD5E1" />
              <line x1="342" y1="100" x2="342" y2="86"  stroke="#F1F5F9" strokeWidth="2.5" />
              <line x1="342" y1="100" x2="355" y2="95"  stroke="#F1F5F9" strokeWidth="2.5" />
              <line x1="342" y1="100" x2="351" y2="113" stroke="#F1F5F9" strokeWidth="2.5" />
              <line x1="342" y1="100" x2="333" y2="113" stroke="#F1F5F9" strokeWidth="2.5" />
              <line x1="342" y1="100" x2="329" y2="95"  stroke="#F1F5F9" strokeWidth="2.5" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
