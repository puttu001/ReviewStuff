from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.models import AuthResponse, GoogleAuthRequest
from database.client import get_db
from services.auth_service import create_access_token, get_or_create_user, verify_google_token

router = APIRouter()

@router.get('/')
def root ():
    return {"Status:Okay"}

@router.post('/auth/google', response_model=AuthResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    google_user = verify_google_token(payload.id_token)
    user = get_or_create_user(db, google_sub=google_user["sub"], email=google_user["email"])
    token = create_access_token(user.id)
    return AuthResponse(access_token=token)

@router.post('/save')
def save_link():
    pass