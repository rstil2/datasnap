from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app import crud
from app.api import deps
from app.models.user import User
from app.schemas.visualizations import (
    ScatterPlotRequest,
    HistogramRequest,
    BoxplotRequest,
    BarChartRequest,
    LineChartRequest,
    VisualizationResponse,
    ChartSuggestionsResponse
)
from app.services.visualization_service import VisualizationService

router = APIRouter()

async def get_optional_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(deps.get_db),
) -> Optional[User]:
    """Get current user if authenticated, otherwise return None"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.replace("Bearer ", "")
        return await deps.get_current_user(token=token, db=db)
    except (HTTPException, Exception):
        return None


@router.post("/scatter", response_model=VisualizationResponse)
async def create_scatter_plot(
    request: ScatterPlotRequest,
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> VisualizationResponse:
    """
    Create a scatter plot visualization.
    
    Plots two numeric variables against each other, with optional color and size grouping.
    """
    # Get the file
    csv_file = crud.csv_file.get(db=db, id=request.file_id)
    if not csv_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check ownership if user is authenticated
    if current_user:
        if csv_file.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this file"
            )
    
    try:
        result = await VisualizationService.create_scatter_plot(
            file_path=csv_file.file_path,
            x_column=request.x_column,
            y_column=request.y_column,
            color_column=request.color_column,
            size_column=request.size_column,
            title=request.title,
            x_label=request.x_label,
            y_label=request.y_label,
            color_scheme=request.color_scheme
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error creating scatter plot: {str(e)}"
        )


@router.post("/histogram", response_model=VisualizationResponse)
async def create_histogram(
    request: HistogramRequest,
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> VisualizationResponse:
    """
    Create a histogram visualization.
    
    Shows the distribution of a numeric variable, with optional grouping.
    """
    # Get the file
    csv_file = crud.csv_file.get(db=db, id=request.file_id)
    if not csv_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check ownership if user is authenticated
    if current_user:
        if csv_file.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this file"
            )
    
    try:
        result = await VisualizationService.create_histogram(
            file_path=csv_file.file_path,
            column=request.column,
            bins=request.bins,
            group_column=request.group_column,
            title=request.title,
            x_label=request.x_label,
            y_label=request.y_label,
            color_scheme=request.color_scheme
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error creating histogram: {str(e)}"
        )


@router.post("/boxplot", response_model=VisualizationResponse)
async def create_boxplot(
    request: BoxplotRequest,
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> VisualizationResponse:
    """
    Create a boxplot visualization.
    
    Shows the distribution and outliers of a numeric variable, with optional grouping.
    """
    # Get the file
    csv_file = crud.csv_file.get(db=db, id=request.file_id)
    if not csv_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check ownership if user is authenticated
    if current_user:
        if csv_file.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this file"
            )
    
    try:
        result = await VisualizationService.create_boxplot(
            file_path=csv_file.file_path,
            y_column=request.y_column,
            x_column=request.x_column,
            title=request.title,
            x_label=request.x_label,
            y_label=request.y_label,
            color_scheme=request.color_scheme
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error creating boxplot: {str(e)}"
        )


@router.get("/suggestions/{file_id}", response_model=ChartSuggestionsResponse)
async def get_chart_suggestions(
    file_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> ChartSuggestionsResponse:
    """
    Get chart suggestions based on data characteristics.
    
    Analyzes the dataset and suggests appropriate chart types with confidence scores.
    """
    # Get the file
    csv_file = crud.csv_file.get(db=db, id=file_id)
    if not csv_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check ownership if user is authenticated
    if current_user:
        if csv_file.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this file"
            )
    
    try:
        result = await VisualizationService.suggest_charts(
            file_path=csv_file.file_path
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error analyzing data for suggestions: {str(e)}"
        )