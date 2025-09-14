from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, status
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.file import File, FileCreate
from app.services.file import (
    save_upload_file,
    validate_csv_file,
    create_file,
    get_user_files,
    get_file,
    delete_file,
)

router = APIRouter()


@router.post("/upload", response_model=File)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> File:
    """Upload a new CSV file."""
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed",
        )

    # Save file
    file_path, unique_filename, file_size = await save_upload_file(file, current_user.id)

    # Validate CSV format
    is_valid, error_message = validate_csv_file(file_path)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid CSV file: {error_message}",
        )

    # Create file record
    file_in = FileCreate(
        filename=file.filename,
        content_type=file.content_type,
        file_size=file_size,
    )
    return create_file(db, file_in, current_user.id, file_path)


@router.get("/", response_model=List[File])
def list_files(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[File]:
    """List all files for the current user."""
    return get_user_files(db, current_user.id, skip=skip, limit=limit)


@router.get("/{file_id}/download")
def download_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    """Download a specific file."""
    db_file = get_file(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    if db_file.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return FileResponse(
        db_file.file_path,
        filename=db_file.filename,
        media_type="text/csv"
    )


@router.delete("/{file_id}")
def delete_user_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Delete a specific file."""
    db_file = get_file(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    if db_file.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    delete_file(db, db_file)
    return {"message": "File deleted successfully"}