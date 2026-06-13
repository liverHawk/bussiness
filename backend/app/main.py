from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.exception_handlers import http_exception_handler, validation_exception_handler

from app.routers import auth, health, coupons, spots, users, routes, reviews

app = FastAPI(title="58 in OMU API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=settings.allow_credentials and settings.origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(coupons.router)
app.include_router(spots.router)
app.include_router(users.router)
app.include_router(routes.router)
app.include_router(reviews.router)
