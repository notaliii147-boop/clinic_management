from datetime import date, datetime, time
from typing import List, Optional

from sqlalchemy import exc
from sqlalchemy.orm import Session, joinedload

from database import Appointment, Doctor, DoctorAvailability, Patient
from . import models


class AppointmentBookingError(Exception):
    """Base exception for appointment booking problems."""
    pass


class AppointmentConflictError(AppointmentBookingError):
    """Conflict raised when the requested slot is already booked."""
    pass


class AppointmentAvailabilityError(AppointmentBookingError):
    """Conflict raised when requested time is outside doctor availability."""
    pass


def parse_date(date_string: str) -> date:
    # Convert incoming ISO date strings to Python date objects for SQLAlchemy.
    return datetime.strptime(date_string, "%Y-%m-%d").date()


def parse_time(time_string: str) -> time:
    # Convert ISO time strings to Python time objects.
    return time.fromisoformat(time_string)


def get_patients(db: Session) -> List[Patient]:
    return db.query(Patient).order_by(Patient.created_at).all()


def get_patient(db: Session, patient_id: str) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.id == patient_id).first()


def _commit_and_refresh(db: Session, model_instance):
    # Commit the transaction and refresh the instance so generated fields
    # (like timestamps or UUIDs) are available on the returned object.
    try:
        db.commit()
        db.refresh(model_instance)
        return model_instance
    except exc.IntegrityError as integrity_err:
        db.rollback()
        if "uq_doctor_appointment_slot" in str(getattr(integrity_err, "orig", "")).lower():
            raise AppointmentConflictError("Requested appointment slot is already booked.")
        raise
    except exc.SQLAlchemyError:
        db.rollback()
        raise


def _commit_or_rollback(db: Session):
    # Use for delete operations where no model instance needs refreshing.
    try:
        db.commit()
    except exc.SQLAlchemyError:
        db.rollback()
        raise


def create_patient(db: Session, patient_data: models.PatientCreate) -> Patient:
    patient = Patient(
        name=patient_data.name,
        gender=patient_data.gender.value,
        dob=parse_date(patient_data.dob),
        blood_group=patient_data.blood_group.value,
        phone=patient_data.phone,
        email=patient_data.email,
        address=patient_data.address,
    )
    db.add(patient)
    return _commit_and_refresh(db, patient)


def update_patient(db: Session, patient: Patient, updates: models.PatientUpdate) -> Patient:
    update_data = updates.model_dump(exclude_unset=True, exclude_none=True)
    if "dob" in update_data:
        update_data["dob"] = parse_date(update_data["dob"])

    # Apply only the fields provided in the update request.
    for field, value in update_data.items():
        setattr(patient, field, value)

    db.add(patient)
    return _commit_and_refresh(db, patient)


def delete_patient(db: Session, patient: Patient) -> None:
    db.delete(patient)
    _commit_or_rollback(db)


def get_doctors(db: Session) -> List[Doctor]:
    return db.query(Doctor).options(joinedload(Doctor.availability)).order_by(Doctor.created_at).all()


def get_doctor(db: Session, doctor_id: str) -> Optional[Doctor]:
    return (
        db.query(Doctor)
        .options(joinedload(Doctor.availability))
        .filter(Doctor.id == doctor_id)
        .first()
    )


def get_appointments(db: Session) -> List[Appointment]:
    return db.query(Appointment).order_by(Appointment.appointment_date, Appointment.appointment_start_time).all()


def get_appointment(db: Session, appointment_id: str) -> Optional[Appointment]:
    return db.query(Appointment).filter(Appointment.id == appointment_id).first()


def is_doctor_available(
    db: Session,
    doctor_id: str,
    appointment_date: date,
    appointment_start_time: time,
    appointment_end_time: time,
) -> bool:
    # Check whether the requested range falls inside one of the doctor's availability slots.
    target_day = appointment_date.strftime("%A")
    return (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.day == target_day,
            DoctorAvailability.start_time <= appointment_start_time,
            DoctorAvailability.end_time >= appointment_end_time,
        )
        .count()
        > 0
    )


def is_slot_booked(
    db: Session,
    doctor_id: str,
    appointment_date: date,
    appointment_start_time: time,
    appointment_end_time: time,
    exclude_appointment_id: Optional[str] = None,
) -> bool:
    query = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date == appointment_date,
        Appointment.appointment_start_time < appointment_end_time,
        Appointment.appointment_end_time > appointment_start_time,
    )
    if exclude_appointment_id:
        query = query.filter(Appointment.id != exclude_appointment_id)
    return query.first() is not None


def _build_availability_slots(availability_data: List[models.Availability]) -> List[DoctorAvailability]:
    # Build SQLAlchemy availability rows from validated Pydantic availability objects.
    return [
        DoctorAvailability(
            day=slot.day.value,
            start_time=parse_time(slot.start_time),
            end_time=parse_time(slot.end_time),
        )
        for slot in availability_data
    ]


def create_doctor(db: Session, doctor_data: models.DoctorCreate) -> Doctor:
    doctor = Doctor(
        name=doctor_data.name,
        specialization=doctor_data.specialization,
        phone=doctor_data.phone,
        email=doctor_data.email,
        experience_years=doctor_data.experience_years,
        availability=_build_availability_slots(doctor_data.availability),
    )
    db.add(doctor)
    return _commit_and_refresh(db, doctor)


def update_doctor(db: Session, doctor: Doctor, updates: models.DoctorUpdate) -> Doctor:
    update_data = updates.model_dump(exclude_unset=True, exclude_none=True)
    if "availability" in update_data:
        update_data.pop("availability")
        doctor.availability.clear()
        new_availability = _build_availability_slots(updates.availability)
        doctor.availability.extend(new_availability)

    for field, value in update_data.items():
        setattr(doctor, field, value)

    db.add(doctor)
    return _commit_and_refresh(db, doctor)


def delete_doctor(db: Session, doctor: Doctor) -> None:
    db.delete(doctor)
    _commit_or_rollback(db)


def create_appointment(db: Session, appointment_data: models.AppointmentCreate) -> Appointment:
    appointment_date = parse_date(appointment_data.appointment_date)
    appointment_start_time = parse_time(appointment_data.appointment_start_time)
    appointment_end_time = parse_time(appointment_data.appointment_end_time)

    if not is_doctor_available(
        db,
        appointment_data.doctor_id,
        appointment_date,
        appointment_start_time,
        appointment_end_time,
    ):
        raise AppointmentAvailabilityError(
            "Requested appointment time range is outside the doctor's availability."
        )

    if is_slot_booked(
        db,
        appointment_data.doctor_id,
        appointment_date,
        appointment_start_time,
        appointment_end_time,
    ):
        raise AppointmentConflictError("Requested appointment slot range overlaps an existing appointment.")

    appointment_fields = {
        "patient_id": appointment_data.patient_id,
        "doctor_id": appointment_data.doctor_id,
        "appointment_date": appointment_date,
        "appointment_start_time": appointment_start_time,
        "appointment_end_time": appointment_end_time,
        "notes": appointment_data.notes,
    }
    if appointment_data.status is not None:
        appointment_fields["status"] = appointment_data.status.value

    appointment = Appointment(**appointment_fields)
    db.add(appointment)
    return _commit_and_refresh(db, appointment)


def update_appointment(db: Session, appointment: Appointment, updates: models.AppointmentUpdate) -> Appointment:
    update_data = updates.model_dump(exclude_unset=True, exclude_none=True)

    appointment_date = appointment.appointment_date
    appointment_start_time = appointment.appointment_start_time
    appointment_end_time = appointment.appointment_end_time
    doctor_id = appointment.doctor_id

    if "appointment_date" in update_data:
        appointment_date = parse_date(update_data["appointment_date"])
        update_data["appointment_date"] = appointment_date
    if "appointment_start_time" in update_data:
        appointment_start_time = parse_time(update_data["appointment_start_time"])
        update_data["appointment_start_time"] = appointment_start_time
    if "appointment_end_time" in update_data:
        appointment_end_time = parse_time(update_data["appointment_end_time"])
        update_data["appointment_end_time"] = appointment_end_time
    if "doctor_id" in update_data:
        doctor_id = update_data["doctor_id"]
    if "status" in update_data:
        update_data["status"] = update_data["status"].value

    slot_is_changing = \
        "doctor_id" in update_data or \
        "appointment_date" in update_data or \
        "appointment_start_time" in update_data or \
        "appointment_end_time" in update_data
    if slot_is_changing:
        if not is_doctor_available(
            db,
            doctor_id,
            appointment_date,
            appointment_start_time,
            appointment_end_time,
        ):
            raise AppointmentAvailabilityError(
                "Requested appointment time range is outside the doctor's availability."
            )

        if is_slot_booked(
            db,
            doctor_id,
            appointment_date,
            appointment_start_time,
            appointment_end_time,
            exclude_appointment_id=appointment.id,
        ):
            raise AppointmentConflictError("Requested appointment slot range overlaps an existing appointment.")

    for field, value in update_data.items():
        setattr(appointment, field, value)

    db.add(appointment)
    return _commit_and_refresh(db, appointment)


def delete_appointment(db: Session, appointment: Appointment) -> None:
    db.delete(appointment)
    _commit_or_rollback(db)
