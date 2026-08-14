from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from database.models import SavedItem

UNSET = object()


def list_items(db: Session, user_id: int, topic: str | None = None) -> list[SavedItem]:
    query = db.query(SavedItem).filter(SavedItem.user_id == user_id)
    if topic is not None:
        query = query.filter(SavedItem.topic == topic)
    return query.order_by(SavedItem.created_at.desc(), SavedItem.id.desc()).all()


def _owned_item(db: Session, user_id: int, item_id: int) -> SavedItem:
    """Fetch an item the caller owns, or 404.

    Scoping the lookup by user_id means someone else's item is indistinguishable
    from one that does not exist — deliberately 404 rather than 403, so the API
    never confirms that an id belongs to another account.
    """
    item = (
        db.query(SavedItem)
        .filter(SavedItem.id == item_id, SavedItem.user_id == user_id)
        .one_or_none()
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


def update_item(db: Session, user_id: int, item_id: int, topic=UNSET) -> SavedItem:
    item = _owned_item(db, user_id, item_id)

    if topic is not UNSET:
        item.topic = topic

    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, user_id: int, item_id: int) -> None:
    """Permanently remove an item. Also removes it from the review queue, since
    that reads the same rows."""
    db.delete(_owned_item(db, user_id, item_id))
    db.commit()
