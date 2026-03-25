from pydantic import BaseModel, EmailStr
from typing import Optional


# Create 
class UserCreate(BaseModel):
    username: str
    email: str
    password: str


#  Update 
class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None


# Change password 

class PasswordChange(BaseModel):
    old_password: str
    new_password: str


# Response 

class UserOut(BaseModel):
    user_id: str
    username: str
    email: str
    role: str

    model_config = {"from_attributes": True}