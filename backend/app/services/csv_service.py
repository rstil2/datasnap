import os
import uuid
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app import crud
from app.core.config import settings
from app.schemas.csv_file import CSVFileCreate

UPLOAD_DIR = Path(settings.UPLOAD_DIR)
PREVIEW_ROWS = 5
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

class CSVValidationError(Exception):
    pass

async def process_csv_file(
    file: UploadFile,
    user_id: int,
    db: Session
) -> Tuple[CSVFileCreate, pd.DataFrame, Dict]:
    """
    Process and validate a CSV file.
    Returns a tuple of (file_info, preview_data, statistics).
    """
    if not file.filename.endswith('.csv'):
        raise CSVValidationError("File must be a CSV")

    # Create unique filename
    unique_filename = f"{uuid.uuid4()}.csv"
    file_path = UPLOAD_DIR / unique_filename

    # Ensure upload directory exists
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Save file
    file_size = 0
    with open(file_path, "wb") as buffer:
        while content := await file.read(8192):
            file_size += len(content)
            if file_size > MAX_FILE_SIZE:
                os.unlink(file_path)
                raise CSVValidationError("File too large")
            buffer.write(content)

    try:
        # Read CSV with pandas
        df = pd.read_csv(file_path)
        
        # Basic validation
        if len(df.columns) < 1:
            raise CSVValidationError("CSV must have at least one column")
        
        if len(df) < 1:
            raise CSVValidationError("CSV must have at least one row")

        # Create file info
        file_info = CSVFileCreate(
            filename=unique_filename,
            original_filename=file.filename,
            row_count=len(df),
            columns=df.columns.tolist()
        )

        # Generate preview and statistics
        preview_data = df.head(PREVIEW_ROWS).to_dict('records')
        statistics = {
            'total_rows': len(df),
            'total_columns': len(df.columns),
            'columns': {
                col: {
                    'type': str(df[col].dtype),
                    'missing': int(df[col].isna().sum()),
                    'unique': int(df[col].nunique())
                }
                for col in df.columns
            }
        }

        return file_info, preview_data, statistics

    except Exception as e:
        # Clean up file if processing fails
        os.unlink(file_path)
        raise CSVValidationError(f"Error processing CSV: {str(e)}")

def get_file_path(filename: str) -> Path:
    """Get the full path for a file in the upload directory."""
    return UPLOAD_DIR / filename