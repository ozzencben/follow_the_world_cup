import json
from pathlib import Path
from loguru import logger

DATA_DIR = Path("app/data")
WINNERS_FILE = DATA_DIR / "winners.json"


_cached_winners = None
_winners_mtime = 0.0


def fetch_world_cup_winners() -> dict:
    """
    Kullanıcının elle oluşturduğu yerel 'winners.json' dosyasından 
    tarihsel Dünya Kupası şampiyonları listesini yükler.
    Bellekte önbellek tutarak disk I/O operasyonlarını minimize eder.
    """
    global _cached_winners, _winners_mtime
    
    if WINNERS_FILE.exists():
        try:
            mtime = WINNERS_FILE.stat().st_mtime
            if _cached_winners is not None and mtime == _winners_mtime:
                return _cached_winners

            with open(WINNERS_FILE, "r", encoding="utf-8") as f:
                _cached_winners = json.load(f)
                _winners_mtime = mtime
                return _cached_winners
        except Exception as e:
            logger.error(f"Yerel winners.json dosyası okunurken hata oluştu: {e}")
    else:
        logger.error(f"winners.json dosyası bulunamadı: {WINNERS_FILE}")
        
    return {"winners": [], "total_tournaments": 0}
