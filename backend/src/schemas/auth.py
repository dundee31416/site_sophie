from datetime import datetime

from pydantic import BaseModel, ConfigDict

from src.models import UserRole


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: UserRole
    display_name: str | None
    age: int | None
    color: str | None
    bio: str | None
    favo: str | None
    avatar_path: str | None
    created_at: datetime
