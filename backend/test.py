# backend/test_relationship.py
from database import SessionLocal
from db_models import User, Post

db = SessionLocal()

# Get a post
post = db.query(Post).first()

print(f"Post: {post.title}") # type: ignore
print(f"Post user_id: {post.user_id}") # type: ignore
print(f"Post author object: {post.authorship}") # type: ignore - this should not be None if the relationship is set up correctly

if post.authorship: #type: ignore
    print(f"Author username: {post.authorship.username}") # type: ignore - this should print the username of the author if the relationship is working
else:
    print("ERROR: Author is None!")

db.close()