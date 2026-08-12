from datetime import datetime, time, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from database.models import SavedItem

DAILY_REVIEW_LIMIT = 3
REVIEWED_INTERVAL_DAYS = 3
SKIPPED_INTERVAL_DAYS = 1


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _end_of_today() -> datetime:
    return datetime.combine(_utc_now().date(), time.max)


def get_review_items(db: Session, user_id: int) -> list[SavedItem]:
    return (
        db.query(SavedItem)
        .filter(SavedItem.user_id == user_id, SavedItem.next_review_date <= _end_of_today())
        .order_by(SavedItem.next_review_date.asc(), SavedItem.id.asc())
        .limit(DAILY_REVIEW_LIMIT)
        .all()
    )


def apply_review_action(db: Session, user_id: int, item_id: int, action: str) -> SavedItem:
    item = (
        db.query(SavedItem)
        .filter(SavedItem.id == item_id, SavedItem.user_id == user_id)
        .one_or_none()
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    now = _utc_now()
    if action == "reviewed":
        item.last_reviewed = now
        item.next_review_date = now + timedelta(days=REVIEWED_INTERVAL_DAYS)
    else:
        item.next_review_date = now + timedelta(days=SKIPPED_INTERVAL_DAYS)

    db.commit()
    db.refresh(item)
    return item
