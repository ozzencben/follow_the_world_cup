import asyncio
import httpx
from bs4 import BeautifulSoup
import json
from pathlib import Path
from loguru import logger

# Dosyayı kaydedeceğimiz yol
DATA_DIR = Path("app/data")
OUTPUT_FILE = DATA_DIR / "transfermarkt_stats.json"

# Transfermarkt'ın sayfalanmış URL'leri (48 takımı ve play-offları kapsar)
BASE_URLS = [
    "https://www.transfermarkt.com.tr/weltmeisterschaft/teilnehmer/pokalwettbewerb/FIWC/saison_id/2025",
    "https://www.transfermarkt.com.tr/weltmeisterschaft/teilnehmer/pokalwettbewerb/FIWC/saison_id/2025/page/2",
    "https://www.transfermarkt.com.tr/weltmeisterschaft/teilnehmer/pokalwettbewerb/FIWC/saison_id/2025/page/3"
]

# Transfermarkt bot korumasına takılmamak için gerçekçi bir tarayıcı kimliği
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
}

def parse_market_value(value_str: str) -> float:
    """
    Transfermarkt'ın Türkçe değer formatlarını (milyar, mil., bin) 
    standart 'Milyon Euro' cinsinden ondalık sayıya çevirir.
    Örn: '1.48 milyar €' -> 1480.0
         '536.20 mil. €' -> 536.2
         '724 bin €'     -> 0.724
    """
    value_str = value_str.lower().replace("€", "").strip()
    
    if "-" in value_str or value_str == "":
        return 0.0
        
    try:
        # Sayısal kısmı ayırma
        number_part = float(value_str.split()[0])
        
        if "milyar" in value_str:
            return number_part * 1000.0
        elif "mil." in value_str:
            return number_part
        elif "bin" in value_str:
            return number_part / 1000.0
        else:
            return number_part
    except Exception as e:
        logger.warning(f"Değer dönüştürülemedi: {value_str} -> {e}")
        return 0.0

async def scrape_market_values():
    team_data = {}
    
    async with httpx.AsyncClient(timeout=20.0, headers=HEADERS) as client:
        for page_index, url in enumerate(BASE_URLS, 1):
            logger.info(f"Sayfa {page_index} çekiliyor: {url}")
            try:
                response = await client.get(url)
                if response.status_code != 200:
                    logger.error(f"Sayfa {page_index} yüklenemedi! HTTP Kodu: {response.status_code}")
                    continue
                
                # HTML'i parse ediyoruz
                soup = BeautifulSoup(response.text, "lxml")
                
                # Tablodaki tüm satırları buluyoruz (odd ve even sınıfları)
                rows = soup.select("table.items tbody tr")
                
                for row in rows:
                    cols = row.find_all("td")
                    if len(cols) < 8:
                        continue
                    
                    # 2. sütundaki (index 1) a etiketinden takım adını al
                    team_name = cols[1].find("a").text.strip()
                    
                    # Verileri HTML'deki sıralarına göre çek
                    player_count = int(cols[2].text.strip())
                    avg_age = float(cols[3].text.strip())
                    wc_appearances = int(cols[4].text.strip())
                    
                    total_value_raw = cols[6].text.strip()
                    total_value_million = parse_market_value(total_value_raw)
                    
                    # Veriyi sözlüğe ekle
                    team_data[team_name] = {
                        "team_name": team_name,
                        "player_count": player_count,
                        "average_age": avg_age,
                        "world_cup_appearances": wc_appearances,
                        "squad_value_million_eur": total_value_million,
                        "raw_value_text": total_value_raw
                    }
                    
                logger.success(f"Sayfa {page_index} başarıyla işlendi.")
                # Transfermarkt sunucularını yormamak için kısa bir bekleme
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"Sayfa {page_index} işlenirken hata oluştu: {e}")

    # JSON dosyasına kaydet
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(team_data, f, ensure_ascii=False, indent=4)
        
    logger.info(f"Toplam {len(team_data)} takımın verisi {OUTPUT_FILE} dosyasına kaydedildi!")

if __name__ == "__main__":
    asyncio.run(scrape_market_values())