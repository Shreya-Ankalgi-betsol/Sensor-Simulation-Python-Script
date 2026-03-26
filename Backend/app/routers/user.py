from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.user import PasswordChange, UserCreate, UserOut, UserUpdate
from app.services.user_service import user_service

router = APIRouter(
    prefix="/api/v1/users",
    tags=["Users"],
)


@router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user",
    description="Creates a new user with admin role.",
)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    return await user_service.create_user(data, db)


@router.get(
    "/{user_id}",
    response_model=UserOut,
    summary="Get a user",
    description="Returns a single user by their ID.",
)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    return await user_service.get_user(user_id, db)


@router.put(
    "/{user_id}",
    response_model=UserOut,
    summary="Update a user",
    description="Updates username or email of an existing user.",
)
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    return await user_service.update_user(user_id, data, db)


@router.put(
    "/{user_id}/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change password",
    description=(
        "Changes the user password. "
        "Requires the current password for verification. "
        "Auth and bcrypt hashing will be added in a future version."
    ),
)
async def change_password(
    user_id: str,
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await user_service.change_password(
        user_id, data.old_password, data.new_password, db
    )