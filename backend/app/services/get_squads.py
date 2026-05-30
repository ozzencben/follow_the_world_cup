import json
from pathlib import Path
import httpx
from loguru import logger

# Kayıt / Önbellekleme dizini ve dosya yolları
DATA_DIR = Path("app/data")
SQUADS_FILE = DATA_DIR / "squads.json"
FIFA_SQUADS_URL = "https://play.fifa.com/json/bracket_predictor/squads.json"


async def fetch_world_cup_squads() -> list:
    """
    FIFA takımları puan durumları ve torba verilerini önbellek öncelikli (caching-first) olarak yükler.
    1. Yerel 'squads.json' dosyası VARSA: Doğrudan yerel dosyayı okur (0 ms gecikme, API çağrısı yapılmaz).
    2. Dosya YOKSA: Resmi FIFA API'sine istek atar, gelen verileri yerel dosyaya kaydeder ve döner.
    """
    # ==============================================================
    # 1. YEREL DOSYA KONTROLÜ (Dosya varsa doğrudan oku)
    # ==============================================================
    if SQUADS_FILE.exists():
        logger.info(
            f"FIFA takımları puan durumu verileri yerel önbellek dosyasından okunuyor (API isteği yapılmadı): {SQUADS_FILE}"
        )
        try:
            with open(SQUADS_FILE, "r", encoding="utf-8") as f:
                cached_data = json.load(f)
                return cached_data
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
                
                # Verileri diske yaz (Böylece bir sonraki isteklerde API çağrısı yapılmaz)
                DATA_DIR.mkdir(parents=True, exist_ok=True)
                with open(SQUADS_FILE, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=4)
                
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
