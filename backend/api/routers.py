from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from api.models import AuthResponse, GoogleAuthRequest, ReviewActionRequest, SaveItemRequest, SavedItemResponse, UpdateItemRequest
from database.client import get_db
from database.models import User
from services.auth_service import create_access_token, get_current_user, get_or_create_user, verify_google_token
from services.items_service import UNSET, delete_item, list_items, update_item
from services.metadata_service import enrich_item, needs_metadata
from services.review_service import apply_review_action, get_review_items
from services.save_service import extract_content, save_item

router = APIRouter()

@router.get('/')
def root ():
    return {"Status:Running Fine"}

@router.post('/auth/google', response_model=AuthResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    google_user = verify_google_token(payload.id_token)
    user = get_or_create_user(db, google_sub=google_user["sub"], email=google_user["email"])
    token = create_access_token(user.id)
    return AuthResponse(access_token=token)

@router.post('/save', response_model=SavedItemResponse)
def save_link(
    payload: SaveItemRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = extract_content(payload.url, payload.text)
    item = save_item(db, user_id=current_user.id, content=content, title=payload.title, topic=payload.topic)

    # Link preview is fetched after the response is sent — the save must never
    # wait on a third-party site.
    if needs_metadata(item):
        background_tasks.add_task(enrich_item, item.id, item.content)

    return item

@router.get('/items', response_model=list[SavedItemResponse])
def get_items(
    topic: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_items(db, user_id=current_user.id, topic=topic)

@router.patch('/items/{item_id}', response_model=SavedItemResponse)
def patch_item(
    item_id: int,
    payload: UpdateItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topic = payload.topic if 'topic' in payload.model_fields_set else UNSET
    return update_item(db, user_id=current_user.id, item_id=item_id, topic=topic)

@router.delete('/items/{item_id}', status_code=status.HTTP_204_NO_CONTENT)
def remove_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_item(db, user_id=current_user.id, item_id=item_id)

@router.get('/review-today', response_model=list[SavedItemResponse])
def review_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_review_items(db, user_id=current_user.id)

@router.post('/review/{item_id}', response_model=SavedItemResponse)
def review_item(
    item_id: int,
    payload: ReviewActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return apply_review_action(db, user_id=current_user.id, item_id=item_id, action=payload.action)