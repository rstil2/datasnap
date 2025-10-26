import json
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple, Any
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.crud.csv_file import create as create_csv_file
from app.schemas.csv_file import CSVFileCreate

UPLOAD_DIR = Path(settings.UPLOAD_DIR)
PREVIEW_ROWS = 5
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
MAX_ROWS_FREE_TIER = 1000  # Free tier row limit

class CSVProcessingError(Exception):
    pass

def get_column_stats(df: pd.DataFrame, column: str) -> Dict[str, Any]:
    """Calculate statistics for a single column."""
    series = df[column]
    stats = {
        "type": str(series.dtype),
        "missing": int(series.isna().sum()),
        "unique": int(series.nunique()),
    }
    
    # Add numeric statistics if applicable
    if pd.api.types.is_numeric_dtype(series):
        stats.update({
            "mean": float(series.mean()) if not pd.isna(series.mean()) else None,
            "std": float(series.std()) if not pd.isna(series.std()) else None,
            "min": float(series.min()) if not pd.isna(series.min()) else None,
            "max": float(series.max()) if not pd.isna(series.max()) else None,
        })
    
    return stats

async def process_csv_file(
    file: UploadFile,
    user_id: int,
    db: Session,
    user_is_premium: bool = False,
) -> Tuple[CSVFileCreate, List[Dict[str, Any]], Dict[str, Any]]:
    """
    Process and validate a CSV file.
    Returns a tuple of (file_info, preview_data, statistics).
    """
    if not file.filename.lower().endswith('.csv'):
        raise CSVProcessingError("File must be a CSV")

    # Create unique filename using timestamp and original name
    unique_filename = f"{user_id}_{Path(file.filename).stem}_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.csv"
    file_path = UPLOAD_DIR / unique_filename

    # Ensure upload directory exists
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Save file
    file_size = 0
    try:
        with open(file_path, "wb") as buffer:
            while content := await file.read(8192):
                file_size += len(content)
                if file_size > MAX_FILE_SIZE:
                    raise CSVProcessingError("File too large (max 50MB)")
                buffer.write(content)
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise CSVProcessingError(f"Error saving file: {str(e)}")

    try:
        # Read CSV with pandas
        df = pd.read_csv(file_path)
        
        # Basic validation
        if len(df.columns) < 1:
            raise CSVProcessingError("CSV must have at least one column")
        
        if len(df) < 1:
            raise CSVProcessingError("CSV must have at least one row")
        
        # Check row limit for free tier
        if not user_is_premium and len(df) > MAX_ROWS_FREE_TIER:
            raise CSVProcessingError(
                f"Free tier is limited to {MAX_ROWS_FREE_TIER:,} rows. "
                "Please upgrade to process larger datasets."
            )

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
                col: get_column_stats(df, col)
                for col in df.columns
            }
        }

        # Save to database
        db_file = create_csv_file(
            db=db,
            obj_in=file_info,
            user_id=user_id,
            file_path=str(file_path)
        )

        return file_info, preview_data, statistics

    except pd.errors.EmptyDataError:
        raise CSVProcessingError("The CSV file is empty")
    except pd.errors.ParserError:
        raise CSVProcessingError("Error parsing CSV file. Please check the file format")
    except Exception as e:
        raise CSVProcessingError(f"Error processing CSV: {str(e)}")
    finally:
        # If any error occurred after file was saved, clean up
        if 'db_file' not in locals() and file_path.exists():
            file_path.unlink()

def get_file_path(filename: str) -> Path:
    """Get the full path for a file in the upload directory."""
    return UPLOAD_DIR / filename