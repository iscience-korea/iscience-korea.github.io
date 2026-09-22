from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
import math

import models, schemas
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(root_path="/iscience/api")  # Apache 프록시 경로와 일치시킴

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 운영 시 실제 도메인으로 제한 권장
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/posts", response_model=schemas.PagedPosts)
def list_posts(page: int = 1, page_size: int = 10, db: Session = Depends(get_db)):
    total = db.query(func.count(models.Post.id)).scalar()
    items = (
        db.query(models.Post)
        .order_by(models.Post.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"total": total, "page": page, "page_size": page_size, "items": items}

@app.post("/posts", response_model=schemas.PostDetailOut)
def create_post(post: schemas.PostCreate, db: Session = Depends(get_db)):
    db_post = models.Post(title=post.title, author=post.author, content=post.content)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

@app.get("/posts/{post_id}", response_model=schemas.PostDetailOut)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "게시글을 찾을 수 없습니다.")
    post.view_count += 1
    db.commit()
    db.refresh(post)
    return post

@app.post("/posts/{post_id}/comments", response_model=schemas.CommentOut)
def add_comment(post_id: int, comment: schemas.CommentCreate, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "게시글을 찾을 수 없습니다.")
    db_comment = models.Comment(post_id=post_id, author=comment.author, content=comment.content)
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment
