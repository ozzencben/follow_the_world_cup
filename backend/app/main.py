from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import anyio
from app.api.exceptions import register_exception_handlers
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.lifespan import lifespan

# Instantiate FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
    debug=(settings.ENVIRONMENT == "development"),
)

# Apply dynamic CORS configurations with regex match support (such as Vercel preview environments)
if settings.BACKEND_CORS_ORIGINS or settings.BACKEND_CORS_ORIGIN_REGEX:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS or [],
        allow_origin_regex=settings.BACKEND_CORS_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register custom exception handlers globally
register_exception_handlers(app)

# Include structural versioned endpoints
app.include_router(api_router, prefix=settings.API_V1_STR)

# ── VERIFIED CREATORS ONE-SHOT LOCK ENDPOINT ──────────────────────
class PublishRequest(BaseModel):
    token: str
    bracketString: str
    comment: str = None

# Define paths to json databases
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
TOKENS_FILE = os.path.join(DATA_DIR, "tokens.json")
CREATORS_FILE = os.path.join(DATA_DIR, "creators.json")

_cached_creators = None
_creators_mtime = 0.0


def _load_creators_sync() -> list:
    with open(CREATORS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_tokens_sync() -> dict:
    with open(TOKENS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_creators_and_tokens_sync(tokens_data: dict, creators_data: list) -> None:
    with open(TOKENS_FILE, "w", encoding="utf-8") as f:
        json.dump(tokens_data, f, indent=2, ensure_ascii=False)
    with open(CREATORS_FILE, "w", encoding="utf-8") as f:
        json.dump(creators_data, f, indent=2, ensure_ascii=False)


@app.get("/api/creators")
async def get_creators():
    """
    Public endpoint — returns the list of verified creators.
    Only exposes id, name, bracketString. Token data is NEVER returned.
    Önbellekleme mantığıyla bellekten hızlı yanıt verir ve event-loop'u bloke etmez.
    """
    global _cached_creators, _creators_mtime
    
    exists = os.path.exists(CREATORS_FILE)
    mtime = os.path.getmtime(CREATORS_FILE) if exists else 0.0
    
    if _cached_creators is not None and mtime == _creators_mtime:
        creators_data = _cached_creators
    else:
        if not exists:
            return []
        try:
            creators_data = await anyio.to_thread.run_sync(_load_creators_sync)
            _cached_creators = creators_data
            _creators_mtime = mtime
        except Exception as e:
            logger.error(f"Creators verisi yüklenirken hata oluştu: {e}")
            return []
        
    # Strip to public fields only
    return [
        {
            "id": c.get("id"),
            "name": c.get("name"),
            "bracketString": c.get("bracketString"),
            "roleTr": c.get("roleTr"),
            "roleEn": c.get("roleEn"),
            "commentTr": c.get("commentTr"),
            "commentEn": c.get("commentEn"),
        }
        for c in creators_data
    ]


@app.post("/api/creators/publish")
async def publish_creator_bracket(payload: PublishRequest):
    global _cached_creators, _creators_mtime
    try:
        # Load tokens
        if not os.path.exists(TOKENS_FILE):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Tokens database is missing."
            )
        
        tokens_data = await anyio.to_thread.run_sync(_load_tokens_sync)
            
        # Adım 1: Gelen token'ı tokens.json içinde ara. Eğer yoksa veya used: true ise 403 Forbidden döndür.
        token_info = tokens_data.get(payload.token)
        if not token_info or token_info.get("used") is True:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Geçersiz veya daha önce kullanılmış token."
            )
            
        creator_id = token_info.get("creator_id")
        
        # Load creators
        if not os.path.exists(CREATORS_FILE):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Creators database is missing."
            )
            
        creators_data = await anyio.to_thread.run_sync(_load_creators_sync)
            
        # Adım 2: Token geçerliyse, o token'a ait creator_id'yi al, creators.json dosyasında o yorumcuyu bul ve bracketString değerini güncelle.
        creator_found = False
        for creator in creators_data:
            if creator.get("id") == creator_id:
                creator["bracketString"] = payload.bracketString
                if payload.comment:
                    creator["commentTr"] = payload.comment
                    creator["commentEn"] = payload.comment
                creator_found = True
                break
                
        if not creator_found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Yorumcu profili bulunamadı."
            )
            
        # Adım 3: İşlemi güvenceye almak için (One-Shot Lock), token'ın used değerini anında true yap.
        token_info["used"] = True
        
        # Adım 4: Dosyaları diske geri kaydet (JSON dump)
        await anyio.to_thread.run_sync(_save_creators_and_tokens_sync, tokens_data, creators_data)
        
        # Force cache reload on next GET
        _cached_creators = creators_data
        _creators_mtime = os.path.getmtime(CREATORS_FILE) if os.path.exists(CREATORS_FILE) else 0.0
            
        return {
            "status": "success",
            "message": "Tahmin başarıyla kilitlendi."
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sunucu hatası: {str(e)}"
        )
