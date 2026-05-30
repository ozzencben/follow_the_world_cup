from pathlib import Path
import httpx
import copy
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse
from app.services.get_teams import fetch_world_cup_participants
from loguru import logger

router = APIRouter()

FLAGS_CACHE_DIR = Path("app/data/flags")


@router.get("", status_code=200)
async def get_teams(request: Request):
    """
    Resmi FIFA verilerini kullanarak 2026 Dünya Kupası takımlarını, gruplarını 
    ve kurumsal renk şemalarını döner. Veriler yerel önbellekten hızlıca okunur.
    Flag URL'leri yerel proxy sunucumuz üzerinden geçecek şekilde dinamik olarak güncellenir.
    """
    try:
        data = await fetch_world_cup_participants()
        if not data:
            raise HTTPException(
                status_code=500, detail="Milli takımlar verisi yüklenemedi."
            )
        
        # Deepcopy to prevent mutating shared in-memory data
        data_copy = copy.deepcopy(data)
        
        # Dynamic flag rewrite to point to our proxy
        base_url = str(request.base_url)
        if "teams" in data_copy:
            for team in data_copy["teams"]:
                original_flag = team.get("teamFlag", "")
                if original_flag and "api.fifa.com" in original_flag:
                    # Replace FIFA API prefix with local proxy path
                    # Original: https://api.fifa.com/api/v3/picture/flags-{format}-{size}/{code}
                    # Local: http://localhost:8005/api/v1/teams/flags/flags-{format}-{size}/{code}
                    team["teamFlag"] = original_flag.replace(
                        "https://api.fifa.com/api/v3/picture/",
                        f"{base_url}api/v1/teams/flags/"
                    )
        
        return data_copy
    except Exception as e:
        logger.error(f"Takımlar API çağrısında hata oluştu: {e}")
        raise HTTPException(
            status_code=500, detail=f"Sunucu hatası: {str(e)}"
        )


@router.get("/flags/flags-{format}-{size}/{code}", status_code=200)
async def get_flag_proxy(format: str, size: str, code: str):
    """
    Takım bayraklarını önbellekleyen proxy endpoint.
    FIFA API sunucularından resmi bayrak görsellerini çeker, yerel diske
    önbellekler ve kesintisiz 0ms gecikmeyle sunar.
    """
    try:
        # Create cache directory if not exists
        FLAGS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        
        # Normalize inputs to prevent directory traversal
        safe_code = "".join(c for c in code if c.isalnum() or c in "-_")
        safe_format = "".join(c for c in format if c.isalnum())
        safe_size = "".join(c for c in size if c.isalnum())
        
        cache_file = FLAGS_CACHE_DIR / f"{safe_code}_{safe_format}_{safe_size}.png"
        
        # 1. Return from cache if exists
        if cache_file.exists():
            return FileResponse(cache_file, media_type="image/png")
            
        # 2. Fetch from FIFA API if not cached
        fifa_url = f"https://api.fifa.com/api/v3/picture/flags-{format}-{size}/{code}"
        logger.info(f"Flag not cached. Proxying from FIFA: {fifa_url}")
        
        headers = {
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(fifa_url, headers=headers)
            
            if response.status_code == 200:
                # Save to cache
                with open(cache_file, "wb") as f:
                    f.write(response.content)
                return FileResponse(cache_file, media_type="image/png")
            else:
                logger.warning(f"FIFA Flag API returned status {response.status_code} for {code}. Redirecting to original.")
                
    except Exception as e:
        logger.error(f"Error in flag proxy for {code}: {e}. Redirecting.")
        
    # 3. Fallback: Redirect to FIFA so it still renders
    fallback_url = f"https://api.fifa.com/api/v3/picture/flags-{format}-{size}/{code}"
    return RedirectResponse(url=fallback_url)

