"""Initial database schema

Revision ID: b21186140e78
Revises: 
Create Date: 2026-07-08 16:29:29.331418

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b21186140e78'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'patients',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('gender', sa.Enum('Male', 'Female', 'Not Specified', name='gender'), nullable=False),
        sa.Column('dob', sa.Date(), nullable=False),
        sa.Column('blood_group', sa.Enum('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', name='bloodgroup'), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('email', sa.String(length=100), nullable=False),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        'doctors',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('specialization', sa.String(length=100), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('email', sa.String(length=100), nullable=False),
        sa.Column('experience_years', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        'doctor_availability',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('doctor_id', sa.String(length=36), sa.ForeignKey('doctors.id', ondelete='CASCADE'), nullable=False),
        sa.Column('day', sa.Enum('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', name='dayofweek'), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
    )
    op.create_table(
        'appointments',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('patient_id', sa.String(length=36), sa.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('doctor_id', sa.String(length=36), sa.ForeignKey('doctors.id', ondelete='CASCADE'), nullable=False),
        sa.Column('appointment_date', sa.Date(), nullable=False),
        sa.Column('appointment_time', sa.Time(), nullable=False),
        sa.Column('status', sa.Enum('Scheduled', 'Completed', 'Cancelled', 'No-Show', name='appointmentstatus'), nullable=False, server_default='Scheduled'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('appointments')
    op.drop_table('doctor_availability')
    op.drop_table('doctors')
    op.drop_table('patients')

