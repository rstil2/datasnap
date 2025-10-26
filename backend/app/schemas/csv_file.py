from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class CSVFileBase(BaseModel):
    filename: str
    original_filename: str
    row_count: Optional[int] = None
    columns: Optional[List[str]] = None

class CSVFileCreate(CSVFileBase):
    pass

class CSVFileUpdate(CSVFileBase):
    pass

class CSVFile(CSVFileBase):
    id: int
    user_id: int
    file_path: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CSVUploadResponse(BaseModel):
    file: CSVFile
    column_preview: List[dict]  # First few rows of data
    statistics: dict  # Basic statistics about the file