from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    google_sub: Mapped[str] = mapped_column(unique=True, index=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    picture: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    saved_items: Mapped[list["SavedItem"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class SavedItem(Base):
    __tablename__ = "saved_items"
    __table_args__ = (
        UniqueConstraint("user_id", "content", name="uq_saved_items_user_content"),
        Index("ix_saved_items_user_next_review", "user_id", "next_review_date"),
        Index("ix_saved_items_user_topic", "user_id", "topic"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    content: Mapped[str]
    title: Mapped[str | None]
    topic: Mapped[str | None]

    # Open Graph data fetched from the URL itself. Kept separate from `title`
    # so enrichment can never overwrite what the sharing app or the user gave us.
    fetched_title: Mapped[str | None]
    fetched_image: Mapped[str | None]
    fetched_site_name: Mapped[str | None]
    fetched_favicon: Mapped[str | None]

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    last_reviewed: Mapped[datetime | None] = mapped_column(DateTime)
    next_review_date: Mapped[datetime] = mapped_column(DateTime)
    review_stage: Mapped[int] = mapped_column(default=0, server_default="0")

    user: Mapped["User"] = relationship(back_populates="saved_items")
