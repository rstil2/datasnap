import json
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from app.db.base import Base

class CSVFile(Base):
    __tablename__ = "csv_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    row_count = Column(Integer, nullable=True)
    _columns = Column("columns", String, nullable=True)  # JSON string of column names
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="csv_files")
    narratives = relationship("Narrative", back_populates="csv_file")
    
    @property
    def columns(self) -> Optional[List[str]]:
        """Return columns as a list, parsing from JSON if needed."""
        if self._columns:
            try:
                return json.loads(self._columns)
            except (json.JSONDecodeError, TypeError):
                return None
        return None
    
    @columns.setter
    def columns(self, value: Optional[List[str]]) -> None:
        """Set columns, converting to JSON string."""
        if value:
            self._columns = json.dumps(value)
        else:
            self._columns = None
