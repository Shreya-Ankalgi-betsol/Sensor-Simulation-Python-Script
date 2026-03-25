from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserUpdate


class UserService:

    #  Create user 

    async def create_user(
        self, data: UserCreate, db: AsyncSession
    ) -> UserOut:
        user = User(
            username=data.username,
            email=data.email,
            password_hash=data.password,
            role="admin",
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return UserOut.model_validate(user)

    #  Get user 

    async def get_user(
        self, user_id: str, db: AsyncSession
    ) -> UserOut:
        user = await db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User '{user_id}' not found.",
            )
        return UserOut.model_validate(user)

    #  Update user 

    async def update_user(
        self, user_id: str, data: UserUpdate, db: AsyncSession
    ) -> UserOut:
        user = await db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User '{user_id}' not found.",
            )
        if data.username is not None:
            user.username = data.username
        if data.email is not None:
            user.email = data.email

        await db.flush()
        await db.refresh(user)
        return UserOut.model_validate(user)

    #  Change password 

    async def change_password(
        self, user_id: str, old_password: str, new_password: str, db: AsyncSession
    ) -> dict:
        user = await db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User '{user_id}' not found.",
            )
        if user.password_hash != old_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Old password is incorrect.",
            )
        user.password_hash = new_password
        await db.flush()
        return {"message": "Password changed successfully."}


user_service = UserService()