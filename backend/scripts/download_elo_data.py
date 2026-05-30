import asyncio
import httpx
from pathlib import Path
from loguru import logger

# Verilerin kaydedileceği klasör (Eğer yoksa otomatik oluşturulacak)
DATA_DIR = Path("app/data/elo")
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Eloratings.net URL yapısı ve ekran görüntüsünde tespit ettiğimiz 4 hedef dosya
BASE_URL = "https://www.eloratings.net/"
TARGET_FILES = [
    "2026_World_Cup.tsv",
    "2026_World_Cup_fixtures.tsv",
    "2026_World_Cup_latest.tsv",
    "2026_World_Cup_graph.tsv"
]

# Siteye "Ben bir bot değilim, gerçek bir tarayıcıyım" demek için gerekli başlıklar
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/plain, */*; q=0.01",
    "Referer": "https://www.eloratings.net/2026_World_Cup",
    "X-Requested-With": "XMLHttpRequest"
}

async def download_tsv_files():
    logger.info("Eloratings.net veri senkronizasyonu başlatılıyor...")
    
    async with httpx.AsyncClient(timeout=15.0, headers=HEADERS) as client:
        # Tüm indirme işlemlerini aynı anda (paralel) yapmak için task listesi oluşturuyoruz
        tasks = []
        for filename in TARGET_FILES:
            file_url = f"{BASE_URL}{filename}"
            tasks.append(fetch_and_save(client, file_url, filename))
            
        # Tüm dosyaları asenkron olarak beklemeden indir
        await asyncio.gather(*tasks)
        
    logger.success("Tüm Elo verileri başarıyla indirildi ve yerel diske kaydedildi!")

async def fetch_and_save(client: httpx.AsyncClient, url: str, filename: str):
    try:
        logger.info(f"İndiriliyor: {filename}...")
        response = await client.get(url)
        
        if response.status_code == 200:
            # Gelen TSV verisini bilgisayardaki dosyaya yaz
            save_path = DATA_DIR / filename
            with open(save_path, "w", encoding="utf-8") as f:
                f.write(response.text)
            logger.info(f"Kaydedildi -> {save_path}")
        else:
            logger.error(f"Hata! {filename} indirilemedi. Durum Kodu: {response.status_code}")
            
    except Exception as e:
        logger.error(f"{filename} çekilirken bağlantı hatası oluştu: {e}")

if __name__ == "__main__":
    # Scripti çalıştır
    asyncio.run(download_tsv_files())