from fastapi import FastAPI, Request
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


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

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
