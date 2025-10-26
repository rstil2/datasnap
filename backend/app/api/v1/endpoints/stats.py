from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.api import deps
from app.models.user import User
from app.services.stats_service import compute_descriptive_stats

router = APIRouter()

@router.get("/{file_id}")
async def get_descriptive_stats(
    *,
    file_id: int,
    db: Session = Depends(deps.get_db),
) -> Dict[str, Any]:
    # TODO: Remove this temporary bypass for Module 2 development
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
    
    # TODO: Remove this temporary bypass - check ownership when auth is restored
    # For Module 2 development, allow access to any file with user_id=1
    if csv_file.user_id != 1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Compute stats
    try:
        stats = await compute_descriptive_stats(csv_file.file_path)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )