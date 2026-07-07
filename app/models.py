import json, os, re, uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator

PATIENTS_FILE = "patients.json"
DOCTORS_FILE = "doctors.json"


class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"
    NOT_SPECIFIED = "Not Specified"


class BloodGroup(str, Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"


class DayOfWeek(str, Enum):
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"    


class BaseModelMixin(BaseModel):
    @field_validator("dob", check_fields=False)
    @classmethod
    def validate_dob_format(cls, v):
        if v is None:
            return v
        try:
            datetime.strptime(v, "%Y-%m-%d")
            return v
        except ValueError:
            raise ValueError("Date must be in YYYY-MM-DD format (e.g., 1990-06-15)")

    @field_validator("email", check_fields=False)
    @classmethod
    def validate_email(cls, v):
        if v is None:
            return v
        # Basic email validation
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Invalid email format. Example: name@domain.com")
        return v

    @field_validator("phone", check_fields=False)
    @classmethod
    def validate_phone(cls, v):
        if v is None:
            return v
        cleaned = v.replace(" ", "").replace("-", "")
        
        if not cleaned.startswith("+92"):
            raise ValueError("Phone number must start with +92 (Pakistani format)")
        
        number_part = cleaned[3:]
        if not number_part.isdigit():
            raise ValueError("Phone number must contain only digits after +92")
        
        if len(number_part) != 10:
            raise ValueError("Phone number must have exactly 10 digits after +92")
            
        return v


class PatientCreate(BaseModelMixin):
    name: str = Field(..., min_length=1, max_length=50, example="Muhammad Ali")
    gender: Gender = Field(..., example="Male")
    dob: str = Field(..., example="1990-06-15", description="Format: YYYY-MM-DD")
    blood_group: BloodGroup = Field(..., example="A+")
    phone: str = Field(..., example="+92 300 1234567")
    email: str = Field(..., example="ali@email.com")
    address: str = Field(..., min_length=5, max_length=200, example="123 Main Street, Karachi")


class PatientUpdate(BaseModelMixin):
    name: Optional[str] = Field(None, min_length=1, max_length=50, example="nani")
    gender: Optional[Gender] = Field(None, example="Female")
    dob: Optional[str] = Field(None, example="1985-12-20", description="Format: YYYY-MM-DD")
    blood_group: Optional[BloodGroup] = Field(None, example="O-")
    phone: Optional[str] = Field(None, example="+92 300 7654321")
    email: Optional[str] = Field(None, example="nani@email.com")
    address: Optional[str] = Field(None, min_length=5, max_length=200, example="456 Park Avenue, Lahore")


class PatientResponse(BaseModel):
    id: str
    name: str
    gender: str
    dob: str
    blood_group: str
    phone: str
    email: str
    address: str
    created_at: str
    updated_at: str


class Availability(BaseModel):
    day: DayOfWeek
    start_time: str = Field(..., pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", example="09:00")
    end_time: str = Field(..., pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", example="17:00")
    
    @field_validator("end_time")
    @classmethod
    def validate_end_time_after_start(cls, v, info):
        if "start_time" in info.data:
            start = info.data["start_time"]
            if start and v:
                if start >= v:
                    raise ValueError("End time must be after start time")
        return v


class DoctorCreate(BaseModelMixin):
    name: str = Field(..., min_length=1, max_length=50, example="Dr. Sarah Ahmed")
    specialization: str = Field(..., min_length=3, max_length=100, example="Cardiologist")
    phone: str = Field(..., example="+92 300 9876543")
    email: str = Field(..., example="sarah@hospital.com")
    experience_years: int = Field(..., ge=0, le=60, example=10)
    availability: list[Availability] = Field(..., min_length=1)


class DoctorUpdate(BaseModelMixin):
    name: Optional[str] = Field(None, min_length=1, max_length=50, example="Dr. Ahmed Khan")
    specialization: Optional[str] = Field(None, min_length=3, max_length=100, example="Neurologist")
    phone: Optional[str] = Field(None, example="+92 300 5555555")
    email: Optional[str] = Field(None, example="ahmed@hospital.com")
    experience_years: Optional[int] = Field(None, ge=0, le=60, example=15)
    availability: Optional[list[Availability]] = Field(None)


class DoctorResponse(BaseModel):
    id: str
    name: str
    specialization: str
    phone: str
    email: str
    experience_years: int
    availability: list[Availability]
    created_at: str
    updated_at: str


def load_patients():
    if not os.path.exists(PATIENTS_FILE):
        return []
    with open(PATIENTS_FILE, "r") as f:
        return json.load(f)


def save_patients(patients):
    with open(PATIENTS_FILE, "w") as f:
        json.dump(patients, f, indent=2)


def load_doctors():
    if not os.path.exists(DOCTORS_FILE):
        return []
    with open(DOCTORS_FILE, "r") as f:
        return json.load(f)


def save_doctors(doctors):
    with open(DOCTORS_FILE, "w") as f:
        json.dump(doctors, f, indent=2)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def generate_uuid():
      return str(uuid.uuid4())