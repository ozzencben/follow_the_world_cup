// 🏆 realScores.ts
// Oynanan gerçek Dünya Kupası maçlarının skorlarını elle girdiğimiz dosya.

export interface RealScore {
    homeScore: number;
    awayScore: number;
    homePenaltyScore?: number;
    awayPenaltyScore?: number;
}

// Takım isimlerini normalize eden yardımcı fonksiyon
export const normalizeTeamName = (name: string): string => {
    if (!name) return "";
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .replace("and", "");
};

// İki takıma ait tekil anahtar üreten yardımcı fonksiyon (alfabetik sıralayarak Home/Away bağımsız yapar)
export const getMatchKey = (teamA: string, teamB: string): string => {
    const normA = normalizeTeamName(teamA);
    const normB = normalizeTeamName(teamB);
    return [normA, normB].sort().join("-");
};

// ── GERÇEK SKOR SÖZLÜĞÜ (REAL SCORES DICTIONARY) ──────────────────
// Yeni sonuçlar geldikçe buraya ekleme yapabilirsiniz.
export const REAL_SCORES: Record<string, RealScore> = {
    // Meksika 2 - 0 Güney Afrika
    "mexico-southafrica": { homeScore: 2, awayScore: 0 },

    // Güney Kore (Korea Republic) 2 - 1 Çekya (Czechia)
    "czechia-korearepublic": { homeScore: 2, awayScore: 1 },

    // Kanada 1 - 1 Bosna Hersek (Bosnia-Herzegovina)
    "bosniaherzegovina-canada": { homeScore: 1, awayScore: 1 },

    // ABD (USA) 4 - 1 Paraguay
    "paraguay-usa": { homeScore: 4, awayScore: 1 },

    // Brezilya 1 - 1 Fas
    "brazil-morocco": { homeScore: 1, awayScore: 1 },

    //Ispanya 0 - 0 Yeşil Burun Adaları
    "spain-caboverde": { homeScore: 0, awayScore: 0 }
};

// Bir maç için gerçek skor var mı diye kontrol eden fonksiyon
// Eğer varsa, takım isimlerinin REAL_SCORES içindeki key sırasına göre skorları döndürür.
export const getRealScore = (homeTeamName: string, awayTeamName: string): RealScore | null => {
    if (!homeTeamName || !awayTeamName) return null;
    const key = getMatchKey(homeTeamName, awayTeamName);
    const score = REAL_SCORES[key];
    if (!score) return null;

    // Skor sözlükte kayıtlı olan sıraya göre home/away olarak doğru dönmeli.
    // Sözlükteki key'in ilk parçası alfabetik olarak hangisiyse ona aittir.
    const normHome = normalizeTeamName(homeTeamName);
    const normAway = normalizeTeamName(awayTeamName);
    const sorted = [normHome, normAway].sort();

    if (normHome === sorted[0]) {
        // Sözlükteki homeScore gerçekte de home takıma ait
        return {
            homeScore: score.homeScore,
            awayScore: score.awayScore,
            homePenaltyScore: score.homePenaltyScore,
            awayPenaltyScore: score.awayPenaltyScore
        };
    } else {
        // Sözlükteki homeScore gerçekte away takıma ait, yer değiştirerek dönüyoruz
        return {
            homeScore: score.awayScore,
            awayScore: score.homeScore,
            homePenaltyScore: score.awayPenaltyScore,
            awayPenaltyScore: score.homePenaltyScore
        };
    }
};
