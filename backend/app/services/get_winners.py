import json
from pathlib import Path
from loguru import logger

DATA_DIR = Path("app/data")
WINNERS_FILE = DATA_DIR / "winners.json"


def fetch_world_cup_winners() -> dict:
    """
    Kullanıcının elle oluşturduğu yerel 'winners.json' dosyasından 
    tarihsel Dünya Kupası şampiyonları listesini yükler.
    """
    if WINNERS_FILE.exists():
        try:
            with open(WINNERS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data
        except Exception as e:
            logger.error(f"Yerel winners.json dosyası okunurken hata oluştu: {e}")
    else:
        logger.error(f"winners.json dosyası bulunamadı: {WINNERS_FILE}")
        
    return {"winners": [], "total_tournaments": 0}
