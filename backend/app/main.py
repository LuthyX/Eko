# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import auth

# Create database tables automatically (Great for Day 1 of a hackathon!)
# Note: In production, you'd use Alembic migrations instead of this line.
Base.metadata.create_all(bind=engine)

# Initialize the FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent economic platform for informal traders and job seekers.",
    version=settings.VERSION,
)

# Configure CORS (Cross-Origin Resource Sharing)
# This allows your React frontend to make requests to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For the hackathon, "*" is fine. Restrict this in real production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """Verify the backend is up and running."""
    return {
        "status": "online", 
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

# Include the Routers
# This maps the logic from app/api/v1/auth.py to the /api/v1/auth URL path
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])

# --- Future Phase Routers will be added here ---
# from app.api.v1 import score, webhooks, credit, jobs
# app.include_router(score.router, prefix="/api/v1/score", tags=["EkoScore"])
# app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Squad Webhooks"])

if __name__ == "__main__":
    import uvicorn
    # Run the server on port 8000
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)