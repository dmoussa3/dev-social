from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import validate_email
from typing import List, Optional
from datetime import timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, or_

from auth import (
    hash_password, 
    verify_password, 
    create_access_token, 
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

from database import get_db, Base, engine
from db_models import User, Post

from schemas import (
    UserCreate, 
    UserResponse,
    UserUpdate,
    PostCreate,
    PostResponse,
    Token,
    UserWithPosts,
    PostWithAuthor
)

app = FastAPI(title="Dev Social API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

Base.metadata.create_all(bind=engine)

@app.get("/", response_model=dict)
def root():
    return {"message": "Welcome to Dev Social API", "docs": "/docs"}

# =================================== User endpoints ===================================

# REQUIRES AUTHENTICATION/LOGIN
@app.get("/api/users", response_model=List[UserResponse])
def read_users(db: Session = Depends(get_db), search: Optional[str] = None, current_user: User = Depends(get_current_active_user)):
    query = db.query(User)

    if search:
        query = query.filter(
            or_(
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%")
            )
        )

    return query.all()

@app.put("/api/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user: UserUpdate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.id != user_id: # type: ignore
        raise HTTPException(status_code=403, detail="Not authorized to update this user")

    db_user = db.query(User).filter(User.id == user_id).first()

    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.username and user.username != db_user.username:
        if db.query(User).filter(User.username == user.username).first():
            raise HTTPException(status_code=400, detail="Username already exists")

    if user.email and user.email != db_user.email:
        valid = validate_email(user.email)
    
        if not valid:
            raise HTTPException(status_code=400, detail="Invalid email format")
    
        if db.query(User).filter(User.email == user.email).first():
            raise HTTPException(status_code=400, detail="Email already exists")
    
    if user.password:
        db_user.password_hash = hash_password(user.password) #type: ignore

    updated_fields = user.model_dump(exclude_unset=True)
    for key, value in updated_fields.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return db_user

# REQUIRES AUTHENTICATION
@app.delete("/api/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.id != user_id: # type: ignore
        raise HTTPException(status_code=403, detail="Not authorized to delete this user")
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(db_user)
    db.commit()
    return None

# =================================== Post endpoints ======================================

@app.get("/api/posts", response_model=List[PostWithAuthor])
def read_posts(db: Session = Depends(get_db), search: Optional[str] = None):
    query = db.query(Post).options(joinedload(Post.authorship))

    if search:
        query = query.filter(
            or_(
                Post.title.like(f"%{search}%"), Post.content.like(f"%{search}%")
            )
        )

    posts = query.order_by(Post.created_at.desc()).all()

    return posts

@app.post("/api/posts", response_model=PostWithAuthor, status_code=201)
def create_post(post: PostCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):    
    db_post = Post(title=post.title, content=post.content, user_id=current_user.id)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)

    return db_post


@app.get("/api/posts/{post_id}", response_model=PostWithAuthor)
def read_post(post_id: int, db: Session = Depends(get_db)):
    db_post = db.query(Post).options(joinedload(Post.authorship)).filter(Post.id == post_id).first()

    if db_post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    return db_post

@app.delete("/api/posts/{post_id}", status_code=204)
def delete_post(post_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    db_post = db.query(Post).filter(Post.id == post_id).first()

    if db_post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    if db_post.user_id != current_user.id: #type: ignore
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")

    db.delete(db_post)
    db.commit()
    return None

@app.get("/api/users/{user_id}/posts", response_model=List[PostResponse])
def read_user_posts(user_id: int, db: Session = Depends(get_db)):
    db_user=db.query(User).filter(User.id == user_id).first()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return db.query(Post).filter(Post.user_id == user_id).order_by(Post.created_at.desc()).all()

@app.get("/api/me/posts", response_model=List[PostResponse])
def read_current_user_posts(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    return db.query(Post).filter(Post.user_id == current_user.id).order_by(Post.created_at.desc()).all()


# ================================== Auth endpoints ========================================

@app.post("/api/signup", response_model=UserResponse, status_code=201)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_password = hash_password(user.password)
    db_user = User(username=user.username, email=user.email, password_hash=hashed_password, role=user.role)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user

@app.post("/api/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash): #type: ignore
        raise HTTPException(status_code=400, detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})
    

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=access_token_expires)

    return {"access_token": access_token, "token_type": "bearer"}    

@app.get("/api/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    return current_user

# Health check endpoint
@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connection successful"}
    except Exception as e:
        return {"status": "unhealthy", "database": "connection failed", "error": str(e)}