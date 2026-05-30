from fastapi import APIRouter, HTTPException
from app.services.get_rounds import fetch_world_cup_rounds
from loguru import logger

router = APIRouter()


@router.get("", status_code=200)
async def get_rounds():
    """
    Resmi FIFA verilerini kullanarak 2026 Dünya Kupası fikstür, maç ve tur 
    bilgilerini döner. Veriler yerel önbellekten hızlıca okunur.
    """
    try:
        data = await fetch_world_cup_rounds()
        if not data:
            raise HTTPException(
                status_code=500, detail="Milli takımlar fikstür verisi yüklenemedi."
            )
        return data
    except Exception as e:
        logger.error(f"Fikstür API çağrısında hata oluştu: {e}")
        raise HTTPException(
            status_code=500, detail=f"Sunucu hatası: {str(e)}"
        )
