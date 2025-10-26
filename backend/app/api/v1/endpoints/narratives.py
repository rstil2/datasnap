"""
API endpoints for narrative generation (Module 5).
Provides endpoints for generating AI-powered narratives from statistical results and data analysis.
"""

from typing import List, Union, Optional
from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.narrative_service import NarrativeService
from app.crud.narrative import narrative_crud
from app.schemas.narratives import (
    StatisticalTestNarrativeRequest, DataSummaryNarrativeRequest, 
    VisualizationNarrativeRequest, NarrativeResponse, BatchNarrativeRequest,
    BatchNarrativeResponse, NarrativeError
)

router = APIRouter()


@router.post("/statistical-test", response_model=NarrativeResponse)
async def generate_statistical_narrative(
    request: StatisticalTestNarrativeRequest,
    db: Session = Depends(get_db)
) -> NarrativeResponse:
    """
    Generate narrative for statistical test results.
    
    Creates human-readable explanations of statistical test outcomes including:
    - Plain English interpretation of results
    - Practical significance assessment  
    - Actionable recommendations
    - Key insights with confidence levels
    """
    try:
        service = NarrativeService(db)
        return service.generate_narrative(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate statistical narrative: {str(e)}"
        )


@router.post("/data-summary", response_model=NarrativeResponse)
async def generate_data_summary_narrative(
    request: DataSummaryNarrativeRequest,
    db: Session = Depends(get_db)
) -> NarrativeResponse:
    """
    Generate narrative for dataset overview and quality assessment.
    
    Creates comprehensive data quality reports including:
    - Dataset composition and structure
    - Missing values and outlier analysis
    - Data quality scoring and recommendations
    - Readiness assessment for analysis
    """
    try:
        service = NarrativeService(db)
        return service.generate_narrative(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate data summary narrative: {str(e)}"
        )


@router.post("/visualization", response_model=NarrativeResponse) 
async def generate_visualization_narrative(
    request: VisualizationNarrativeRequest,
    db: Session = Depends(get_db)
) -> NarrativeResponse:
    """
    Generate narrative for visualization analysis.
    
    Creates descriptive explanations of chart patterns including:
    - Visual pattern identification
    - Trend and relationship descriptions
    - Accessibility-friendly chart descriptions
    - Insights derived from visual analysis
    """
    try:
        service = NarrativeService(db)
        return service.generate_narrative(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate visualization narrative: {str(e)}"
        )


@router.post("/batch", response_model=BatchNarrativeResponse)
async def generate_batch_narratives(
    request: BatchNarrativeRequest,
    db: Session = Depends(get_db)
) -> BatchNarrativeResponse:
    """
    Generate multiple narratives in a single request.
    
    Efficiently processes multiple analysis results and optionally:
    - Combines insights across all narratives
    - Generates executive summary
    - Maintains consistent narrative style
    - Optimizes for batch processing performance
    """
    try:
        service = NarrativeService(db)
        narratives = []
        total_time = 0
        combined_insights = []
        
        # Process each narrative request
        for narrative_request in request.requests:
            narrative = service.generate_narrative(narrative_request)
            narratives.append(narrative)
            total_time += narrative.metadata.generation_time_ms or 0
            
            if request.combine_insights:
                combined_insights.extend(narrative.key_insights)
        
        # Sort and deduplicate insights if combining
        if request.combine_insights:
            # Sort by priority and confidence, remove duplicates
            unique_insights = []
            seen_titles = set()
            
            for insight in sorted(combined_insights, 
                                key=lambda x: (x.priority.value, x.confidence.value), reverse=True):
                if insight.title not in seen_titles:
                    unique_insights.append(insight)
                    seen_titles.add(insight.title)
            
            combined_insights = unique_insights[:10]  # Limit to top 10 insights
        
        # Generate executive summary if requested
        executive_summary = None
        if request.combine_insights and narratives:
            executive_summary = f"Analysis of {len(narratives)} components reveals {len(combined_insights)} key insights. "
            if any(insight.priority.value == "critical" for insight in combined_insights):
                executive_summary += "Critical findings require immediate attention. "
            executive_summary += "See detailed narratives below for complete analysis."
        
        return BatchNarrativeResponse(
            narratives=narratives,
            combined_insights=combined_insights if request.combine_insights else [],
            executive_summary=executive_summary,
            total_generation_time_ms=total_time
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate batch narratives: {str(e)}"
        )


@router.get("/templates")
async def list_available_templates():
    """
    List available narrative templates and their capabilities.
    
    Returns information about:
    - Template types and supported statistical tests
    - Required and optional fields for each template
    - Template versions and update history
    - Usage examples and documentation
    """
    from app.templates.narrative_templates import NARRATIVE_TEMPLATES
    
    templates_info = []
    for key, template in NARRATIVE_TEMPLATES.items():
        templates_info.append({
            "template_id": template.template_id,
            "narrative_type": template.narrative_type,
            "test_types": template.test_types,
            "required_fields": template.required_fields,
            "optional_fields": template.optional_fields,
            "version": template.version,
            "priority": template.priority,
            "conditions": template.conditions
        })
    
    return {
        "available_templates": templates_info,
        "total_templates": len(templates_info)
    }


@router.post("/test-template/{template_id}")
async def test_narrative_template(
    template_id: str,
    test_data: dict,
    db: Session = Depends(get_db)
):
    """
    Test a specific narrative template with sample data.
    
    Useful for:
    - Template development and debugging
    - Previewing narrative output
    - Validating template requirements
    - Testing edge cases and error handling
    """
    try:
        from app.templates.narrative_templates import NARRATIVE_TEMPLATES
        
        if template_id not in NARRATIVE_TEMPLATES:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template '{template_id}' not found"
            )
        
        # Create a test request based on template type and test data
        template = NARRATIVE_TEMPLATES[template_id]
        
        if template.narrative_type.value == "statistical_test":
            request = StatisticalTestNarrativeRequest(**test_data)
        elif template.narrative_type.value == "data_summary":
            request = DataSummaryNarrativeRequest(**test_data)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Template type '{template.narrative_type}' not supported for testing"
            )
        
        service = NarrativeService(db)
        return service.generate_narrative(request)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid test data: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test template: {str(e)}"
        )


@router.get("/health")
async def narrative_service_health(db: Session = Depends(get_db)):
    """
    Check health and status of narrative generation service.
    
    Returns:
    - Service availability and response time
    - Template system status
    - AI integration status (when implemented)
    - Resource usage and performance metrics
    """
    import time
    start_time = time.time()
    
    try:
        # Test basic service functionality
        service = NarrativeService(db)
        
        # Test template system
        test_request = StatisticalTestNarrativeRequest(
            narrative_type="statistical_test",
            test_name="Independent T-Test",
            test_statistic=1.0,
            p_value=0.05,
            sample_size=100
        )
        
        # This should complete quickly with templates
        response = service.generate_narrative(test_request)
        response_time = int((time.time() - start_time) * 1000)
        
        from app.templates.narrative_templates import NARRATIVE_TEMPLATES
        
        return {
            "status": "healthy",
            "response_time_ms": response_time,
            "template_system": "operational",
            "available_templates": len(NARRATIVE_TEMPLATES),
            "ai_integration": "not_implemented",  # Will be updated when AI is added
            "generation_methods": ["template", "hybrid"],
            "timestamp": start_time
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "response_time_ms": int((time.time() - start_time) * 1000),
            "timestamp": start_time
        }


# Narrative Storage Endpoints

@router.post("/save", response_model=dict)
async def save_narrative(
    narrative: NarrativeResponse,
    csv_file_id: Optional[int] = None,
    user_id: Optional[int] = None,
    tags: Optional[List[str]] = None,
    db: Session = Depends(get_db)
):
    """
    Save a generated narrative to the database.
    
    Allows users to persist narratives for later retrieval and sharing.
    Supports tagging and linking to source CSV files.
    """
    try:
        # Create narrative in database
        saved_narrative = narrative_crud.create_narrative(
            db=db,
            narrative_data=narrative,
            csv_file_id=csv_file_id,
            user_id=user_id
        )
        
        # Add tags if provided
        if tags:
            saved_narrative.tag_list = tags
            db.commit()
            db.refresh(saved_narrative)
        
        return {
            "narrative_id": saved_narrative.id,
            "message": "Narrative saved successfully",
            "created_at": saved_narrative.created_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save narrative: {str(e)}"
        )


@router.get("/{narrative_id}", response_model=NarrativeResponse)
async def get_narrative(
    narrative_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieve a saved narrative by ID.
    
    Returns the complete narrative with all metadata, insights, and recommendations.
    """
    try:
        narrative = narrative_crud.get_narrative(db=db, narrative_id=narrative_id)
        
        if not narrative:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Narrative with ID {narrative_id} not found"
            )
        
        # Convert database model back to NarrativeResponse
        return narrative.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve narrative: {str(e)}"
        )


@router.get("/list", response_model=List[dict])
async def list_narratives(
    user_id: Optional[int] = None,
    csv_file_id: Optional[int] = None,
    narrative_type: Optional[str] = None,
    is_favorite: Optional[bool] = None,
    is_archived: Optional[bool] = None,
    tags: Optional[List[str]] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    order_by: str = Query("created_at"),
    order_desc: bool = Query(True),
    db: Session = Depends(get_db)
):
    """
    List saved narratives with filtering and pagination.
    
    Supports filtering by user, CSV file, type, favorite status, archive status, and tags.
    Results are paginated and can be ordered by various fields.
    """
    try:
        narratives = narrative_crud.get_narratives(
            db=db,
            user_id=user_id,
            csv_file_id=csv_file_id,
            narrative_type=narrative_type,
            is_favorite=is_favorite,
            is_archived=is_archived,
            tags=tags,
            limit=limit,
            offset=offset,
            order_by=order_by,
            order_desc=order_desc
        )
        
        return [{
            "id": n.id,
            "title": n.title,
            "summary": n.summary,
            "narrative_type": n.narrative_type,
            "insights_count": n.insights_count,
            "patterns_count": n.patterns_count,
            "data_quality_score": n.data_quality_score,
            "is_favorite": n.is_favorite,
            "is_archived": n.is_archived,
            "tags": n.tag_list,
            "created_at": n.created_at.isoformat(),
            "updated_at": n.updated_at.isoformat()
        } for n in narratives]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list narratives: {str(e)}"
        )


@router.put("/{narrative_id}", response_model=dict)
async def update_narrative(
    narrative_id: int,
    update_data: dict,
    db: Session = Depends(get_db)
):
    """
    Update a saved narrative.
    
    Allows updating title, summary, content, favorite status, archive status, and tags.
    """
    try:
        updated_narrative = narrative_crud.update_narrative(
            db=db,
            narrative_id=narrative_id,
            update_data=update_data
        )
        
        if not updated_narrative:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Narrative with ID {narrative_id} not found"
            )
        
        return {
            "narrative_id": updated_narrative.id,
            "message": "Narrative updated successfully",
            "updated_at": updated_narrative.updated_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update narrative: {str(e)}"
        )


@router.delete("/{narrative_id}", response_model=dict)
async def delete_narrative(
    narrative_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a saved narrative.
    
    Permanently removes the narrative from the database.
    """
    try:
        success = narrative_crud.delete_narrative(db=db, narrative_id=narrative_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Narrative with ID {narrative_id} not found"
            )
        
        return {
            "message": "Narrative deleted successfully",
            "narrative_id": narrative_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete narrative: {str(e)}"
        )


@router.post("/{narrative_id}/favorite", response_model=dict)
async def toggle_favorite(
    narrative_id: int,
    db: Session = Depends(get_db)
):
    """
    Toggle the favorite status of a narrative.
    
    Returns the new favorite status.
    """
    try:
        is_favorite = narrative_crud.toggle_favorite(db=db, narrative_id=narrative_id)
        
        if is_favorite is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Narrative with ID {narrative_id} not found"
            )
        
        return {
            "narrative_id": narrative_id,
            "is_favorite": is_favorite,
            "message": f"Narrative {'added to' if is_favorite else 'removed from'} favorites"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle favorite: {str(e)}"
        )


@router.get("/search", response_model=List[dict])
async def search_narratives(
    q: str = Query(..., description="Search query"),
    user_id: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Search narratives by title, summary, or content.
    
    Performs full-text search across narrative fields.
    """
    try:
        narratives = narrative_crud.search_narratives(
            db=db,
            search_query=q,
            user_id=user_id,
            limit=limit
        )
        
        return [{
            "id": n.id,
            "title": n.title,
            "summary": n.summary,
            "narrative_type": n.narrative_type,
            "insights_count": n.insights_count,
            "created_at": n.created_at.isoformat(),
            "relevance_score": 1.0  # Could implement proper scoring later
        } for n in narratives]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search narratives: {str(e)}"
        )


@router.get("/stats", response_model=dict)
async def get_narrative_stats(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get statistics about saved narratives.
    
    Returns counts by type, favorite status, average insights, and top tags.
    """
    try:
        stats = narrative_crud.get_narrative_stats(db=db, user_id=user_id)
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get narrative statistics: {str(e)}"
        )
