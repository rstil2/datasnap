from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class FileBase(BaseModel):
    filename: str
    content_type: str
    file_size: int


class FileCreate(FileBase):
    pass


class FileUpdate(FileBase):
    filename: Optional[str] = None
    content_type: Optional[str] = None
    file_size: Optional[int] = None


class File(FileBase):
    id: str
    file_path: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)