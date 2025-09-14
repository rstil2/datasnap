from typing import List, Optional
from fastapi import UploadFile
import uuid
import os
import aiofiles
import pandas as pd
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.file import File
from app.schemas.file import FileCreate


async def save_upload_file(upload_file: UploadFile, user_id: str) -> tuple[str, str, int]:
    """Save an uploaded file to disk and return the file path and size."""
    # Create uploads directory if it doesn't exist
    upload_dir = os.path.join(settings.UPLOAD_FOLDER, user_id)
    os.makedirs(upload_dir, exist_ok=True)

    # Generate a unique filename
    file_ext = os.path.splitext(upload_file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, unique_filename)

    # Save the file
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await upload_file.read()
        await out_file.write(content)
        file_size = len(content)

    return file_path, unique_filename, file_size


def validate_csv_file(file_path: str) -> tuple[bool, Optional[str]]:
    """Validate a CSV file and return whether it's valid and any error message."""
    try:
        df = pd.read_csv(file_path)
        if df.empty:
            return False, "File is empty"
        return True, None
    except Exception as e:
        return False, str(e)


def create_file(db: Session, file_in: FileCreate, user_id: str, file_path: str) -> File:
    """Create a new file record in the database."""
    db_file = File(
        id=str(uuid.uuid4()),
        filename=file_in.filename,
        file_path=file_path,
        file_size=file_in.file_size,
        content_type=file_in.content_type,
        user_id=user_id,
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


def get_user_files(db: Session, user_id: str, skip: int = 0, limit: int = 100) -> List[File]:
    """Get all files for a user."""
    return db.query(File).filter(File.user_id == user_id).offset(skip).limit(limit).all()


def get_file(db: Session, file_id: str) -> Optional[File]:
    """Get a specific file by ID."""
    return db.query(File).filter(File.id == file_id).first()


def delete_file(db: Session, file: File) -> None:
    """Delete a file from both storage and database."""
    try:
        if os.path.exists(file.file_path):
            os.remove(file.file_path)
    except Exception:
        # Log the error but continue with database deletion
        pass
    
    db.delete(file)
    db.commit()