from typing import List

from fastapi import APIRouter, HTTPException

from .models import (
        PatientCreate,
        PatientResponse,
        PatientUpdate,
        DoctorCreate,
        DoctorResponse,
        DoctorUpdate,
        generate_uuid,
        load_patients,
        load_doctors,
        save_patients,
        save_doctors,
        now_iso,
    )

router = APIRouter()


@router.get("/patients", response_model=List[PatientResponse])
def list_patients():
    """Get all patients"""
    return load_patients()


@router.get("/patients/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: str):
    """Get a specific patient by ID"""
    patients = load_patients()
    for p in patients:
        if p["id"] == patient_id:
            return p
    raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")


@router.post("/patients", response_model=PatientResponse, status_code=201)
def create_patient(patient: PatientCreate):
    """Create a new patient"""
    patients = load_patients()
    timestamp = now_iso()

    new_patient = {
        **patient.model_dump(),
        "id": generate_uuid(),
        "created_at": timestamp,
        "updated_at": timestamp,
    }

    patients.append(new_patient)
    save_patients(patients)
    return new_patient


@router.put("/patients/{patient_id}", response_model=PatientResponse)
def update_patient(patient_id: str, patient: PatientUpdate):
    """Update an existing patient"""
    patients = load_patients()

    for i, existing_patient in enumerate(patients):
        if existing_patient["id"] == patient_id:
            updated_patient = existing_patient.copy()
            updates = patient.model_dump(exclude_unset=True)

            for key, value in updates.items():
                if value is not None:
                    updated_patient[key] = value

            updated_patient["updated_at"] = now_iso()
            patients[i] = updated_patient
            save_patients(patients)
            return updated_patient

    raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")


@router.delete("/patients/{patient_id}")
def delete_patient(patient_id: str):
    """Delete a patient by ID"""
    patients = load_patients()

    for i, p in enumerate(patients):
        if p["id"] == patient_id:
            patients.pop(i)
            save_patients(patients)
            return {"success": True, "message": "Patient deleted", "id": patient_id}

    raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")


@router.get("/doctors", response_model=List[DoctorResponse])
def list_doctors():
    """Get all doctors"""
    return load_doctors()


@router.get("/doctors/{doctor_id}", response_model=DoctorResponse)
def get_doctor(doctor_id: str):
    """Get a specific doctor by ID"""
    doctors = load_doctors()
    for d in doctors:
        if d["id"] == doctor_id:
            return d
    raise HTTPException(status_code=404, detail=f"Doctor '{doctor_id}' not found")


@router.post("/doctors", response_model=DoctorResponse, status_code=201)
def create_doctor(doctor: DoctorCreate):
    """Create a new doctor"""
    doctors = load_doctors()
    timestamp = now_iso()

    new_doctor = {
        **doctor.model_dump(),
        "id": generate_uuid(),
        "created_at": timestamp,
        "updated_at": timestamp,
    }

    doctors.append(new_doctor)
    save_doctors(doctors)
    return new_doctor


@router.put("/doctors/{doctor_id}", response_model=DoctorResponse)
def update_doctor(doctor_id: str, doctor: DoctorUpdate):
    """Update an existing doctor"""
    doctors = load_doctors()

    for i, existing_doctor in enumerate(doctors):
        if existing_doctor["id"] == doctor_id:
            updated_doctor = existing_doctor.copy()
            updates = doctor.model_dump(exclude_unset=True)

            for key, value in updates.items():
                if value is not None:
                    updated_doctor[key] = value

            updated_doctor["updated_at"] = now_iso()
            doctors[i] = updated_doctor
            save_doctors(doctors)
            return updated_doctor

    raise HTTPException(status_code=404, detail=f"Doctor '{doctor_id}' not found")


@router.delete("/doctors/{doctor_id}")
def delete_doctor(doctor_id: str):
    """Delete a doctor by ID"""
    doctors = load_doctors()

    for i, d in enumerate(doctors):
        if d["id"] == doctor_id:
            doctors.pop(i)
            save_doctors(doctors)
            return {"success": True, "message": "Doctor deleted", "id": doctor_id}

    raise HTTPException(status_code=404, detail=f"Doctor '{doctor_id}' not found")
