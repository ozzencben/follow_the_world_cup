export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative z-10 mt-16"
      style={{
        background: "#1A1916",
        borderTop: "2px solid #1A1916",
      }}
    >
      {/* Top neon accent line */}
      <div style={{ height: 2, background: "linear-gradient(90deg, #00FF87, #00E5FF, #FFE600, transparent)", opacity: 0.6 }} />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

          {/* Brand column — 4 cols */}
          <div className="md:col-span-4 space-y-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 flex items-center justify-center font-black text-base"
                style={{
                  background: "transparent",
                  border: "1.5px solid #00FF87",
                  color: "#00FF87",
                  boxShadow: "0 0 12px rgba(0,255,135,0.25)",
                  letterSpacing: "-0.02em",
                }}
              >
                FW
              </div>
              <div className="flex flex-col leading-none">
                <span style={{ fontSize: "0.6rem", fontWeight: 900, letterSpacing: "0.2em", color: "#F8F7F2", textTransform: "uppercase" }}>
                  FollowThe
                </span>
                <span style={{ fontSize: "0.6rem", fontWeight: 900, letterSpacing: "0.2em", color: "#00FF87", textTransform: "uppercase" }}>
                  WorldCup
                </span>
              </div>
            </div>

            <p style={{ color: "#5C5A54", fontSize: "0.7rem", lineHeight: 1.7, fontWeight: 500, maxWidth: "32ch" }}>
              Dünya Kupası 2026 heyecanını en modern teknolojilerle yansıtmak amacıyla
              açık kaynaklı olarak geliştirilmektedir.
            </p>

            <div className="flex gap-2 flex-wrap">
              <span className="neon-badge neon-badge-green">React</span>
              <span className="neon-badge neon-badge-cyan">FastAPI</span>
              <span className="neon-badge neon-badge-yellow">Tailwind</span>
            </div>
          </div>

          {/* Spacer — 1 col */}
          <div className="hidden md:block md:col-span-1" />

          {/* Links — 3 cols */}
          <div className="md:col-span-3 space-y-4">
            <div className="swiss-label" style={{ color: "#5C5A54" }}>Platform</div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
            <nav className="space-y-2">
              {[
                { href: "#/home",    label: "Ana Sayfa"       },
                { href: "#/teams",   label: "Milli Takımlar"  },
                { href: "#/groups",  label: "Gruplar & Puanlar"},
                { href: "#/matches", label: "Fikstür & Maçlar" },
                { href: "#/elo",     label: "ELO Analizi"     },
                { href: "#/about",   label: "Turnuva Hakkında"},
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    display: "block",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: "#8C8A84",
                    textDecoration: "none",
                    transition: "color 0.15s",
                    padding: "2px 0",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#00FF87")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#8C8A84")}
                >
                  → {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Contact — 4 cols */}
          <div className="md:col-span-4 space-y-4">
            <div className="swiss-label" style={{ color: "#5C5A54" }}>İletişim & Destek</div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

            <div className="space-y-2">
              <a
                href="mailto:ozencben@gmail.com"
                style={{ display: "block", fontSize: "0.7rem", fontWeight: 800, color: "#F2F0E8", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#00FF87")}
                onMouseLeave={e => (e.currentTarget.style.color = "#F2F0E8")}
              >
                ozencben@gmail.com
              </a>
              <div style={{ fontSize: "0.6rem", color: "#5C5A54", fontWeight: 600 }}>
                Profesyonel iş birlikleri ve katkılar için:
              </div>
              <div className="flex gap-2 flex-wrap mt-3">
                {["Upwork", "LinkedIn", "GitHub", "Instagram"].map(s => (
                  <a
                    key={s}
                    href="#/"
                    onClick={e => e.preventDefault()}
                    className="neon-badge"
                    style={{
                      color: "#8C8A84",
                      borderColor: "rgba(255,255,255,0.12)",
                      textDecoration: "none",
                      transition: "all 0.15s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = "#00FF87";
                      e.currentTarget.style.borderColor = "#00FF87";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = "#8C8A84";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                    }}
                  >
                    {s}
                  </a>
                ))}
              </div>
            </div>

            {/* Donate box */}
            <div
              className="mt-4 p-4"
              style={{ border: "1px solid rgba(255,230,0,0.2)", background: "rgba(255,230,0,0.03)" }}
            >
              <div style={{ fontSize: "0.55rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#B8A800", marginBottom: 6 }}>
                ☕ Projeyi Destekle
              </div>
              <p style={{ fontSize: "0.6rem", color: "#5C5A54", lineHeight: 1.6, marginBottom: 10, fontWeight: 500 }}>
                AI tahmin motoru ve yeni özellikler için katkıda bulunabilirsiniz.
              </p>
              <button
                className="swiss-btn-primary w-full justify-center"
                style={{
                  background: "transparent",
                  color: "#FFE600",
                  borderColor: "#FFE600",
                  boxShadow: "3px 3px 0 rgba(255,230,0,0.25)",
                }}
                onClick={() => alert("Bağış entegrasyonu yakında! 🏆")}
              >
                Bahşiş Bırak / Donate ☕
              </button>
            </div>
          </div>
        </div>

        {/* Bottom copyright bar */}
        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span style={{ fontSize: "0.55rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#5C5A54" }}>
            © {year} FollowTheWorldCup.com — Tüm Hakları Saklıdır
          </span>
          <div className="flex items-center gap-4">
            <span className="animate-retro-blink" style={{ color: "#00FF87", fontSize: "0.55rem", fontWeight: 900, letterSpacing: "0.18em" }}>
              ● LIVE DATA
            </span>
            <span style={{ fontSize: "0.55rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#5C5A54" }}>
              v2.1 — Swiss-Retro Fusion
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
