import json
import unicodedata
from pathlib import Path
from loguru import logger
import anyio

# Kayıt dizini ve dosya yolları
DATA_DIR = Path("app/data")
ELO_DIR = DATA_DIR / "elo"
ELO_RATINGS_FILE = ELO_DIR / "2026_World_Cup.tsv"
ELO_LATEST_FILE  = ELO_DIR / "2026_World_Cup_latest.tsv"
ELO_FIXTURES_FILE = ELO_DIR / "2026_World_Cup_fixtures.tsv"
TRANSFERMARKT_FILE = DATA_DIR / "transfermarkt_stats.json"
ELO_GRAPH_FILE   = ELO_DIR / "2026_World_Cup_graph.tsv"


# ─────────────────────────────────────────────────────────────────────────────
# Altın Ülke Haritalama Sözlüğü  (ELO kodu → İngilizce / Türkçe / Konfederasyon)
# Tüm 48 Dünya Kupası 2026 takımı tam ve eksiksiz tanımlıdır.
# "tm" anahtarı: transfermarkt_stats.json içindeki gerçek Türkçe anahtar
# ─────────────────────────────────────────────────────────────────────────────
GOLDEN_COUNTRY_MAP: dict[str, dict] = {
    "ES": {"en": "Spain",              "tr": "İspanya",                       "conf": "UEFA",     "tm": "İspanya"},
    "AR": {"en": "Argentina",          "tr": "Arjantin",                      "conf": "CONMEBOL", "tm": "Arjantin"},
    "FR": {"en": "France",             "tr": "Fransa",                        "conf": "UEFA",     "tm": "Fransa"},
    "EN": {"en": "England",            "tr": "İngiltere",                     "conf": "UEFA",     "tm": "İngiltere"},
    "BR": {"en": "Brazil",             "tr": "Brezilya",                      "conf": "CONMEBOL", "tm": "Brezilya"},
    "PT": {"en": "Portugal",           "tr": "Portekiz",                      "conf": "UEFA",     "tm": "Portekiz"},
    "CO": {"en": "Colombia",           "tr": "Kolombiya",                     "conf": "CONMEBOL", "tm": "Kolombiya"},
    "NL": {"en": "Netherlands",        "tr": "Hollanda",                      "conf": "UEFA",     "tm": "Hollanda"},
    "EC": {"en": "Ecuador",            "tr": "Ekvador",                       "conf": "CONMEBOL", "tm": "Ekvador"},
    "HR": {"en": "Croatia",            "tr": "Hırvatistan",                   "conf": "UEFA",     "tm": "Hırvatistan"},
    "DE": {"en": "Germany",            "tr": "Almanya",                       "conf": "UEFA",     "tm": "Almanya"},
    "NO": {"en": "Norway",             "tr": "Norveç",                        "conf": "UEFA",     "tm": "Norveç"},
    "JP": {"en": "Japan",              "tr": "Japonya",                       "conf": "AFC",      "tm": "Japonya"},
    "TR": {"en": "Türkiye",            "tr": "Türkiye",                       "conf": "UEFA",     "tm": "Türkiye"},
    "UY": {"en": "Uruguay",            "tr": "Uruguay",                       "conf": "CONMEBOL", "tm": "Uruguay"},
    "CH": {"en": "Switzerland",        "tr": "İsviçre",                       "conf": "UEFA",     "tm": "İsviçre"},
    "SN": {"en": "Senegal",            "tr": "Senegal",                       "conf": "CAF",      "tm": "Senegal"},
    "BE": {"en": "Belgium",            "tr": "Belçika",                       "conf": "UEFA",     "tm": "Belçika"},
    "MX": {"en": "Mexico",             "tr": "Meksika",                       "conf": "CONCACAF", "tm": "Meksika"},
    "PY": {"en": "Paraguay",           "tr": "Paraguay",                      "conf": "CONMEBOL", "tm": "Paraguay"},
    "AT": {"en": "Austria",            "tr": "Avusturya",                     "conf": "UEFA",     "tm": "Avusturya"},
    "MA": {"en": "Morocco",            "tr": "Fas",                           "conf": "CAF",      "tm": "Fas"},
    "CA": {"en": "Canada",             "tr": "Kanada",                        "conf": "CONCACAF", "tm": "Kanada"},
    "AU": {"en": "Australia",          "tr": "Avustralya",                    "conf": "AFC",      "tm": "Avustralya"},
    "SQ": {"en": "Scotland",           "tr": "İskoçya",                       "conf": "UEFA",     "tm": "İskoçya"},
    "IR": {"en": "IR Iran",            "tr": "İran",                          "conf": "AFC",      "tm": "İran"},
    "KR": {"en": "Korea Republic",     "tr": "Güney Kore",                    "conf": "AFC",      "tm": "Güney Kore"},
    "DZ": {"en": "Algeria",            "tr": "Cezayir",                       "conf": "CAF",      "tm": "Cezayir"},
    "PA": {"en": "Panama",             "tr": "Panama",                        "conf": "CONCACAF", "tm": "Panama"},
    "UZ": {"en": "Uzbekistan",         "tr": "Özbekistan",                    "conf": "AFC",      "tm": "Özbekistan"},
    "CZ": {"en": "Czechia",            "tr": "Çekya",                         "conf": "UEFA",     "tm": "Çekya"},
    "US": {"en": "USA",                "tr": "ABD",                           "conf": "CONCACAF", "tm": "Amerika Birleşik Devletleri"},
    "SE": {"en": "Sweden",             "tr": "İsveç",                         "conf": "UEFA",     "tm": "İsveç"},
    "EG": {"en": "Egypt",              "tr": "Mısır",                         "conf": "CAF",      "tm": "Mısır"},
    "JO": {"en": "Jordan",             "tr": "Ürdün",                         "conf": "AFC",      "tm": "Ürdün"},
    "CI": {"en": "Côte d'Ivoire",      "tr": "Fildişi Sahili",                "conf": "CAF",      "tm": "Fildişi Sahili"},
    "CD": {"en": "Congo DR",           "tr": "Kongo DR",                      "conf": "CAF",      "tm": "Demokratik Kongo Cumhuriyeti"},
    "TN": {"en": "Tunisia",            "tr": "Tunus",                         "conf": "CAF",      "tm": "Tunus"},
    "IQ": {"en": "Iraq",               "tr": "Irak",                          "conf": "AFC",      "tm": "Irak"},
    "BA": {"en": "Bosnia and Herzegovina", "tr": "Bosna-Hersek",                  "conf": "UEFA",     "tm": "Bosna-Hersek"},
    "NZ": {"en": "New Zealand",        "tr": "Yeni Zelanda",                  "conf": "OFC",      "tm": "Yeni Zelanda"},
    "SA": {"en": "Saudi Arabia",       "tr": "Suudi Arabistan",               "conf": "AFC",      "tm": "Suudi Arabistan"},
    "CV": {"en": "Cabo Verde",         "tr": "Yeşil Burun Adaları",           "conf": "CAF",      "tm": "Yeşil Burun Adaları"},
    "HT": {"en": "Haiti",              "tr": "Haiti",                         "conf": "CONCACAF", "tm": "Haiti"},
    "ZA": {"en": "South Africa",       "tr": "Güney Afrika",                  "conf": "CAF",      "tm": "Güney Afrika"},
    "GH": {"en": "Ghana",              "tr": "Gana",                          "conf": "CAF",      "tm": "Gana"},
    "CW": {"en": "Curaçao",            "tr": "Curaçao",                       "conf": "CONCACAF", "tm": "Curaçao"},
    "QA": {"en": "Qatar",              "tr": "Katar",                         "conf": "AFC",      "tm": "Katar"},
}


def clean_value(val: str) -> int:
    """
    ELO TSV dosyasındaki sayısal değerleri güvenle temizler ve int'e dönüştürür.
    Unicode eksi işareti (U+2212 '−') ve artı işareti gibi özel karakterleri kaldırır.
    """
    if not val or not val.strip():
        return 0
    try:
        # Unicode normalisation: tüm özel tire/eksi karakterleri standart ASCII'ye çevir
        normalized = unicodedata.normalize("NFKC", val.strip())
        # U+2212 '−' (Mathematical Minus), U+2013 '–' (En Dash) ASCII '-'ye çevir
        normalized = normalized.replace("\u2212", "-").replace("\u2013", "-").replace("−", "-")
        # Artı işaretini kaldır
        normalized = normalized.replace("+", "")
        return int(normalized)
    except (ValueError, TypeError):
        return 0


def clean_change_str(val: str) -> str:
    """
    ELO değişim değerini frontend'e göstermek için temiz string formatında döner.
    Her zaman işaret ile döner: '+15', '-7', '0'
    """
    if not val or not val.strip():
        return "0"
    normalized = unicodedata.normalize("NFKC", val.strip())
    # Unicode minus işaretini ASCII eksi ile değiştir
    normalized = normalized.replace("\u2212", "-").replace("\u2013", "-").replace("−", "-")
    # Sayısal değeri hesapla ve işaretli string döndür
    try:
        n = int(normalized)
        if n > 0:
            return f"+{n}"
        return str(n)  # 0 or negative already formatted correctly
    except ValueError:
        return normalized



def load_transfermarkt_stats() -> dict:
    """Kadro değerleri ve yaş ortalaması gibi Transfermarkt istatistiklerini yükler."""
    if not TRANSFERMARKT_FILE.exists():
        logger.warning(f"Transfermarkt dosyası bulunamadı: {TRANSFERMARKT_FILE}")
        return {}
    try:
        with open(TRANSFERMARKT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Transfermarkt verisi okunurken hata oluştu: {e}")
        return {}


_cached_ratings = None
_ratings_mtime = 0.0
_cached_tm_mtime = 0.0


def normalize_name(name: str) -> str:
    if not name:
        return ""
    # Standardize unicode characters (remove accents)
    normalized = unicodedata.normalize("NFKD", name.lower())
    # Remove accents, non-alphanumeric, and whitespace
    cleaned = "".join([c for c in normalized if c.isalnum()])
    return cleaned.replace("and", "")


def calculate_team_category(
    rating: int,
    avg_rating: int,
    matches_total: int,
    appearances: int,
    championships: int,
    squad_value: float
) -> str:
    """
    Takımların güç ve profil kategorilerini hiyerarşik öncelik mantığıyla belirler.
    """
    # ÖNCELİK 1 (Tarihi Efsane): Toplam Maç >= 800 VE (Şampiyonluk > 0 VEYA Katılım >= 15)
    if matches_total >= 800 and (championships > 0 or appearances >= 15):
        return "Historic Legend"

    # ÖNCELİK 2 (Gizli Potansiyel): Güncel ELO < 1900 VE Kadro Değeri > 300M VE Şampiyonluk == 0
    elif rating < 1900 and squad_value > 300.0 and championships == 0:
        return "Dark Horse"

    # ÖNCELİK 3 (Yükselen Yıldız): (Güncel ELO - Tarihsel ELO >= 100) VE (Tarihsel ELO < 1850)
    elif (rating - avg_rating >= 100) and (avg_rating < 1850):
        return "Rising Star"

    # ÖNCELİK 4 (Gerileyen Dev): (Tarihsel ELO - Güncel ELO >= 20) VE Kadro Değeri < 250M
    elif (avg_rating - rating >= 20) and squad_value < 250.0:
        return "Falling Giant"

    # ÖNCELİK 5 (Mütevazı Güç)
    else:
        return "Modest Strength"


def _get_elo_ratings_sync() -> list:
    if not ELO_RATINGS_FILE.exists():
        logger.error(f"Elo ratings dosyası bulunamadı: {ELO_RATINGS_FILE}")
        return []

    ratings_list = []
    tm_stats = load_transfermarkt_stats()

    # Load winners to get championships count
    winners_file = Path("app/data/winners.json")
    championships_map = {}
    if winners_file.exists():
        try:
            with open(winners_file, "r", encoding="utf-8") as f:
                winners_data = json.load(f)
                for w in winners_data.get("winners", []):
                    name = normalize_name(w.get("country_en", ""))
                    championships_map[name] = championships_map.get(name, 0) + 1
        except Exception as e:
            logger.error(f"Winners read error: {e}")

    # Load fifa_data to get appearances
    fifa_file = Path("app/data/fifa_data.json")
    appearances_map = {}
    if fifa_file.exists():
        try:
            with open(fifa_file, "r", encoding="utf-8") as f:
                fifa_data = json.load(f)
                for t in fifa_data.get("teams", []):
                    name = normalize_name(t.get("teamName", ""))
                    appearances_map[name] = t.get("appearances", 1)
        except Exception as e:
            logger.error(f"Fifa data read error: {e}")

    try:
        with open(ELO_RATINGS_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split("\t")
                if len(parts) < 31:
                    logger.warning(f"Kısa TSV satırı atlandı ({len(parts)} sütun): {line[:60]}")
                    continue

                code = parts[2].strip().upper()
                if code not in GOLDEN_COUNTRY_MAP:
                    logger.debug(f"Bilinmeyen kod atlandı: {code}")
                    continue

                mapping = GOLDEN_COUNTRY_MAP[code]

                # Transfermarkt verisini 'tm' anahtarıyla çek (tam eşleşme)
                tm_key = mapping["tm"]
                tm_data = tm_stats.get(tm_key, {})
                squad_value  = tm_data.get("squad_value_million_eur", 0.0)
                average_age  = tm_data.get("average_age", 0.0)
                player_count = tm_data.get("player_count", 0)

                if squad_value == 0.0:
                    logger.debug(f"Transfermarkt verisi bulunamadı: {code} → '{tm_key}'")

                total_matches  = clean_value(parts[22])
                matches_home   = clean_value(parts[23])
                matches_away   = clean_value(parts[24])
                matches_neutral = clean_value(parts[25])
                wins   = clean_value(parts[26])
                losses = clean_value(parts[27])
                draws  = clean_value(parts[28])
                goals_for     = clean_value(parts[29])
                goals_against = clean_value(parts[30])

                win_rate          = round((wins / total_matches) * 100, 1) if total_matches > 0 else 0.0
                goals_for_avg     = round(goals_for / total_matches, 2)    if total_matches > 0 else 0.0
                goals_against_avg = round(goals_against / total_matches, 2) if total_matches > 0 else 0.0

                name_norm = normalize_name(mapping["en"])
                appearances = appearances_map.get(name_norm, 1)
                championships = championships_map.get(name_norm, 0)
                rating_val = clean_value(parts[3])
                avg_rating_val = clean_value(parts[7]) or rating_val

                category = calculate_team_category(
                    rating=rating_val,
                    avg_rating=avg_rating_val,
                    matches_total=total_matches,
                    appearances=appearances,
                    championships=championships,
                    squad_value=squad_value
                )

                team_data = {
                    "localRank":            clean_value(parts[0]),
                    "globalRank":           clean_value(parts[1]),
                    "code":                 code,
                    "nameEn":               mapping["en"],
                    "nameTr":               mapping["tr"],
                    "confederation":        mapping["conf"],
                    "rating":               rating_val,
                    "peakRank":             clean_value(parts[4]),
                    "peakRating":           clean_value(parts[5]),
                    "avgRank":              clean_value(parts[6]),
                    "avgRating":            avg_rating_val,
                    "lowRank":              clean_value(parts[8]),
                    "lowRating":            clean_value(parts[9]),
                    # 1 yıllık değişim — frontend'de ▲/▼ ile gösterilir
                    "oneYearRankChange":    clean_change_str(parts[14]),
                    "oneYearRatingChange":  clean_change_str(parts[15]),
                    "matchesTotal":         total_matches,
                    "matchesHome":          matches_home,
                    "matchesAway":          matches_away,
                    "matchesNeutral":       matches_neutral,
                    "wins":                 wins,
                    "losses":               losses,
                    "draws":                draws,
                    "goalsFor":             goals_for,
                    "goalsAgainst":         goals_against,
                    "winRate":              win_rate,
                    "goalsForAvg":          goals_for_avg,
                    "goalsAgainstAvg":      goals_against_avg,
                    # Transfermarkt zengin verileri
                    "squadValue":           squad_value,
                    "averageAge":           average_age,
                    "playerCount":          player_count,
                    "appearances":          appearances,
                    "championships":        championships,
                    "category":             category,
                }
                ratings_list.append(team_data)

        ratings_list.sort(key=lambda x: x["localRank"])
        logger.info(f"ELO Ratings yüklendi: {len(ratings_list)} takım")
        return ratings_list

    except Exception as e:
        logger.error(f"Elo ratings okuma hatası: {e}")
        return []


async def get_elo_ratings() -> list:
    """
    2026_World_Cup.tsv dosyasını parse eder, Transfermarkt kadro verileriyle
    birleştirir, GOLDEN_COUNTRY_MAP üzerinden eşleştirir ve tam liste döner.
    Önbellekleme mantığıyla bellekten hızlı yanıt verir ve event-loop'u bloke etmez.
    """
    global _cached_ratings, _ratings_mtime, _cached_tm_mtime
    
    r_exists = ELO_RATINGS_FILE.exists()
    tm_exists = TRANSFERMARKT_FILE.exists()
    
    r_mtime = ELO_RATINGS_FILE.stat().st_mtime if r_exists else 0.0
    tm_mtime = TRANSFERMARKT_FILE.stat().st_mtime if tm_exists else 0.0
    
    if _cached_ratings is not None and r_mtime == _ratings_mtime and tm_mtime == _cached_tm_mtime:
        return _cached_ratings
        
    _cached_ratings = await anyio.to_thread.run_sync(_get_elo_ratings_sync)
    _ratings_mtime = r_mtime
    _cached_tm_mtime = tm_mtime
    return _cached_ratings


def _get_team_form_sync(team_code: str) -> dict:
    team_code = team_code.upper()
    form_list = []

    # ─── 1. Son Maç Form Listesi ────────────────────────────────────────────
    if ELO_LATEST_FILE.exists():
        try:
            with open(ELO_LATEST_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    parts = line.split("\t")
                    if len(parts) < 10:
                        continue

                    t1 = parts[3].strip().upper()
                    t2 = parts[4].strip().upper()

                    if t1 != team_code and t2 != team_code:
                        continue

                    date_str   = f"{parts[0]}-{int(parts[1]):02d}-{int(parts[2]):02d}"
                    t1_score   = clean_value(parts[5])
                    t2_score   = clean_value(parts[6])
                    match_type = parts[7].strip()

                    # parts[9] = ELO değişimi takım 1'e göre
                    raw_change = clean_value(parts[9])

                    if t1 == team_code:
                        opponent_code  = t2
                        team_score     = t1_score
                        opponent_score = t2_score
                        elo_change_str = clean_change_str(parts[9])
                    else:
                        opponent_code  = t1
                        team_score     = t2_score
                        opponent_score = t1_score
                        # Takım 2'nin ELO değişimi takım 1'inkinin tersi
                        inv = -raw_change
                        elo_change_str = f"+{inv}" if inv > 0 else str(inv)

                    opp_map = GOLDEN_COUNTRY_MAP.get(
                        opponent_code, {"en": opponent_code, "tr": opponent_code}
                    )

                    if team_score > opponent_score:
                        result = "W"
                    elif team_score < opponent_score:
                        result = "L"
                    else:
                        result = "D"

                    form_list.append({
                        "date":             date_str,
                        "teamScore":        team_score,
                        "opponentScore":    opponent_score,
                        "opponentCode":     opponent_code,
                        "opponentNameTr":   opp_map["tr"],
                        "opponentNameEn":   opp_map["en"],
                        "matchType":        match_type,
                        "result":           result,
                        "eloChange":        elo_change_str,
                    })

            form_list.sort(key=lambda x: x["date"], reverse=True)
        except Exception as e:
            logger.error(f"Form listesi yüklenirken hata: {e}")

    # ─── 2. Tarihsel ELO Trajectory (graph.tsv + latest.tsv) ────────────────
    trajectory = []

    if ELO_GRAPH_FILE.exists() and ELO_LATEST_FILE.exists():
        try:
            # 2a. Başlangıç ELO değerlerini graph.tsv 1. satırından oku
            with open(ELO_GRAPH_FILE, "r", encoding="utf-8") as f:
                start_line = f.readline().strip()

            # Format: "ES2172AR2113FR2062..." (2-char code + 4-char rating, concatenated)
            initial_ratings: dict[str, int] = {}
            i = 0
            while i + 6 <= len(start_line):
                code_part   = start_line[i:i+2].upper()
                rating_part = start_line[i+2:i+6]
                try:
                    initial_ratings[code_part] = int(rating_part)
                except ValueError:
                    pass
                i += 6

            # 2b. Tüm maç ELO değişimlerini latest.tsv'den çek
            all_matches = []
            with open(ELO_LATEST_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    parts = line.split("\t")
                    if len(parts) < 10:
                        continue
                    try:
                        year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
                    except ValueError:
                        continue
                    t1_code    = parts[3].strip().upper()
                    t2_code    = parts[4].strip().upper()
                    raw_change = clean_value(parts[9])

                    all_matches.append({
                        "date":   f"{year}-{month:02d}-{day:02d}",
                        "t1":     t1_code,
                        "t2":     t2_code,
                        "change": raw_change,
                    })

            # Kronolojik sırala (en eski → en yeni)
            all_matches.sort(key=lambda x: x["date"])

            # 2c. Simülasyon: adım adım güncel ELO'ları hesapla
            current_ratings = dict(initial_ratings)
            start_rating    = initial_ratings.get(team_code, 1500)

            trajectory.append({
                "matchIndex": 1,
                "date":       "2026-02-25",
                "rating":     start_rating,
                "opponent":   "Başlangıç",
            })

            idx = 2
            running_rating = start_rating

            # Benzersiz tarihleri sırala
            unique_dates = sorted(set(m["date"] for m in all_matches))

            for d in unique_dates:
                day_matches = [m for m in all_matches if m["date"] == d]
                played_opp  = None

                for m in day_matches:
                    t1, t2, ch = m["t1"], m["t2"], m["change"]
                    if t1 in current_ratings:
                        current_ratings[t1] += ch
                    if t2 in current_ratings:
                        current_ratings[t2] -= ch

                    if t1 == team_code:
                        played_opp = t2
                    elif t2 == team_code:
                        played_opp = t1

                new_rating = current_ratings.get(team_code, running_rating)

                opponent_name = "Maç Yok"
                if played_opp:
                    opp_map = GOLDEN_COUNTRY_MAP.get(played_opp, {"tr": played_opp})
                    opponent_name = opp_map["tr"]

                trajectory.append({
                    "matchIndex": idx,
                    "date":       d,
                    "rating":     new_rating,
                    "opponent":   opponent_name,
                })
                idx           += 1
                running_rating = new_rating

        except Exception as e:
            logger.error(f"Trajectory hesaplanırken hata oluştu: {e}")

    # Fallback: trajectory boş kaldıysa temel veri döndür
    if not trajectory:
        trajectory = [{"matchIndex": 1, "date": "2026-02-25", "rating": 1500, "opponent": "Başlangıç"}]

    return {
        "form":       form_list[:8],   # Son 8 maç
        "trajectory": trajectory,
    }


async def get_team_form(team_code: str) -> dict:
    """
    2026_World_Cup_latest.tsv dosyasını okur ve son maçların form detaylarını çıkarır.
    Önbellekleme mantığıyla event-loop'u bloke etmeden arka planda çalıştırır.
    """
    return await anyio.to_thread.run_sync(_get_team_form_sync, team_code)


def _get_elo_fixtures_sync() -> list:
    if not ELO_FIXTURES_FILE.exists():
        logger.error(f"Elo fixtures dosyası bulunamadı: {ELO_FIXTURES_FILE}")
        return []

    fixtures = []
    try:
        with open(ELO_FIXTURES_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split("\t")
                if len(parts) < 16:
                    continue

                match_type = parts[5].strip()
                if match_type != "WC":
                    continue

                t1 = parts[3].strip().upper()
                t2 = parts[4].strip().upper()

                t1_map = GOLDEN_COUNTRY_MAP.get(t1, {"en": t1, "tr": t1})
                t2_map = GOLDEN_COUNTRY_MAP.get(t2, {"en": t2, "tr": t2})

                t1_prob   = clean_value(parts[11])
                t2_prob   = clean_value(parts[15])
                draw_prob = max(0, 100 - t1_prob - t2_prob)

                fixtures.append({
                    "date":       f"{parts[0]}-{int(parts[1]):02d}-{int(parts[2]):02d}",
                    "t1Code":     t1,
                    "t1NameEn":   t1_map["en"],
                    "t1NameTr":   t1_map["tr"],
                    "t2Code":     t2,
                    "t2NameEn":   t2_map["en"],
                    "t2NameTr":   t2_map["tr"],
                    "t1Prob":     t1_prob,
                    "t2Prob":     t2_prob,
                    "drawProb":   draw_prob,
                    "locationCode": parts[6].strip(),
                })

        logger.info(f"ELO Fixtures yüklendi: {len(fixtures)} Dünya Kupası maçı")
        return fixtures

    except Exception as e:
        logger.error(f"Elo fikstür okuma hatası: {e}")
        return []


_cached_fixtures = None
_fixtures_mtime = 0.0


async def get_elo_fixtures() -> list:
    """
    2026_World_Cup_fixtures.tsv dosyasını okur,
    Dünya Kupası (WC) maçlarını filtreler ve ELO olasılıklarıyla birlikte döner.
    Önbellekleme mantığıyla bellekten hızlı yanıt verir ve event-loop'u bloke etmez.
    """
    global _cached_fixtures, _fixtures_mtime
    exists = ELO_FIXTURES_FILE.exists()
    mtime = ELO_FIXTURES_FILE.stat().st_mtime if exists else 0.0

    if _cached_fixtures is not None and mtime == _fixtures_mtime:
        return _cached_fixtures

    _cached_fixtures = await anyio.to_thread.run_sync(_get_elo_fixtures_sync)
    _fixtures_mtime = mtime
    return _cached_fixtures
