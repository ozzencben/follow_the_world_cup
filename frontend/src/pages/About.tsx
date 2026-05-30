import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../services/api";

interface Winner {
  year: number;
  country_tr: string;
  country_en: string;
  manager: string;
}

interface WinnersResponse {
  winners: Winner[];
  total_tournaments: number;
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
  teamEnrichmentData: TeamEnrichmentData;
}

interface FifaDataResponse {
  entryId: string;
  seasonId: string;
  tournamentState: string;
  teams: Team[];
  teamsTotal: number;
}

const countryFlags: { [key: string]: string } = {
  "Argentina": "🇦🇷", "France": "🇫🇷", "Germany": "🇩🇪",
  "Spain": "🇪🇸", "Italy": "🇮🇹", "Brazil": "🇧🇷",
  "Uruguay": "🇺🇾", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
};

interface AboutProps {
  onSelectTeam: (teamName: string) => void;
}

const getTournamentFacts = (isTr: boolean) => [
  { num: "23.", label: isTr ? "Turnuva" : "Tournament", sub: isTr ? "FIFA Dünya Kupası'nın 23. Edisyonu" : "23rd Edition of FIFA World Cup" },
  { num: "48",  label: isTr ? "Takım" : "Teams",   sub: isTr ? "Tarihte İlk Kez 48 Katılımcı Ülke" : "First Time in History 48 Teams" },
  { num: "104", label: isTr ? "Maç" : "Matches",     sub: isTr ? "12 Grup + Eleme Aşamaları" : "12 Groups + Knockout Stages" },
  { num: "16",  label: isTr ? "Şehir" : "Cities",   sub: isTr ? "3 Ülkede 16 Farklı Ev Sahibi Şehir" : "16 Host Cities across 3 Nations" },
];

export default function About({ onSelectTeam }: AboutProps) {
  const { t, i18n } = useTranslation();
  const isTr = (i18n.language || "en").startsWith("tr");

  const [winnersData, setWinnersData] = useState<WinnersResponse | null>(null);
  const [teamsMap, setTeamsMap] = useState<{ [name: string]: Team }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<WinnersResponse>("/winners"),
      api.get<FifaDataResponse>("/teams"),
    ])
      .then(([wr, tr]) => {
        setWinnersData(wr.data);
        const map: { [name: string]: Team } = {};
        tr.data.teams.forEach(t => {
          const key = t.teamName === "Bosnia-Herzegovina" ? "Bosnia and Herzegovina" : t.teamName;
          map[key] = t;
        });
        setTeamsMap(map);
        setError(null);
      })
      .catch(err => setError(err.message || (isTr ? "Veriler yüklenemedi." : "Failed to load data.")))
      .finally(() => setLoading(false));
  }, []);

  const getWinnerSummary = () => {
    if (!winnersData) return [];
    const counts: { [k: string]: { tr: string; count: number } } = {};
    winnersData.winners.forEach(w => {
      if (!counts[w.country_en]) counts[w.country_en] = { tr: w.country_tr, count: 0 };
      counts[w.country_en].count += 1;
    });
    return Object.entries(counts)
      .map(([en, v]) => ({ country_en: en, country_tr: v.tr, count: v.count, flag: countryFlags[en] || "🏳️" }))
      .sort((a, b) => b.count - a.count);
  };

  const winnerSummary = getWinnerSummary();
  const getFlagUrl = (f?: string) => f ? f.replace("{format}", "sq").replace("{size}", "1") : "";

  return (
    <div className="space-y-8 animate-fade-up" style={{ color: "#1A1916" }}>

      {/* ══ PAGE HEADER ══ */}
      <div
        className="relative overflow-hidden p-6 md:p-10"
        style={{ background: "#1A1916", border: "1.5px solid #1A1916", boxShadow: "6px 6px 0 #FF2D78" }}
      >
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "#FF2D78", boxShadow: "0 0 12px #FF2D78" }} />

        <div className="relative space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="neon-badge" style={{ color: "#FF2D78", borderColor: "#FF2D7860", background: "rgba(255,45,120,0.06)", fontSize: "0.52rem", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", padding: "2px 10px", border: "1.5px solid" }}>
              FIFA 2026
            </span>
            <span className="neon-badge neon-badge-green">{isTr ? "KUZEY AMERİKA" : "NORTH AMERICA"}</span>
          </div>
          <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#F8F7F2", lineHeight: 1.1 }}>
            {isTr ? "TURNUVA" : "ABOUT"}
            <br />
            <span style={{ color: "#FF2D78", textShadow: "0 0 20px rgba(255,45,120,0.4)" }}>{isTr ? "HAKKINDA" : "TOURNAMENT"}</span>
          </h1>
          <p style={{ color: "#8C8A84", fontSize: "0.72rem", fontWeight: 500, lineHeight: 1.7, maxWidth: "50ch" }}>
            {isTr
              ? "2026 FIFA Dünya Kupası, tarihte ilk kez üç ülkenin ortak ev sahipliğinde, ilk kez 48 takımla düzenlenecek olan 23. büyük şampiyona."
              : "The 2026 FIFA World Cup will be the 23rd edition, co-hosted by three countries for the first time in history, featuring a 48-team format."}
          </p>
        </div>
      </div>

      {/* ══ TOURNAMENT FACTS ══ */}
      <div style={{ border: "1.5px solid #1A1916", overflow: "hidden" }}>
        <div className="grid grid-cols-2 md:grid-cols-4">
          {getTournamentFacts(isTr).map((f, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center py-8 px-4 text-center"
              style={{
                borderRight: i < 3 ? "1.5px solid #1A1916" : "none",
                borderBottom: i < 2 ? "1.5px solid #1A1916" : "none",
                background: i % 2 === 0 ? "#F8F7F2" : "#F2F0E8",
              }}
            >
              <div style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                color: "#1A1916",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}>
                {f.num}
              </div>
              <div style={{ height: 2, width: 32, background: "#00FF87", boxShadow: "0 0 6px #00FF87", margin: "8px auto" }} />
              <div style={{ fontSize: "0.6rem", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "#1A1916", marginBottom: 4 }}>
                {f.label}
              </div>
              <div style={{ fontSize: "0.58rem", fontWeight: 500, color: "#8C8A84", lineHeight: 1.5 }}>
                {f.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ KEY FACTS GRID ══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[
          {
            icon: "🌎",
            title: isTr ? "Ev Sahibi Ülkeler" : "Host Countries",
            accent: "#00FF87",
            text: isTr
              ? "Turnuva ilk kez üç farklı ülkenin (Kanada, Meksika ve ABD) ortak ev sahipliğinde gerçekleştirilecektir. Maçlar 16 farklı şehirde oynanacaktır. Ev sahibi ülkeler turnuvaya doğrudan katılmaktadır."
              : "The tournament will be co-hosted by three nations (Canada, Mexico, and the USA) for the first time. Matches will be played in 16 host cities. Host countries qualify automatically.",
          },
          {
            icon: "⚡",
            title: isTr ? "48 Takımlı Yeni Format" : "New 48-Team Format",
            accent: "#00E5FF",
            text: isTr
              ? "Geleneksel 32 takım yerine tarihte ilk kez 48 takım final aşamasında mücadele edecektir. Takımlar 4'erli 12 gruba ayrılacak; her gruptan en iyi 2 takım turluyor."
              : "For the first time in history, 48 teams will compete in the finals instead of the traditional 32. Teams will be split into 12 groups of 4, with the top 2 teams from each group advancing.",
          },
          {
            icon: "🏆",
            title: isTr ? "Tarihsel Rekorlar" : "Historical Milestones",
            accent: "#FFE600",
            text: isTr
              ? "Bu turnuva birçok ilki barındırıyor: En fazla katılımcı, en fazla maç, en fazla stadyum ve ilk kez üç ülkenin ortak organizasyonu. Dünya futbol tarihinin en büyük organizasyonu."
              : "This tournament features many firsts: largest team pool, most matches, most stadiums, and the first three-nation co-organization. It is the largest event in world football history.",
          },
          {
            icon: "📅",
            title: isTr ? "Takvim" : "Schedule & Timeline",
            accent: "#FF2D78",
            text: isTr
              ? "Açılış maçı 11 Haziran 2026'da oynanacak, final ise 19 Temmuz 2026'da gerçekleşecektir. Turnuva yaklaşık 39 gün sürecek ve 104 maçla tamamlanacaktır."
              : "The kickoff match will be played on June 11, 2026, and the grand final will take place on July 19, 2026. The tournament will span 39 days with a total of 104 matches.",
          },
        ].map((f, i) => (
          <div
            key={i}
            className="retro-card p-6"
            style={{ background: "#F8F7F2" }}
          >
            <div className="flex items-start gap-4 mb-4">
              <span style={{ fontSize: "1.6rem", lineHeight: 1, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ height: 2, background: f.accent, boxShadow: `0 0 6px ${f.accent}`, width: 32, marginBottom: 8 }} />
                <h3 style={{ fontSize: "0.85rem", fontWeight: 900, letterSpacing: "0.02em", color: "#1A1916" }}>
                  {f.title}
                </h3>
              </div>
            </div>
            <p style={{ fontSize: "0.68rem", color: "#5C5A54", lineHeight: 1.75, fontWeight: 500 }}>
              {f.text}
            </p>
          </div>
        ))}
      </div>

      {/* ══ HISTORICAL CHAMPIONS ══ */}
      <div>
        <div className="swiss-divider mb-6">{isTr ? "Dünya Kupası Tarihi — Şampiyonlar" : "World Cup History — All-Time Champions"}</div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4"
            style={{ border: "1.5px solid #1A1916", background: "#F2F0E8" }}>
            <div style={{ width: 32, height: 32, border: "3px solid #FF2D78", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p className="swiss-label animate-retro-blink" style={{ color: "#5C5A54" }}>{isTr ? "Tarih Verileri Yükleniyor..." : "Historical Data Loading..."}</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center" style={{ border: "1.5px solid #E53E3E", background: "#FFF5F5" }}>
            <span style={{ fontSize: "2rem" }}>⚠️</span>
            <h4 style={{ fontWeight: 900, color: "#E53E3E", marginTop: 8 }}>{isTr ? "Veri Yüklenemedi" : "Failed to Load Data"}</h4>
            <p style={{ fontSize: "0.7rem", color: "#E53E3E", marginTop: 4 }}>{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* All-time winners panel */}
            <div style={{ border: "1.5px solid #1A1916", boxShadow: "4px 4px 0 #FF2D7850", background: "#F8F7F2", overflow: "hidden" }}>
              {/* Panel header */}
              <div className="flex items-center gap-3 px-5 py-3" style={{ background: "#1A1916", borderBottom: "2px solid #FF2D78" }}>
                <span style={{ color: "#FF2D78", fontSize: "0.6rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  🏆 {isTr ? "En Çok Kazananlar" : "Most Successful Teams"}
                </span>
              </div>

              <div className="space-y-0">
                {winnerSummary.map((item, i) => {
                  const teamInfo = teamsMap[item.country_en];
                  const flagUrl = getFlagUrl(teamInfo?.teamFlag);
                  const primaryColor = teamInfo?.teamEnrichmentData?.primaryColor || "#E0DDD0";

                  return (
                    <div
                      key={item.country_en}
                      onClick={() => onSelectTeam(item.country_en)}
                      className="flex items-center justify-between px-5 py-3 cursor-pointer"
                      style={{
                        borderBottom: "1px solid #EAE7DA",
                        borderLeft: `3px solid ${primaryColor}`,
                        transition: "background 0.12s",
                        background: "#F8F7F2",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F2F0E8")}
                      onMouseLeave={e => (e.currentTarget.style.background = "#F8F7F2")}
                    >
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: "0.65rem", fontWeight: 900, color: "#8C8A84", width: 16, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                          {i + 1}
                        </span>
                        {flagUrl
                          ? <img src={flagUrl} alt={isTr ? item.country_tr : item.country_en} style={{ width: 22, height: 14, objectFit: "cover", border: "1px solid #E0DDD0" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          : <span style={{ fontSize: "1rem" }}>{item.flag}</span>
                        }
                        <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#1A1916" }}>{isTr ? item.country_tr : item.country_en}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: "1rem", fontWeight: 900, color: "#1A1916", fontVariantNumeric: "tabular-nums" }}>{item.count}</span>
                        <span style={{ fontSize: "0.8rem" }}>🏆</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-3" style={{ borderTop: "1px solid #EAE7DA", background: "#F2F0E8" }}>
                <span className="swiss-label">{isTr ? `Toplam Turnuva: ${winnersData?.total_tournaments}` : `Total Tournaments: ${winnersData?.total_tournaments}`}</span>
              </div>
            </div>

            {/* Chronological timeline */}
            <div className="lg:col-span-2" style={{ border: "1.5px solid #1A1916", boxShadow: "4px 4px 0 #1A191620", overflow: "hidden", background: "#F8F7F2" }}>
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-3" style={{ background: "#1A1916", borderBottom: "2px solid #00FF87" }}>
                <span style={{ color: "#00FF87", fontSize: "0.6rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  📅 {isTr ? "Kronolojik Şampiyonlar" : "Chronological Champions"}
                </span>
                <span className="swiss-label" style={{ color: "#5C5A54" }}>{isTr ? "1930 → Günümüz" : "1930 → Present"}</span>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {winnersData?.winners.map((winner, i) => {
                    const teamInfo = teamsMap[winner.country_en];
                    const flagUrl = getFlagUrl(teamInfo?.teamFlag);
                    const primaryColor = teamInfo?.teamEnrichmentData?.primaryColor || "#E0DDD0";
                    const fallbackFlag = countryFlags[winner.country_en] || "🏳️";
                    const isLast = i === (winnersData.winners.length || 0) - 1;

                    return (
                      <div
                        key={winner.year}
                        onClick={() => onSelectTeam(winner.country_en)}
                        className="flex items-start gap-3 p-4 cursor-pointer"
                        style={{
                          borderBottom: isLast ? "none" : "1px solid #EAE7DA",
                          borderLeft: `3px solid ${primaryColor}`,
                          borderRight: i % 2 === 0 ? "1px solid #EAE7DA" : "none",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F2F0E8")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div>
                          <div style={{ fontSize: "0.9rem", fontWeight: 900, color: "#00C060", letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums" }}>
                            {winner.year}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            {flagUrl
                              ? <img src={flagUrl} alt={isTr ? winner.country_tr : winner.country_en} style={{ width: 20, height: 13, objectFit: "cover", border: "1px solid #E0DDD0" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              : <span style={{ fontSize: "0.9rem" }}>{fallbackFlag}</span>
                            }
                            <span style={{ fontSize: "0.72rem", fontWeight: 900, color: "#1A1916" }}>{isTr ? winner.country_tr : winner.country_en}</span>
                          </div>
                          <div style={{ fontSize: "0.58rem", color: "#8C8A84", marginTop: 4, fontWeight: 500 }}>
                            {isTr ? "Teknik Direktör" : "Head Coach"}: {winner.manager}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ CTA STRIP ══ */}
      <div
        className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8"
        style={{ background: "#1A1916", border: "1.5px solid #1A1916" }}
      >
        <div className="space-y-2">
          <div className="swiss-label" style={{ color: "#5C5A54" }}>{isTr ? "Projeyi Beğendiniz mi?" : "Enjoying the Project?"}</div>
          <div style={{ fontSize: "1rem", fontWeight: 900, color: "#F8F7F2", letterSpacing: "-0.01em" }}>
            {isTr ? "Geliştiriciyle İletişime Geçin" : "Get in Touch with the Developer"}
          </div>
          <p style={{ fontSize: "0.65rem", color: "#8C8A84", lineHeight: 1.6, maxWidth: "40ch" }}>
            {isTr
              ? "Yeni özellikler, iş birlikleri veya katkılar için her zaman iletişime geçebilirsiniz."
              : "Feel free to reach out anytime for new features, collaborations, or contributions."}
          </p>
        </div>
        <a
          href="#/contact"
          className="swiss-btn-primary shrink-0"
          onClick={e => { e.preventDefault(); window.location.hash = "#/contact"; }}
        >
          {isTr ? "İletişim & Destek ✉️" : "Contact & Support ✉️"}
        </a>
      </div>

    </div>
  );
}
