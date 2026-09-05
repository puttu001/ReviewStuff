"""review stage on saved items

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-05

"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "saved_items",
        sa.Column("review_stage", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("saved_items", "review_stage")
