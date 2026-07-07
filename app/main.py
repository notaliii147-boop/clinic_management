from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .exception_handler import register_exception_handlers
from .routes import router

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(
    title="Clinic Appointment System API",
    description="Complete patient and doctor management system",
    version="2.0.0",
)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
async def root():
    return FileResponse(STATIC_DIR / "index.html")


app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)