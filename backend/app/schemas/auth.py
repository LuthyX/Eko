# app/schemas/auth.py
from pydantic import BaseModel, Field
from typing import List

class TraderRegistration(BaseModel):
    name: str = Field(..., example="Amaka")
    phone_number: str = Field(..., example="+2348000000000")
    business_category: str = Field(..., example="fabric")
    
class SeekerRegistration(BaseModel):
    name: str = Field(..., example="Emeka")
    phone_number: str = Field(..., example="+2348000000001")
    location: str = Field(..., example="Surulere")
    primary_language: str = Field(..., example="Yoruba")
    skills: List[str] = Field(..., example=["Loading", "Inventory"])
    daily_pay_expectation: float = Field(..., example=4000.0)

class RegistrationResponse(BaseModel):
    user_id: str
    message: str