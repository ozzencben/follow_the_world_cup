import { useTranslation } from "react-i18next";

interface HomeProps {
  onSelectTeam: (teamName: string) => void;
}

export default function Home({ onSelectTeam }: HomeProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const isTr = currentLang.startsWith("tr");

  const quickTeams = [
    { name: "Argentina", tr: isTr ? "Arjantin" : "Argentina",  emoji: "🇦🇷", elo: "2046" },
    { name: "Brazil",    tr: isTr ? "Brezilya" : "Brazil",    emoji: "🇧🇷", elo: "2044" },
    { name: "Germany",   tr: isTr ? "Almanya" : "Germany",   emoji: "🇩🇪", elo: "1952" },
    { name: "France",    tr: isTr ? "Fransa" : "France",    emoji: "🇫🇷", elo: "2000" },
    { name: "Spain",     tr: isTr ? "İspanya" : "Spain",     emoji: "🇪🇸", elo: "1976" },
    { name: "Italy",     tr: isTr ? "İtalya" : "Italy",      emoji: "🇮🇹", elo: "1909" },
    { name: "England",   tr: isTr ? "İngiltere" : "England", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", elo: "1961" },
    { name: "Uruguay",   tr: isTr ? "Uruguay" : "Uruguay",   emoji: "🇺🇾", elo: "1927" },
  ];

  const features = [
    {
      icon: "48",
      unit: isTr ? "TAKIM" : "TEAMS",
      label: isTr ? "Katılımcı Milli Takım" : "Qualified National Teams",
      desc: isTr
        ? "Kuzey Amerika kıtasındaki dev turnuvada yarışan tüm takımları, tohum torbalarını ve kadro değerlerini keşfedin."
        : "Discover all teams competing in the massive North American tournament, seeding pots, and squad values.",
      accent: "#00FF87",
      route: "teams",
    },
    {
      icon: "104",
      unit: isTr ? "MAÇ" : "MATCHES",
      label: isTr ? "Fikstür & Maç Takvimi" : "Fixtures & Match Schedule",
      desc: isTr
        ? "A'dan L'ye 12 grubun güncel puan durumu, gol averajları ve stad detaylı fikstür takvimini takip edin."
        : "Follow the latest standings, goal differences, and detailed schedules with stadium info for all 12 groups.",
      accent: "#00E5FF",
      route: "matches",
    },
    {
      icon: "AI",
      unit: isTr ? "VERİ" : "DATA",
      label: isTr ? "ELO Güç Analizi" : "ELO Power Analysis",
      desc: isTr
        ? "Tarihsel Elo skorları, Transfermarkt kadro değerleri ve 1 yıllık trend analizleriyle gücü rakamsal görün."
        : "See real strengths numerically with historical ELO ratings, Transfermarkt values, and 1-year performance trends.",
      accent: "#FFE600",
      route: "elo",
    },
  ];

  const stats = [
    { num: "48", label: isTr ? "Katılımcı Takım" : "Qualified Teams",   sub: isTr ? "Tüm Zamanların En Büyüğü" : "Largest World Cup in History" },
    { num: "104", label: isTr ? "Toplam Maç" : "Total Matches",       sub: isTr ? "Grup + Eleme Aşamaları" : "Group + Knockout Stages" },
    { num: "16", label: isTr ? "Ev Sahibi Şehir" : "Host Cities",   sub: isTr ? "3 Ülke Boyunca" : "Across 3 Nations" },
    { num: "12", label: isTr ? "Grup" : "Groups",              sub: isTr ? "A'dan L'ye Devler Ligi" : "Pots A through L" },
  ];

  const hosts = [
    { flag: "🇺🇸", country: isTr ? "ABD" : "USA", cities: isTr ? "11 Şehir" : "11 Cities", host: isTr ? "Ana Ev Sahibi" : "Primary Host" },
    { flag: "🇲🇽", country: isTr ? "Meksika" : "Mexico", cities: isTr ? "3 Şehir" : "3 Cities", host: isTr ? "Ortak Ev Sahibi" : "Co-Host" },
    { flag: "🇨🇦", country: isTr ? "Kanada" : "Canada", cities: isTr ? "2 Şehir" : "2 Cities", host: isTr ? "Ortak Ev Sahibi" : "Co-Host" },
  ];

  return (
    <div className="space-y-10 animate-fade-up" style={{ color: "#1A1916" }}>

      {/* ═══════════════════════════════════════════════════════
          HERO — Swiss asymmetric layout
      ══════════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "#1A1916",
          border: "1.5px solid #1A1916",
          boxShadow: "6px 6px 0px #00FF87",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />

        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: "#00FF87", boxShadow: "0 0 12px #00FF87" }}
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-between" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-3 mb-8">
              <span className="neon-badge neon-badge-green">FIFA 2026</span>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.6rem", fontWeight: 900 }}>•</span>
              <span className="neon-badge neon-badge-green">{isTr ? "48 TAKIM" : "48 TEAMS"}</span>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.6rem", fontWeight: 900 }}>•</span>
              <span className="neon-badge neon-badge-yellow">{isTr ? "3 ÜLKE" : "3 COUNTRIES"}</span>
            </div>

            <div className="space-y-4">
              <h1
                className="leading-none"
                style={{
                  fontSize: "clamp(2.5rem, 7vw, 5rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  color: "#F8F7F2",
                }}
              >
                {isTr ? "DÜNYA" : "WORLD"}
                <br />
                <span style={{ color: "#00FF87", textShadow: "0 0 30px rgba(0,255,135,0.4)" }}>{isTr ? "KUPASI" : "CUP"}</span>
                <br />
                2026
              </h1>

              <p style={{ color: "#8C8A84", fontSize: "0.8rem", fontWeight: 500, lineHeight: 1.7, maxWidth: "38ch" }}>
                {isTr
                  ? "Kanada, Meksika ve ABD ortak ev sahipliğindeki 48 takımlı dev turnuvanın tüm istatistiklerini, AI destekli analizlerini ve ELO güç derecelerini keşfedin."
                  : "Discover all the statistics, AI-powered insights, and ELO power ratings of the massive 48-team tournament co-hosted by Canada, Mexico, and the USA."}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 mt-10">
              <a
                href="#/teams"
                className="swiss-btn-primary"
                onClick={e => { e.preventDefault(); window.location.hash = "#/teams"; }}
              >
                <span>⚽</span> {isTr ? "Takımları Keşfet" : "Explore Teams"}
              </a>
              <a
                href="#/elo"
                className="swiss-btn-secondary"
                style={{ color: "#F8F7F2", borderColor: "rgba(255,255,255,0.25)", boxShadow: "3px 3px 0 rgba(255,255,255,0.15)" }}
                onClick={e => { e.preventDefault(); window.location.hash = "#/elo"; }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.boxShadow = "4px 4px 0 rgba(255,255,255,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.boxShadow = "3px 3px 0 rgba(255,255,255,0.15)"; }}
              >
                <span>📊</span> {isTr ? "ELO Analizi" : "ELO Analysis"}
              </a>
            </div>
          </div>

          <div className="flex flex-col" style={{ background: "rgba(255,255,255,0.02)" }}>
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex-1 flex items-center gap-6 px-8 py-5"
                style={{
                  borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  transition: "background 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,255,135,0.04)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  className="swiss-number shrink-0"
                  style={{ color: "#00FF87", fontSize: "clamp(1.8rem, 3.5vw, 3rem)", textShadow: "0 0 20px rgba(0,255,135,0.25)" }}
                >
                  {stat.num}
                </div>
                <div>
                  <div style={{ color: "#F2F0E8", fontWeight: 800, fontSize: "0.75rem", letterSpacing: "0.05em" }}>{stat.label}</div>
                  <div style={{ color: "#5C5A54", fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.08em", marginTop: 2 }}>{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="swiss-divider mb-6">{isTr ? "Platformun Temel Özellikleri" : "Core Platform Features"}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <a
              key={i}
              href={`#/${f.route}`}
              className="retro-card block p-6"
              style={{
                background: "#F8F7F2",
                textDecoration: "none",
                color: "inherit",
              }}
              onClick={e => { e.preventDefault(); window.location.hash = `#/${f.route}`; }}
            >
              <div className="flex items-end gap-2 mb-4">
                <span
                  className="swiss-number"
                  style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)", color: "#1A1916" }}
                >
                  {f.icon}
                </span>
                <span
                  style={{
                    fontSize: "0.55rem",
                    fontWeight: 900,
                    letterSpacing: "0.2em",
                    color: f.accent,
                    paddingBottom: "0.5rem",
                    textShadow: `0 0 8px ${f.accent}`,
                  }}
                >
                  {f.unit}
                </span>
              </div>

              <div style={{ height: 2, background: f.accent, boxShadow: `0 0 6px ${f.accent}`, marginBottom: 12 }} />

              <div style={{ fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.05em", marginBottom: 6, color: "#1A1916" }}>
                {f.label}
              </div>
              <p style={{ fontSize: "0.65rem", color: "#5C5A54", lineHeight: 1.7, fontWeight: 500 }}>
                {f.desc}
              </p>

              <div
                className="flex items-center gap-2 mt-5"
                style={{ fontSize: "0.55rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: f.accent }}
              >
                <span>{isTr ? "Keşfet" : "Explore"}</span>
                <span>→</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div>
        <div className="swiss-divider mb-6">{isTr ? "Efsanevi Takım Profilleri" : "Legendary Team Profiles"}</div>

        <div
          className="p-6 md:p-8"
          style={{
            background: "#F2F0E8",
            border: "1.5px solid #1A1916",
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="swiss-label mb-1">{isTr ? "Hızlı Erişim" : "Quick Access"}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 900, letterSpacing: "0.02em", color: "#1A1916" }}>
                {isTr ? "Tarihsel Güç Profilleri" : "Historical Strength Profiles"}
              </div>
            </div>
            <span className="neon-badge neon-badge-green animate-neon-pulse">{isTr ? "CANLI VERİ" : "LIVE DATA"}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickTeams.map(team => (
              <button
                key={team.name}
                onClick={() => onSelectTeam(team.name)}
                className="retro-card-sm p-4 flex flex-col items-center text-center gap-2 cursor-pointer"
                style={{
                  background: "#F8F7F2",
                  border: "none",
                  width: "100%",
                }}
              >
                <span style={{ fontSize: "2rem", lineHeight: 1 }}>{team.emoji}</span>
                <div style={{ fontSize: "0.6rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1A1916" }}>
                  {team.tr}
                </div>
                <div
                  className="neon-badge neon-badge-green"
                  style={{ fontSize: "0.5rem" }}
                >
                  ELO {team.elo}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-3 gap-0 overflow-hidden"
        style={{ border: "1.5px solid #1A1916" }}
      >
        {hosts.map((h, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center p-4 md:p-6 text-center"
            style={{ borderRight: i < 2 ? "1.5px solid #1A1916" : "none", background: i === 0 ? "#1A1916" : "#F8F7F2" }}
          >
            <span style={{ fontSize: "2rem", marginBottom: 8 }}>{h.flag}</span>
            <div style={{
              fontSize: "0.75rem",
              fontWeight: 900,
              letterSpacing: "0.06em",
              color: i === 0 ? "#F8F7F2" : "#1A1916",
              textTransform: "uppercase",
            }}>
              {h.country}
            </div>
            <div className="swiss-label mt-1" style={{ color: i === 0 ? "#5C5A54" : "#8C8A84" }}>{h.cities}</div>
            <div
              style={{
                marginTop: 6,
                fontSize: "0.5rem",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: i === 0 ? "#00FF87" : "#00C060",
              }}
            >
              {h.host}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
