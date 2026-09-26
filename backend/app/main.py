from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    chat,
    dashboard,
    dev_auth,
    exercise_logs,
    families,
    goals,
    meal_logs,
    meal_plans,
    measurements,
    notes,
    profiles,
    training_plans,
    users,
    weekly_menus,
    weight,
)

settings = get_settings()

app = FastAPI(title="Team Fit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(profiles.router)
app.include_router(goals.router)
app.include_router(weight.router)
app.include_router(measurements.router)
app.include_router(meal_plans.router)
app.include_router(training_plans.router)
app.include_router(weekly_menus.router)
app.include_router(meal_logs.router)
app.include_router(exercise_logs.router)
app.include_router(chat.router)
app.include_router(dashboard.router)
app.include_router(families.router)
app.include_router(notes.router)

if settings.local_auth_enabled:
    app.include_router(dev_auth.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
