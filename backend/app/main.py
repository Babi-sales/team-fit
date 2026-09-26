from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, dashboard, foods, goals, meal_logs, measurements, people, training_plans, weight

settings = get_settings()

app = FastAPI(title="Team Fit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(people.router)
app.include_router(goals.router)
app.include_router(weight.router)
app.include_router(measurements.router)
app.include_router(foods.router)
app.include_router(meal_logs.router)
app.include_router(training_plans.router)
app.include_router(dashboard.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
