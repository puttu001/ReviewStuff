"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-12

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("google_sub", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "saved_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("topic", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("last_reviewed", sa.DateTime(), nullable=True),
        sa.Column("next_review_date", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "content", name="uq_saved_items_user_content"),
    )
    op.create_index("ix_saved_items_user_next_review", "saved_items", ["user_id", "next_review_date"])
    op.create_index("ix_saved_items_user_topic", "saved_items", ["user_id", "topic"])


def downgrade() -> None:
    op.drop_index("ix_saved_items_user_topic", table_name="saved_items")
    op.drop_index("ix_saved_items_user_next_review", table_name="saved_items")
    op.drop_table("saved_items")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_google_sub", table_name="users")
    op.drop_table("users")
