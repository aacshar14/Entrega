from typing import Generator
from sqlmodel import Session, create_engine
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL, echo=True if settings.ENVIRONMENT == "development" else False
)


# For backward compatibility
def get_engine():
    return engine


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def init_db():
    # Initial setup for database if needed (like creating extensions)
    pass
