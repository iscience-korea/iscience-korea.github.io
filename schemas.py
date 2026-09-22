from pydantic import BaseModel
from datetime import datetime
from typing import List

class CommentCreate(BaseModel):
    author: str = "익명"
    content: str

class CommentOut(BaseModel):
    id: int
    author: str
    content: str
    created_at: datetime
    class Config:
        from_attributes = True

class PostCreate(BaseModel):
    title: str
    author: str = "익명"
    content: str

class PostListOut(BaseModel):
    id: int
    title: str
    author: str
    view_count: int
    created_at: datetime
    class Config:
        from_attributes = True

class PostDetailOut(PostListOut):
    content: str
    comments: List[CommentOut] = []

class PagedPosts(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[PostListOut]
