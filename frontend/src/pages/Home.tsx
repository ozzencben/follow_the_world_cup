import { useEffect, useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTournamentStore } from "../services/useTournamentStore";

interface HomeProps {
  onSelectTeam: (teamName: string) => void;
}

const PRESETS = [
  { id: "1", teamA: "AR", teamB: "FR", label: "🇦🇷 ARJ - FRA 🇫🇷", labelEn: "🇦🇷 ARG - FRA 🇫🇷" },
  { id: "2", teamA: "TR", teamB: "US", label: "🇹🇷 TUR - ABD 🇺🇸", labelEn: "🇹🇷 TUR - USA 🇺🇸" },
  { id: "3", teamA: "BR", teamB: "ES", label: "🇧🇷 BRE - İSP 🇪🇸", labelEn: "🇧🇷 BRA - ESP 🇪🇸" },
];

// Math helpers matching TournamentEngine.ts
function log10(val: number): number {
  return Math.log(val) / Math.LN10;
}

function calculateCSR(
  team: any,
  stage: "GROUP" | "R32" | "R16" | "QF" | "SF" | "F" = "GROUP"
): number {
  const rElo = team.rating;
  const rSquad = 100 * log10(team.squadValue + 1);
  
  let dnaMultiplier = 1.0;
  if (stage !== "GROUP") {
    dnaMultiplier = stage === "R32" || stage === "R16" ? 1.5 : 2.0;
  }
  const rDNA = Math.min(150, 5 * team.appearances + 25 * team.championships) * dnaMultiplier;
  
  const parsedChange = parseInt(team.oneYearRatingChange?.replace("−", "-").replace("+", "") || "0", 10);
  const rMomentum = isNaN(parsedChange) ? 0 : parsedChange;
  
  const rHost = team.hostTeam ? 100 : 0;
  let csr = 0.55 * rElo + 0.20 * rSquad + 0.10 * rDNA + 0.05 * rMomentum + 0.10 * rHost;
  
  if (team.hostTeam && team.rating < 1950) {
    csr = Math.min(1950, csr);
  }
  return csr;
}

function poissonRandom(lambda: number, rand: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1.0;
  do {
    k++;
    p *= rand();
  } while (p > L && k < 15);
  return Math.min(8, k - 1);
}

function computeProbabilities(teamA: any, teamB: any) {
  let winsA = 0;
  let draws = 0;
  let winsB = 0;
  
  const csrA = calculateCSR(teamA);
  const csrB = calculateCSR(teamB);
  
  const parseChange = (changeStr: string) => {
    const cleaned = changeStr?.replace("−", "-").replace("+", "").trim() || "0";
    const val = parseInt(cleaned, 10);
    return isNaN(val) ? 0 : val;
  };
  
  let tempCSR_A = csrA;
  let tempCSR_B = csrB;
  
  // Underdog motivation filter
  if (csrA - csrB > 250) {
    if (parseChange(teamB.oneYearRatingChange) > 0) tempCSR_B += 50;
  } else if (csrB - csrA > 250) {
    if (parseChange(teamA.oneYearRatingChange) > 0) tempCSR_A += 50;
  }
  
  let goalsForA = teamA.goalsForAvg ?? 1.45;
  let goalsAgainstA = teamA.goalsAgainstAvg ?? 1.15;
  let goalsForB = teamB.goalsForAvg ?? 1.45;
  let goalsAgainstB = teamB.goalsAgainstAvg ?? 1.15;
  
  // Fake stats normalization filter
  if (tempCSR_A - tempCSR_B > 300) {
    goalsForB = Math.min(goalsForB, 1.1);
  } else if (tempCSR_B - tempCSR_A > 300) {
    goalsForA = Math.min(goalsForA, 1.1);
  }
  
  const diffCSR = tempCSR_A - tempCSR_B;
  let lambdaA = goalsForA * goalsAgainstB * (1 + diffCSR / 1000);
  let lambdaB = goalsForB * goalsAgainstA * (1 + diffCSR / -1000);
  
  // Otobüsü Çekme (Low-Block Bias / Underdog Tactical Lockdown)
  if (tempCSR_A - tempCSR_B > 300) {
    lambdaB = Math.min(lambdaB, 0.75);
    lambdaA *= 0.85;
  } else if (tempCSR_B - tempCSR_A > 300) {
    lambdaA = Math.min(lambdaA, 0.75);
    lambdaB *= 0.85;
  }

  // Juggernaut modifier
  if (teamA.rating > 2000) lambdaB *= 0.85;
  if (teamB.rating > 2000) lambdaA *= 0.85;
  
  // Wonderkids/averageAge bonus
  if (teamA.averageAge < 27 && teamA.squadValue > 500) lambdaA *= 1.10;
  if (teamB.averageAge < 27 && teamB.squadValue > 500) lambdaB *= 1.10;
  
  lambdaA = Math.max(0.25, Math.min(4.25, lambdaA));
  lambdaB = Math.max(0.25, Math.min(4.25, lambdaB));
  
  const trials = 1000;
  for (let i = 0; i < trials; i++) {
    const scoreA = poissonRandom(lambdaA, Math.random);
    const scoreB = poissonRandom(lambdaB, Math.random);
    if (scoreA > scoreB) winsA++;
    else if (scoreA < scoreB) winsB++;
    else draws++;
  }
  
  return {
    winA: Math.round((winsA / trials) * 100),
    draw: Math.round((draws / trials) * 100),
    winB: Math.round((winsB / trials) * 100)
  };
}

export default function Home({ onSelectTeam }: HomeProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const isTr = currentLang.startsWith("tr");

  // Consume real, dynamic data loaded from Zustand tournament store
  const { teams, loading: storeLoading, creatorsList, fetchCreators } = useTournamentStore();

  useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  // State variables for interactive Poisson match sandbox
  const [homeTeamCode, setHomeTeamCode] = useState<string>("AR");
  const [awayTeamCode, setAwayTeamCode] = useState<string>("FR");
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simulatedScore, setSimulatedScore] = useState<{ home: number | null, away: number | null }>({ home: null, away: null });
  const [probabilities, setProbabilities] = useState<{ winA: number, draw: number, winB: number }>({ winA: 33, draw: 33, winB: 34 });
  const [logs, setLogs] = useState<string[]>([]);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Automatically scroll console to bottom on new log feeds
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Dynamically query teams list from the store
  const teamA = teams.find(t => t.code === homeTeamCode) || teams[0];
  const teamB = teams.find(t => t.code === awayTeamCode) || teams[1];
  const isSelfMatch = homeTeamCode === awayTeamCode;

  // Sort teams alphabetically based on active language for select lists
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      const nameA = isTr ? a.nameTr : a.nameEn;
      const nameB = isTr ? b.nameTr : b.nameEn;
      return nameA.localeCompare(nameB);
    });
  }, [teams, isTr]);

  useEffect(() => {
    if (!teamA || !teamB) return;
    
    if (isSelfMatch) {
      setProbabilities({ winA: 0, draw: 100, winB: 0 });
      setSimulatedScore({ home: null, away: null });
      setLogs(isTr ? [
        `> HATA: KENDİ KENDİNE KARŞILAŞMA TESPİT EDİLDİ`,
        `> HEDEF: ${teamA.nameTr.toUpperCase()} vs ${teamB.nameTr.toUpperCase()}`,
        `> UYARI: Bir takım kuantum fiziği sınırları içerisinde kendisine karşı oynayamaz.`,
        `> Lütfen listelerden farklı iki takım seçiniz.`
      ] : [
        `> ERROR: SELF-MATCHUP DETECTED`,
        `> TARGET: ${teamA.nameEn.toUpperCase()} vs ${teamB.nameEn.toUpperCase()}`,
        `> WARNING: A team cannot compete against itself under normal laws of physics.`,
        `> Please select two distinct teams from the lists.`
      ]);
      return;
    }

    const probs = computeProbabilities(teamA, teamB);
    setProbabilities(probs);
    setSimulatedScore({ home: null, away: null });
    
    setLogs(isTr ? [
      `> BAŞLANGIÇ: TAHMİN MOTORU V2.0 AKTİF`,
      `> HEDEF KARŞILAŞMA: ${teamA.nameTr.toUpperCase()} vs ${teamB.nameTr.toUpperCase()}`,
      `> CSR Güç Endeksi... ${teamA.code}: ${calculateCSR(teamA).toFixed(1)} | ${teamB.code}: ${calculateCSR(teamB).toFixed(1)}`,
      `> Hesaplanan Olasılıklar: G=%${probs.winA} | B=%${probs.draw} | M=%${probs.winB}`,
      `> SİSTEM HAZIR. Simülasyonu başlatmak için [SİMÜLE ET] butonuna tıklayın...`
    ] : [
      `> INIT: PREDICTION ENGINE V2.0 ACTIVE`,
      `> TARGET MATCHUP: ${teamA.nameEn.toUpperCase()} vs ${teamB.nameEn.toUpperCase()}`,
      `> CSR Strength Rating... ${teamA.code}: ${calculateCSR(teamA).toFixed(1)} | ${teamB.code}: ${calculateCSR(teamB).toFixed(1)}`,
      `> Expected Probabilities: W=%${probs.winA} | D=%${probs.draw} | L=%${probs.winB}`,
      `> ENGINE READY. Click [RUN AI SIM] to execute the Monte Carlo Poisson simulation...`
    ]);
  }, [homeTeamCode, awayTeamCode, isTr, teams, teamA, teamB, isSelfMatch]);

  const runSimulation = () => {
    if (simulating || isSelfMatch) return;
    setSimulating(true);
    setLogs(prev => [...prev, isTr ? `> 1000 TURLUK POISSON VE MONTE CARLO TRAIL MODELİ ÇALIŞTIRILIYOR...` : `> EXECUTING 1000-TRIAL KNUTH POISSON AND MONTE CARLO RESOLVER...`]);
    
    setTimeout(() => {
      const csrA = calculateCSR(teamA);
      const csrB = calculateCSR(teamB);
      
      const parseChange = (changeStr: string) => {
        const cleaned = changeStr?.replace("−", "-").replace("+", "").trim() || "0";
        const val = parseInt(cleaned, 10);
        return isNaN(val) ? 0 : val;
      };
      
      let tempCSR_A = csrA;
      let tempCSR_B = csrB;
      
      if (csrA - csrB > 250) {
        if (parseChange(teamB.oneYearRatingChange) > 0) tempCSR_B += 50;
      } else if (csrB - csrA > 250) {
        if (parseChange(teamA.oneYearRatingChange) > 0) tempCSR_A += 50;
      }
      
      let goalsForA = teamA.goalsForAvg ?? 1.45;
      let goalsAgainstA = teamA.goalsAgainstAvg ?? 1.15;
      let goalsForB = teamB.goalsForAvg ?? 1.45;
      let goalsAgainstB = teamB.goalsAgainstAvg ?? 1.15;
      
      if (tempCSR_A - tempCSR_B > 300) {
        goalsForB = Math.min(goalsForB, 1.1);
      } else if (tempCSR_B - tempCSR_A > 300) {
        goalsForA = Math.min(goalsForA, 1.1);
      }
      
      const diffCSR = tempCSR_A - tempCSR_B;
      let lambdaA = goalsForA * goalsAgainstB * (1 + diffCSR / 1000);
      let lambdaB = goalsForB * goalsAgainstA * (1 + diffCSR / -1000);
      
      // Otobüsü Çekme (Low-Block Bias / Underdog Tactical Lockdown)
      if (tempCSR_A - tempCSR_B > 300) {
        lambdaB = Math.min(lambdaB, 0.75);
        lambdaA *= 0.85;
      } else if (tempCSR_B - tempCSR_A > 300) {
        lambdaA = Math.min(lambdaA, 0.75);
        lambdaB *= 0.85;
      }

      if (teamA.rating > 2000) lambdaB *= 0.85;
      if (teamB.rating > 2000) lambdaA *= 0.85;
      
      if (teamA.averageAge < 27 && teamA.squadValue > 500) lambdaA *= 1.10;
      if (teamB.averageAge < 27 && teamB.squadValue > 500) lambdaB *= 1.10;
      
      lambdaA = Math.max(0.25, Math.min(4.25, lambdaA));
      lambdaB = Math.max(0.25, Math.min(4.25, lambdaB));
      
      const scoreA = poissonRandom(lambdaA, Math.random);
      const scoreB = poissonRandom(lambdaB, Math.random);
      
      setSimulatedScore({ home: scoreA, away: scoreB });
      setSimulating(false);
      
      setLogs(prev => isTr ? [
        ...prev,
        `> Poisson Gol Beklentisi (Lambda)... ${teamA.code}: ${lambdaA.toFixed(2)} | ${teamB.code}: ${lambdaB.toFixed(2)}`,
        `> Altın Jenerasyon ve Devlerin Aurası filtreleri uygulandı.`,
        `> Simüle Edilen Skor: ${teamA.nameTr} ${scoreA} — ${scoreB} ${teamB.nameTr}`,
        `> Kazanan Belirlendi: ${scoreA > scoreB ? teamA.nameTr.toUpperCase() : scoreA < scoreB ? teamB.nameTr.toUpperCase() : "BERABERLİK"}`,
        `> SÜREÇ TAMAMLANDI. Simülatör kilitlendi.`
      ] : [
        ...prev,
        `> Poisson Goal Expectation (Lambda)... ${teamA.code}: ${lambdaA.toFixed(2)} | ${teamB.code}: ${lambdaB.toFixed(2)}`,
        `> Wonderkids and Juggernaut filters applied.`,
        `> Simulated Score: ${teamA.nameEn} ${scoreA} — ${scoreB} ${teamB.nameEn}`,
        `> Winner Resolved: ${scoreA > scoreB ? teamA.nameEn.toUpperCase() : scoreA < scoreB ? teamB.nameEn.toUpperCase() : "DRAW"}`,
        `> STATUS: SUCCESS. Simulation locked.`
      ]);
    }, 800);
  };

  const getFlagUrl = (code: string) => {
    if (!code) return "";
    return `https://api.fifa.com/api/v3/picture/flags-sq-1/${code.toUpperCase()}`;
  };

  const quickTeams = [
    { name: "Argentina", tr: isTr ? "Arjantin" : "Argentina",  emoji: "🇦🇷", elo: "2046" },
    { name: "Brazil",    tr: isTr ? "Brezilya" : "Brazil",    emoji: "🇧🇷", elo: "2044" },
    { name: "Germany",   tr: isTr ? "Almanya" : "Germany",   emoji: "🇩🇪", elo: "1952" },
    { name: "France",    tr: isTr ? "Fransa" : "France",    emoji: "🇫🇷", elo: "2000" },
    { name: "Spain",     tr: isTr ? "İspanya" : "Spain",     emoji: "🇪🇸", elo: "1976" },
    { name: "Turkey",    tr: isTr ? "Türkiye" : "Türkiye",   emoji: "🇹🇷", elo: "1810" },
    { name: "England",   tr: isTr ? "İngiltere" : "England", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", elo: "1961" },
    { name: "Uruguay",   tr: isTr ? "Uruguay" : "Uruguay",   emoji: "🇺🇾", elo: "1927" },
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

  // Render global store loading indicator if needed
  if (storeLoading || teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-fade-up"
        style={{ border: "1.5px solid #1A1916", background: "#F2F0E8" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #00FF87", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p className="swiss-label animate-retro-blink" style={{ color: "#5C5A54" }}>
          {isTr ? "Simülasyon Verileri Yükleniyor..." : "Loading Simulation Data..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fade-up" style={{ color: "#1A1916" }}>

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
          <div className="p-6 md:p-12 lg:p-16 flex flex-col justify-between" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-3 mb-8 flex-wrap">
              <span className="neon-badge neon-badge-green">FIFA 2026</span>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.6rem", fontWeight: 900 }}>•</span>
              <span className="neon-badge neon-badge-green">{isTr ? "48 TAKIM" : "48 TEAMS"}</span>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.6rem", fontWeight: 900 }}>•</span>
              <span className="neon-badge neon-badge-yellow">{isTr ? "AI DESTEKLİ" : "AI ENGINE"}</span>
            </div>

            <div className="space-y-4">
              <h1
                className="leading-none"
                style={{
                  fontSize: "clamp(2.5rem, 7vw, 4.5rem)",
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
                  ? "Bilimsel tahmin gücü ile Swiss-Brutalist estetiğin buluşması. Monte Carlo Poisson simülatörüyle turnuva ağacını şekillendirin, tahminlerinizi tek tıkla kilitleyin ve paylaşın."
                  : "Where scientific prediction power meets Swiss-Brutalist aesthetic. Shape the tournament bracket with a Monte Carlo Poisson simulator, lock in, and share predictions in one-click."}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 mt-10">
              <a
                href="#/simulator"
                className="swiss-btn-primary animate-neon-pulse"
                onClick={e => { e.preventDefault(); window.location.hash = "#/simulator"; }}
              >
                <span>⚡</span> {isTr ? "Simülatörü Başlat" : "Launch Simulator"}
              </a>
              <a
                href="#/elo"
                className="swiss-btn-secondary"
                style={{ color: "#F8F7F2", borderColor: "rgba(255,255,255,0.25)", boxShadow: "3px 3px 0 rgba(255,255,255,0.15)" }}
                onClick={e => { e.preventDefault(); window.location.hash = "#/elo"; }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.boxShadow = "4px 4px 0 rgba(255,255,255,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.boxShadow = "3px 3px 0 rgba(255,255,255,0.15)"; }}
              >
                <span>📊</span> {isTr ? "ELO Sıralaması" : "ELO Standings"}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:flex lg:flex-col" style={{ background: "rgba(255,255,255,0.02)" }}>
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-6 py-4 md:px-8 md:py-5"
                style={{
                  borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  transition: "background 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,255,135,0.04)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  className="swiss-number shrink-0"
                  style={{ color: "#00FF87", fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", textShadow: "0 0 20px rgba(0,255,135,0.25)" }}
                >
                  {stat.num}
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-[#F2F0E8] font-extrabold tracking-wide uppercase">{stat.label}</div>
                  <div className="text-[8px] sm:text-[9px] text-[#5C5A54] font-bold tracking-wider uppercase mt-0.5">{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          INTERACTIVE AI MATCH SIMULATOR SANDBOX
      ══════════════════════════════════════════════════════════ */}
      <div>
        <div className="swiss-divider mb-6">
          {isTr ? "⚡ ETKİLEŞİMLİ AI TAHMİN SAHASI" : "⚡ INTERACTIVE AI PREDICTION SANDBOX"}
        </div>

        <div
          className="p-4 md:p-8 space-y-6"
          style={{
            background: "#1A1916",
            border: "1.5px solid #1A1916",
            boxShadow: "5px 5px 0px #00E5FF",
          }}
        >
          {/* Top header status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <span className="neon-badge neon-badge-cyan animate-neon-pulse font-mono tracking-widest text-[9px]">
                ● POISSON PRED ENGINE v2.0
              </span>
              <h2 className="text-white font-black text-sm tracking-[0.12em] uppercase mt-2">
                {isTr ? "Anlık Maç Tahmin Sandbox'ı" : "Real-Time Match Pred Sandbox"}
              </h2>
            </div>
            {/* Match selector tabs */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setHomeTeamCode(m.teamA);
                    setAwayTeamCode(m.teamB);
                  }}
                  className={`px-3 py-1.5 font-mono text-[9px] font-bold border-2 transition-all cursor-pointer ${
                    homeTeamCode === m.teamA && awayTeamCode === m.teamB
                      ? "bg-[#00E5FF] text-zinc-950 border-[#00E5FF] shadow-[2px_2px_0_#fff]"
                      : "bg-transparent text-zinc-400 border-zinc-800 hover:text-white"
                  }`}
                  style={{ borderRadius: "0px" }}
                >
                  {isTr ? m.label : m.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* DYNAMIC TWO-TEAM DROPDOWN CUSTOMIZER SELECTOR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950 p-4 border border-zinc-900">
            {/* Home Select Box */}
            <div className="flex flex-col space-y-2">
              <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                ⚽ {isTr ? "1. Takım (Ev Sahibi)" : "1st Team (Home)"}
              </label>
              <select
                value={homeTeamCode}
                onChange={e => setHomeTeamCode(e.target.value)}
                className="bg-zinc-900 border-2 border-zinc-800 text-white font-mono text-xs font-bold p-3 focus:border-[#00E5FF] focus:outline-none cursor-pointer"
                style={{ borderRadius: "0px" }}
              >
                {sortedTeams.map(t => (
                  <option key={t.code} value={t.code} className="bg-zinc-950">
                    {isTr ? t.nameTr.toUpperCase() : t.nameEn.toUpperCase()} ({t.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Away Select Box */}
            <div className="flex flex-col space-y-2">
              <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                ⚽ {isTr ? "2. Takım (Deplasman)" : "2nd Team (Away)"}
              </label>
              <select
                value={awayTeamCode}
                onChange={e => setAwayTeamCode(e.target.value)}
                className="bg-zinc-900 border-2 border-zinc-800 text-white font-mono text-xs font-bold p-3 focus:border-[#00E5FF] focus:outline-none cursor-pointer"
                style={{ borderRadius: "0px" }}
              >
                {sortedTeams.map(t => (
                  <option key={t.code} value={t.code} className="bg-zinc-950">
                    {isTr ? t.nameTr.toUpperCase() : t.nameEn.toUpperCase()} ({t.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Screen: Match Card & Probability Bar (8 cols) */}
            <div className="lg:col-span-8 flex flex-col justify-between space-y-6 bg-zinc-950 border border-zinc-800 p-5">
              
              {/* Massive Scoreboard Display */}
              <div className="flex items-center justify-around py-6 border-b border-zinc-900">
                {/* Team A */}
                <div className="flex flex-col items-center space-y-2 text-center w-1/3">
                  <img
                    src={getFlagUrl(teamA.code)}
                    alt={isTr ? teamA.nameTr : teamA.nameEn}
                    className="w-16 h-11 object-cover border border-black shadow-[2px_2px_0px_#000] select-none"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/40x30/222/00FF87?text=${teamA.code}`;
                    }}
                  />
                  <span className="text-[10px] md:text-xs font-mono font-black text-white uppercase tracking-wider mt-1">{teamA.code}</span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:inline">{isTr ? teamA.nameTr : teamA.nameEn}</span>
                  <span className="text-[8px] font-mono text-[#00FF87] font-semibold border border-[#00FF87]/20 px-2 py-0.5 mt-1 select-none">ELO {teamA.rating}</span>
                </div>

                {/* Score vs VS */}
                <div className="flex flex-col items-center justify-center w-1/3">
                  {simulatedScore.home !== null && simulatedScore.away !== null ? (
                    <div className="text-3xl md:text-5xl font-mono font-black text-[#00FF87] tracking-wider select-all animate-fade-in drop-shadow-[0_0_8px_rgba(0,255,135,0.4)]">
                      {simulatedScore.home} — {simulatedScore.away}
                    </div>
                  ) : (
                    <div className="text-xs md:text-sm font-mono font-black text-zinc-600 border border-zinc-850 px-4 py-2 uppercase tracking-[0.2em] select-none text-center">
                      {simulating ? (
                        <span className="animate-pulse">{isTr ? "SİMÜLE..." : "SIMULATING..."}</span>
                      ) : (
                        "VS"
                      )}
                    </div>
                  )}
                </div>

                {/* Team B */}
                <div className="flex flex-col items-center space-y-2 text-center w-1/3">
                  <img
                    src={getFlagUrl(teamB.code)}
                    alt={isTr ? teamB.nameTr : teamB.nameEn}
                    className="w-16 h-11 object-cover border border-black shadow-[2px_2px_0px_#000] select-none"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/40x30/222/00FF87?text=${teamB.code}`;
                    }}
                  />
                  <span className="text-[10px] md:text-xs font-mono font-black text-white uppercase tracking-wider mt-1">{teamB.code}</span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest hidden sm:inline">{isTr ? teamB.nameTr : teamB.nameEn}</span>
                  <span className="text-[8px] font-mono text-[#00FF87] font-semibold border border-[#00FF87]/20 px-2 py-0.5 mt-1 select-none">ELO {teamB.rating}</span>
                </div>
              </div>

              {/* Dynamic Win/Draw/Loss Probability HUD */}
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                  <span className="text-[#00FF87]">{teamA.code} {isTr ? "GALİBİYETİ" : "WIN"}: %{probabilities.winA}</span>
                  <span className="text-yellow-400">{isTr ? "BERABERLİK" : "DRAW"}: %{probabilities.draw}</span>
                  <span className="text-[#00E5FF]">{teamB.code} {isTr ? "GALİBİYETİ" : "WIN"}: %{probabilities.winB}</span>
                </div>
                {/* Visual Probability Bar */}
                <div className="w-full h-3.5 bg-zinc-900 border border-zinc-800 flex overflow-hidden">
                  <div style={{ width: `${probabilities.winA}%`, background: "#00FF87" }} className="h-full transition-all duration-300" />
                  <div style={{ width: `${probabilities.draw}%`, background: "#EAB308" }} className="h-full transition-all duration-300" />
                  <div style={{ width: `${probabilities.winB}%`, background: "#00E5FF" }} className="h-full transition-all duration-300" />
                </div>
              </div>

              {/* Simulation Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-900">
                <button
                  onClick={runSimulation}
                  disabled={simulating || isSelfMatch}
                  className="flex-grow bg-transparent border-2 border-[#00E5FF] text-[#00E5FF] py-3.5 font-mono text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-[#00E5FF]/5 transition disabled:opacity-40"
                  style={{ borderRadius: "0px", boxShadow: "3px 3px 0px rgba(0, 229, 255, 0.25)" }}
                >
                  ⚡ {simulating ? (isTr ? "ÇALIŞTIRILIYOR..." : "RUNNING TRAILS...") : (isTr ? "AI İLE SİMÜLE ET" : "RUN AI SIMULATION")}
                </button>
                <a
                  href="#/simulator"
                  onClick={e => { e.preventDefault(); window.location.hash = "#/simulator"; }}
                  className="bg-[#00FF87] border-2 border-zinc-950 text-zinc-950 py-3.5 font-mono text-xs font-black text-center uppercase tracking-widest cursor-pointer hover:bg-[#00D070] transition flex items-center justify-center"
                  style={{ borderRadius: "0px", textDecoration: "none", width: "100%", maxWidth: "300px" }}
                >
                  🚀 {isTr ? "TAM TURNUVAYI SİMÜLE ET" : "SIMULATE FULL TOURNAMENT"}
                </a>
              </div>

            </div>

            {/* Right Screen: Siber Terminal Output logs (4 cols) */}
            <div className="lg:col-span-4 bg-zinc-950 border border-zinc-800 p-4 flex flex-col justify-between font-mono text-[9px] md:text-[10px] leading-relaxed">
              <style>{`
                .no-scrollbar::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div 
                ref={logContainerRef}
                className="space-y-2 text-zinc-400 select-all overflow-y-auto h-[200px] no-scrollbar"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {logs.map((log, idx) => (
                  <div key={idx} className={log.startsWith("> HATA") || log.startsWith("> ERROR") ? "text-[#FF2D78] font-bold" : log.startsWith("> UYARI") || log.startsWith("> WARNING") ? "text-yellow-500" : log.startsWith("> STATUS") ? "text-[#00FF87] font-bold" : log.startsWith("> EXECUTING") ? "text-yellow-400 animate-pulse" : "text-zinc-400"}>
                    {log}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between text-zinc-500 font-bold tracking-widest uppercase">
                <span>[LOG MONITOR]</span>
                <span className={isSelfMatch ? "text-[#FF2D78] font-black" : "text-[#00FF87] animate-retro-blink"}>
                  {isSelfMatch ? "HALTED" : "ONLINE"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          THE AI ALGORITHM ROOM - INFOGRAPHIC
      ══════════════════════════════════════════════════════════ */}
      <div>
        <div className="swiss-divider mb-6">
          {isTr ? "🧠 AI SİMÜLASYON MOTORUNUN TEKNİK MİMARİSİ" : "🧠 THE AI SIMULATION MOTOR ARCHITECTURE"}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* CSR Formula Info (7 cols) */}
          <div
            className="lg:col-span-7 p-6 flex flex-col justify-between space-y-6"
            style={{ border: "1.5px solid #1A1916", background: "#F8F7F2", boxShadow: "4px 4px 0px #00FF87" }}
          >
            <div>
              <span className="neon-badge neon-badge-green font-mono uppercase text-[8px] tracking-widest">
                01 • COMPOUND STRENGTH RATING
              </span>
              <h3 className="font-black text-sm tracking-wide uppercase mt-3">
                {isTr ? "CSR Formülü: Gerçek Güç Nasıl Hesaplanır?" : "CSR Formula: How Real Strength Is Estimated?"}
              </h3>
              <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed mt-2">
                {isTr
                  ? "Sadece FIFA sıralaması aldatıcıdır. AI motorumuz, her takımı 5 farklı veri katmanını ağırlıklandırarak değerlendirir:"
                  : "Pure FIFA ranking is deceptive. Our AI engine evaluates every team by weighting 5 distinct data layers:"}
              </p>
            </div>

            {/* Weights list */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border-y border-zinc-200 py-5">
              {[
                { weight: "%55", label: isTr ? "ELO GÜCÜ" : "ELO SCORE", sub: isTr ? "Tüm Zamanlar" : "All-Time" },
                { weight: "%20", label: isTr ? "KADRO DEĞERİ" : "SQUAD VALUE", sub: isTr ? "Piyasa Değeri" : "Transfermarkt" },
                { weight: "%10", label: isTr ? "TURNUVA DNA" : "DNA FORCE", sub: isTr ? "Katılım / Kupa" : "History" },
                { weight: "%5", label: isTr ? "MOMENTUM" : "MOMENTUM", sub: isTr ? "1 Yıllık Trend" : "1Yr Trend" },
                { weight: "+%15", label: isTr ? "EV SAHİBİ" : "HOST BOOST", sub: isTr ? "Gol Olasılığı" : "Expected Goals" },
              ].map((w, idx) => (
                <div key={idx} className="text-center space-y-1">
                  <div className="swiss-number text-zinc-900 leading-none" style={{ fontSize: "1.6rem" }}>{w.weight}</div>
                  <div className="text-[8px] font-extrabold text-zinc-800 tracking-wider uppercase leading-tight">{w.label}</div>
                  <div className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">{w.sub}</div>
                </div>
              ))}
            </div>

            <div className="text-[9px] text-zinc-500 font-bold bg-[#F2F0E8] p-3 border-l-2 border-[#00FF87] leading-relaxed">
              💡 {isTr 
                ? "Ev Sahibi Ayrıştırması: Seyirci motivasyonu temel CSR puanını yapay olarak şişirmemesi için teknik formülden çıkarılmış, doğrudan gol beklentisine (Lambda +%15) yansıtılmıştır." 
                : "Host Decoupling: To prevent crowd motivation from artificially inflating the core CSR, it is decoupled from the strength rating and applied directly to expected goals (Lambda +15%)."}
            </div>
          </div>

          {/* Realism factors (5 cols) */}
          <div
            className="lg:col-span-5 p-6 flex flex-col justify-between space-y-6"
            style={{ border: "1.5px solid #1A1916", background: "#F8F7F2", boxShadow: "4px 4px 0px #FFE600" }}
          >
            <div>
              <span className="neon-badge neon-badge-yellow font-mono uppercase text-[8px] tracking-widest">
                02 • REALISM ENHANCERS
              </span>
              <h3 className="font-black text-sm tracking-wide uppercase mt-3">
                {isTr ? "Hiper-Realizm Simülasyon Filtreleri" : "Hyper-Realism Simulation Filters"}
              </h3>
              <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed mt-2">
                {isTr
                  ? "Poisson gol dağılımını daha tutarlı kılmak için kurguladığımız akıllı katsayı modüllerimiz:"
                  : "Intelligent coefficient modules integrated to calibrate standard Poisson goal expectation variables:"}
              </p>
            </div>

            {/* Filter stubs */}
            <div className="space-y-3.5">
              {[
                { title: isTr ? "Devlerin Aurası (Juggernaut)" : "Juggernaut Modifier", desc: isTr ? "2000 ELO üstü devlere karşı oynayan takımların gol şansları %15 oranında düşer." : "Teams competing against elite juggernauts (>2000 ELO) suffer a 15% reduction in goal expectation." },
                { title: isTr ? "Altın Jenerasyon (Wonderkids)" : "Golden Generation Boost", desc: isTr ? "Yaş ortalaması <27 olan ve kadro değeri 500M € aşan dinamik takımlar %10 gol bonusu alır." : "Dynamic squads with average age <27 and value >500M EUR receive a 10% attacking boost." },
                { title: isTr ? "Otobüsü Çekme (Low-Block Bias)" : "Low-Block Bias", desc: isTr ? "CSR farkı 300'ü aşan maçlarda zayıf takımın gol beklentisi maks 0.75'e sınırlanır, devin golü %15 törpülenir." : "If CSR difference exceeds 300, the underdog's expected goals is capped at 0.75, and giant's is dampened by 15%." },
                { title: isTr ? "Efsanelerin Zırhı (Plot Armor)" : "Elite Plot Armor", desc: isTr ? "Eleme turlarında favori devler karşısında zayıf takımların gol üretme şansı %20 oranında baskılanır." : "During knockouts, underdog goal expectation against elite powerhouses is dampened by 20%." }
              ].map((f, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className="text-[#FFE600] font-black text-xs">●</span>
                  <div className="space-y-0.5">
                    <div className="text-[9px] font-extrabold text-zinc-900 uppercase tracking-wider">{f.title}</div>
                    <div className="text-[8px] text-zinc-500 font-medium leading-normal">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          BRACKET SHARING (FULL WIDTH)
      ══════════════════════════════════════════════════════════ */}
      <div
        className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
        style={{ border: "1.5px solid #1A1916", background: "#F8F7F2", boxShadow: "5px 5px 0px #FF2D78" }}
      >
        <div className="flex-1 space-y-4">
          <div>
            <span className="neon-badge font-mono uppercase text-[8px] tracking-widest" style={{ color: "#FF2D78", borderColor: "#FF2D7840", background: "#FF2D7810" }}>
              03 • ZERO-DATABASE SHARING
            </span>
            <h3 className="font-black text-sm tracking-wide uppercase mt-3">
              {isTr ? "Kurşun Geçirmez Braket Paylaşım Altyapısı" : "Bulletproof Zero-DB Bracket Sharing"}
            </h3>
            <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed mt-2">
              {isTr
                ? "Braketinizi paylaşmak için hiçbir veritabanı veya üyelik gerekmez! Tahminlerinizi tek tıkla şifrelenmiş URL parametrelerine kodlayın, kopyalayın ve tüm dünyayla paylaşın."
                : "No databases or profiles required to broadcast your bracket! Instantly serialize all match overrides into a compressed URL parameter string, copy, and share globally."}
            </p>
          </div>

          <div className="text-[9px] font-mono text-zinc-400 bg-zinc-950 p-4 border border-zinc-800 leading-normal flex items-center justify-between max-w-xl">
            <span className="truncate select-all mr-2">?bracket=G-A-1_2-1|R32-1_3-2|QF-1_1-0...</span>
            <span className="text-[#FF2D78] font-bold shrink-0">[ENCRYPTED]</span>
          </div>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <a
            href="#/simulator"
            onClick={e => { e.preventDefault(); window.location.hash = "#/simulator"; }}
            className="swiss-btn-primary w-full md:w-64 justify-center"
            style={{ background: "transparent", color: "#FF2D78", borderColor: "#FF2D78", boxShadow: "3px 3px 0 rgba(255,45,120,0.25)" }}
          >
            🎮 {isTr ? "KENDİ TAHMİNİNİ OLUŞTUR" : "GENERATE YOUR PREDICTION BRACKET"}
          </a>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ANALYST REVIEWS & COMMENTARY PREVIEW
      ══════════════════════════════════════════════════════════ */}
      <div>
        <div className="swiss-divider mb-6">
          {isTr ? "🎙️ ONAYLI YORUMCU GÖRÜŞLERİ & ANALİZLERİ" : "🎙️ VERIFIED CREATOR REVIEWS & BRACKET ANALYSIS"}
        </div>

        <div
          className="p-6 md:p-8 space-y-8"
          style={{
            background: "#1A1916",
            border: "1.5px solid #1A1916",
            boxShadow: "5px 5px 0px #A78BFA",
          }}
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <span className="neon-badge font-mono tracking-widest text-[9px] uppercase" style={{ color: "#A78BFA", borderColor: "#A78BFA40", background: "#A78BFA10" }}>
                ● {isTr ? "ANALİST KÖŞESİ / CANLI YORUMLAR" : "ANALYST CORNER / LIVE REVIEWS"}
              </span>
              <h2 className="text-white font-black text-sm tracking-[0.12em] uppercase mt-2">
                {isTr ? "Yorumcuların Öne Çıkan Turnuva Analizleri" : "Featured Commentator Tournament Analyses"}
              </h2>
            </div>
            <span className="text-[10px] font-mono text-[#A78BFA] font-bold shrink-0 self-start sm:self-center select-none animate-retro-blink">
              {isTr ? "YENİ YORUMLAR AKTİF" : "NEW REVIEWS LIVE"}
            </span>
          </div>

          {/* Grid of Reviews */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {creatorsList.map((review, idx) => {
              const avatarText = review.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              
              // Dynamic color schemes for the brutalist monograms
              const avatarColor = idx === 0 ? "#00FF87" : idx === 1 ? "#A78BFA" : "#00E5FF";
              const role = isTr ? (review.roleTr || "Spor Yazarı / Analist") : (review.roleEn || "Sports Analyst / Writer");
              const quote = isTr 
                ? (review.commentTr || "“Turnuva simülasyon ağacımı resmi olarak kilitledim. AI tahmin motoru karşısındaki performansını incelemek için sabırsızlanıyorum!”") 
                : (review.commentEn || "“I officially locked in my tournament tree predictions. Looking forward to testing my bracket against the AI Monte Carlo engine!”");
              
              const hasPrediction = review.bracketString !== null && review.bracketString.trim() !== "";
              const badgeText = hasPrediction 
                ? (isTr ? "TAHMİN YAYINDA" : "PREDICTION LIVE") 
                : (isTr ? "TAHMİN BEKLENİYOR" : "PREDICTION PENDING");
              const badgeColor = hasPrediction ? "#00FF87" : "#00E5FF";

              return (
                <div 
                  key={review.id || idx} 
                  className="bg-zinc-950 border border-zinc-800 p-5 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-colors"
                  style={{
                    boxShadow: `3px 3px 0px ${badgeColor}20`
                  }}
                >
                  {/* Creator Header Info */}
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 flex items-center justify-center font-mono font-black text-xs border border-zinc-700 text-zinc-950 select-none shrink-0"
                      style={{
                        background: avatarColor,
                        boxShadow: "2px 2px 0px #000"
                      }}
                    >
                      {avatarText}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-extrabold text-white truncate leading-tight uppercase">{review.name}</div>
                      <div className="text-[8px] font-bold text-zinc-500 tracking-wider uppercase mt-0.5">{role}</div>
                    </div>
                  </div>

                  {/* Quote body */}
                  <p className="text-[10px] text-zinc-400 font-medium italic leading-relaxed flex-grow">
                    {quote}
                  </p>

                  {/* Badge Status & Action */}
                  <div className="pt-3 border-t border-zinc-900 flex items-center justify-between">
                    <span 
                      className="text-[7.5px] font-black tracking-widest uppercase px-2 py-0.5 border"
                      style={{
                        borderColor: `${badgeColor}40`,
                        background: `${badgeColor}10`,
                        color: badgeColor
                      }}
                    >
                      ● {badgeText}
                    </span>
                    <a 
                      href="#/creators"
                      onClick={e => {
                        e.preventDefault();
                        window.location.hash = "#/creators";
                      }}
                      className="text-[7.5px] font-black font-mono text-zinc-400 hover:text-white uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                    >
                      {isTr ? "İNCELE →" : "INSPECT →"}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full-Width call to action redirect button */}
          <div className="pt-2 flex justify-center">
            <a
              href="#/creators"
              onClick={e => {
                e.preventDefault();
                window.location.hash = "#/creators";
              }}
              className="swiss-btn-primary w-full max-w-md justify-center text-center py-3.5 uppercase font-black text-xs tracking-widest animate-neon-pulse"
              style={{
                background: "transparent",
                color: "#A78BFA",
                borderColor: "#A78BFA",
                boxShadow: "4px 4px 0px rgba(167, 139, 250, 0.25)"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(167, 139, 250, 0.05)";
                e.currentTarget.style.boxShadow = "2px 2px 0px rgba(167, 139, 250, 0.4)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.boxShadow = "4px 4px 0px rgba(167, 139, 250, 0.25)";
              }}
            >
              📣 {isTr ? "TÜM YORUMCULARI & TAHMİNLERİNİ KEŞFET" : "EXPLORE ALL CREATORS & BRACKETS"}
            </a>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          LEGENDARY TEAM PROFILES (Quick Modal Access)
      ═══════════════════════════════════════════════════════ */}
      <div>
        <div className="swiss-divider mb-6">{isTr ? "🏆 MİLLİ TAKIMLAR & ELO VERİ PROFİLLERİ" : "🏆 NATIONAL TEAMS & ELO DATA PROFILES"}</div>

        <div
          className="p-4 md:p-8 space-y-6"
          style={{
            background: "#F2F0E8",
            border: "1.5px solid #1A1916",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-300 pb-4">
            <div>
              <div className="swiss-label mb-1">{isTr ? "HIZLI ERİŞİM MODAL SİSTEMİ" : "QUICK ACCESS PROFILE MODALS"}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 900, letterSpacing: "0.02em", color: "#1A1916" }}>
                {isTr ? "Tarihsel ELO Güç ve Transfermarkt Kadro Profilleri" : "Historical ELO Strength & Transfermarkt Squad Profiles"}
              </div>
            </div>
            <span className="neon-badge neon-badge-green animate-neon-pulse shrink-0 self-start sm:self-center">{isTr ? "0MS GECİKME" : "0MS LATENCY"}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickTeams.map(team => (
              <button
                key={team.name}
                onClick={() => onSelectTeam(team.name)}
                className="retro-card-sm p-4 flex flex-col items-center text-center gap-2 cursor-pointer transition-all hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#00FF87]"
                style={{
                  background: "#F8F7F2",
                  border: "none",
                  width: "100%",
                }}
              >
                <span className="text-3xl select-none" style={{ lineHeight: 1 }}>{team.emoji}</span>
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

      {/* ═══════════════════════════════════════════════════════
          HOST CITIES TABULAR MAP
      ══════════════════════════════════════════════════════════ */}
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
            <span className="text-2xl md:text-3xl select-none mb-1 md:mb-2">{h.flag}</span>
            <div 
              className="text-[0.65rem] md:text-[0.75rem]"
              style={{
                fontWeight: 900,
                letterSpacing: "0.06em",
                color: i === 0 ? "#F8F7F2" : "#1A1916",
                textTransform: "uppercase",
              }}
            >
              {h.country}
            </div>
            <div className="swiss-label mt-1" style={{ color: i === 0 ? "#5C5A54" : "#8C8A84" }}>{h.cities}</div>
            <div
              className="text-[0.45rem] md:text-[0.5rem]"
              style={{
                marginTop: 6,
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
