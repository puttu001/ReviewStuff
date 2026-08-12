from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.models import AuthResponse, GoogleAuthRequest, SaveItemRequest, SavedItemResponse
from database.client import get_db
from database.models import User
from services.auth_service import create_access_token, get_current_user, get_or_create_user, verify_google_token
from services.items_service import list_items
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = extract_content(payload.url, payload.text)
    return save_item(db, user_id=current_user.id, content=content, title=payload.title, topic=payload.topic)

@router.get('/items', response_model=list[SavedItemResponse])
def get_items(
    topic: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_items(db, user_id=current_user.id, topic=topic)