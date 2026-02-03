from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app import crud
from app.api import deps
from app.models.user import User
from app.schemas.statistical_tests import (
    OneSampleTTestRequest,
    IndependentTTestRequest,
    PairedTTestRequest,
    OneWayAnovaRequest,
    StatisticalTestResult,
    StatisticalTestError
)
from app.services.statistical_tests_service import StatisticalTestsService

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


@router.post("/one_sample_ttest", response_model=StatisticalTestResult)
async def perform_one_sample_ttest(
    request: OneSampleTTestRequest,
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> StatisticalTestResult:
    """
    Perform a one-sample t-test.
    
    Tests whether the mean of a single sample differs significantly from a specified value.
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
        result = await StatisticalTestsService.one_sample_ttest(
            file_path=csv_file.file_path,
            variable_column=request.variable_column,
            test_value=request.test_value,
            alpha=request.alpha
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
            detail=f"Unexpected error in one-sample t-test: {str(e)}"
        )


@router.post("/independent_ttest", response_model=StatisticalTestResult)
async def perform_independent_ttest(
    request: IndependentTTestRequest,
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> StatisticalTestResult:
    """
    Perform an independent samples t-test.
    
    Tests whether the means of two independent groups differ significantly.
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
        result = await StatisticalTestsService.independent_ttest(
            file_path=csv_file.file_path,
            variable_column=request.variable_column,
            group_column=request.group_column,
            alpha=request.alpha
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
            detail=f"Unexpected error in independent t-test: {str(e)}"
        )


@router.post("/paired_ttest", response_model=StatisticalTestResult)
async def perform_paired_ttest(
    request: PairedTTestRequest,
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> StatisticalTestResult:
    """
    Perform a paired samples t-test.
    
    Tests whether the means of two related measurements differ significantly.
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
        result = await StatisticalTestsService.paired_ttest(
            file_path=csv_file.file_path,
            variable1_column=request.variable1_column,
            variable2_column=request.variable2_column,
            alpha=request.alpha
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
            detail=f"Unexpected error in paired t-test: {str(e)}"
        )


@router.post("/one_way_anova", response_model=StatisticalTestResult)
async def perform_one_way_anova(
    request: OneWayAnovaRequest,
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> StatisticalTestResult:
    """
    Perform a one-way ANOVA.
    
    Tests whether the means of three or more groups differ significantly.
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
        result = await StatisticalTestsService.one_way_anova(
            file_path=csv_file.file_path,
            variable_column=request.variable_column,
            group_column=request.group_column,
            alpha=request.alpha
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
            detail=f"Unexpected error in one-way ANOVA: {str(e)}"
        )