from sqlalchemy.orm import Session

from database.models import SavedItem


def list_items(db: Session, user_id: int, topic: str | None = None) -> list[SavedItem]:
    query = db.query(SavedItem).filter(SavedItem.user_id == user_id)
    if topic is not None:
        query = query.filter(SavedItem.topic == topic)
    return query.order_by(SavedItem.created_at.desc(), SavedItem.id.desc()).all()
