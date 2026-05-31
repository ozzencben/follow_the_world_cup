import json
from pathlib import Path
import httpx
from loguru import logger
import anyio

# Kayıt / Önbellekleme dizini ve dosya yolları
DATA_DIR = Path("app/data")
SQUADS_FILE = DATA_DIR / "squads.json"
FIFA_SQUADS_URL = "https://play.fifa.com/json/bracket_predictor/squads.json"

_cached_squads = None
_squads_mtime = 0.0


def _load_squads_sync() -> list:
    with open(SQUADS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_squads_sync(data: list) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(SQUADS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


async def fetch_world_cup_squads() -> list:
    """
    FIFA takımları puan durumları ve torba verilerini önbellek öncelikli (caching-first) olarak yükler.
    1. Yerel 'squads.json' dosyası VARSA: Bellekten veya arka planda asenkron diskten okur.
    2. Dosya YOKSA: Resmi FIFA API'sine istek atar, gelen verileri yerel dosyaya kaydeder ve döner.
    """
    global _cached_squads, _squads_mtime

    # ==============================================================
    # 1. YEREL DOSYA KONTROLÜ & RAM CACHE (Dosya varsa bellekten veya diskten oku)
    # ==============================================================
    if SQUADS_FILE.exists():
        try:
            mtime = SQUADS_FILE.stat().st_mtime
            if _cached_squads is not None and mtime == _squads_mtime:
                return _cached_squads

            logger.info(
                f"FIFA takımları puan durumu verileri yerel önbellek dosyasından okunuyor (API isteği yapılmadı): {SQUADS_FILE}"
            )
            _cached_squads = await anyio.to_thread.run_sync(_load_squads_sync)
            _squads_mtime = mtime
            return _cached_squads
        except Exception as cache_err:
            logger.error(
                f"Yerel önbellek puan durumu dosyası okunurken hata oluştu, API çağrısına yönlendiriliyor: {cache_err}"
            )

    # ==============================================================
    # 2. DOSYA YOKSA: FIFA API'SİNDEN ÇEK VE KAYDET
    # ==============================================================
    headers = {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }

    try:
        logger.info("Yerel puan durumu verisi bulunamadı. Resmi FIFA API'si üzerinden squads verileri çekiliyor...")
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(FIFA_SQUADS_URL, headers=headers)

            if response.status_code == 200:
                data = response.json()
                
                # Verileri asenkron arka planda diske yaz
                await anyio.to_thread.run_sync(_save_squads_sync, data)
                
                _cached_squads = data
                _squads_mtime = SQUADS_FILE.stat().st_mtime if SQUADS_FILE.exists() else 0.0
                
                logger.info(
                    f"FIFA squads API verileri ilk kez çekildi ve yerel dosyaya başarıyla kaydedildi: {SQUADS_FILE}"
                )
                return data
            else:
                logger.error(
                    f"FIFA squads API sorgusu başarısız oldu. Durum Kodu: {response.status_code} | Yanıt: {response.text[:200]}"
                )

    except Exception as e:
        logger.error(f"FIFA squads API servisine bağlanırken hata oluştu: {e}")

    return []
