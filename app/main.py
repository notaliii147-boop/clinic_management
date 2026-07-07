from fastapi import FastAPI

from .exception_handler import register_exception_handlers
from .routes import router


app = FastAPI(
    title="Clinic Appointment System API",
    description="Complete patient and doctor management system",
    version="2.0.0",
)

register_exception_handlers(app)

app.include_router(router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)