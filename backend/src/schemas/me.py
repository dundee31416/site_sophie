from pydantic import BaseModel, Field


class UpdateProfileRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=128)
    age: int | None = Field(default=None, ge=0, le=150)
    color: str | None = Field(default=None, max_length=16)
    bio: str | None = Field(default=None, max_length=2000)
    favo: str | None = Field(default=None, max_length=2000)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=4, max_length=128)
