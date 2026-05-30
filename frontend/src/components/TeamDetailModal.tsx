import { useEffect, useState } from "react";
import api from "../services/api";

interface TeamDetailModalProps {
  teamName: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectTeam?: (name: string) => void;
}

interface TeamEnrichmentData {
  teamId: string;
  primaryColor: string;
  secondaryColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
}

interface Team {
  teamId: string;
  teamName: string;
  teamFlag: string;
  confederationId: string;
  stage: string;
  worldRanking: number;
  appearances: number;
  hostTeam: boolean;
  teamEnrichmentData: TeamEnrichmentData;
}

interface SquadTeam {
  name: string;
  abbr: string;
  seed: number;
  group: string;
  groupPlayed: number;
  groupPosition: number;
  groupGoalsDifference: number;
  groupPoints: number;
  worldRank: number;
}

interface Match {
  id: number;
  venueName: string;
  date: string;
  homeSquadName: string;
  awaySquadName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

interface Round {
  id: number;
  stage: string;
  tournaments: Match[];
}

interface Winner {
  year: number;
  country_tr: string;
  country_en: string;
  manager: string;
}

interface WinnersResponse {
  winners: Winner[];
}

interface EloStats {
  localRank: number;
  globalRank: number;
  code: string;
  nameEn: string;
  nameTr: string;
  confederation: string;
  rating: number;
  peakRank: number;
  peakRating: number;
  avgRank: number;
  avgRating: number;
  lowRank: number;
  lowRating: number;
  oneYearRankChange: string;
  oneYearRatingChange: string;
  matchesTotal: number;
  matchesHome: number;
  matchesAway: number;
  matchesNeutral: number;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  winRate: number;
  goalsForAvg: number;
  goalsAgainstAvg: number;
  squadValue: number;
  averageAge: number;
  playerCount: number;
}

interface FormMatch {
  date: string;
  teamScore: number;
  opponentScore: number;
  opponentCode: string;
  opponentNameTr: string;
  opponentNameEn: string;
  matchType: string;
  result: string;
  eloChange: string;
}

const normalizeName = (name: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace("and", "");
};

const nameToCodeMap: { [key: string]: string } = {
  "spain": "ES", "argentina": "AR", "france": "FR", "england": "EN",
  "brazil": "BR", "portugal": "PT", "colombia": "CO", "netherlands": "NL",
  "ecuador": "EC", "croatia": "HR", "germany": "DE", "norway": "NO",
  "japan": "JP", "türkiye": "TR", "turkey": "TR", "uruguay": "UY",
  "switzerland": "CH", "senegal": "SN", "belgium": "BE", "mexico": "MX",
  "paraguay": "PY", "austria": "AT", "morocco": "MA", "canada": "CA",
  "australia": "AU", "scotland": "SQ", "ir iran": "IR", "korea republic": "KR",
  "algeria": "DZ", "panama": "PA", "uzbekistan": "UZ", "czechia": "CZ",
  "usa": "US", "sweden": "SE", "egypt": "EG", "jordan": "JO",
  "côte d'ivoire": "CI", "congo dr": "CD", "tunisia": "TN", "iraq": "IQ",
  "bosnia-herzegovina": "BA", "bosnia and herzegovina": "BA",
  "new zealand": "NZ", "saudi arabia": "SA", "cabo verde": "CV",
  "haiti": "HT", "south africa": "ZA", "ghana": "GH", "curaçao": "CW", "qatar": "QA"
};

const getTeamCode = (name: string) => {
  const norm = normalizeName(name);
  const normalizedMap: { [key: string]: string } = {};
  Object.keys(nameToCodeMap).forEach(key => {
    normalizedMap[normalizeName(key)] = nameToCodeMap[key];
  });
  return normalizedMap[norm] || "";
};

const CONF_NEON: Record<string, string> = {
  UEFA: "#00E5FF", CONMEBOL: "#00FF87", CONCACAF: "#FFE600",
  CAF: "#FF6B00", AFC: "#FF2D78", OFC: "#8C8A84",
};

// ── Swiss-Retro stat block helper ──────────────────────────────
const StatBlock = ({ label, value, sub, accent = "#1A1916" }: { label: string; value: string; sub?: string; accent?: string }) => (
  <div style={{ padding: "14px 12px", borderRight: "1px solid #EAE7DA" }}>
    <div style={{ fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8C8A84", marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontSize: "1.1rem", fontWeight: 900, color: accent, letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: "0.5rem", fontWeight: 700, color: "#8C8A84", marginTop: 3, letterSpacing: "0.06em" }}>{sub}</div>}
  </div>
);

export default function TeamDetailModal({ teamName, isOpen, onClose, onSelectTeam }: TeamDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "matches" | "group" | "history" | "stats">("overview");

  const [teamInfo, setTeamInfo] = useState<Team | null>(null);
  const [squadInfo, setSquadInfo] = useState<SquadTeam | null>(null);
  const [allGroupTeams, setAllGroupTeams] = useState<{ team: Team; squad: SquadTeam }[]>([]);
  const [teamMatches, setTeamMatches] = useState<Match[]>([]);
  const [championships, setChampionships] = useState<Winner[]>([]);
  const [eloStats, setEloStats] = useState<EloStats | null>(null);
  const [formHistory, setFormHistory] = useState<FormMatch[]>([]);
  const [trajectory, setTrajectory] = useState<any[]>([]);
  const [eloFixtures, setEloFixtures] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !teamName) return;
    setLoading(true);
    setError(null);
    setActiveTab("overview");

    Promise.all([
      api.get<{ teams: Team[] }>("/teams"),
      api.get<SquadTeam[]>("/squads"),
      api.get<Round[]>("/rounds"),
      api.get<WinnersResponse>("/winners"),
      api.get<EloStats[]>("/elo/ratings"),
      api.get<any[]>("/elo/fixtures"),
    ])
      .then(([teamsRes, squadsRes, roundsRes, winnersRes, eloRes, fixturesRes]) => {
        setEloFixtures(fixturesRes.data || []);

        const foundTeam = teamsRes.data.teams.find(
          t => normalizeName(t.teamName) === normalizeName(teamName)
        );
        if (!foundTeam) throw new Error("Takım veritabanında bulunamadı.");
        setTeamInfo(foundTeam);

        const foundSquad = squadsRes.data.find(
          s => normalizeName(s.name) === normalizeName(teamName)
        );
        setSquadInfo(foundSquad || null);

        if (foundSquad?.group) {
          const members = squadsRes.data
            .filter(s => s.group === foundSquad.group)
            .map(sq => {
              const memberTeam = teamsRes.data.teams.find(
                t => normalizeName(t.teamName) === normalizeName(sq.name)
              );
              return {
                squad: sq,
                team: memberTeam || {
                  teamId: sq.name, teamName: sq.name, teamFlag: "", confederationId: "",
                  stage: foundSquad.group, worldRanking: sq.worldRank, appearances: 1,
                  hostTeam: false,
                  teamEnrichmentData: { teamId: sq.name, primaryColor: "#475569", secondaryColor: "#64748B", primaryTextColor: "#FFF", secondaryTextColor: "#FFF" }
                }
              };
            })
            .sort((a, b) => a.squad.groupPosition - b.squad.groupPosition);
          setAllGroupTeams(members);
        }

        const matches: Match[] = [];
        roundsRes.data.forEach(round => {
          round.tournaments?.forEach(m => {
            if (normalizeName(m.homeSquadName) === normalizeName(teamName) || normalizeName(m.awaySquadName) === normalizeName(teamName)) {
              matches.push(m);
            }
          });
        });
        setTeamMatches(matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

        setChampionships(winnersRes.data.winners.filter(w => normalizeName(w.country_en) === normalizeName(teamName)));

        const teamCode = getTeamCode(teamName);
        if (teamCode) {
          const matchedElo = eloRes.data.find((e: any) => e.code.toLowerCase() === teamCode.toLowerCase());
          setEloStats(matchedElo || null);
          api.get<{ form: FormMatch[]; trajectory: any[] }>(`/elo/team/${teamCode}/form`)
            .then(r => { setFormHistory(r.data.form || []); setTrajectory(r.data.trajectory || []); })
            .catch(() => {});
        } else {
          setEloStats(null);
          setFormHistory([]);
          setTrajectory([]);
        }
      })
      .catch(err => setError(err.message || "Takım detayları yüklenirken hata oluştu."))
      .finally(() => setLoading(false));
  }, [isOpen, teamName]);

  if (!isOpen) return null;

  const getFlagUrl = (f?: string) => f ? f.replace("{format}", "sq").replace("{size}", "2") : "";
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const primaryColor = teamInfo?.teamEnrichmentData?.primaryColor || "#1A1916";
  const primaryText  = teamInfo?.teamEnrichmentData?.primaryTextColor || "#FFFFFF";
  const confColor    = CONF_NEON[teamInfo?.confederationId || ""] ?? "#8C8A84";

  const strengthIndex = (() => {
    if (!teamInfo) return 50;
    const r = Math.max(0, 100 - (teamInfo.worldRanking || 100) * 0.8);
    const a = Math.min(30, (teamInfo.appearances || 0) * 1.5);
    const c = championships.length * 10;
    return Math.min(99, Math.round(40 + r * 0.4 + a + c));
  })();

  const tacticalAnalysis = (() => {
    if (!teamInfo) return "";
    const n = teamInfo.teamName;
    if (championships.length > 0)
      return `${n}, Dünya Kupası tarihinin ${championships.length} şampiyonlukla en elit ekiplerindendir. 2026 kupasında da doğal şampiyonluk favorileri arasında gösterilmektedir.`;
    if (teamInfo.worldRanking <= 15)
      return `${n}, FIFA sıralamasında ${teamInfo.worldRanking}. sırada yer alarak modern futbolun en organize ekiplerinden biridir. Dengeli taktik disipliniyle yarı final ve ötesine uzanabilecek güçlü bir potansiyele sahiptir.`;
    if (teamInfo.hostTeam)
      return `${n}, 2026 turnuvasına ev sahipliği yapmanın getirdiği devasa taraftar coşkusu ve saha avantajına sahiptir. Gruplardan lider çıkarak sürpriz yapmaya hazırdır.`;
    return `${n}, fiziksel gücü ve mücadeleci yapısıyla turnuvanın en dirençli takımlarındandır. ${teamInfo.confederationId} elemelerinden gelen bu kararlı ekip rakipleri zorlayacak puan almaya adaydır.`;
  })();

  // ── TAB DEFINITIONS ──────────────────────────────────────────
  const tabs = [
    { id: "overview", label: "Genel Bakış" },
    { id: "matches",  label: `Maçlar (${teamMatches.length})` },
    { id: "group",    label: "Puan Durumu" },
    ...(eloStats           ? [{ id: "stats",   label: "İstatistikler" }] : []),
    ...(championships.length > 0 ? [{ id: "history", label: "Şampiyonluklar" }] : []),
  ];

  return (
    // ── OVERLAY ─────────────────────────────────────────────────
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(26,25,22,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      {/* ── MODAL SHELL ───────────────────────────────────────── */}
      <div
        className="flex flex-col w-full max-w-3xl relative animate-fade-up"
        style={{
          maxHeight: "88vh",
          background: "#F8F7F2",
          border: "1.5px solid #1A1916",
          boxShadow: `6px 6px 0 ${primaryColor}80`,
          color: "#1A1916",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Neon top bar (team brand color) */}
        <div style={{ height: 3, background: primaryColor, boxShadow: `0 0 10px ${primaryColor}80` }} />

        {/* ── CLOSE BUTTON ──────────────────────────────────── */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 12, right: 12,
            width: 32, height: 32,
            border: "1.5px solid #1A1916",
            background: "#F8F7F2",
            color: "#1A1916",
            fontWeight: 900,
            fontSize: "0.75rem",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 20,
            transition: "background 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#1A1916"; e.currentTarget.style.color = "#00FF87"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#F8F7F2"; e.currentTarget.style.color = "#1A1916"; }}
        >
          ✕
        </button>

        {/* ── LOADING ───────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div style={{ width: 36, height: 36, border: `3px solid ${primaryColor}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span className="swiss-label animate-retro-blink" style={{ color: "#5C5A54" }}>Takım Detayları Yükleniyor...</span>
          </div>
        )}

        {/* ── ERROR ─────────────────────────────────────────── */}
        {!loading && (error || !teamInfo) && (
          <div className="p-12 text-center space-y-4">
            <span style={{ fontSize: "2.5rem" }}>⚠️</span>
            <h4 style={{ fontWeight: 900, fontSize: "1rem", color: "#E53E3E" }}>Detaylar Yüklenemedi</h4>
            <p style={{ fontSize: "0.7rem", color: "#5C5A54" }}>{error || "Takım bilgilerine şu anda erişilemiyor."}</p>
            <button onClick={onClose} className="swiss-btn-secondary" style={{ margin: "0 auto" }}>Kapat</button>
          </div>
        )}

        {/* ── CONTENT ───────────────────────────────────────── */}
        {!loading && !error && teamInfo && (
          <>
            {/* ── HERO HEADER ─────────────────────────────── */}
            <div
              className="relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-5 p-6"
              style={{ background: primaryColor, flexShrink: 0 }}
            >
              {/* Grid overlay */}
              <div className="absolute inset-0 opacity-[0.06]" style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                backgroundSize: "36px 36px",
              }} />

              {/* Left: flag + name */}
              <div className="flex items-center gap-4 z-10">
                <img
                  src={getFlagUrl(teamInfo.teamFlag)}
                  alt={teamInfo.teamName}
                  style={{ width: 60, height: 60, objectFit: "cover", border: `2px solid ${primaryText}30`, flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span style={{
                      fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase",
                      color: confColor, border: `1px solid ${confColor}50`, background: `${confColor}12`,
                      padding: "2px 8px",
                    }}>
                      {teamInfo.confederationId}
                    </span>
                    <span style={{ fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: primaryText, opacity: 0.7, padding: "2px 8px", border: `1px solid ${primaryText}30` }}>
                      {teamInfo.stage}
                    </span>
                    {teamInfo.hostTeam && (
                      <span style={{ fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FFE600", border: "1px solid #FFE60050", padding: "2px 8px" }}>
                        EV SAHİBİ
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: "clamp(1.3rem, 4vw, 2rem)", fontWeight: 900, letterSpacing: "-0.03em", color: primaryText, lineHeight: 1.1 }}>
                    {teamInfo.teamName}
                    {squadInfo?.abbr && (
                      <span style={{ fontSize: "0.7rem", opacity: 0.6, marginLeft: 8, fontWeight: 700 }}>({squadInfo.abbr})</span>
                    )}
                  </h2>
                  <div style={{ fontSize: "0.6rem", color: primaryText, opacity: 0.7, marginTop: 4, fontWeight: 600 }}>
                    FIFA Sıra #{teamInfo.worldRanking} · {teamInfo.appearances} Katılım
                    {eloStats && ` · ELO ${eloStats.rating}`}
                  </div>
                </div>
              </div>

              {/* Right: trophies + strength index */}
              <div className="flex items-center gap-4 z-10 shrink-0">
                {championships.length > 0 && (
                  <div className="text-center" style={{ padding: "8px 14px", border: `1.5px solid rgba(255,230,0,0.4)`, background: "rgba(255,230,0,0.1)" }}>
                    <div style={{ fontSize: "1.5rem" }}>🏆</div>
                    <div style={{ fontSize: "0.5rem", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FFE600", marginTop: 2 }}>
                      {championships.length}x Şampiyon
                    </div>
                  </div>
                )}

                {/* Strength gauge */}
                <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
                  <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                    <circle cx="36" cy="36" r="30" stroke={`${primaryText}25`} strokeWidth="5" fill="transparent" />
                    <circle
                      cx="36" cy="36" r="30"
                      stroke={confColor}
                      strokeWidth="5"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 30}
                      strokeDashoffset={2 * Math.PI * 30 * (1 - strengthIndex / 100)}
                      strokeLinecap="square"
                    />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 900, color: primaryText, lineHeight: 1 }}>{strengthIndex}</span>
                    <span style={{ fontSize: "0.38rem", fontWeight: 900, letterSpacing: "0.1em", color: confColor, textTransform: "uppercase" }}>GÜÇSKOR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── NAVIGATION TABS ─────────────────────────── */}
            <div
              className="flex overflow-x-auto"
              style={{ borderBottom: "1.5px solid #1A1916", background: "#F2F0E8", flexShrink: 0 }}
            >
              {tabs.map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      padding: "12px 18px",
                      fontSize: "0.52rem",
                      fontWeight: 900,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      background: "transparent",
                      border: "none",
                      borderBottom: `2.5px solid ${active ? primaryColor : "transparent"}`,
                      color: active ? primaryColor : "#8C8A84",
                      whiteSpace: "nowrap",
                      transition: "color 0.12s, border-color 0.12s",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ── SCROLLABLE CONTENT ──────────────────────── */}
            <div className="flex-grow overflow-y-auto p-5 md:p-6 space-y-5">

              {/* ═══ TAB: OVERVIEW ═══════════════════════════ */}
              {activeTab === "overview" && (
                <div className="space-y-5">

                  {/* Quick stat row */}
                  <div style={{ border: "1.5px solid #1A1916", overflow: "hidden" }}>
                    <div className="grid grid-cols-2 md:grid-cols-4">
                      <StatBlock label="Grup Torbası" value={squadInfo?.seed ? `${squadInfo.seed}. Torba` : "—"} accent={primaryColor} />
                      <StatBlock label="Konfederasyon" value={teamInfo.confederationId} accent={confColor} />
                      <StatBlock label="Katılım" value={`${teamInfo.appearances} Kez`} />
                      <div style={{ padding: "14px 12px" }}>
                        <div style={{ fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8C8A84", marginBottom: 4 }}>Aşama</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "#1A1916", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{teamInfo.stage}</div>
                      </div>
                    </div>
                  </div>

                  {/* Transfermarkt squad value */}
                  {eloStats && eloStats.squadValue > 0 && (
                    <div style={{ border: "1.5px solid #1A1916", overflow: "hidden" }}>
                      <div className="flex items-center justify-between px-4 py-2" style={{ background: "#1A1916", borderBottom: "2px solid #00FF87" }}>
                        <span style={{ fontSize: "0.52rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: "#00FF87" }}>
                          Transfermarkt Kadro Profili
                        </span>
                        <span style={{ fontSize: "0.48rem", fontWeight: 900, color: "#5C5A54", letterSpacing: "0.1em" }}>FİNANSAL VERİ</span>
                      </div>
                      <div className="grid grid-cols-3">
                        <StatBlock label="Kadro Değeri" value={`${eloStats.squadValue.toLocaleString("tr-TR")} M€`} accent="#00C060" />
                        <StatBlock label="Yaş Ortalaması" value={`${eloStats.averageAge} Yaş`} />
                        <div style={{ padding: "14px 12px" }}>
                          <div style={{ fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8C8A84", marginBottom: 4 }}>Oyuncu Sayısı</div>
                          <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#1A1916", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{eloStats.playerCount}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Tactical Analysis */}
                  <div style={{ border: "1.5px solid #1A1916", borderLeft: `4px solid ${confColor}`, padding: "16px 18px", background: "#F2F0E8" }}>
                    <div style={{ fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: confColor, marginBottom: 8 }}>
                      🤖 AI Taktik Analizi
                    </div>
                    <p style={{ fontSize: "0.7rem", color: "#5C5A54", lineHeight: 1.8, fontStyle: "italic" }}>
                      "{tacticalAnalysis}"
                    </p>
                  </div>
                </div>
              )}

              {/* ═══ TAB: MATCHES ════════════════════════════ */}
              {activeTab === "matches" && (
                <div className="space-y-3">
                  {teamMatches.length > 0 ? teamMatches.map(match => {
                    const isHome = normalizeName(match.homeSquadName) === normalizeName(teamName);
                    const isPlayed = match.homeScore !== null && match.awayScore !== null;

                    const eloFix = eloFixtures.find(f =>
                      (f.t1NameEn.toLowerCase() === match.homeSquadName.toLowerCase() && f.t2NameEn.toLowerCase() === match.awaySquadName.toLowerCase()) ||
                      (f.t1NameEn.toLowerCase() === match.awaySquadName.toLowerCase() && f.t2NameEn.toLowerCase() === match.homeSquadName.toLowerCase())
                    );
                    const homeProb = eloFix ? (eloFix.t1NameEn.toLowerCase() === match.homeSquadName.toLowerCase() ? eloFix.t1Prob : eloFix.t2Prob) : null;
                    const awayProb = eloFix ? (eloFix.t2NameEn.toLowerCase() === match.awaySquadName.toLowerCase() ? eloFix.t2Prob : eloFix.t1Prob) : null;
                    const drawProb = eloFix ? eloFix.drawProb : null;

                    return (
                      <div
                        key={match.id}
                        style={{
                          border: "1.5px solid #1A1916",
                          borderLeft: `4px solid ${isHome ? primaryColor : "#E0DDD0"}`,
                          background: "#F8F7F2",
                          boxShadow: "2px 2px 0 #1A191615",
                        }}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-2" style={{ background: "#F2F0E8", borderBottom: "1px solid #EAE7DA" }}>
                          <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "#8C8A84", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                            📍 {match.venueName}
                          </span>
                          <span style={{ fontSize: "0.5rem", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5C5A54", flexShrink: 0 }}>
                            {match.status}
                          </span>
                        </div>

                        {/* Score row */}
                        <div className="flex items-center px-4 py-4">
                          <span style={{ flex: 1, fontSize: "0.75rem", fontWeight: isHome ? 900 : 700, color: isHome ? primaryColor : "#1A1916", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {match.homeSquadName}
                          </span>
                          <div className="shrink-0 mx-4">
                            {isPlayed ? (
                              <div style={{ padding: "4px 14px", background: "#1A1916", color: "#00FF87", fontWeight: 900, fontSize: "0.9rem", letterSpacing: "0.1em", fontVariantNumeric: "tabular-nums", textShadow: "0 0 8px rgba(0,255,135,0.5)" }}>
                                {match.homeScore} — {match.awayScore}
                              </div>
                            ) : (
                              <div style={{ padding: "3px 10px", border: `1.5px solid ${primaryColor}`, color: primaryColor, fontWeight: 900, fontSize: "0.6rem", letterSpacing: "0.2em" }}>
                                VS
                              </div>
                            )}
                          </div>
                          <span style={{ flex: 1, fontSize: "0.75rem", fontWeight: !isHome ? 900 : 700, color: !isHome ? primaryColor : "#1A1916", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                            {match.awaySquadName}
                          </span>
                        </div>

                        {/* ELO probability bar */}
                        {!isPlayed && homeProb !== null && awayProb !== null && drawProb !== null && (
                          <div className="px-4 pb-3 space-y-1" style={{ borderTop: "1px solid #EAE7DA", paddingTop: 10 }}>
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8C8A84" }}>🤖 ELO Tahmin Olasılıkları</span>
                              <span style={{ fontSize: "0.48rem", fontWeight: 900, color: "#00C060" }}>CANLI</span>
                            </div>
                            <div style={{ height: 6, background: "#E0DDD0", overflow: "hidden", display: "flex" }}>
                              <div style={{ width: `${homeProb}%`, background: primaryColor, transition: "width 0.6s ease" }} />
                              <div style={{ width: `${drawProb}%`, background: "#8C8A84" }} />
                              <div style={{ width: `${awayProb}%`, background: "#1A1916" }} />
                            </div>
                            <div className="flex justify-between" style={{ fontSize: "0.52rem", fontWeight: 900, color: "#5C5A54" }}>
                              <span style={{ color: primaryColor }}>%{homeProb} G</span>
                              <span>%{drawProb} B</span>
                              <span>%{awayProb} M</span>
                            </div>
                          </div>
                        )}

                        {/* Date footer */}
                        <div className="px-4 py-2 text-center" style={{ borderTop: "1px solid #EAE7DA", background: "#F2F0E8" }}>
                          <span className="swiss-label">{formatDate(match.date)}</span>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-16 text-center space-y-2" style={{ border: "1.5px solid #E0DDD0", background: "#F2F0E8" }}>
                      <div style={{ fontSize: "1.5rem" }}>⏳</div>
                      <p className="swiss-label">Bu takımın planlanmış karşılaşması bulunmamaktadır.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: GROUP STANDINGS ════════════════════ */}
              {activeTab === "group" && (
                <div>
                  {squadInfo?.group ? (
                    <div style={{ border: "1.5px solid #1A1916", overflow: "hidden", boxShadow: `4px 4px 0 ${primaryColor}50` }}>
                      {/* Group header */}
                      <div className="flex items-center justify-between px-5 py-3" style={{ background: "#1A1916", borderBottom: `2px solid ${primaryColor}` }}>
                        <span style={{ fontSize: "0.6rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: primaryColor }}>
                          {squadInfo.group.replace("Group", "Grup")} Puan Durumu
                        </span>
                        <span className="swiss-label" style={{ color: "#5C5A54" }}>FIFA Dünya Kupası 2026</span>
                      </div>

                      <table className="w-full border-collapse">
                        <thead>
                          <tr style={{ background: "#F2F0E8", borderBottom: "1px solid #E0DDD0" }}>
                            {["#", "Takım", "OM", "G", "B", "M", "A", "P"].map((col, i) => (
                              <th key={i} style={{
                                padding: "8px 6px",
                                fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase",
                                color: col === "P" ? primaryColor : "#8C8A84",
                                textAlign: i === 1 ? "left" : "center",
                                paddingLeft: i === 0 ? 16 : 6,
                                paddingRight: i === 7 ? 16 : 6,
                              }}>
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {allGroupTeams.map(({ team, squad }, idx) => {
                            const isSelf = normalizeName(squad.name) === normalizeName(teamName);
                            const flagUrl = getFlagUrl(team.teamFlag);
                            const isPromoted = idx < 2;

                            return (
                              <tr
                                key={squad.name}
                                onClick={() => { if (onSelectTeam && !isSelf) onSelectTeam(squad.name); }}
                                style={{
                                  borderBottom: idx === allGroupTeams.length - 1 ? "none" : "1px solid #EAE7DA",
                                  background: isSelf ? `${primaryColor}08` : "transparent",
                                  cursor: isSelf ? "default" : "pointer",
                                  transition: "background 0.12s",
                                }}
                                onMouseEnter={e => { if (!isSelf) e.currentTarget.style.background = "#F2F0E8"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = isSelf ? `${primaryColor}08` : "transparent"; }}
                              >
                                <td style={{ padding: "12px 6px 12px 16px", position: "relative" }}>
                                  {isPromoted && (
                                    <div style={{ position: "absolute", left: 6, top: 6, bottom: 6, width: 2, background: primaryColor, boxShadow: `0 0 4px ${primaryColor}` }} />
                                  )}
                                  <span style={{ fontSize: "0.7rem", fontWeight: 900, color: isPromoted ? primaryColor : "#8C8A84", fontVariantNumeric: "tabular-nums" }}>
                                    {idx + 1}
                                  </span>
                                </td>
                                <td style={{ padding: "12px 6px" }}>
                                  <div className="flex items-center gap-2">
                                    {flagUrl && <img src={flagUrl} alt={squad.name} style={{ width: 18, height: 12, objectFit: "cover", border: "1px solid #E0DDD0" }} />}
                                    <span style={{ fontSize: "0.7rem", fontWeight: isSelf ? 900 : 700, color: isSelf ? primaryColor : "#1A1916", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 110 }}>
                                      {squad.name}
                                    </span>
                                    {squad.abbr && (
                                      <span style={{ fontSize: "0.42rem", fontWeight: 900, color: "#8C8A84", background: "#EAE7DA", padding: "1px 4px" }}>
                                        {squad.abbr}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                {[squad.groupPlayed, 0, 0, 0, squad.groupGoalsDifference].map((v, i) => (
                                  <td key={i} style={{ padding: "12px 6px", textAlign: "center", fontSize: "0.68rem", fontWeight: 600, color: "#5C5A54", fontVariantNumeric: "tabular-nums" }}>{v}</td>
                                ))}
                                <td style={{ padding: "12px 16px 12px 6px", textAlign: "center" }}>
                                  <span style={{ fontSize: "0.78rem", fontWeight: 900, color: primaryColor, fontVariantNumeric: "tabular-nums" }}>
                                    {squad.groupPoints}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div className="flex items-center gap-2 px-5 py-2" style={{ borderTop: "1px solid #EAE7DA", background: "#F2F0E8" }}>
                        <div style={{ width: 2, height: 10, background: primaryColor, boxShadow: `0 0 4px ${primaryColor}`, flexShrink: 0 }} />
                        <span className="swiss-label">İlk 2 takım tur atlar</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center space-y-2" style={{ border: "1.5px solid #E0DDD0", background: "#F2F0E8" }}>
                      <div style={{ fontSize: "1.5rem" }}>📊</div>
                      <p className="swiss-label">Bu takımın grup puan tablosu şu an oluşturulamıyor.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: STATS ══════════════════════════════ */}
              {activeTab === "stats" && eloStats && (
                <div className="space-y-5">

                  {/* ELO Rating row */}
                  <div style={{ border: "1.5px solid #1A1916", overflow: "hidden" }}>
                    <div className="flex items-center px-4 py-2" style={{ background: "#1A1916", borderBottom: `2px solid ${primaryColor}` }}>
                      <span style={{ fontSize: "0.52rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: primaryColor }}>ELO Güç Dereceleri</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <StatBlock label="Güncel ELO" value={String(eloStats.rating)} sub={`DÜNYA #${eloStats.globalRank} · GRUP #${eloStats.localRank}`} accent={primaryColor} />
                      <StatBlock label="Zirve ELO" value={String(eloStats.peakRating)} sub={`Zirve Sıra: #${eloStats.peakRank}`} />
                      <div style={{ padding: "14px 12px" }}>
                        <div style={{ fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8C8A84", marginBottom: 4 }}>Tarihsel Ortalama</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#1A1916", fontVariantNumeric: "tabular-nums" }}>{eloStats.avgRating}</div>
                        <div style={{ fontSize: "0.5rem", fontWeight: 700, color: "#8C8A84", marginTop: 3 }}>Ort. Sıra: #{eloStats.avgRank}</div>
                      </div>
                    </div>
                  </div>

                  {/* W/L/D + Goals */}
                  <div style={{ border: "1.5px solid #1A1916", overflow: "hidden" }}>
                    <div className="flex items-center px-4 py-2" style={{ background: "#1A1916", borderBottom: "2px solid #00FF87" }}>
                      <span style={{ fontSize: "0.52rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: "#00FF87" }}>Tarihsel Maç Performansı</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4">
                      <StatBlock label="Toplam Maç" value={String(eloStats.matchesTotal)} sub={`Ev ${eloStats.matchesHome} · Dep ${eloStats.matchesAway}`} />
                      <StatBlock label="Galibiyet" value={String(eloStats.wins)} accent="#00C060" />
                      <StatBlock label="Mağlubiyet" value={String(eloStats.losses)} accent="#E53E3E" />
                      <div style={{ padding: "14px 12px" }}>
                        <div style={{ fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8C8A84", marginBottom: 4 }}>Kazanma Oranı</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#1A1916", fontVariantNumeric: "tabular-nums" }}>%{eloStats.winRate}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3" style={{ borderTop: "1px solid #EAE7DA" }}>
                      <StatBlock label="Atılan Gol" value={String(eloStats.goalsFor)} accent="#00C060" />
                      <StatBlock label="Yenilen Gol" value={String(eloStats.goalsAgainst)} />
                      <div style={{ padding: "14px 12px" }}>
                        <div style={{ fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8C8A84", marginBottom: 4 }}>Maç Başı Ort.</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#1A1916", fontVariantNumeric: "tabular-nums" }}>{eloStats.goalsForAvg}</div>
                      </div>
                    </div>
                  </div>

                  {/* ELO Trajectory sparkline */}
                  {trajectory.length > 1 && (() => {
                    const ratings = trajectory.map(t => t.rating);
                    const maxR = Math.max(...ratings, eloStats.rating) + 15;
                    const minR = Math.min(...ratings, eloStats.rating) - 15;
                    const range = maxR - minR || 1;
                    const pts = (arr: number[]) => arr.map((v, i) => `${(i / (arr.length - 1)) * 400} ${120 - ((v - minR) / range) * 100 - 10}`).join(" L ");

                    return (
                      <div style={{ border: "1.5px solid #1A1916", overflow: "hidden" }}>
                        <div className="flex items-center justify-between px-4 py-2" style={{ background: "#1A1916", borderBottom: `2px solid ${primaryColor}` }}>
                          <span style={{ fontSize: "0.52rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: primaryColor }}>ELO Güç Dalgalanma Çizgisi</span>
                          <span style={{ fontSize: "0.48rem", fontWeight: 900, color: "#5C5A54" }}>Kronolojik Sparkline</span>
                        </div>
                        <div style={{ padding: "16px", background: "#F8F7F2" }}>
                          <div style={{ position: "relative", height: 120 }}>
                            <svg style={{ width: "100%", height: "100%" }} viewBox="0 0 400 120" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={primaryColor} stopOpacity="0.2" />
                                  <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              {/* Grid */}
                              {[20, 60, 100].map(y => (
                                <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#E0DDD0" strokeWidth="1" strokeDasharray="4 4" />
                              ))}
                              {/* Area */}
                              <path d={`M ${pts(ratings)} L 400 120 L 0 120 Z`} fill="url(#sparkGrad)" />
                              {/* Line */}
                              <path d={`M ${pts(ratings)}`} fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" />
                              {/* Dots */}
                              {ratings.map((v, i) => {
                                const cx = (i / (ratings.length - 1)) * 400;
                                const cy = 120 - ((v - minR) / range) * 100 - 10;
                                return <circle key={i} cx={cx} cy={cy} r="3" fill={primaryColor} stroke="#F8F7F2" strokeWidth="1.5" />;
                              })}
                            </svg>
                            <div style={{ position: "absolute", top: 4, left: 0, fontSize: "0.48rem", fontWeight: 900, color: "#8C8A84", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                              En Yüksek: {maxR - 15}
                            </div>
                            <div style={{ position: "absolute", bottom: 4, left: 0, fontSize: "0.48rem", fontWeight: 900, color: "#8C8A84", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                              En Düşük: {minR + 15}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Form history */}
                  {formHistory.length > 0 && (
                    <div style={{ border: "1.5px solid #1A1916", overflow: "hidden" }}>
                      <div className="flex items-center justify-between px-4 py-2" style={{ background: "#1A1916", borderBottom: "2px solid #FFE600" }}>
                        <span style={{ fontSize: "0.52rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: "#FFE600" }}>Son Form Durumu</span>
                        <div className="flex gap-1.5">
                          {formHistory.map((m, i) => {
                            const bg = m.result === "W" ? "#00C060" : m.result === "L" ? "#E53E3E" : "#8C8A84";
                            return (
                              <div key={i} style={{ width: 22, height: 22, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5rem", fontWeight: 900, color: "#F8F7F2", letterSpacing: "0.05em" }}
                                title={`${m.date} - ${m.opponentNameTr} (${m.teamScore}-${m.opponentScore})`}
                              >
                                {m.result}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        {formHistory.map((m, i) => {
                          const eloVal = parseInt(m.eloChange.replace("−", "-").replace("+", ""));
                          const isPlus = eloVal > 0;
                          const isLast = i === formHistory.length - 1;
                          return (
                            <div key={i} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: isLast ? "none" : "1px solid #EAE7DA" }}>
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "#8C8A84" }}>{m.date}</span>
                                <span style={{ fontSize: "0.45rem", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5C5A54", background: "#EAE7DA", padding: "1px 5px" }}>
                                  {m.matchType}
                                </span>
                              </div>
                              <div className="flex items-center gap-2" style={{ fontSize: "0.68rem", fontWeight: 700, color: "#1A1916" }}>
                                <span>{teamName}</span>
                                <div style={{ padding: "2px 10px", background: "#1A1916", color: "#00FF87", fontWeight: 900, fontSize: "0.72rem", letterSpacing: "0.1em", fontVariantNumeric: "tabular-nums" }}>
                                  {m.teamScore} — {m.opponentScore}
                                </div>
                                <span>{m.opponentNameTr}</span>
                              </div>
                              <span style={{ fontSize: "0.6rem", fontWeight: 900, color: isPlus ? "#00C060" : eloVal < 0 ? "#E53E3E" : "#8C8A84", fontVariantNumeric: "tabular-nums" }}>
                                {m.eloChange} Elo
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: HISTORY ════════════════════════════ */}
              {activeTab === "history" && (
                <div className="space-y-3">
                  {championships.length > 0 ? championships.map(champ => (
                    <div
                      key={champ.year}
                      className="flex items-center justify-between px-5 py-4"
                      style={{ border: "1.5px solid #1A1916", borderLeft: `4px solid #FFE600`, background: "#F8F7F2", boxShadow: "3px 3px 0 #FFE60040" }}
                    >
                      <div className="space-y-1">
                        <div style={{ fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#FFE600", background: "#1A1916", display: "inline-block", padding: "2px 8px", marginBottom: 6 }}>
                          {champ.year} Şampiyonu
                        </div>
                        <div style={{ fontSize: "1rem", fontWeight: 900, color: "#1A1916" }}>{champ.country_tr}</div>
                        <div style={{ fontSize: "0.6rem", color: "#8C8A84", fontWeight: 500 }}>Teknik Direktör: {champ.manager}</div>
                      </div>
                      <div style={{ fontSize: "2.5rem", filter: "drop-shadow(0 0 8px rgba(255,230,0,0.3))" }}>🏆</div>
                    </div>
                  )) : (
                    <div className="py-16 text-center space-y-2" style={{ border: "1.5px solid #E0DDD0", background: "#F2F0E8" }}>
                      <div style={{ fontSize: "1.5rem" }}>🏳️</div>
                      <p className="swiss-label">Bu takımın geçmiş şampiyonluk kaydı bulunmamaktadır.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </div>
  );
}
