/**
 * 🎮 TournamentEngine.ts
 *
 * Safe client-side mathematical World Cup 2026 Simulator and Cascade State Engine.
 * Decoupled from UI rendering, highly optimized, and suitable for Web Worker execution.
 */

export interface SimulatorTeam {
  code: string;
  nameEn: string;
  nameTr: string;
  rating: number;
  squadValue: number;
  averageAge: number;
  playerCount: number;
  oneYearRatingChange: string;
  appearances: number;
  championships: number;
  hostTeam: boolean;
  confederationId: string;
  group: string; // "a" to "l"
  abbr: string;
  goalsForAvg?: number;
  goalsAgainstAvg?: number;
  avgRating?: number;
  matchesTotal?: number;
}

export interface MatchState {
  id: string; // e.g., "G-A-1", "R32-1", "SF-2"
  stage: "GROUP" | "R32" | "R16" | "QF" | "SF" | "F";
  homeTeamCode: string;
  awayTeamCode: string;
  isOverridden: boolean;
  simulatedHomeScore: number | null;
  simulatedAwayScore: number | null;
  userHomeScore: number | null;
  userAwayScore: number | null;
  winnerCode: string | null;
  nextMatchId: string | null; // ID of the match the winner moves to
}

export interface GroupStanding {
  teamCode: string;
  teamNameTr: string;
  teamNameEn: string;
  group: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  csr: number;
}

// Global math helper
function log10(val: number): number {
  return Math.log(val) / Math.LN10;
}

/**
 * 1. COMPOSITE STRENGTH RATING (CSR) CALCULATION
 * Evaluates a team based on Elo, squad value (logarithmic), DNA, momentum, and host advantages.
 */
export function calculateCSR(
  team: SimulatorTeam,
  stage: "GROUP" | "R32" | "R16" | "QF" | "SF" | "F" = "GROUP"
): number {
  // A. Base Elo (55%)
  const rElo = team.rating;

  // B. Squad Value Logarithmic (20%)
  const rSquad = 100 * log10(team.squadValue + 1);

  // C. Tournament DNA (10%)
  let dnaMultiplier = 1.0;
  if (stage === "R32" || stage === "R16") {
    dnaMultiplier = 1.5;
  } else if (stage === "QF" || stage === "SF" || stage === "F") {
    dnaMultiplier = 2.0;
  }
  const rDNA = Math.min(150, 5 * team.appearances + 25 * team.championships) * dnaMultiplier;

  // D. Momentum (5%)
  const parsedChange = parseInt(team.oneYearRatingChange.replace("−", "-").replace("+", ""), 10);
  const rMomentum = isNaN(parsedChange) ? 0 : parsedChange;

  // E. Host Advantage (10%)
  const rHost = team.hostTeam ? 100 : 0;

  let csr = 0.55 * rElo + 0.20 * rSquad + 0.10 * rDNA + 0.05 * rMomentum + 0.10 * rHost;

  // Ev Sahibi Balonunu Söndürme (Host Cap):
  // Ev sahibi bonusu alan ancak elite ELO'su olmayan takımlar 1950 CSR ile limitlenir.
  if (team.hostTeam && team.rating < 1950) {
    csr = Math.min(1950, csr);
  }

  return csr;
}

/**
 * 2. TRUNCATED POISSON RANDOM VARIABLE GENERATION
 * Employs Knuth's algorithm to generate realistic soccer goal counts bounded to [0, 8].
 */
export function poissonRandom(lambda: number, randomFn?: () => number): number {
  const rand = randomFn || Math.random;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1.0;
  do {
    k++;
    p *= rand();
  } while (p > L && k < 15); // Bounded loop for safety
  const val = k - 1;
  return Math.min(8, val); // Bounded to 8 to allow historic routs (e.g. 7-1, 8-0)
}

/**
 * 3. POISSON GOAL PREDICTOR MODEL
 * Simulates a single match outcome based on team CSR ratings, aura, underdog momentum, and golden generation.
 */
export function simulateMatch(
  teamA: SimulatorTeam,
  teamB: SimulatorTeam,
  stage: "GROUP" | "R32" | "R16" | "QF" | "SF" | "F",
  randomFn?: () => number
): { homeScore: number; awayScore: number; winnerCode: string } {
  const rand = randomFn || Math.random;
  let csrA = calculateCSR(teamA, stage);
  let csrB = calculateCSR(teamB, stage);

  const parseChange = (changeStr: string) => {
    const cleaned = changeStr.replace("−", "-").replace("+", "").trim();
    const val = parseInt(cleaned, 10);
    return isNaN(val) ? 0 : val;
  };

  // Deviren Bonusu (Underdog Motivation)
  if (csrA - csrB > 250) {
    if (parseChange(teamB.oneYearRatingChange) > 0) {
      csrB += 50;
    }
  } else if (csrB - csrA > 250) {
    if (parseChange(teamA.oneYearRatingChange) > 0) {
      csrA += 50;
    }
  }

  // Get dynamic goal average values or fallback
  let goalsForA = teamA.goalsForAvg ?? 1.45;
  let goalsAgainstA = teamA.goalsAgainstAvg ?? 1.15;
  let goalsForB = teamB.goalsForAvg ?? 1.45;
  let goalsAgainstB = teamB.goalsAgainstAvg ?? 1.15;

  // Şişirilmiş İstatistik Filtresi (Fake Stats Normalization):
  // İki takım arasındaki CSR farkı 300 puandan BÜYÜKSE, zayıf olan takımın goalsForAvg değeri MAKSİMUM 1.1'e sabitlenir.
  if (csrA - csrB > 300) {
    goalsForB = Math.min(goalsForB, 1.1);
  } else if (csrB - csrA > 300) {
    goalsForA = Math.min(goalsForA, 1.1);
  }

  const diffCSR = csrA - csrB;
  let lambdaA = goalsForA * goalsAgainstB * (1 + diffCSR / 1000);
  let lambdaB = goalsForB * goalsAgainstA * (1 + diffCSR / -1000);

  // Devlerin Aurası (Juggernaut Modifier)
  if (teamA.rating > 2000) {
    lambdaB *= 0.85;
  }
  if (teamB.rating > 2000) {
    lambdaA *= 0.85;
  }

  // Altın Jenerasyon Bonusu (Golden Generation / Wonderkids)
  if (teamA.averageAge < 27 && teamA.squadValue > 300) {
    lambdaA *= 1.10;
  }
  if (teamB.averageAge < 27 && teamB.squadValue > 300) {
    lambdaB *= 1.10;
  }

  // Efsanelerin Zırhı (Elite Plot Armor - Knockout Penalty)
  if (stage !== "GROUP") {
    if (teamA.rating >= 2000 && csrA - csrB > 200) {
      lambdaB *= 0.80;
    }
    if (teamB.rating >= 2000 && csrB - csrA > 200) {
      lambdaA *= 0.80;
    }
  }

  // Sahne Korkusu (Stage Fright Penalty):
  // Zayıf takımın baz ELO < 1650 ise VE rakibinin baz ELO > 1950 ise; zayıf takımın Lambda'sı %50 oranında düşürülür.
  if (teamA.rating < 1650 && teamB.rating > 1950) {
    lambdaA *= 0.5;
  }
  if (teamB.rating < 1650 && teamA.rating > 1950) {
    lambdaB *= 0.5;
  }

  // Büyük Maç Baskısı (Variance Dampening)
  if (stage === "QF" || stage === "SF" || stage === "F") {
    lambdaA *= 0.75;
    lambdaB *= 0.75;
  }

  // Bound lambdas to realistic ranges [0.25, 4.25] after all modifications
  lambdaA = Math.max(0.25, Math.min(4.25, lambdaA));
  lambdaB = Math.max(0.25, Math.min(4.25, lambdaB));

  let homeScore = poissonRandom(lambdaA, rand);
  let awayScore = poissonRandom(lambdaB, rand);

  // Kesin Gol Sınırı (Ultimate Score Cap):
  // İki takım arasındaki CSR farkı 350 puandan BÜYÜKSE, zayıf takımın üretebileceği maksimum gol sayısı zorla 1'e sabitlenir.
  if (csrA - csrB > 350) {
    awayScore = Math.min(1, awayScore);
  } else if (csrB - csrA > 350) {
    homeScore = Math.min(1, homeScore);
  }

  // Handle Knockout Stage Tie-Breakers (no draws)
  if (stage !== "GROUP" && homeScore === awayScore) {
    // 50% CSR weight + 50% luck simulation for extra-time/penalties
    const pA = 1 / (1 + Math.pow(10, -(csrA - csrB) / 400));
    if (rand() < pA) {
      homeScore += 1; // Simulated extra time goal or penalty win
    } else {
      awayScore += 1;
    }
  }

  const winnerCode = homeScore > awayScore ? teamA.code : teamB.code;

  return { homeScore, awayScore, winnerCode };
}

/**
 * 4. TOURNAMENT STANDINGS & BRACKET RESOLUTION ENGINE
 */
export class TournamentEngine {
  private teamsMap: Map<string, SimulatorTeam>;

  constructor(teams: SimulatorTeam[]) {
    this.teamsMap = new Map(teams.map((t) => [t.code.toUpperCase(), t]));
  }

  public getTeam(code: string): SimulatorTeam | undefined {
    return this.teamsMap.get(code.toUpperCase());
  }

  /**
   * Calculates standings for all 12 groups.
   */
  public calculateGroupStandings(groupMatches: MatchState[]): Map<string, GroupStanding[]> {
    const standings = new Map<string, Map<string, GroupStanding>>();

    // Initialize all teams
    this.teamsMap.forEach((team) => {
      const g = team.group.toLowerCase();
      if (!standings.has(g)) standings.set(g, new Map());
      const gMap = standings.get(g)!;
      gMap.set(team.code, {
        teamCode: team.code,
        teamNameTr: team.nameTr,
        teamNameEn: team.nameEn,
        group: team.group,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        csr: calculateCSR(team),
      });
    });

    // Accumulate match results
    groupMatches.forEach((m) => {
      const homeT = standings.get(m.id.split("-")[1].toLowerCase())?.get(m.homeTeamCode);
      const awayT = standings.get(m.id.split("-")[1].toLowerCase())?.get(m.awayTeamCode);

      if (!homeT || !awayT) return;

      const hScore = m.isOverridden ? m.userHomeScore : m.simulatedHomeScore;
      const aScore = m.isOverridden ? m.userAwayScore : m.simulatedAwayScore;

      if (hScore === null || aScore === null) return;

      homeT.played++;
      awayT.played++;
      homeT.goalsFor += hScore;
      homeT.goalsAgainst += aScore;
      awayT.goalsFor += aScore;
      awayT.goalsAgainst += hScore;

      if (hScore > aScore) {
        homeT.won++;
        homeT.points += 3;
        awayT.lost++;
      } else if (hScore < aScore) {
        awayT.won++;
        awayT.points += 3;
        homeT.lost++;
      } else {
        homeT.drawn++;
        homeT.points += 1;
        awayT.drawn++;
        awayT.points += 1;
      }
    });

    // Final sorting for each group with strict rules
    const finalStandings = new Map<string, GroupStanding[]>();
    standings.forEach((gMap, groupLetter) => {
      // Recalculate goal difference for all teams in the group
      gMap.forEach((t) => {
        t.goalDifference = t.goalsFor - t.goalsAgainst;
      });

      const sorted = Array.from(gMap.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return b.csr - a.csr; // Dynamic Tie-Breaker: Higher CSR moves up
      });
      finalStandings.set(groupLetter, sorted);
    });

    return finalStandings;
  }

  /**
   * Solves the 8 best 3rd placed teams across the 12 groups (A to L)
   */
  public getBestThirdPlacedTeams(groupStandings: Map<string, GroupStanding[]>): GroupStanding[] {
    const thirds: GroupStanding[] = [];
    groupStandings.forEach((teams) => {
      if (teams.length >= 3) {
        thirds.push(teams[2]);
      }
    });

    return thirds.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return b.csr - a.csr; // Higher CSR fallback
    }).slice(0, 8);
  }

  /**
   * Runs complete single cascade evaluation starting from group matches and going to the final
   */
  public runFullCascade(existingStates: MatchState[], seed: number = 2026): MatchState[] {
    const statesMap = new Map(existingStates.map((s) => [s.id, { ...s }]));

    // Mulberry32 Pseudo-Random Number Generator (PRNG) sequence
    let seedValue = seed;
    const seededRandom = () => {
      let t = (seedValue += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // ==========================================
    // 1. SIMULATE MISSING GROUP MATCHES
    // ==========================================
    statesMap.forEach((m) => {
      if (m.stage === "GROUP" && !m.isOverridden) {
        if (m.simulatedHomeScore === null || m.simulatedAwayScore === null) {
          const tA = this.getTeam(m.homeTeamCode);
          const tB = this.getTeam(m.awayTeamCode);
          if (tA && tB) {
            const res = simulateMatch(tA, tB, "GROUP", seededRandom);
            m.simulatedHomeScore = res.homeScore;
            m.simulatedAwayScore = res.awayScore;
            m.winnerCode = res.winnerCode;
          }
        }
      }
    });

    // ==========================================
    // 2. COMPUTE RANKINGS & ADVANCED TEAMS
    // ==========================================
    const allMatches = Array.from(statesMap.values());
    const groupMatches = allMatches.filter((s) => s.stage === "GROUP");
    const standings = this.calculateGroupStandings(groupMatches);
    const bestThirds = this.getBestThirdPlacedTeams(standings);

    // Dynamic Qualified List
    // Winners: Rank 1-12, Runners-up: Rank 13-24, 3rd Places: Rank 25-32
    const winners: GroupStanding[] = [];
    const runnersUp: GroupStanding[] = [];

    standings.forEach((teams) => {
      if (teams[0]) winners.push(teams[0]);
      if (teams[1]) runnersUp.push(teams[1]);
    });

    // Sort subsets
    const sortStandings = (arr: GroupStanding[]) =>
      arr.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const diffA = a.goalsFor - a.goalsAgainst;
        const diffB = b.goalsFor - b.goalsAgainst;
        if (diffB !== diffA) return diffB - diffA;
        return b.goalsFor - a.goalsFor;
      });

    const sortedWinners = sortStandings(winners);
    const sortedRunners = sortStandings(runnersUp);

    // Pairings matrix mapper
    const pairings: { home: string; away: string }[] = [
      { home: sortedWinners[0].teamCode, away: bestThirds[7]?.teamCode || "TBD" }, // Match 1
      { home: sortedWinners[1].teamCode, away: bestThirds[6]?.teamCode || "TBD" }, // Match 2
      { home: sortedWinners[2].teamCode, away: bestThirds[5]?.teamCode || "TBD" }, // Match 3
      { home: sortedWinners[3].teamCode, away: bestThirds[4]?.teamCode || "TBD" }, // Match 4
      { home: sortedWinners[4].teamCode, away: bestThirds[3]?.teamCode || "TBD" }, // Match 5
      { home: sortedWinners[5].teamCode, away: bestThirds[2]?.teamCode || "TBD" }, // Match 6
      { home: sortedWinners[6].teamCode, away: bestThirds[1]?.teamCode || "TBD" }, // Match 7
      { home: sortedWinners[7].teamCode, away: bestThirds[0]?.teamCode || "TBD" }, // Match 8
      { home: sortedWinners[8].teamCode, away: sortedRunners[11]?.teamCode || "TBD" }, // Match 9
      { home: sortedWinners[9].teamCode, away: sortedRunners[10]?.teamCode || "TBD" }, // Match 10
      { home: sortedWinners[10].teamCode, away: sortedRunners[9]?.teamCode || "TBD" }, // Match 11
      { home: sortedWinners[11].teamCode, away: sortedRunners[8]?.teamCode || "TBD" }, // Match 12
      { home: sortedRunners[0].teamCode, away: sortedRunners[7]?.teamCode || "TBD" }, // Match 13
      { home: sortedRunners[1].teamCode, away: sortedRunners[6]?.teamCode || "TBD" }, // Match 14
      { home: sortedRunners[2].teamCode, away: sortedRunners[5]?.teamCode || "TBD" }, // Match 15
      { home: sortedRunners[3].teamCode, away: sortedRunners[4]?.teamCode || "TBD" }, // Match 16
    ];

    // ==========================================
    // 3. GENERATE ROUND OF 32 (R32) MATCHES
    // ==========================================
    for (let i = 0; i < 16; i++) {
      const matchId = `R32-${i + 1}`;
      const pair = pairings[i];
      const existing = statesMap.get(matchId);

      const updatedMatch: MatchState = {
        id: matchId,
        stage: "R32",
        homeTeamCode: pair.home,
        awayTeamCode: pair.away,
        isOverridden: existing ? existing.isOverridden : false,
        simulatedHomeScore: existing ? existing.simulatedHomeScore : null,
        simulatedAwayScore: existing ? existing.simulatedAwayScore : null,
        userHomeScore: existing ? existing.userHomeScore : null,
        userAwayScore: existing ? existing.userAwayScore : null,
        winnerCode: existing ? existing.winnerCode : null,
        nextMatchId: `R16-${Math.floor(i / 2) + 1}`, // Map winners to R16
      };

      // Reset user overrides if participants changed entirely
      if (existing && (existing.homeTeamCode !== pair.home || existing.awayTeamCode !== pair.away)) {
        updatedMatch.isOverridden = false;
        updatedMatch.userHomeScore = null;
        updatedMatch.userAwayScore = null;
        updatedMatch.simulatedHomeScore = null;
        updatedMatch.simulatedAwayScore = null;
        updatedMatch.winnerCode = null;
      }

      // Simulate if needed
      if (!updatedMatch.isOverridden && (updatedMatch.simulatedHomeScore === null || updatedMatch.simulatedAwayScore === null)) {
        const tA = this.getTeam(updatedMatch.homeTeamCode);
        const tB = this.getTeam(updatedMatch.awayTeamCode);
        if (tA && tB) {
          const res = simulateMatch(tA, tB, "R32", seededRandom);
          updatedMatch.simulatedHomeScore = res.homeScore;
          updatedMatch.simulatedAwayScore = res.awayScore;
          updatedMatch.winnerCode = res.winnerCode;
        } else {
          updatedMatch.winnerCode = updatedMatch.homeTeamCode !== "TBD" ? updatedMatch.homeTeamCode : "TBD";
        }
      } else if (updatedMatch.isOverridden) {
        // User changed it
        const hScore = updatedMatch.userHomeScore || 0;
        const aScore = updatedMatch.userAwayScore || 0;
        updatedMatch.winnerCode = hScore > aScore ? updatedMatch.homeTeamCode : updatedMatch.awayTeamCode;
      }

      statesMap.set(matchId, updatedMatch);
    }

    // ==========================================
    // 4. CASCADE ELEME AŞAMASI (R16 -> QF -> SF -> F)
    // ==========================================
    const stages: ("R16" | "QF" | "SF" | "F")[] = ["R16", "QF", "SF", "F"];
    const parentStages: ("R32" | "R16" | "QF" | "SF")[] = ["R32", "R16", "QF", "SF"];
    const stageMatchesCount = { R16: 8, QF: 4, SF: 2, F: 1 };

    for (let sIdx = 0; sIdx < stages.length; sIdx++) {
      const stage = stages[sIdx];
      const parentStage = parentStages[sIdx];
      const count = stageMatchesCount[stage];

      for (let i = 0; i < count; i++) {
        const matchId = `${stage}-${i + 1}`;
        const parentId1 = `${parentStage}-${i * 2 + 1}`;
        const parentId2 = `${parentStage}-${i * 2 + 2}`;

        const parent1 = statesMap.get(parentId1);
        const parent2 = statesMap.get(parentId2);

        const homeTeam = parent1 ? (parent1.isOverridden ? (parent1.userHomeScore! > parent1.userAwayScore! ? parent1.homeTeamCode : parent1.awayTeamCode) : parent1.winnerCode) : "TBD";
        const awayTeam = parent2 ? (parent2.isOverridden ? (parent2.userHomeScore! > parent2.userAwayScore! ? parent2.homeTeamCode : parent2.awayTeamCode) : parent2.winnerCode) : "TBD";

        const existing = statesMap.get(matchId);
        const nextId = stage === "F" ? null : stage === "R16" ? `QF-${Math.floor(i / 2) + 1}` : stage === "QF" ? `SF-${Math.floor(i / 2) + 1}` : "F-1";

        const updatedMatch: MatchState = {
          id: matchId,
          stage,
          homeTeamCode: homeTeam || "TBD",
          awayTeamCode: awayTeam || "TBD",
          isOverridden: existing ? existing.isOverridden : false,
          simulatedHomeScore: existing ? existing.simulatedHomeScore : null,
          simulatedAwayScore: existing ? existing.simulatedAwayScore : null,
          userHomeScore: existing ? existing.userHomeScore : null,
          userAwayScore: existing ? existing.userAwayScore : null,
          winnerCode: existing ? existing.winnerCode : null,
          nextMatchId: nextId,
        };

        // Reset user overrides if participants changed
        if (existing && (existing.homeTeamCode !== homeTeam || existing.awayTeamCode !== awayTeam)) {
          updatedMatch.isOverridden = false;
          updatedMatch.userHomeScore = null;
          updatedMatch.userAwayScore = null;
          updatedMatch.simulatedHomeScore = null;
          updatedMatch.simulatedAwayScore = null;
          updatedMatch.winnerCode = null;
        }

        // Simulate
        if (!updatedMatch.isOverridden && (updatedMatch.simulatedHomeScore === null || updatedMatch.simulatedAwayScore === null)) {
          const tA = this.getTeam(updatedMatch.homeTeamCode);
          const tB = this.getTeam(updatedMatch.awayTeamCode);
          if (tA && tB) {
            const res = simulateMatch(tA, tB, stage, seededRandom);
            updatedMatch.simulatedHomeScore = res.homeScore;
            updatedMatch.simulatedAwayScore = res.awayScore;
            updatedMatch.winnerCode = res.winnerCode;
          } else {
            updatedMatch.winnerCode = updatedMatch.homeTeamCode !== "TBD" ? updatedMatch.homeTeamCode : "TBD";
          }
        } else if (updatedMatch.isOverridden) {
          const hScore = updatedMatch.userHomeScore || 0;
          const aScore = updatedMatch.userAwayScore || 0;
          updatedMatch.winnerCode = hScore > aScore ? updatedMatch.homeTeamCode : updatedMatch.awayTeamCode;
        }

        statesMap.set(matchId, updatedMatch);
      }
    }

    return Array.from(statesMap.values());
  }
}
