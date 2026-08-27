from typing import Optional
from pydantic import BaseModel


class PatientData(BaseModel):
    age: Optional[int] = None
    heart_rate: Optional[int] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    respiratory_rate: Optional[int] = None
    pain_score: Optional[int] = None
    consciousness: Optional[str] = None
    chief_complaint: Optional[str] = None