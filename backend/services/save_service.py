import re
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from database.models import SavedItem

URL_PATTERN = re.compile(r"https?://\S+")


def extract_content(url: str | None, text: str | None) -> str:
    if url and url.strip():
        return url.strip()

    if text:
        match = URL_PATTERN.search(text)
        if match:
            return match.group(0)
        if text.strip():
            return text.strip()

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to save")


def save_item(
    db: Session, user_id: int, content: str, title: str | None, topic: str | None = None
) -> SavedItem:
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)

    existing = (
        db.query(SavedItem)
        .filter(SavedItem.user_id == user_id, SavedItem.content == content)
        .one_or_none()
    )

    if existing:
        existing.title = title
        existing.next_review_date = tomorrow
        if topic is not None:
            existing.topic = topic
        db.commit()
        db.refresh(existing)
        return existing

    item = SavedItem(user_id=user_id, content=content, title=title, topic=topic, next_review_date=tomorrow)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
