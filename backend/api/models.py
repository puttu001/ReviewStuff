from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class GoogleAuthRequest(BaseModel):
    id_token: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SaveItemRequest(BaseModel):
    url: str | None = None
    text: str | None = None
    title: str | None = None
    topic: str | None = None


class SavedItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    title: str | None
    topic: str | None
    created_at: datetime
    last_reviewed: datetime | None
    next_review_date: datetime


class ReviewActionRequest(BaseModel):
    action: Literal["reviewed", "skipped"]
