from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from . import crud, models
from .crud import AppointmentBookingError
from database import get_db

router = APIRouter()


@router.get("/patients", response_model=List[models.PatientResponse])
def list_patients(db: Session = Depends(get_db)):
    return crud.get_patients(db)


@router.get("/patients/{patient_id}", response_model=models.PatientResponse)
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = crud.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")
    return patient


@router.post("/patients", response_model=models.PatientResponse, status_code=201)
def create_patient(patient: models.PatientCreate, db: Session = Depends(get_db)):
    return crud.create_patient(db, patient)


@router.put("/patients/{patient_id}", response_model=models.PatientResponse)
def update_patient(patient_id: str, patient: models.PatientUpdate, db: Session = Depends(get_db)):
    existing_patient = crud.get_patient(db, patient_id)
    if not existing_patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")
    return crud.update_patient(db, existing_patient, patient)


@router.delete("/patients/{patient_id}")
def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = crud.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")
    crud.delete_patient(db, patient)
    return {"success": True, "message": "Patient deleted", "id": patient_id}


@router.get("/doctors", response_model=List[models.DoctorResponse])
def list_doctors(db: Session = Depends(get_db)):
    return crud.get_doctors(db)


@router.get("/doctors/{doctor_id}", response_model=models.DoctorResponse)
def get_doctor(doctor_id: str, db: Session = Depends(get_db)):
    doctor = crud.get_doctor(db, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail=f"Doctor '{doctor_id}' not found")
    return doctor


@router.post("/doctors", response_model=models.DoctorResponse, status_code=201)
def create_doctor(doctor: models.DoctorCreate, db: Session = Depends(get_db)):
    return crud.create_doctor(db, doctor)


@router.put("/doctors/{doctor_id}", response_model=models.DoctorResponse)
def update_doctor(doctor_id: str, doctor: models.DoctorUpdate, db: Session = Depends(get_db)):
    existing_doctor = crud.get_doctor(db, doctor_id)
    if not existing_doctor:
        raise HTTPException(status_code=404, detail=f"Doctor '{doctor_id}' not found")
    return crud.update_doctor(db, existing_doctor, doctor)


@router.delete("/doctors/{doctor_id}")
def delete_doctor(doctor_id: str, db: Session = Depends(get_db)):
    doctor = crud.get_doctor(db, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail=f"Doctor '{doctor_id}' not found")
    crud.delete_doctor(db, doctor)
    return {"success": True, "message": "Doctor deleted", "id": doctor_id}


@router.get("/appointments", response_model=List[models.AppointmentResponse])
def list_appointments(db: Session = Depends(get_db)):
    # Return all appointments ordered by date and time.
    return crud.get_appointments(db)


@router.get("/appointments/{appointment_id}", response_model=models.AppointmentResponse)
def get_appointment(appointment_id: str, db: Session = Depends(get_db)):
    appointment = crud.get_appointment(db, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail=f"Appointment '{appointment_id}' not found")
    return appointment


@router.post("/appointments", response_model=models.AppointmentResponse, status_code=201)
def create_appointment(appointment: models.AppointmentCreate, db: Session = Depends(get_db)):
    # Validate related patient and doctor IDs before creating an appointment.
    if not crud.get_patient(db, appointment.patient_id):
        raise HTTPException(status_code=404, detail=f"Patient '{appointment.patient_id}' not found")
    if not crud.get_doctor(db, appointment.doctor_id):
        raise HTTPException(status_code=404, detail=f"Doctor '{appointment.doctor_id}' not found")

    try:
        return crud.create_appointment(db, appointment)
    except AppointmentBookingError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.put("/appointments/{appointment_id}", response_model=models.AppointmentResponse)
def update_appointment(appointment_id: str, appointment: models.AppointmentUpdate, db: Session = Depends(get_db)):
    existing_appointment = crud.get_appointment(db, appointment_id)
    if not existing_appointment:
        raise HTTPException(status_code=404, detail=f"Appointment '{appointment_id}' not found")
    update_data = appointment.model_dump(exclude_unset=True, exclude_none=True)
    # Maintain referential integrity when changing linked patient or doctor IDs.
    if "patient_id" in update_data and not crud.get_patient(db, update_data["patient_id"]):
        raise HTTPException(status_code=404, detail=f"Patient '{update_data['patient_id']}' not found")
    if "doctor_id" in update_data and not crud.get_doctor(db, update_data["doctor_id"]):
        raise HTTPException(status_code=404, detail=f"Doctor '{update_data['doctor_id']}' not found")

    try:
        return crud.update_appointment(db, existing_appointment, appointment)
    except AppointmentBookingError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: str, db: Session = Depends(get_db)):
    appointment = crud.get_appointment(db, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail=f"Appointment '{appointment_id}' not found")
    crud.delete_appointment(db, appointment)
    return {"success": True, "message": "Appointment deleted", "id": appointment_id}
