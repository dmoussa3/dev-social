# Dev Social

A small social platform for developers to sign up, share posts, and browse other users. Built as a FastAPI backend with a vanilla HTML/CSS/JS single-page frontend.

## Features

- **Authentication** — signup/login with JWT bearer tokens, bcrypt-hashed passwords
- **Posts** — create, view, search, and delete posts on a shared feed
- **User profiles** — update username, email, role, or password; delete your account
- **User search** — look up other users by username or email
- **Roles** — users pick a role on signup (Backend Engineer, Frontend Engineer, DevOps Engineer, etc.)

## Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — REST API
- [SQLAlchemy](https://www.sqlalchemy.org/) — ORM
- [SQLite](https://www.sqlite.org/) — database
- [Alembic](https://alembic.sqlalchemy.org/) — database migrations
- [python-jose](https://github.com/mpdavis/python-jose) — JWT tokens
- [passlib](https://passlib.readthedocs.io/) (bcrypt) — password hashing
- [Uvicorn](https://www.uvicorn.org/) — ASGI server

**Frontend**
- Static HTML/CSS/JS (no build step, no framework) served as a single page that talks to the API via `fetch`

## Project Structure

```
backend/
  main.py         # FastAPI app and route definitions
  auth.py         # Password hashing, JWT creation/validation, auth dependencies
  database.py     # SQLAlchemy engine/session setup
  db_models.py    # SQLAlchemy models (User, Post)
  schemas.py      # Pydantic request/response schemas
  alembic/        # Database migration environment
  alembic.ini      # Alembic configuration
  requirements.txt

frontend/
  index.html      # App markup + styles
  app.js          # Frontend logic (auth, posts, users, modals)
  ds_logo.png      # Favicon/logo
```

## Getting Started

### Prerequisites

- Python 3.11+

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

> `requirements.txt` is a dump of a broader environment. At minimum you need: `fastapi`, `uvicorn`, `sqlalchemy`, `alembic`, `pydantic`, `email-validator`, `passlib[bcrypt]`, `python-jose`, `python-multipart`.

Run the API:

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`. A SQLite database file (`dev_social_db`) is created automatically on first run.

### Frontend

The frontend is a static site with no build step. Serve the `frontend/` directory with any static file server, e.g.:

```bash
cd frontend
python3 -m http.server 5500
```

Then open `http://localhost:5500` in your browser. It expects the API at `http://localhost:8000/api` (see `API_URL` in `app.js`).

## API Overview

All endpoints are prefixed with `/api` unless noted.

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| POST | `/signup` | No | Create a new user |
| POST | `/token` | No | Log in, returns a JWT access token |
| GET | `/me` | Yes | Get the current logged-in user |
| GET | `/users` | Yes | List/search users (`?search=`) |
| PUT | `/users/{user_id}` | Yes | Update a user (self only) |
| DELETE | `/users/{user_id}` | Yes | Delete a user (self only) |
| GET | `/posts` | No | List/search posts (`?search=`) |
| POST | `/posts` | Yes | Create a post |
| GET | `/posts/{post_id}` | No | Get a single post |
| DELETE | `/posts/{post_id}` | Yes | Delete a post (author only) |
| GET | `/users/{user_id}/posts` | No | List a user's posts |
| GET | `/me/posts` | Yes | List the current user's posts |
| GET | `/health` (no prefix) | No | Database health check |

Authenticated requests use `Authorization: Bearer <token>`.

## Database Migrations

Migrations are managed with Alembic from the `backend/` directory:

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Notes

- The JWT secret in `auth.py` is a hardcoded placeholder — replace it with an environment-provided secret before deploying anywhere beyond local development.
- CORS is currently wide open (`allow_origins=["*"]`) for local development convenience.
