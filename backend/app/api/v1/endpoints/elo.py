from fastapi import APIRouter, HTTPException
from app.services.get_elo import get_elo_ratings, get_team_form, get_elo_fixtures
from loguru import logger

router = APIRouter()

@router.get("/ratings", status_code=200)
async def get_ratings():
    """
    Tüm 48 Dünya Kupası takımının detaylı Elo güç sıralamalarını,
    kümülatif maç/gol istatistiklerini ve Transfermarkt kadro verilerini döner.
    """
    try:
        data = await get_elo_ratings()
        if not data:
            raise HTTPException(
                status_code=500, detail="Elo sıralama verileri yüklenemedi."
            )
        return data
    except Exception as e:
        logger.error(f"Elo Ratings API çağrısında hata oluştu: {e}")
        raise HTTPException(
            status_code=500, detail=f"Sunucu hatası: {str(e)}"
        )

@router.get("/team/{code}/form", status_code=200)
async def get_form(code: str):
    """
    Belirtilen 2 harfli ülke kodu için son maçların form detaylarını 
    ve ELO rating gelişim çizgisini döner.
    """
    try:
        data = await get_team_form(code.upper())
        return data
    except Exception as e:
        logger.error(f"Elo Form API çağrısında hata oluştu: {e}")
        raise HTTPException(
            status_code=500, detail=f"Sunucu hatası: {str(e)}"
        )

@router.get("/fixtures", status_code=200)
async def get_fixtures():
    """
    Tüm Dünya Kupası grup maçlarının Elo tahmin olasılıklarını döner.
    """
    try:
        data = await get_elo_fixtures()
        return data
    except Exception as e:
        logger.error(f"Elo Fixtures API çağrısında hata oluştu: {e}")
        raise HTTPException(
            status_code=500, detail=f"Sunucu hatası: {str(e)}"
        )

