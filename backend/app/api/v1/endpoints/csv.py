import pandas as pd
import io
from typing import Dict, Any
from fastapi import APIRouter, File, HTTPException, UploadFile, status

router = APIRouter()

@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """
    Upload and process a CSV file - simplified version for demo.
    """
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only CSV files are allowed"
            )
        
        # Read CSV content
        content = await file.read()
        
        # Parse CSV
        try:
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error parsing CSV: {str(e)}"
            )
        
        # Basic validation
        if len(df) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV file is empty"
            )
        
        # Generate basic statistics
        stats = {
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": df.columns.tolist(),
            "numeric_columns": df.select_dtypes(include=['number']).columns.tolist(),
            "categorical_columns": df.select_dtypes(include=['object']).columns.tolist()
        }
        
        # Generate preview data
        preview = df.head(5).to_dict('records')
        
        return {
            "message": "File uploaded successfully",
            "file": {
                "id": 1,  # Mock ID
                "filename": file.filename
            },
            "statistics": {
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "numeric_columns": df.select_dtypes(include=['number']).columns.tolist(),
                "categorical_columns": df.select_dtypes(include=['object']).columns.tolist()
            },
            "column_preview": preview
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )

@router.get("/files")
def list_files():
    """
    List all CSV files - simplified for demo.
    """
    return {"files": [], "message": "File listing coming soon"}
