from app.services.user import create_user
from app.schemas.user import UserCreate
from app.core.security import get_password_hash


def test_create_user(client, session):
    user_data = {
        "email": "test@example.com",
        "password": "testpassword123",
        "full_name": "Test User",
    }
    response = client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["full_name"] == user_data["full_name"]


def test_login_success(client, session):
    # Create a test user
    user_in = UserCreate(
        email="test@example.com",
        password="testpassword123",
        full_name="Test User",
    )
    create_user(session, user_in)

    # Login
    response = client.post(
        "/api/v1/auth/login/access-token",
        data={"username": "test@example.com", "password": "testpassword123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, session):
    # Create a test user
    user_in = UserCreate(
        email="test@example.com",
        password="testpassword123",
        full_name="Test User",
    )
    create_user(session, user_in)

    # Try to login with wrong password
    response = client.post(
        "/api/v1/auth/login/access-token",
        data={"username": "test@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401


def test_login_nonexistent_user(client):
    response = client.post(
        "/api/v1/auth/login/access-token",
        data={"username": "nonexistent@example.com", "password": "testpassword123"},
    )
    assert response.status_code == 401


def test_register_existing_user(client, session):
    # Create a test user
    user_in = UserCreate(
        email="test@example.com",
        password="testpassword123",
        full_name="Test User",
    )
    create_user(session, user_in)

    # Try to register with the same email
    user_data = {
        "email": "test@example.com",
        "password": "differentpassword",
        "full_name": "Different Name",
    }
    response = client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 400