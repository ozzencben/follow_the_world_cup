from fastapi import APIRouter, HTTPException
from app.services.get_winners import fetch_world_cup_winners
from loguru import logger

router = APIRouter()


@router.get("", status_code=200)
def get_winners():
    """
    Tarihsel Dünya Kupası şampiyonlarının, kazandıkları yılların ve 
    teknik direktörlerinin yer aldığı listeyi döner.
    """
    try:
        data = fetch_world_cup_winners()
        if not data or not data.get("winners"):
            raise HTTPException(
                status_code=500, detail="Tarihsel şampiyonlar verisi yüklenemedi."
            )
        return data
    except Exception as e:
        logger.error(f"Winners API çağrısında hata oluştu: {e}")
        raise HTTPException(
            status_code=500, detail=f"Sunucu hatası: {str(e)}"
        )
