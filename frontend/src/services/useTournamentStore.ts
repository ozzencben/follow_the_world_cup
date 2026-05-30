import { create } from "zustand";
import api from "./api";
import { TournamentEngine } from "./TournamentEngine";
import type {
  SimulatorTeam,
  MatchState,
  GroupStanding,
} from "./TournamentEngine";

interface TournamentState {
  teams: SimulatorTeam[];
  matches: MatchState[];
  groupStandings: Map<string, GroupStanding[]>;
  bestThirds: GroupStanding[];
  loading: boolean;
  error: string | null;
  seed: number;

  initializeStore: () => Promise<void>;
  overrideMatchScore: (matchId: string, homeScore: number, awayScore: number) => void;
  resetMatch: (matchId: string) => void;
  resetAllMatches: () => void;
  reRollSeed: () => void;
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
    } catch (err: any) {
      set({
        loading: false,
        error: err.message || "Turnuva simülasyonu başlatılırken hata oluştu.",
      });
    }
  },

  overrideMatchScore: (matchId: string, homeScore: number, awayScore: number) => {
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
}));
