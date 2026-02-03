from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app import crud
from app.api import deps
from app.models.user import User
from app.services.stats_service import compute_descriptive_stats

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

@router.get("/{file_id}")
async def get_descriptive_stats(
    *,
    file_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    """
    Get descriptive statistics for a CSV file.
    Returns:
    - Numeric columns: count, mean, std, min, 25%, 50%, 75%, max
    - Categorical columns: count, unique values, top values and their frequencies
    - Missing value counts for all columns
    """
    # Get the file
    csv_file = crud.csv_file.get(db=db, id=file_id)
    if not csv_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check ownership if user is authenticated
    if current_user:
        if csv_file.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this file"
            )
    # For unauthenticated access, allow access (for backward compatibility)
    # In production, you may want to require authentication
    
    # Compute stats
    try:
        stats = await compute_descriptive_stats(csv_file.file_path)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
