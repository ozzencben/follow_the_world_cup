import { useState, useRef, useEffect } from "react";
import api from "../services/api";

interface Team {
  teamId: string;
  teamName: string;
  teamFlag: string;
}

interface FifaDataResponse {
  teams: Team[];
}

interface NavbarProps {
  currentRoute: string;
  onRouteChange: (route: string) => void;
  onSelectTeam: (teamName: string) => void;
}

export default function Navbar({ currentRoute, onRouteChange, onSelectTeam }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [countdownText, setCountdownText] = useState("");
  const [scrolled, setScrolled] = useState(false);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) setShowSearchResults(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        const t = e.target as HTMLElement;
        if (!t.closest("#mobile-menu-toggle")) setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load teams for search
  useEffect(() => {
    api.get<FifaDataResponse>("/teams").then(r => setTeams(r.data.teams)).catch(() => {});
  }, []);

  // Countdown
  useEffect(() => {
    const target = new Date("2026-06-11T21:00:00+03:00").getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setCountdownText("⚽ 2026 DÜNYA KUPASI BAŞLADI!"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdownText(`${d}G ${h}S ${m}D ${s}SN`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isTeamsActive = ["teams", "groups", "matches"].includes(currentRoute);
  const filteredTeams = searchQuery
    ? teams.filter(t => {
        const name = t.teamName === "Bosnia-Herzegovina" ? "Bosnia and Herzegovina" : t.teamName;
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : [];

  const getFlagUrl = (f?: string) => f ? f.replace("{format}", "sq").replace("{size}", "1") : "";

  const navLinks = [
    { id: "home",      label: "Ana Sayfa" },
    { id: "about",     label: "Turnuva" },
    { id: "elo",       label: "ELO Rating" },
    { id: "simulator", label: "⚡ Simüle Et" },
    { id: "contact",   label: "İletişim" },
  ];

  return (
    <header className={`sticky top-0 z-50 w-full flex flex-col transition-all duration-200 ${scrolled ? "shadow-md" : ""}`}>
      {/* ── Retro Ticker Bar ─────────────────────────────────── */}
      <div
        className="w-full overflow-hidden relative"
        style={{ background: "#1A1916", borderBottom: "1px solid rgba(0,255,135,0.2)" }}
      >
        <div className="flex items-center h-8">
          {/* Left badge */}
          <div
            className="shrink-0 flex items-center gap-2 px-4 h-full border-r"
            style={{ borderColor: "rgba(0,255,135,0.25)", background: "rgba(0,255,135,0.06)" }}
          >
            <span className="animate-retro-blink" style={{ color: "#00FF87", fontSize: "0.5rem" }}>●</span>
            <span className="swiss-label" style={{ color: "#00FF87" }}>LIVE</span>
          </div>
          {/* Ticker content */}
          <div className="flex-1 overflow-hidden mx-4">
            <div className="ticker-track">
              {[1, 2].map(i => (
                <span key={i} className="flex items-center gap-8 pr-16" style={{ color: "#8C8A84", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em" }}>
                  <span style={{ color: "#F2F0E8" }}>⏱ DÜNYA KUPASI AÇILIŞ MAÇINA:</span>
                  <span style={{ color: "#00FF87", fontVariantNumeric: "tabular-nums" }}>{countdownText}</span>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>//</span>
                  <span>🏆 FIFA DÜNYA KUPASI 2026 • KANADA • ABD • MEKSİKA</span>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>//</span>
                  <span>48 Milli Takım • 104 Maç • 16 Şehir</span>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>//</span>
                </span>
              ))}
            </div>
          </div>
          {/* Right status */}
          <div
            className="shrink-0 px-4 h-full flex items-center border-l"
            style={{ borderColor: "rgba(0,255,135,0.25)", background: "rgba(0,255,135,0.06)" }}
          >
            <span className="swiss-label" style={{ color: "#8C8A84" }}>FTW v2.1</span>
          </div>
        </div>
      </div>

      {/* ── Main Navbar ──────────────────────────────────────── */}
      <nav
        className="w-full"
        style={{
          background: "rgba(248,247,242,0.97)",
          backdropFilter: "blur(12px)",
          borderBottom: "2px solid #1A1916",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 md:px-6 h-14">

          {/* Logo */}
          <a
            href="#/home"
            className="flex items-center gap-3 shrink-0 group"
            onClick={e => { e.preventDefault(); onRouteChange("home"); }}
          >
            <div
              className="w-8 h-8 flex items-center justify-center font-black text-sm"
              style={{
                background: "#1A1916",
                color: "#00FF87",
                border: "1.5px solid #1A1916",
                boxShadow: "2px 2px 0 #00FF87",
                borderRadius: 0,
                letterSpacing: "-0.02em",
              }}
            >
              FW
            </div>
            <div className="flex flex-col leading-none">
              <span style={{ fontSize: "0.65rem", fontWeight: 900, letterSpacing: "0.18em", color: "#1A1916", textTransform: "uppercase" }}>
                FollowThe
              </span>
              <span style={{ fontSize: "0.65rem", fontWeight: 900, letterSpacing: "0.18em", color: "#00C060", textTransform: "uppercase" }}>
                WorldCup
              </span>
            </div>
          </a>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Home */}
            {navLinks.map(link => (
              <a
                key={link.id}
                href={`#/${link.id}`}
                onClick={e => { e.preventDefault(); onRouteChange(link.id); }}
                className="relative px-4 py-2 flex flex-col items-center"
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: currentRoute === link.id ? "#1A1916" : "#5C5A54",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {link.label}
                {currentRoute === link.id && (
                  <span
                    style={{
                      display: "block",
                      height: "2px",
                      background: "#00FF87",
                      boxShadow: "0 0 6px #00FF87",
                      width: "100%",
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                    }}
                  />
                )}
              </a>
            ))}

            {/* Teams Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="relative px-4 py-2 flex flex-col items-center"
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: isTeamsActive ? "#1A1916" : "#5C5A54",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                Milli Takımlar
                <svg className={`w-2.5 h-2.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                </svg>
                {isTeamsActive && (
                  <span style={{ display: "block", height: "2px", background: "#00FF87", boxShadow: "0 0 6px #00FF87", width: "calc(100% - 16px)", position: "absolute", bottom: 0, left: 8 }} />
                )}
              </button>

              {dropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-0 w-48 animate-fade-up"
                  style={{
                    background: "#F8F7F2",
                    border: "1.5px solid #1A1916",
                    boxShadow: "4px 4px 0px #1A1916",
                    zIndex: 100,
                  }}
                >
                  {[
                    { id: "teams", label: "Tüm Takımlar" },
                    { id: "groups", label: "Gruplar & Puanlar" },
                    { id: "matches", label: "Fikstür & Maçlar" },
                  ].map(item => (
                    <a
                      key={item.id}
                      href={`#/${item.id}`}
                      onClick={e => { e.preventDefault(); setDropdownOpen(false); onRouteChange(item.id); }}
                      style={{
                        display: "block",
                        padding: "10px 16px",
                        fontSize: "0.6rem",
                        fontWeight: 900,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: currentRoute === item.id ? "#00C060" : "#2C2A26",
                        textDecoration: "none",
                        borderBottom: "1px solid #EAE7DA",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#EAE7DA")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {currentRoute === item.id && <span style={{ color: "#00FF87", marginRight: 6 }}>▶</span>}
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative shrink w-40 md:w-60 max-w-xs" ref={searchContainerRef}>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Takım ara..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                onFocus={() => setShowSearchResults(true)}
                className="swiss-input pr-8"
                style={{ paddingLeft: "36px", borderRadius: 0 }}
              />
              <span style={{ position: "absolute", left: 12, color: "#8C8A84", fontSize: "0.75rem", pointerEvents: "none" }}>⌕</span>
            </div>

            {showSearchResults && filteredTeams.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-0 max-h-64 overflow-y-auto animate-fade-up"
                style={{ background: "#F8F7F2", border: "1.5px solid #1A1916", boxShadow: "4px 4px 0 #1A1916", zIndex: 100 }}
              >
                <div style={{ padding: "6px 12px", fontSize: "0.5rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8C8A84", borderBottom: "1px solid #EAE7DA" }}>
                  Sonuçlar ({filteredTeams.length})
                </div>
                {filteredTeams.map(t => (
                  <button
                    key={t.teamId}
                    onClick={() => { onSelectTeam(t.teamName); setSearchQuery(""); setShowSearchResults(false); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "8px 12px",
                      background: "none",
                      border: "none",
                      borderBottom: "1px solid #EAE7DA",
                      cursor: "pointer",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "#2C2A26",
                      textAlign: "left",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#EAE7DA")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    {t.teamFlag && (
                      <img src={getFlagUrl(t.teamFlag)} alt={t.teamName} style={{ width: 18, height: 12, objectFit: "cover", border: "1px solid #E0DDD0" }} />
                    )}
                    {t.teamName}
                  </button>
                ))}
              </div>
            )}

            {showSearchResults && searchQuery && filteredTeams.length === 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-0 p-4 text-center"
                style={{ background: "#F8F7F2", border: "1.5px solid #1A1916", boxShadow: "4px 4px 0 #1A1916", fontSize: "0.6rem", fontWeight: 700, color: "#8C8A84", letterSpacing: "0.1em" }}
              >
                Takım bulunamadı
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2"
            style={{ background: "none", border: "1.5px solid #1A1916", cursor: "pointer", color: "#1A1916" }}
          >
            {mobileMenuOpen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="lg:hidden animate-slide-in"
          style={{ background: "#F8F7F2", borderBottom: "2px solid #1A1916" }}
        >
          {[
            { id: "home",      label: "Ana Sayfa" },
            { id: "teams",     label: "Tüm Takımlar" },
            { id: "groups",    label: "Gruplar & Puanlar" },
            { id: "matches",   label: "Fikstür & Maçlar" },
            { id: "about",     label: "Turnuva" },
            { id: "elo",       label: "ELO Rating" },
            { id: "simulator", label: "⚡ Simüle Et (Kokpit)" },
            { id: "contact",   label: "İletişim" },
          ].map(item => (
            <a
              key={item.id}
              href={`#/${item.id}`}
              onClick={e => { e.preventDefault(); setMobileMenuOpen(false); onRouteChange(item.id); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 20px",
                fontSize: "0.65rem",
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: currentRoute === item.id ? "#00C060" : "#2C2A26",
                textDecoration: "none",
                borderBottom: "1px solid #E0DDD0",
                background: currentRoute === item.id ? "rgba(0,192,96,0.05)" : "transparent",
              }}
            >
              {currentRoute === item.id && <span style={{ color: "#00FF87", fontSize: "0.5rem" }}>●</span>}
              {item.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
