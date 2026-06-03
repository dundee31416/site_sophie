from pydantic import BaseModel, Field


class CreateAuthorRequest(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    password: str = Field(min_length=4, max_length=128)
    display_name: str | None = Field(default=None, max_length=128)


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=4, max_length=128)
