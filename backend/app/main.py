"""
Image Editor Backend - MVP
No database, in-memory storage only
"""
import uuid
import io
import base64
from datetime import datetime, timedelta
from typing import Dict, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np

app = FastAPI(title="Image Editor API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage: {session_id: {"image": Image, "created_at": datetime}}
image_store: Dict = {}

# Session quota tracking: {session_id: {"count": int, "created_at": datetime}}
quota_store: Dict = {}

FREE_QUOTA = 2
PRICE_PER_IMAGE = 0.8


def cleanup_expired_sessions():
    """Remove expired sessions (older than 1 hour)"""
    now = datetime.now()
    expired = [
        sid for sid, data in image_store.items()
        if now - data["created_at"] > timedelta(hours=1)
    ]
    for sid in expired:
        image_store.pop(sid, None)
        quota_store.pop(sid, None)


def get_quota(session_id: str) -> int:
    """Get remaining free quota for session"""
    if session_id not in quota_store:
        quota_store[session_id] = {"count": 0, "created_at": datetime.now()}
    return max(0, FREE_QUOTA - quota_store[session_id]["count"])


def use_quota(session_id: str) -> bool:
    """Use one quota. Returns True if allowed, False if should pay"""
    if session_id not in quota_store:
        quota_store[session_id] = {"count": 0, "created_at": datetime.now()}
    
    if quota_store[session_id]["count"] < FREE_QUOTA:
        quota_store[session_id]["count"] += 1
        return True
    return False


@app.get("/")
def root():
    return {"message": "Image Editor API v1.0", "status": "running"}


@app.post("/upload")
async def upload_image(session_id: str = Form(...), file: UploadFile = File(...)):
    """Upload and process image"""
    cleanup_expired_sessions()
    
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Unsupported image format")
    
    # Read image
    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:  # 20MB limit
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")
    
    try:
        image = Image.open(io.BytesIO(contents))
        if image.mode == "RGBA":
            image = image.convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    # Generate unique ID for this upload
    image_id = str(uuid.uuid4())
    
    # Store in memory
    image_store[image_id] = {
        "image": image,
        "session_id": session_id,
        "created_at": datetime.now(),
        "filename": file.filename
    }
    
    # Check quota
    remaining_free = get_quota(session_id)
    is_free = use_quota(session_id)
    
    return {
        "image_id": image_id,
        "quota_remaining": remaining_free,
        "is_free": is_free,
        "price": 0 if is_free else PRICE_PER_IMAGE
    }


@app.post("/adjust")
def adjust_image(
    image_id: str = Form(...),
    brightness: float = Form(1.0),
    contrast: float = Form(1.0),
    saturation: float = Form(1.0),
    temperature: float = Form(0)
):
    """Adjust image parameters"""
    if image_id not in image_store:
        raise HTTPException(status_code=404, detail="Image not found")
    
    img = image_store[image_id]["image"].copy()
    
    # Brightness
    if brightness != 1.0:
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(brightness)
    
    # Contrast
    if contrast != 1.0:
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(contrast)
    
    # Saturation
    if saturation != 1.0:
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(saturation)
    
    # Temperature (warm/cool)
    if temperature != 0:
        img_array = np.array(img).astype(np.float32)
        if temperature > 0:  # Warm
            img_array[:, :, 0] = np.clip(img_array[:, :, 0] + temperature * 10, 0, 255)
            img_array[:, :, 2] = np.clip(img_array[:, :, 2] - temperature * 5, 0, 255)
        else:  # Cool
            img_array[:, :, 0] = np.clip(img_array[:, :, 0] + temperature * 5, 0, 255)
            img_array[:, :, 2] = np.clip(img_array[:, :, 2] - abs(temperature) * 10, 0, 255)
        img = Image.fromarray(np.clip(img_array, 0, 255).astype(np.uint8))
    
    # Update stored image
    image_store[image_id]["image"] = img
    
    # Return preview
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    preview = base64.b64encode(buffer.getvalue()).decode()
    
    return {"preview": f"data:image/jpeg;base64,{preview}"}


@app.post("/filter/{filter_name}")
def apply_filter(image_id: str, filter_name: str):
    """Apply preset filters"""
    if image_id not in image_store:
        raise HTTPException(status_code=404, detail="Image not found")
    
    filters = {
        "vintage": lambda img: img.filter(ImageFilter.SMOOTH_MORE).point(lambda x: int(256 * (x/255) ** 1.2)),
        "cool": lambda img: ImageEnhance.Color(img).enhance(1.1),
        "warm": lambda img: ImageEnhance.Color(img).enhance(0.9),
        "sharpen": lambda img: img.filter(ImageFilter.SHARPEN),
        "blur": lambda img: img.filter(ImageFilter.GaussianBlur(radius=2)),
        "bright": lambda img: ImageEnhance.Brightness(img).enhance(1.3),
        "dramatic": lambda img: ImageEnhance.Contrast(img).enhance(1.5),
    }
    
    if filter_name not in filters:
        raise HTTPException(status_code=400, detail="Invalid filter")
    
    img = image_store[image_id]["image"].copy()
    img = filters[filter_name](img)
    
    image_store[image_id]["image"] = img
    
    # Return preview
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    preview = base64.b64encode(buffer.getvalue()).decode()
    
    return {"preview": f"data:image/jpeg;base64,{preview}"}


@app.post("/ai-enhance")
def ai_enhance(image_id: str):
    """AI enhance (placeholder - would connect to external API)"""
    if image_id not in image_store:
        raise HTTPException(status_code=404, detail="Image not found")
    
    img = image_store[image_id]["image"].copy()
    
    # Simple auto-enhance (placeholder for real AI)
    # In production, this would call external API
    img = ImageEnhance.Sharpness(img).enhance(1.2)
    img = ImageEnhance.Contrast(img).enhance(1.1)
    
    image_store[image_id]["image"] = img
    
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    preview = base64.b64encode(buffer.getvalue()).decode()
    
    return {"preview": f"data:image/jpeg;base64,{preview}"}


@app.get("/download/{image_id}")
def download_image(image_id: str, format: str = "jpeg"):
    """Download processed image"""
    if image_id not in image_store:
        raise HTTPException(status_code=404, detail="Image not found")
    
    img = image_store[image_id]["image"]
    
    buffer = io.BytesIO()
    img_format = format.upper() if format.upper() in ["JPEG", "PNG"] else "JPEG"
    img.save(buffer, format=img_format, quality=95)
    buffer.seek(0)
    
    import starlette.responses
    return starlette.responses.Response(
        buffer.getvalue(),
        media_type=f"image/{format.lower()}",
        headers={"Content-Disposition": f"attachment; filename=edited_image.{format.lower()}"}
    )


@app.delete("/{image_id}")
def delete_image(image_id: str):
    """Delete image from memory"""
    if image_id in image_store:
        del image_store[image_id]
        return {"message": "Image deleted"}
    raise HTTPException(status_code=404, detail="Image not found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)