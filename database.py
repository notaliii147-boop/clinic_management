from datetime import datetime
import uuid

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    create_engine,
    func,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

from config import db_config

Base = declarative_base()

# ORM model definitions for core application entities.
class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    gender = Column(Enum("Male", "Female", "Not Specified", name="gender"), nullable=False)
    dob = Column(Date, nullable=False)
    blood_group = Column(
        Enum("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", name="bloodgroup"),
        nullable=False,
    )
    phone = Column(String(20), nullable=False)
    email = Column(String(100), nullable=False)
    address = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    appointments = relationship(
        "Appointment",
        back_populates="patient",
        cascade="all, delete-orphan",
    )


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    specialization = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(100), nullable=False)
    experience_years = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    availability = relationship(
        "DoctorAvailability",
        back_populates="doctor",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    appointments = relationship(
        "Appointment",
        back_populates="doctor",
        cascade="all, delete-orphan",
    )


class DoctorAvailability(Base):
    __tablename__ = "doctor_availability"

    id = Column(Integer, primary_key=True, autoincrement=True)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    day = Column(
        Enum(
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
            name="dayofweek",
        ),
        nullable=False,
    )
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    doctor = relationship("Doctor", back_populates="availability")


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        UniqueConstraint(
            "doctor_id",
            "appointment_date",
            "appointment_time",
            name="uq_doctor_appointment_slot",
        ),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)
    status = Column(
        Enum("Scheduled", "Completed", "Cancelled", "No-Show", name="appointmentstatus"),
        nullable=False,
        server_default="Scheduled",
    )
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")


# SQLAlchemy engine configured for MySQL with connection pool health checks.
engine = create_engine(
    db_config.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,  # keep MySQL connections alive across pool reuse
    pool_recycle=3600,   # recycle stale connections before MySQL closes them
)

# Session factory for request-scoped database sessions.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        # Ensure the DB session is closed after each request, even on errors.
        db.close()
