"""
CRUD operations for narratives
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, and_, or_

from app.models.narrative import Narrative
from app.schemas.narratives import NarrativeResponse


class NarrativeCRUD:
    
    def create_narrative(
        self, 
        db: Session, 
        narrative_data: NarrativeResponse,
        csv_file_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Narrative:
        """Create a new narrative in the database."""
        
        # Convert NarrativeResponse to database model
        narrative = Narrative(
            title=narrative_data.title,
            summary=narrative_data.summary,
            content=narrative_data.content,
            narrative_type=narrative_data.narrative_type.value,
            csv_file_id=csv_file_id,
            user_id=user_id,
            generation_method=narrative_data.metadata.generation_method.value,
            generation_time_ms=narrative_data.metadata.generation_time_ms,
            data_quality_score=getattr(narrative_data.metadata, 'quality_score', None)
        )
        
        # Set JSON fields
        if narrative_data.key_insights:
            narrative.key_insights = [insight.dict() for insight in narrative_data.key_insights]
        
        if narrative_data.recommendations:
            narrative.recommendations = narrative_data.recommendations
        
        if narrative_data.sections:
            narrative.sections = [section.dict() for section in narrative_data.sections]
        
        if narrative_data.metadata:
            narrative.metadata = narrative_data.metadata.dict()
        
        db.add(narrative)
        db.commit()
        db.refresh(narrative)
        
        return narrative
    
    def get_narrative(self, db: Session, narrative_id: int) -> Optional[Narrative]:
        """Get a narrative by ID."""
        return db.query(Narrative).filter(Narrative.id == narrative_id).first()
    
    def get_narratives(
        self, 
        db: Session, 
        user_id: Optional[int] = None,
        csv_file_id: Optional[int] = None,
        narrative_type: Optional[str] = None,
        is_favorite: Optional[bool] = None,
        is_archived: Optional[bool] = None,
        tags: Optional[List[str]] = None,
        limit: int = 20,
        offset: int = 0,
        order_by: str = "created_at",
        order_desc: bool = True
    ) -> List[Narrative]:
        """Get narratives with filtering and pagination."""
        
        query = db.query(Narrative)
        
        # Apply filters
        if user_id is not None:
            query = query.filter(Narrative.user_id == user_id)
        
        if csv_file_id is not None:
            query = query.filter(Narrative.csv_file_id == csv_file_id)
        
        if narrative_type is not None:
            query = query.filter(Narrative.narrative_type == narrative_type)
        
        if is_favorite is not None:
            query = query.filter(Narrative.is_favorite == is_favorite)
        
        if is_archived is not None:
            query = query.filter(Narrative.is_archived == is_archived)
        
        if tags:
            # Filter by tags (OR condition for any matching tag)
            tag_conditions = []
            for tag in tags:
                tag_conditions.append(Narrative.tags.contains(tag))
            query = query.filter(or_(*tag_conditions))
        
        # Apply ordering
        if hasattr(Narrative, order_by):
            order_column = getattr(Narrative, order_by)
            if order_desc:
                query = query.order_by(desc(order_column))
            else:
                query = query.order_by(asc(order_column))
        
        # Apply pagination
        return query.offset(offset).limit(limit).all()
    
    def update_narrative(
        self, 
        db: Session, 
        narrative_id: int, 
        update_data: Dict[str, Any]
    ) -> Optional[Narrative]:
        """Update a narrative."""
        
        narrative = self.get_narrative(db, narrative_id)
        if not narrative:
            return None
        
        # Update allowed fields
        allowed_fields = [
            'title', 'summary', 'content', 'is_favorite', 
            'is_archived', 'tags', 'key_insights', 'recommendations'
        ]
        
        for field, value in update_data.items():
            if field in allowed_fields and hasattr(narrative, field):
                setattr(narrative, field, value)
        
        db.commit()
        db.refresh(narrative)
        
        return narrative
    
    def delete_narrative(self, db: Session, narrative_id: int) -> bool:
        """Delete a narrative."""
        
        narrative = self.get_narrative(db, narrative_id)
        if not narrative:
            return False
        
        db.delete(narrative)
        db.commit()
        
        return True
    
    def toggle_favorite(self, db: Session, narrative_id: int) -> Optional[bool]:
        """Toggle favorite status of a narrative."""
        
        narrative = self.get_narrative(db, narrative_id)
        if not narrative:
            return None
        
        narrative.is_favorite = not narrative.is_favorite
        db.commit()
        
        return narrative.is_favorite
    
    def archive_narrative(self, db: Session, narrative_id: int, archive: bool = True) -> Optional[bool]:
        """Archive or unarchive a narrative."""
        
        narrative = self.get_narrative(db, narrative_id)
        if not narrative:
            return None
        
        narrative.is_archived = archive
        db.commit()
        
        return narrative.is_archived
    
    def search_narratives(
        self, 
        db: Session, 
        search_query: str,
        user_id: Optional[int] = None,
        limit: int = 20
    ) -> List[Narrative]:
        """Search narratives by title, summary, or content."""
        
        query = db.query(Narrative)
        
        if user_id is not None:
            query = query.filter(Narrative.user_id == user_id)
        
        # Search in title, summary, and content
        search_filter = or_(
            Narrative.title.contains(search_query),
            Narrative.summary.contains(search_query),
            Narrative.content.contains(search_query)
        )
        
        query = query.filter(search_filter)
        query = query.order_by(desc(Narrative.updated_at))
        
        return query.limit(limit).all()
    
    def get_narrative_stats(self, db: Session, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Get statistics about narratives."""
        
        query = db.query(Narrative)
        
        if user_id is not None:
            query = query.filter(Narrative.user_id == user_id)
        
        total_count = query.count()
        favorites_count = query.filter(Narrative.is_favorite == True).count()
        archived_count = query.filter(Narrative.is_archived == True).count()
        
        # Count by narrative type
        type_counts = {}
        for narrative_type in ['statistical_test', 'data_summary', 'visualization']:
            count = query.filter(Narrative.narrative_type == narrative_type).count()
            if count > 0:
                type_counts[narrative_type] = count
        
        # Average insights per narrative
        narratives_with_insights = query.filter(Narrative.insights_count > 0).all()
        avg_insights = 0
        if narratives_with_insights:
            avg_insights = sum(n.insights_count for n in narratives_with_insights) / len(narratives_with_insights)
        
        # Most used tags
        all_narratives = query.filter(Narrative.tags.isnot(None)).all()
        tag_counts = {}
        for narrative in all_narratives:
            for tag in narrative.tag_list:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            'total_narratives': total_count,
            'favorites': favorites_count,
            'archived': archived_count,
            'by_type': type_counts,
            'average_insights': round(avg_insights, 1),
            'top_tags': top_tags
        }
    
    def get_recent_narratives(
        self, 
        db: Session, 
        user_id: Optional[int] = None, 
        limit: int = 5
    ) -> List[Narrative]:
        """Get recently created narratives."""
        
        query = db.query(Narrative)
        
        if user_id is not None:
            query = query.filter(Narrative.user_id == user_id)
        
        query = query.filter(Narrative.is_archived == False)
        query = query.order_by(desc(Narrative.created_at))
        
        return query.limit(limit).all()


# Create a global instance
narrative_crud = NarrativeCRUD()