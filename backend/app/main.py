from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
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

# Apply dynamic CORS configurations
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
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

# Define paths to json databases
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
TOKENS_FILE = os.path.join(DATA_DIR, "tokens.json")
CREATORS_FILE = os.path.join(DATA_DIR, "creators.json")

@app.get("/api/creators")
async def get_creators():
    """
    Public endpoint — returns the list of verified creators.
    Only exposes id, name, bracketString. Token data is NEVER returned.
    """
    if not os.path.exists(CREATORS_FILE):
        return []
    with open(CREATORS_FILE, "r", encoding="utf-8") as f:
        creators_data = json.load(f)
    # Strip to public fields only
    return [
        {
            "id": c.get("id"),
            "name": c.get("name"),
            "bracketString": c.get("bracketString"),
        }
        for c in creators_data
    ]


@app.post("/api/creators/publish")
async def publish_creator_bracket(payload: PublishRequest):
    try:
        # Load tokens
        if not os.path.exists(TOKENS_FILE):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Tokens database is missing."
            )
        
        with open(TOKENS_FILE, "r", encoding="utf-8") as f:
            tokens_data = json.load(f)
            
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
            
        with open(CREATORS_FILE, "r", encoding="utf-8") as f:
            creators_data = json.load(f)
            
        # Adım 2: Token geçerliyse, o token'a ait creator_id'yi al, creators.json dosyasında o yorumcuyu bul ve bracketString değerini güncelle.
        creator_found = False
        for creator in creators_data:
            if creator.get("id") == creator_id:
                creator["bracketString"] = payload.bracketString
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
        with open(TOKENS_FILE, "w", encoding="utf-8") as f:
            json.dump(tokens_data, f, indent=2, ensure_ascii=False)
            
        with open(CREATORS_FILE, "w", encoding="utf-8") as f:
            json.dump(creators_data, f, indent=2, ensure_ascii=False)
            
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
