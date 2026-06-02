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
    championshipDnaScore?: number;
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
    roundId?: number; // Dynamic group round ID (1, 2, or 3)
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

// Stable 32-bit FNV-1a like string hashing function
function hashStringTo32BitInt(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

// Deterministic Mulberry32 generator for isolated matches
function createMulberry32(seedVal: number): () => number {
    let state = seedVal;
    return () => {
        let t = (state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
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
    const rDNA = Math.min(150, 5 * team.appearances + (team.championshipDnaScore ?? (25 * team.championships))) * dnaMultiplier;

    // D. Momentum (5%)
    const parsedChange = parseInt(team.oneYearRatingChange.replace("−", "-").replace("+", ""), 10);
    const rMomentum = isNaN(parsedChange) ? 0 : parsedChange;

    // Ev sahibi takımlara verilen doğrudan +100 ELO bonusu (rHost) ve Ev Sahibi Sınırı (Host Cap) Ev Sahibi Paradoksu gereği kaldırılmıştır.
    let csr = 0.55 * rElo + 0.20 * rSquad + 0.10 * rDNA + 0.05 * rMomentum;

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

    // Ev Sahibi Paradoksu: Seyirci Coşkusu & Oynama Motivasyonu (+%15 Gol Olasılık Çarpanı)
    if (teamA.hostTeam) {
        lambdaA *= 1.15;
    }
    if (teamB.hostTeam) {
        lambdaB *= 1.15;
    }

    // Türkiye Paradoksu: Modern Dominasyon Zemin Filtresi (Gruptan ELO Artışıyla Gelen Takımların Zayıf Takımları Dağıtması)
    if (csrA - csrB > 400) {
        lambdaA = Math.max(lambdaA, 2.0);
    }
    if (csrB - csrA > 400) {
        lambdaB = Math.max(lambdaB, 2.0);
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

                // Dynamic İkili Averaj (Head-to-Head) Tie-Breaker
                const h2hMatch = groupMatches.find(
                    (m) =>
                        (m.homeTeamCode === a.teamCode && m.awayTeamCode === b.teamCode) ||
                        (m.homeTeamCode === b.teamCode && m.awayTeamCode === a.teamCode)
                );
                if (h2hMatch) {
                    const hScore = h2hMatch.isOverridden ? h2hMatch.userHomeScore : h2hMatch.simulatedHomeScore;
                    const aScore = h2hMatch.isOverridden ? h2hMatch.userAwayScore : h2hMatch.simulatedAwayScore;
                    if (hScore !== null && aScore !== null) {
                        const isAHome = h2hMatch.homeTeamCode === a.teamCode;
                        if (hScore > aScore) {
                            return isAHome ? -1 : 1;
                        } else if (aScore > hScore) {
                            return isAHome ? 1 : -1;
                        }
                    }
                }

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

        // ==========================================
        // 1. SIMULATE MISSING GROUP MATCHES
        // ==========================================
        statesMap.forEach((m) => {
            if (m.stage === "GROUP" && !m.isOverridden) {
                if (m.simulatedHomeScore === null || m.simulatedAwayScore === null) {
                    const tA = this.getTeam(m.homeTeamCode);
                    const tB = this.getTeam(m.awayTeamCode);
                    if (tA && tB) {
                        const matchSeed = hashStringTo32BitInt(`${seed}_${m.id}`);
                        const matchRandom = createMulberry32(matchSeed);
                        const res = simulateMatch(tA, tB, "GROUP", matchRandom);
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

        // Pairings matrix mapper with dynamic collision resolution
        const getTeamGroup = (code: string) => this.getTeam(code)?.group.toLowerCase() || "";
        const pairings: { home: string; away: string }[] = [];

        // 1. Matches 1-8: sortedWinners[0..7] vs bestThirds[0..7] with dynamic same-group collision protection
        const remainingThirds = [...bestThirds];
        for (let i = 0; i < 8; i++) {
            const winner = sortedWinners[i];
            const winnerGroup = getTeamGroup(winner.teamCode);

            let targetIdx = remainingThirds.length - 1;
            while (
                targetIdx >= 0 &&
                getTeamGroup(remainingThirds[targetIdx].teamCode) === winnerGroup
            ) {
                targetIdx--; // Shift index to avoid same-group pairing
            }

            if (targetIdx < 0) {
                targetIdx = remainingThirds.length - 1; // Fallback if all remaining options collide
            }

            const selectedThird = remainingThirds.splice(targetIdx, 1)[0];
            pairings.push({ home: winner.teamCode, away: selectedThird?.teamCode || "TBD" });
        }

        // 2. Matches 9-12: sortedWinners[8..11] vs sortedRunners[8..11] with dynamic same-group collision protection
        const remainingRunners9to12 = sortedRunners.slice(8, 12);
        for (let i = 8; i < 12; i++) {
            const winner = sortedWinners[i];
            const winnerGroup = getTeamGroup(winner.teamCode);

            let targetIdx = remainingRunners9to12.length - 1;
            while (
                targetIdx >= 0 &&
                getTeamGroup(remainingRunners9to12[targetIdx].teamCode) === winnerGroup
            ) {
                targetIdx--; // Shift index to avoid same-group pairing
            }

            if (targetIdx < 0) {
                targetIdx = remainingRunners9to12.length - 1;
            }

            const selectedRunner = remainingRunners9to12.splice(targetIdx, 1)[0];
            pairings.push({ home: winner.teamCode, away: selectedRunner?.teamCode || "TBD" });
        }

        // 3. Matches 13-16: sortedRunners[0..3] vs sortedRunners[4..7] (no collision possible since all groups are unique)
        const runners1to4 = sortedRunners.slice(0, 4);
        const runners5to8 = sortedRunners.slice(4, 8);
        for (let i = 0; i < 4; i++) {
            pairings.push({
                home: runners1to4[i].teamCode,
                away: runners5to8[3 - i]?.teamCode || "TBD",
            });
        }

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
                    const matchSeed = hashStringTo32BitInt(`${seed}_${matchId}`);
                    const matchRandom = createMulberry32(matchSeed);
                    const res = simulateMatch(tA, tB, "R32", matchRandom);
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
                        const matchSeed = hashStringTo32BitInt(`${seed}_${matchId}`);
                        const matchRandom = createMulberry32(matchSeed);
                        const res = simulateMatch(tA, tB, stage, matchRandom);
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
