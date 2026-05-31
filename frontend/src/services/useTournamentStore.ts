import { create } from "zustand";
import api from "./api";
import { TournamentEngine } from "./TournamentEngine";
import type {
  SimulatorTeam,
  MatchState,
  GroupStanding,
} from "./TournamentEngine";

// ── CREATOR TYPE ────────────────────────────────────────────────
export interface Creator {
  id: string;
  name: string;
  bracketString: string | null;
  seed?: number;
  roleTr?: string;
  roleEn?: string;
  commentTr?: string;
  commentEn?: string;
}

interface TournamentState {
  teams: SimulatorTeam[];
  matches: MatchState[];
  groupStandings: Map<string, GroupStanding[]>;
  bestThirds: GroupStanding[];
  loading: boolean;
  error: string | null;
  seed: number;
  isReadOnly: boolean;
  isPublishing: boolean;
  publishError: string | null;
  creatorsList: Creator[];
  viewingCreatorName: string | null;

  initializeStore: () => Promise<void>;
  overrideMatchScore: (matchId: string, homeScore: number, awayScore: number) => void;
  resetMatch: (matchId: string) => void;
  resetAllMatches: () => void;
  reRollSeed: () => void;
  generateShareableLink: () => string;
  loadBracketFromUrl: (queryString?: string) => Promise<void>;
  cloneBracket: () => void;
  publishCreatorBracket: (token: string, comment?: string) => Promise<void>;
  fetchCreators: () => Promise<void>;
  viewCreatorPrediction: (bracketString: string, creatorName: string) => Promise<void>;
}

// ── NAME NORMALIZATION HELPER ────────────────────────────────────
const normalizeName = (name: string): string => {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace("and", "");
};

// ── NAME TO COUNTRY CODE MAP ──────────────────────────────────────
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

const getTeamCode = (name: string): string => {
  const norm = normalizeName(name);
  const normalizedMap: { [key: string]: string } = {};
  Object.keys(nameToCodeMap).forEach(key => {
    normalizedMap[normalizeName(key)] = nameToCodeMap[key];
  });
  return normalizedMap[norm] || "";
};

export const useTournamentStore = create<TournamentState>((set, get) => ({
  teams: [],
  matches: [],
  groupStandings: new Map(),
  bestThirds: [],
  loading: false,
  error: null,
  seed: 2026,
  isReadOnly: false,
  isPublishing: false,
  publishError: null,
  creatorsList: [],
  viewingCreatorName: null,

  initializeStore: async () => {
    set({ loading: true, error: null });
    try {
      const [teamsRes, squadsRes, roundsRes, winnersRes, eloRes] = await Promise.all([
        api.get<{ teams: any[] }>("/teams"),
        api.get<any[]>("/squads"),
        api.get<any[]>("/rounds"),
        api.get<{ winners: any[] }>("/winners"),
        api.get<any[]>("/elo/ratings"),
      ]);

      const teamsList = teamsRes.data.teams || [];
      const squadsList = squadsRes.data || [];
      const eloList = eloRes.data || [];
      const winnersList = winnersRes.data.winners || [];

      // Calculate champion counts
      const winnerCounts: { [name: string]: number } = {};
      winnersList.forEach((w) => {
        const name = w.country_en.toLowerCase();
        winnerCounts[name] = (winnerCounts[name] || 0) + 1;
      });

      // 1. Build SimulatorTeam list by merging ELO, Transfermarkt, and FIFA sources
      const simulatorTeams: SimulatorTeam[] = eloList.map((elo) => {
        const matchingFifa = teamsList.find(
          (t) => normalizeName(t.teamName) === normalizeName(elo.nameEn)
        );
        const matchingSquad = squadsList.find(
          (s) => normalizeName(s.name) === normalizeName(elo.nameEn)
        );

        const appearances = matchingFifa?.appearances || 1;
        const hostTeam = matchingFifa?.hostTeam || false;
        const championships = winnerCounts[elo.nameEn.toLowerCase()] || 0;

        return {
          code: elo.code,
          nameEn: elo.nameEn,
          nameTr: elo.nameTr,
          rating: elo.rating,
          squadValue: elo.squadValue,
          averageAge: elo.averageAge,
          playerCount: elo.playerCount,
          oneYearRatingChange: elo.oneYearRatingChange,
          appearances,
          championships,
          hostTeam,
          confederationId: elo.confederation,
          group: matchingSquad?.group || "a",
          abbr: matchingSquad?.abbr || elo.code,
          goalsForAvg: elo.goalsForAvg,
          goalsAgainstAvg: elo.goalsAgainstAvg,
          avgRating: elo.avgRating,
          matchesTotal: elo.matchesTotal,
        };
      });

      // 2. Initialize default GROUP stage match states from rounds.json
      const groupMatches: MatchState[] = [];
      roundsRes.data.forEach((round) => {
        if (round.stage === "GROUP" && round.tournaments) {
          round.tournaments.forEach((m: any) => {
            const homeCode = getTeamCode(m.homeSquadName);
            const awayCode = getTeamCode(m.awaySquadName);

            // Find group character
            const team = simulatorTeams.find((t) => t.code === homeCode);
            const grp = team ? team.group.toUpperCase() : "A";

            groupMatches.push({
              id: `G-${grp}-${m.id}`,
              stage: "GROUP",
              homeTeamCode: homeCode,
              awayTeamCode: awayCode,
              isOverridden: false,
              simulatedHomeScore: null,
              simulatedAwayScore: null,
              userHomeScore: null,
              userAwayScore: null,
              winnerCode: null,
              nextMatchId: null,
            });
          });
        }
      });

      // 3. Instantiate Engine & Run Initial full prediction cascade using deterministic seed
      const currentSeed = get().seed || 2026;
      const engine = new TournamentEngine(simulatorTeams);
      const cascadedMatches = engine.runFullCascade(groupMatches, currentSeed);
      const standings = engine.calculateGroupStandings(
        cascadedMatches.filter((m) => m.stage === "GROUP")
      );
      const bestThirds = engine.getBestThirdPlacedTeams(standings);

      set({
        teams: simulatorTeams,
        matches: cascadedMatches,
        groupStandings: standings,
        bestThirds,
        loading: false,
        error: null,
      });

      // Hydrate if bracket parameter exists in URL
      const hasBracket = window.location.href.includes("bracket=");
      if (hasBracket) {
        await get().loadBracketFromUrl();
      }
    } catch (err: any) {
      set({
        loading: false,
        error: err.message || "Turnuva simülasyonu başlatılırken hata oluştu.",
      });
    }
  },

  overrideMatchScore: (matchId: string, homeScore: number, awayScore: number) => {
    if (get().isReadOnly) return;
    const { teams, matches, seed } = get();
    if (teams.length === 0 || matches.length === 0) return;

    // Update targeted match state inside list
    const updatedMatches = matches.map((m) => {
      if (m.id === matchId) {
        return {
          ...m,
          isOverridden: true,
          userHomeScore: homeScore,
          userAwayScore: awayScore,
          winnerCode: homeScore > awayScore ? m.homeTeamCode : m.awayTeamCode,
        };
      }
      return m;
    });

    // Run cascade solver using same deterministic seed to keep other matches repeatable
    const engine = new TournamentEngine(teams);
    const cascadedMatches = engine.runFullCascade(updatedMatches, seed);
    const standings = engine.calculateGroupStandings(
      cascadedMatches.filter((m) => m.stage === "GROUP")
    );
    const bestThirds = engine.getBestThirdPlacedTeams(standings);

    set({
      matches: cascadedMatches,
      groupStandings: standings,
      bestThirds,
    });
  },

  resetMatch: (matchId: string) => {
    if (get().isReadOnly) return;
    const { teams, matches, seed } = get();
    if (teams.length === 0 || matches.length === 0) return;

    const updatedMatches = matches.map((m) => {
      if (m.id === matchId) {
        return {
          ...m,
          isOverridden: false,
          userHomeScore: null,
          userAwayScore: null,
          simulatedHomeScore: null,
          simulatedAwayScore: null,
          winnerCode: null,
        };
      }
      return m;
    });

    const engine = new TournamentEngine(teams);
    const cascadedMatches = engine.runFullCascade(updatedMatches, seed);
    const standings = engine.calculateGroupStandings(
      cascadedMatches.filter((m) => m.stage === "GROUP")
    );
    const bestThirds = engine.getBestThirdPlacedTeams(standings);

    set({
      matches: cascadedMatches,
      groupStandings: standings,
      bestThirds,
    });
  },

  resetAllMatches: () => {
    if (get().isReadOnly) return;
    const { teams, matches, seed } = get();
    if (teams.length === 0 || matches.length === 0) return;

    // Clear all user overrides
    const resetMatches = matches.map((m) => ({
      ...m,
      isOverridden: false,
      userHomeScore: null,
      userAwayScore: null,
      simulatedHomeScore: null,
      simulatedAwayScore: null,
      winnerCode: null,
    }));

    const engine = new TournamentEngine(teams);
    const cascadedMatches = engine.runFullCascade(resetMatches, seed);
    const standings = engine.calculateGroupStandings(
      cascadedMatches.filter((m) => m.stage === "GROUP")
    );
    const bestThirds = engine.getBestThirdPlacedTeams(standings);

    set({
      matches: cascadedMatches,
      groupStandings: standings,
      bestThirds,
    });
  },

  reRollSeed: () => {
    if (get().isReadOnly) return;
    const { teams, matches } = get();
    if (teams.length === 0 || matches.length === 0) return;

    // Generate a fresh random integer seed in [1000, 99999]
    const newSeed = Math.floor(Math.random() * 99000) + 1000;

    // Reset simulated scores for non-overridden matches to force recalculation with the new seed
    const resetMatches = matches.map((m) => {
      if (!m.isOverridden) {
        return {
          ...m,
          simulatedHomeScore: null,
          simulatedAwayScore: null,
          winnerCode: null,
        };
      }
      return m;
    });

    const engine = new TournamentEngine(teams);
    const cascadedMatches = engine.runFullCascade(resetMatches, newSeed);
    const standings = engine.calculateGroupStandings(
      cascadedMatches.filter((m) => m.stage === "GROUP")
    );
    const bestThirds = engine.getBestThirdPlacedTeams(standings);

    set({
      seed: newSeed,
      matches: cascadedMatches,
      groupStandings: standings,
      bestThirds,
    });
  },

  generateShareableLink: () => {
    const { matches } = get();
    const overridden = matches.filter((m) => m.isOverridden);
    if (overridden.length === 0) {
      return window.location.href.split("?")[0];
    }
    const serialized = overridden
      .map((m) => `${m.id}_${m.userHomeScore}-${m.userAwayScore}`)
      .join("|");
    const baseUrl = window.location.href.split("?")[0];
    return `${baseUrl}?bracket=${encodeURIComponent(serialized)}`;
  },

  loadBracketFromUrl: async (queryString?: string) => {
    let bracketData = "";
    if (queryString) {
      const params = new URLSearchParams(queryString);
      bracketData = params.get("bracket") || "";
    } else {
      const href = window.location.href;
      const match = href.match(/[?&]bracket=([^&#]*)/);
      if (match) {
        bracketData = decodeURIComponent(match[1]);
      }
    }

    if (!bracketData) return;

    // Ensure store is loaded before loading bracket
    if (get().teams.length === 0) {
      await get().initializeStore();
    }

    const { teams, matches, seed } = get();
    if (teams.length === 0 || matches.length === 0) return;

    const overridesMap = new Map<string, { home: number; away: number }>();
    bracketData.split("|").forEach((item) => {
      const parts = item.split("_");
      if (parts.length === 2) {
        const matchId = parts[0];
        const scores = parts[1].split("-");
        if (scores.length === 2) {
          const home = parseInt(scores[0], 10);
          const away = parseInt(scores[1], 10);
          if (!isNaN(home) && !isNaN(away)) {
            overridesMap.set(matchId, { home, away });
          }
        }
      }
    });

    if (overridesMap.size === 0) return;

    const updatedMatches = matches.map((m) => {
      const override = overridesMap.get(m.id);
      if (override) {
        return {
          ...m,
          isOverridden: true,
          userHomeScore: override.home,
          userAwayScore: override.away,
          winnerCode: override.home > override.away ? m.homeTeamCode : m.awayTeamCode,
        };
      }
      return m;
    });

    const engine = new TournamentEngine(teams);
    const cascadedMatches = engine.runFullCascade(updatedMatches, seed);
    const standings = engine.calculateGroupStandings(
      cascadedMatches.filter((m) => m.stage === "GROUP")
    );
    const bestThirds = engine.getBestThirdPlacedTeams(standings);

    set({
      matches: cascadedMatches,
      groupStandings: standings,
      bestThirds,
      isReadOnly: true,
    });
  },

  cloneBracket: () => {
    set({ isReadOnly: false });
    
    // Clean up ?bracket= from window URL using history.replaceState
    const url = new URL(window.location.href);
    url.searchParams.delete("bracket");
    
    let newHash = url.hash;
    if (newHash.includes("?")) {
      const parts = newHash.split("?");
      const hashParams = new URLSearchParams(parts[1]);
      hashParams.delete("bracket");
      const cleanParams = hashParams.toString();
      newHash = parts[0] + (cleanParams ? "?" + cleanParams : "");
    }
    url.hash = newHash;

    window.history.replaceState({}, "", url.toString());
  },

  publishCreatorBracket: async (token: string, comment?: string) => {
    set({ isPublishing: true, publishError: null });
    try {
      const { matches } = get();
      const overridden = matches.filter((m) => m.isOverridden);
      const serialized = overridden
        .map((m) => `${m.id}_${m.userHomeScore}-${m.userAwayScore}`)
        .join("|");

      const response = await fetch("/api/creators/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, bracketString: serialized, comment }),
      });

      if (!response.ok) {
        throw new Error(`Yayınlama başarısız oldu (Durum kodu: ${response.status})`);
      }

      // Başarılıysa:
      // 1. isReadOnly durumunu ANINDA true yap
      set({ isReadOnly: true });

      // 2. window.history.replaceState kullanarak URL'deki ?token=... parametresini temizle
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      
      let newHash = url.hash;
      if (newHash.includes("?")) {
        const parts = newHash.split("?");
        const hashParams = new URLSearchParams(parts[1]);
        hashParams.delete("token");
        const cleanParams = hashParams.toString();
        newHash = parts[0] + (cleanParams ? "?" + cleanParams : "");
      }
      url.hash = newHash;

      window.history.replaceState({}, "", url.toString());
    } catch (err: any) {
      set({ publishError: err.message || "Tahmin kaydedilirken bilinmeyen bir hata oluştu." });
    } finally {
      set({ isPublishing: false });
    }
  },

  fetchCreators: async () => {
    try {
      const response = await fetch("/api/creators");
      if (!response.ok) throw new Error(`Yorumcular yüklenemedi (${response.status})`);
      const data: Creator[] = await response.json();
      set({ creatorsList: data });
    } catch (err: any) {
      console.error("[fetchCreators]", err.message);
    }
  },

  viewCreatorPrediction: async (bracketString: string, creatorName: string) => {
    // Ensure simulation engine is loaded before applying the bracket
    if (get().teams.length === 0) {
      await get().initializeStore();
    }

    const { teams, matches, creatorsList } = get();
    if (teams.length === 0 || matches.length === 0) return;

    // Dynamically look up the creator's saved seed (falls back to 2026 if not set)
    const matchedCreator = creatorsList.find((c) => c.name === creatorName);
    const creatorSeed = matchedCreator?.seed || 2026;

    const overridesMap = new Map<string, { home: number; away: number }>();
    if (bracketString && bracketString.trim() !== "") {
      bracketString.split("|").forEach((item) => {
        const parts = item.split("_");
        if (parts.length === 2) {
          const matchId = parts[0];
          const scores = parts[1].split("-");
          if (scores.length === 2) {
            const home = parseInt(scores[0], 10);
            const away = parseInt(scores[1], 10);
            if (!isNaN(home) && !isNaN(away)) {
              overridesMap.set(matchId, { home, away });
            }
          }
        }
      });
    }

    // Reset non-overridden matches to prevent leak of user's active overrides
    const updatedMatches = matches.map((m) => {
      const override = overridesMap.get(m.id);
      if (override) {
        return {
          ...m,
          isOverridden: true,
          userHomeScore: override.home,
          userAwayScore: override.away,
          winnerCode: override.home > override.away ? m.homeTeamCode : m.awayTeamCode,
        };
      }
      return {
        ...m,
        isOverridden: false,
        userHomeScore: null,
        userAwayScore: null,
        simulatedHomeScore: null,
        simulatedAwayScore: null,
        winnerCode: null,
      };
    });

    const engine = new TournamentEngine(teams);
    const cascadedMatches = engine.runFullCascade(updatedMatches, creatorSeed);
    const standings = engine.calculateGroupStandings(
      cascadedMatches.filter((m) => m.stage === "GROUP")
    );
    const bestThirds = engine.getBestThirdPlacedTeams(standings);

    set({
      seed: creatorSeed,
      matches: cascadedMatches,
      groupStandings: standings,
      bestThirds,
      isReadOnly: true,
      viewingCreatorName: creatorName,
    });
  },
}));
