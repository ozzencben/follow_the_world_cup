import json
from pathlib import Path
import httpx
from loguru import logger
import anyio

from app.core.config import settings

# Kayıt / Önbellekleme dizini ve dosya yolları
DATA_DIR = Path("app/data")
ROUNDS_FILE = DATA_DIR / "rounds.json"

_cached_rounds = None
_rounds_mtime = 0.0


def _load_rounds_sync() -> list:
    with open(ROUNDS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_rounds_sync(data: list) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(ROUNDS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


async def fetch_world_cup_rounds() -> list:
    """
    FIFA fikstür ve tur verilerini önbellek öncelikli (caching-first) olarak yükler.
    1. Yerel 'rounds.json' dosyası VARSA: Bellekten veya arka planda asenkron diskten okur.
    2. Dosya YOKSA: Resmi FIFA API'sine istek atar, gelen verileri yerel dosyaya kaydeder ve döner.
    """
    global _cached_rounds, _rounds_mtime

    # ==============================================================
    # 1. YEREL DOSYA KONTROLÜ & RAM CACHE (Dosya varsa bellekten veya diskten oku)
    # ==============================================================
    if ROUNDS_FILE.exists():
        try:
            mtime = ROUNDS_FILE.stat().st_mtime
            if _cached_rounds is not None and mtime == _rounds_mtime:
                return _cached_rounds

            logger.info(
                f"FIFA fikstür verileri yerel önbellek dosyasından okunuyor (API isteği yapılmadı): {ROUNDS_FILE}"
            )
            _cached_rounds = await anyio.to_thread.run_sync(_load_rounds_sync)
            _rounds_mtime = mtime
            return _cached_rounds
        except Exception as cache_err:
            logger.error(
                f"Yerel önbellek fikstür dosyası okunurken hata oluştu, API çağrısına yönlendiriliyor: {cache_err}"
            )

    # ==============================================================
    # 2. DOSYA YOKSA: FIFA API'SİNDEN ÇEK VE KAYDET
    # ==============================================================
    headers = {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }

    try:
        logger.info("Yerel fikstür verisi bulunamadı. Resmi FIFA API'si üzerinden fikstürler çekiliyor...")
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(settings.FIFA_ROUNDS_API_URL, headers=headers)

            if response.status_code == 200:
                data = response.json()
                
                # Verileri asenkron arka planda diske yaz
                await anyio.to_thread.run_sync(_save_rounds_sync, data)
                
                _cached_rounds = data
                _rounds_mtime = ROUNDS_FILE.stat().st_mtime if ROUNDS_FILE.exists() else 0.0
                
                logger.info(
                    f"FIFA fikstür API verileri ilk kez çekildi ve yerel dosyaya başarıyla kaydedildi: {ROUNDS_FILE}"
                )
                return data
            else:
                logger.error(
                    f"FIFA fikstür API sorgusu başarısız oldu. Durum Kodu: {response.status_code} | Yanıt: {response.text[:200]}"
                )

    except Exception as e:
        logger.error(f"FIFA fikstür API servisine bağlanırken hata oluştu: {e}")

    return []
