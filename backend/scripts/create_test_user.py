from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User

# Create database engine
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Test user data
test_user = {
    "email": "test@example.com",
    "password": "testpass123",
    "full_name": "Test User"
}

try:
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == test_user["email"]).first()
    if existing_user:
        print(f"User {test_user['email']} already exists")
    else:
        # Create new user
        db_user = User(
            email=test_user["email"],
            hashed_password=get_password_hash(test_user["password"]),
            full_name=test_user["full_name"],
            is_active=True
        )
        db.add(db_user)
        db.commit()
        print(f"Created user {test_user['email']}")

except Exception as e:
    print(f"Error creating user: {e}")
    db.rollback()
finally:
    db.close()