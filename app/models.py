import re
from datetime import date, datetime, time
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_serializer, field_validator


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
    # Shared validators used by multiple request/response models.
    # This centralizes rules for fields like DOB, email, and phone formatting.
    @field_validator("dob", mode="before", check_fields=False)
    @classmethod
    def validate_dob_format(cls, value):
        if value is None:
            return value
        try:
            datetime.strptime(value, "%Y-%m-%d")
            return value
        except ValueError:
            raise ValueError("Date must be in YYYY-MM-DD format (e.g., 1990-06-15)")

    @field_validator("email", check_fields=False)
    @classmethod
    def validate_email(cls, value):
        if value is None:
            return value
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", value):
            raise ValueError("Invalid email format. Example: name@domain.com")
        return value

    @field_validator("phone", check_fields=False)
    @classmethod
    def validate_phone(cls, value):
        if value is None:
            return value
        cleaned = value.replace(" ", "").replace("-", "")
        if not cleaned.startswith("+92"):
            raise ValueError("Phone number must start with +92 (Pakistani format)")
        number_part = cleaned[3:]
        if not number_part.isdigit():
            raise ValueError("Phone number must contain only digits after +92")
        if len(number_part) != 10:
            raise ValueError("Phone number must have exactly 10 digits after +92")
        return value


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


class Availability(BaseModel):
    day: DayOfWeek
    start_time: str = Field(..., pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", example="09:00")
    end_time: str = Field(..., pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", example="17:00")

    # Allow creating this model from ORM attributes or dictionaries interchangeably.
    model_config = {"from_attributes": True}

    @field_validator("start_time", mode="before")
    @classmethod
    def parse_start_time(cls, value):
        # Convert SQLAlchemy time objects to string format during validation.
        if isinstance(value, time):
            return value.strftime("%H:%M")
        return value

    @field_validator("end_time", mode="before")
    @classmethod
    def parse_end_time(cls, value):
        if isinstance(value, time):
            return value.strftime("%H:%M")
        return value

    @field_validator("end_time")
    @classmethod
    def validate_end_time_after_start(cls, value, info):
        if "start_time" in info.data:
            start_time_str = info.data["start_time"]
            if start_time_str and value:
                start_time_obj = datetime.strptime(start_time_str, "%H:%M").time()
                end_time_obj = datetime.strptime(value, "%H:%M").time()
                if start_time_obj >= end_time_obj:
                    raise ValueError("End time must be after start time")
        return value


class DoctorCreate(BaseModelMixin):
    name: str = Field(..., min_length=1, max_length=50, example="Dr. Sarah Ahmed")
    specialization: str = Field(..., min_length=3, max_length=100, example="Cardiologist")
    phone: str = Field(..., example="+92 300 9876543")
    email: str = Field(..., example="sarah@hospital.com")
    experience_years: int = Field(..., ge=0, le=60, example=10)
    availability: List[Availability] = Field(..., min_length=1)


class DoctorUpdate(BaseModelMixin):
    name: Optional[str] = Field(None, min_length=1, max_length=50, example="Dr. Ahmed Khan")
    specialization: Optional[str] = Field(None, min_length=3, max_length=100, example="Neurologist")
    phone: Optional[str] = Field(None, example="+92 300 5555555")
    email: Optional[str] = Field(None, example="ahmed@hospital.com")
    experience_years: Optional[int] = Field(None, ge=0, le=60, example=15)
    availability: Optional[List[Availability]] = None


class PatientResponse(BaseModel):
    id: str
    name: str
    gender: str
    dob: date
    blood_group: str
    phone: str
    email: str
    address: str
    created_at: datetime
    updated_at: datetime

    # Allow direct serialization from SQLAlchemy model attributes.
    model_config = {"from_attributes": True}

    @field_serializer("dob")
    def serialize_dob(self, value: date) -> str:
        # Always serialize dates as ISO strings in responses.
        return value.isoformat()


class DoctorResponse(BaseModel):
    id: str
    name: str
    specialization: str
    phone: str
    email: str
    experience_years: int
    availability: List[Availability]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AppointmentStatus(str, Enum):
    SCHEDULED = "Scheduled"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"
    NO_SHOW = "No-Show"


class AppointmentCreate(BaseModel):
    patient_id: str = Field(..., example="d313f43d-09da-491e-b234-cfa7a2836efa")
    doctor_id: str = Field(..., example="c83d4d6f-ea13-4fad-9b08-b55a1d4cf8d4")
    appointment_date: str = Field(..., example="2026-07-15", description="Format: YYYY-MM-DD")
    appointment_time: str = Field(
        ..., pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", example="14:30"
    )
    status: Optional[AppointmentStatus] = Field(None, example="Scheduled")
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("appointment_date", mode="before")
    @classmethod
    def validate_appointment_date(cls, value):
        if value is None:
            return value
        try:
            datetime.strptime(value, "%Y-%m-%d")
            return value
        except ValueError:
            raise ValueError("Date must be in YYYY-MM-DD format (e.g., 2026-07-15)")


class AppointmentUpdate(BaseModel):
    patient_id: Optional[str] = Field(None, example="d313f43d-09da-491e-b234-cfa7a2836efa")
    doctor_id: Optional[str] = Field(None, example="c83d4d6f-ea13-4fad-9b08-b55a1d4cf8d4")
    appointment_date: Optional[str] = Field(None, example="2026-07-15", description="Format: YYYY-MM-DD")
    appointment_time: Optional[str] = Field(
        None, pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", example="14:30"
    )
    status: Optional[AppointmentStatus] = Field(None, example="Completed")
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("appointment_date", mode="before")
    @classmethod
    def validate_appointment_date(cls, value):
        if value is None:
            return value
        try:
            datetime.strptime(value, "%Y-%m-%d")
            return value
        except ValueError:
            raise ValueError("Date must be in YYYY-MM-DD format (e.g., 2026-07-15)")


class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    appointment_date: date
    appointment_time: time
    status: AppointmentStatus
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("appointment_date")
    def serialize_appointment_date(self, value: date) -> str:
        return value.isoformat()

    @field_serializer("appointment_time")
    def serialize_appointment_time(self, value: time) -> str:
        # Convert Python time objects into HH:MM strings for API responses.
        return value.strftime("%H:%M")
