import io
import json
from app.services.user import create_user
from app.schemas.user import UserCreate


def create_test_user_and_token(client, session):
    # Create a test user
    user_in = UserCreate(
        email="test@example.com",
        password="testpassword123",
        full_name="Test User",
    )
    create_user(session, user_in)

    # Get token
    response = client.post(
        "/api/v1/auth/login/access-token",
        data={"username": "test@example.com", "password": "testpassword123"},
    )
    token = response.json()["access_token"]
    return token


def test_upload_file_success(client, session, test_upload_dir):
    token = create_test_user_and_token(client, session)
    
    # Create a test CSV file
    csv_content = "name,age\nJohn,30\nJane,25"
    file = io.BytesIO(csv_content.encode())
    file.name = "test.csv"
    
    response = client.post(
        "/api/v1/files/upload",
        files={"file": ("test.csv", file, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test.csv"
    assert data["content_type"] == "text/csv"


def test_upload_invalid_file_type(client, session):
    token = create_test_user_and_token(client, session)
    
    # Create a test text file
    file = io.BytesIO(b"Hello, World!")
    file.name = "test.txt"
    
    response = client.post(
        "/api/v1/files/upload",
        files={"file": ("test.txt", file, "text/plain")},
        headers={"Authorization": f"Bearer {token}"},
    )
    
    assert response.status_code == 400


def test_list_files(client, session, test_upload_dir):
    token = create_test_user_and_token(client, session)
    
    # Upload a test file
    csv_content = "name,age\nJohn,30\nJane,25"
    file = io.BytesIO(csv_content.encode())
    file.name = "test.csv"
    
    client.post(
        "/api/v1/files/upload",
        files={"file": ("test.csv", file, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )
    
    # List files
    response = client.get(
        "/api/v1/files/",
        headers={"Authorization": f"Bearer {token}"},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["filename"] == "test.csv"


def test_download_file(client, session, test_upload_dir):
    token = create_test_user_and_token(client, session)
    
    # Upload a test file
    csv_content = "name,age\nJohn,30\nJane,25"
    file = io.BytesIO(csv_content.encode())
    file.name = "test.csv"
    
    response = client.post(
        "/api/v1/files/upload",
        files={"file": ("test.csv", file, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )
    
    file_id = response.json()["id"]
    
    # Download file
    response = client.get(
        f"/api/v1/files/{file_id}/download",
        headers={"Authorization": f"Bearer {token}"},
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv"
    assert response.content.decode() == csv_content


def test_delete_file(client, session, test_upload_dir):
    token = create_test_user_and_token(client, session)
    
    # Upload a test file
    csv_content = "name,age\nJohn,30\nJane,25"
    file = io.BytesIO(csv_content.encode())
    file.name = "test.csv"
    
    response = client.post(
        "/api/v1/files/upload",
        files={"file": ("test.csv", file, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )
    
    file_id = response.json()["id"]
    
    # Delete file
    response = client.delete(
        f"/api/v1/files/{file_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    
    assert response.status_code == 200
    
    # Verify file is deleted
    response = client.get(
        "/api/v1/files/",
        headers={"Authorization": f"Bearer {token}"},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0