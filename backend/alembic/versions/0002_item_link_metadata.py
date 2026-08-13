"""fetched link metadata on saved_items

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-13

"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("saved_items", sa.Column("fetched_title", sa.String(), nullable=True))
    op.add_column("saved_items", sa.Column("fetched_image", sa.String(), nullable=True))
    op.add_column("saved_items", sa.Column("fetched_site_name", sa.String(), nullable=True))
    op.add_column("saved_items", sa.Column("fetched_favicon", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("saved_items", "fetched_favicon")
    op.drop_column("saved_items", "fetched_site_name")
    op.drop_column("saved_items", "fetched_image")
    op.drop_column("saved_items", "fetched_title")
