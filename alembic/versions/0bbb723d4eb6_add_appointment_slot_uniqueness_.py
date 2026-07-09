"""add appointment slot uniqueness constraint

Revision ID: 0bbb723d4eb6
Revises: b21186140e78
Create Date: 2026-07-09 13:43:16.268014

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0bbb723d4eb6'
down_revision: Union[str, Sequence[str], None] = 'b21186140e78'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('appointments', sa.Column('appointment_start_time', sa.Time(), nullable=True))
    op.add_column('appointments', sa.Column('appointment_end_time', sa.Time(), nullable=True))

    conn = op.get_bind()
    conn.execute(sa.text(
        "UPDATE appointments SET appointment_start_time = appointment_time, appointment_end_time = appointment_time WHERE appointment_time IS NOT NULL"
    ))

    op.alter_column(
        'appointments',
        'appointment_start_time',
        existing_type=sa.Time(),
        nullable=False,
    )
    op.alter_column(
        'appointments',
        'appointment_end_time',
        existing_type=sa.Time(),
        nullable=False,
    )
    op.drop_column('appointments', 'appointment_time')

    op.create_unique_constraint(
        'uq_doctor_appointment_slot',
        'appointments',
        ['doctor_id', 'appointment_date', 'appointment_start_time']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        'uq_doctor_appointment_slot',
        'appointments',
        type_='unique'
    )
    op.add_column('appointments', sa.Column('appointment_time', sa.Time(), nullable=True))

    conn = op.get_bind()
    conn.execute(sa.text(
        "UPDATE appointments SET appointment_time = appointment_start_time WHERE appointment_start_time IS NOT NULL"
    ))

    op.drop_column('appointments', 'appointment_end_time')
    op.drop_column('appointments', 'appointment_start_time')
