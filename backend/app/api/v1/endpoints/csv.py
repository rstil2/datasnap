from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status, Header
from sqlalchemy.orm import Session

from app import crud, deps
from app.models.user import User
from app.services.csv_processor import process_csv_file, CSVProcessingError

router = APIRouter()

async def get_optional_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(deps.get_db),
) -> Optional[User]:
    """Get current user if authenticated, otherwise return None"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.replace("Bearer ", "")
        return await deps.get_current_user(token=token, db=db)
    except (HTTPException, Exception):
        return None

@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    """
    Upload and process a CSV file.
    Saves file to disk and creates database record.
    """
    try:
        # Require authentication for file uploads in production
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to upload files"
            )
        
        # Reset file pointer in case it was already read
        await file.seek(0)
        
        # Process CSV file using the proper service
        file_info, preview_data, statistics = await process_csv_file(
            file=file,
            user_id=current_user.id,
            db=db,
            user_is_premium=False
        )
        
        # The process_csv_file function saves to DB and returns file_info
        # Get the most recently created file for this user
        db_files = crud.csv_file.get_by_user(
            db=db,
            user_id=current_user.id,
            limit=1
        )
        
        if not db_files:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="File was processed but not found in database"
            )
        
        created_file = db_files[0]
        
        return {
            "message": "File uploaded successfully",
            "file": {
                "id": created_file.id,
                "filename": created_file.original_filename
            },
            "statistics": {
                "total_rows": statistics.get('total_rows', file_info.row_count),
                "total_columns": len(file_info.columns or []),
                "numeric_columns": [
                    col for col, stats in statistics.get('columns', {}).items()
                    if stats.get('type', '').startswith(('int', 'float'))
                ],
                "categorical_columns": [
                    col for col, stats in statistics.get('columns', {}).items()
                    if stats.get('type', '').startswith('object')
                ]
            },
            "column_preview": preview_data
        }
        
    except CSVProcessingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )

@router.get("/files")
async def list_files(
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    """
    List all CSV files for the authenticated user.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    files = crud.csv_file.get_by_user(db=db, user_id=current_user.id)
    
    return {
        "files": [
            {
                "id": f.id,
                "filename": f.original_filename,
                "row_count": f.row_count,
                "columns": f.columns,
                "created_at": f.created_at.isoformat() if f.created_at else None
            }
            for f in files
        ]
    }
