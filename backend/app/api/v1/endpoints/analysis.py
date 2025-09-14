from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.file import get_file
from app.services.analysis import (
    analyze_csv,
    get_data_preview,
    get_column_statistics,
    detect_anomalies
)

router = APIRouter()


@router.post("/{file_id}/analyze")
async def analyze_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict:
    """Analyze a CSV file and return descriptive statistics and visualizations."""
    db_file = get_file(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    if db_file.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        analysis_results = analyze_csv(db_file.file_path)
        return analysis_results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{file_id}/preview")
async def get_file_preview(
    file_id: str,
    rows: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict:
    """Get a preview of the CSV data."""
    db_file = get_file(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    if db_file.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        preview = get_data_preview(db_file.file_path, rows)
        return preview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{file_id}/columns/{column_name}")
async def get_column_stats(
    file_id: str,
    column_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict:
    """Get detailed statistics for a specific column."""
    db_file = get_file(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    if db_file.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        stats = get_column_statistics(db_file.file_path, column_name)
        return stats
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{file_id}/columns/{column_name}/anomalies")
async def get_column_anomalies(
    file_id: str,
    column_name: str,
    threshold: float = 1.5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict:
    """Detect anomalies in a numeric column."""
    db_file = get_file(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    if db_file.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        anomalies = detect_anomalies(db_file.file_path, column_name, threshold)
        return anomalies
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))