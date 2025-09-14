# DataSnap API Documentation

## Authentication

### Register a new user
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "mypassword123",
  "full_name": "John Doe"
}
```

Response: 
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true
}
```

### Login with email and password
```http
POST /api/v1/auth/login/access-token
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=mypassword123
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "token_type": "bearer"
}
```

### Login with Google
```http
POST /api/v1/auth/login/google
Content-Type: application/json

{
  "token": "google-oauth-token"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "token_type": "bearer"
}
```

## File Management

All file endpoints require authentication via Bearer token.

### Upload a CSV file
```http
POST /api/v1/files/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

file=@path/to/file.csv
```

Response:
```json
{
  "id": "file-uuid",
  "filename": "data.csv",
  "file_path": "uploads/user-uuid/unique-name.csv",
  "file_size": 1024,
  "content_type": "text/csv",
  "created_at": "2025-09-14T21:39:48Z"
}
```

### List files
```http
GET /api/v1/files
Authorization: Bearer <token>
```

Response:
```json
[
  {
    "id": "file-uuid",
    "filename": "data.csv",
    "file_size": 1024,
    "content_type": "text/csv",
    "created_at": "2025-09-14T21:39:48Z"
  }
]
```

### Download a file
```http
GET /api/v1/files/{file_id}/download
Authorization: Bearer <token>
```

Response: The file content with appropriate content-type header.

### Delete a file
```http
DELETE /api/v1/files/{file_id}
Authorization: Bearer <token>
```

Response:
```json
{
  "message": "File deleted successfully"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Error message describing the issue"
}
```

### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

### 403 Forbidden
```json
{
  "detail": "Not enough permissions"
}
```

### 404 Not Found
```json
{
  "detail": "File not found"
}
```