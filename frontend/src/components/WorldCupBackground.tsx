import { useEffect, useRef } from "react";

export default function WorldCupBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    // Floating neon orbs
    interface Orb { x: number; y: number; r: number; vx: number; vy: number; color: string; alpha: number; da: number; }
    const orbColors = [
      "rgba(0,255,135,",   // neon green
      "rgba(0,229,255,",   // neon cyan
      "rgba(255,230,0,",   // neon yellow
    ];
    const orbs: Orb[] = Array.from({ length: 18 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 3 + 1,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      color: orbColors[Math.floor(Math.random() * orbColors.length)],
      alpha: Math.random() * 0.25 + 0.05,
      da: (Math.random() - 0.5) * 0.003,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      orbs.forEach((o) => {
        o.x += o.vx; o.y += o.vy;
        if (o.x < 0 || o.x > w) o.vx *= -1;
        if (o.y < 0 || o.y > h) o.vy *= -1;
        o.alpha += o.da;
        if (o.alpha > 0.3 || o.alpha < 0.03) o.da *= -1;

        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = o.color + o.alpha + ")";
        ctx.shadowBlur = o.r * 8;
        ctx.shadowColor = o.color + "0.3)";
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(animId); };
  }, []);

  return (
    <div className="fixed inset-0 -z-30 pointer-events-none overflow-hidden" style={{ backgroundColor: "#F8F7F2" }}>
      {/* 1. Swiss grid pattern */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: `
            linear-gradient(rgba(26,25,22,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26,25,22,0.045) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* 2. Soccer pitch line overlay — subtle warm ivory tones */}
      <div className="absolute inset-0 opacity-[0.055] select-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          {/* Outer boundary */}
          <rect x="4%" y="6%" width="92%" height="88%" fill="none" stroke="#1A1916" strokeWidth="1.5" />
          {/* Center line */}
          <line x1="50%" y1="6%" x2="50%" y2="94%" stroke="#1A1916" strokeWidth="1.5" />
          {/* Center circle */}
          <circle cx="50%" cy="50%" r="9%" fill="none" stroke="#1A1916" strokeWidth="1.5" />
          <circle cx="50%" cy="50%" r="2.5" fill="#1A1916" />
          {/* Penalty boxes */}
          <rect x="4%" y="26%" width="13%" height="48%" fill="none" stroke="#1A1916" strokeWidth="1.5" />
          <rect x="83%" y="26%" width="13%" height="48%" fill="none" stroke="#1A1916" strokeWidth="1.5" />
          {/* Goal areas */}
          <rect x="4%" y="38%" width="5%" height="24%" fill="none" stroke="#1A1916" strokeWidth="1" />
          <rect x="91%" y="38%" width="5%" height="24%" fill="none" stroke="#1A1916" strokeWidth="1" />
          {/* Penalty spots */}
          <circle cx="14%" cy="50%" r="2" fill="#1A1916" />
          <circle cx="86%" cy="50%" r="2" fill="#1A1916" />
        </svg>
      </div>

      {/* 3. Warm gradient wash — very subtle */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 15% 20%, rgba(0,255,135,0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 85% 80%, rgba(0,229,255,0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(255,230,0,0.02) 0%, transparent 60%)
          `,
        }}
      />

      {/* 4. Floating neon particles canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
