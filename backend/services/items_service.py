from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from database.models import SavedItem

UNSET = object()


def list_items(db: Session, user_id: int, topic: str | None = None) -> list[SavedItem]:
    query = db.query(SavedItem).filter(SavedItem.user_id == user_id)
    if topic is not None:
        query = query.filter(SavedItem.topic == topic)
    return query.order_by(SavedItem.created_at.desc(), SavedItem.id.desc()).all()


def update_item(db: Session, user_id: int, item_id: int, topic=UNSET) -> SavedItem:
    item = (
        db.query(SavedItem)
        .filter(SavedItem.id == item_id, SavedItem.user_id == user_id)
        .one_or_none()
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    if topic is not UNSET:
        item.topic = topic

    db.commit()
    db.refresh(item)
    return item
