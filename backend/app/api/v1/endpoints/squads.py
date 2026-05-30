from fastapi import APIRouter, HTTPException
from app.services.get_squads import fetch_world_cup_squads
from loguru import logger

router = APIRouter()


@router.get("", status_code=200)
async def get_squads():
    """
    Resmi FIFA verilerini kullanarak 2026 Dünya Kupası takımlarının torba, 
    grup ve güncel puan durumu bilgilerini döner. Veriler yerel önbellekten okunur.
    """
    try:
        data = await fetch_world_cup_squads()
        if not data:
            raise HTTPException(
                status_code=500, detail="Milli takımların puan durumu verileri yüklenemedi."
            )
        return data
    except Exception as e:
        logger.error(f"Squads API çağrısında hata oluştu: {e}")
        raise HTTPException(
            status_code=500, detail=f"Sunucu hatası: {str(e)}"
        )
