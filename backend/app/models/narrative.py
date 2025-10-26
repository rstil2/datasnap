"""
SQLAlchemy model for narrative storage
"""

import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Boolean, Float
from sqlalchemy.orm import relationship

from app.db.base import Base

class Narrative(Base):
    __tablename__ = "narratives"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    summary = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    narrative_type = Column(String(50), nullable=False)  # 'statistical_test', 'data_summary', etc.
    
    # JSON fields stored as TEXT
    _key_insights = Column("key_insights", Text, nullable=True)
    _recommendations = Column("recommendations", Text, nullable=True) 
    _sections = Column("sections", Text, nullable=True)
    _metadata = Column("metadata", Text, nullable=True)
    _patterns = Column("patterns", Text, nullable=True)  # AI-detected patterns
    
    # Relationships and metadata
    csv_file_id = Column(Integer, ForeignKey("csv_files.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Generation details
    generation_method = Column(String(50), nullable=False, default='template')
    generation_time_ms = Column(Integer, nullable=True)
    data_quality_score = Column(Float, nullable=True)
    insights_count = Column(Integer, nullable=False, default=0)
    patterns_count = Column(Integer, nullable=False, default=0)
    
    # Storage metadata
    is_favorite = Column(Boolean, nullable=False, default=False)
    is_archived = Column(Boolean, nullable=False, default=False)
    tags = Column(String(500), nullable=True)  # Comma-separated tags
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    csv_file = relationship("CSVFile", back_populates="narratives")
    user = relationship("User", back_populates="narratives")
    
    @property
    def key_insights(self) -> List[Dict[str, Any]]:
        """Return key insights as a list of dictionaries."""
        if self._key_insights:
            try:
                return json.loads(self._key_insights)
            except (json.JSONDecodeError, TypeError):
                return []
        return []
    
    @key_insights.setter
    def key_insights(self, value: List[Dict[str, Any]]) -> None:
        """Set key insights, converting to JSON string."""
        if value:
            self._key_insights = json.dumps(value)
            self.insights_count = len(value)
        else:
            self._key_insights = None
            self.insights_count = 0
    
    @property
    def recommendations(self) -> List[str]:
        """Return recommendations as a list of strings."""
        if self._recommendations:
            try:
                return json.loads(self._recommendations)
            except (json.JSONDecodeError, TypeError):
                return []
        return []
    
    @recommendations.setter
    def recommendations(self, value: List[str]) -> None:
        """Set recommendations, converting to JSON string."""
        if value:
            self._recommendations = json.dumps(value)
        else:
            self._recommendations = None
    
    @property
    def sections(self) -> List[Dict[str, Any]]:
        """Return sections as a list of dictionaries."""
        if self._sections:
            try:
                return json.loads(self._sections)
            except (json.JSONDecodeError, TypeError):
                return []
        return []
    
    @sections.setter
    def sections(self, value: List[Dict[str, Any]]) -> None:
        """Set sections, converting to JSON string."""
        if value:
            self._sections = json.dumps(value)
        else:
            self._sections = None
    
    @property
    def metadata(self) -> Dict[str, Any]:
        """Return metadata as a dictionary."""
        if self._metadata:
            try:
                return json.loads(self._metadata)
            except (json.JSONDecodeError, TypeError):
                return {}
        return {}
    
    @metadata.setter
    def metadata(self, value: Dict[str, Any]) -> None:
        """Set metadata, converting to JSON string."""
        if value:
            self._metadata = json.dumps(value)
        else:
            self._metadata = None
    
    @property
    def patterns(self) -> List[Dict[str, Any]]:
        """Return AI-detected patterns as a list of dictionaries."""
        if self._patterns:
            try:
                return json.loads(self._patterns)
            except (json.JSONDecodeError, TypeError):
                return []
        return []
    
    @patterns.setter
    def patterns(self, value: List[Dict[str, Any]]) -> None:
        """Set patterns, converting to JSON string."""
        if value:
            self._patterns = json.dumps(value)
            self.patterns_count = len(value)
        else:
            self._patterns = None
            self.patterns_count = 0
    
    @property
    def tag_list(self) -> List[str]:
        """Return tags as a list of strings."""
        if self.tags:
            return [tag.strip() for tag in self.tags.split(',') if tag.strip()]
        return []
    
    @tag_list.setter
    def tag_list(self, value: List[str]) -> None:
        """Set tags from a list of strings."""
        if value:
            self.tags = ', '.join(value)
        else:
            self.tags = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert narrative to dictionary for API responses."""
        return {
            'id': self.id,
            'title': self.title,
            'summary': self.summary,
            'content': self.content,
            'narrative_type': self.narrative_type,
            'key_insights': self.key_insights,
            'recommendations': self.recommendations,
            'sections': self.sections,
            'patterns': self.patterns,
            'metadata': {
                **self.metadata,
                'generation_method': self.generation_method,
                'generation_time_ms': self.generation_time_ms,
                'data_quality_score': self.data_quality_score,
                'insights_count': self.insights_count,
                'patterns_count': self.patterns_count,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            },
            'csv_file_id': self.csv_file_id,
            'is_favorite': self.is_favorite,
            'is_archived': self.is_archived,
            'tags': self.tag_list
        }
    
    def __repr__(self) -> str:
        return f"<Narrative(id={self.id}, title='{self.title[:50]}...', type={self.narrative_type})>"