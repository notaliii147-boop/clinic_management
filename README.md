# Clinic Appointment System

A simple FastAPI application for managing patients and doctors, with a responsive frontend served from the static folder.

## Features

- Patient management UI
- Doctor management UI
- Responsive layout for desktop and mobile
- FastAPI backend with static frontend hosting

## Requirements

- Python 3.10+
- pip

## Setup

1. Open the project folder.
2. Create and activate a virtual environment if needed.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

## Run the app

From the project root, start the server with:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Then open:

```text
http://127.0.0.1:8000/
```

## Notes

- The frontend is served by the FastAPI app from the static files.
- The API routes are available under the app router for patient and doctor operations.
