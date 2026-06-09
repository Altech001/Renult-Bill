from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class StaffCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone_number: Optional[str] = Field(default=None, max_length=30)
    role: Optional[str] = Field(default="staff", max_length=50)
    permissions: list[str] = Field(default_factory=lambda: ["dashboard", "routers", "sales", "vouchers"])
    share_percentage: float = Field(default=0, ge=0, le=100)


class StaffUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    email: Optional[EmailStr] = Field(default=None)
    phone_number: Optional[str] = Field(default=None, max_length=30)
    role: Optional[str] = Field(default=None, max_length=50)
    permissions: Optional[list[str]] = None
    share_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = Field(default=None)


class StaffResponse(BaseModel):
    id: UUID
    branch_id: UUID
    full_name: str
    email: EmailStr
    phone_number: Optional[str]
    role: str
    permissions: list[str]
    share_percentage: float
    is_active: bool
    user_id: Optional[UUID]
    avatar_url: str
    created_at: datetime
    updated_at: datetime


class RevenueShareAgent(BaseModel):
    staff_id: UUID
    full_name: str
    percentage: float
    amount: int


class RevenueShareResponse(BaseModel):
    branch_id: UUID
    gross_sales: int
    allocated_percentage: float
    owner_percentage: float
    owner_amount: int
    current_user_percentage: float
    current_user_amount: int
    agents: list[RevenueShareAgent]
