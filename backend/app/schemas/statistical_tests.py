from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class OneSampleTTestRequest(BaseModel):
    file_id: int = Field(..., description="ID of the uploaded CSV file")
    variable_column: str = Field(..., description="Column name for the test variable")
    test_value: float = Field(..., description="Value to test against (null hypothesis)")
    alpha: float = Field(0.05, description="Significance level", ge=0.001, le=0.5)


class IndependentTTestRequest(BaseModel):
    file_id: int = Field(..., description="ID of the uploaded CSV file")
    variable_column: str = Field(..., description="Column name for the test variable")
    group_column: str = Field(..., description="Column name for the grouping variable")
    alpha: float = Field(0.05, description="Significance level", ge=0.001, le=0.5)


class PairedTTestRequest(BaseModel):
    file_id: int = Field(..., description="ID of the uploaded CSV file")
    variable1_column: str = Field(..., description="Column name for first variable")
    variable2_column: str = Field(..., description="Column name for second variable")
    alpha: float = Field(0.05, description="Significance level", ge=0.001, le=0.5)


class OneWayAnovaRequest(BaseModel):
    file_id: int = Field(..., description="ID of the uploaded CSV file")
    variable_column: str = Field(..., description="Column name for the dependent variable")
    group_column: str = Field(..., description="Column name for the grouping variable")
    alpha: float = Field(0.05, description="Significance level", ge=0.001, le=0.5)


class StatisticalTestResult(BaseModel):
    test_name: str = Field(..., description="Name of the statistical test performed")
    test_statistic: float = Field(..., description="The calculated test statistic")
    degrees_of_freedom: Optional[float] = Field(None, description="Degrees of freedom")
    p_value: float = Field(..., description="P-value of the test")
    confidence_interval_lower: Optional[float] = Field(None, description="Lower bound of confidence interval")
    confidence_interval_upper: Optional[float] = Field(None, description="Upper bound of confidence interval")
    effect_size: Optional[float] = Field(None, description="Effect size (Cohen's d for t-tests)")
    interpretation: str = Field(..., description="Plain English interpretation of results")
    sample_size: int = Field(..., description="Total sample size used in the test")
    group_statistics: Optional[Dict[str, Any]] = Field(None, description="Descriptive statistics by group")


class StatisticalTestError(BaseModel):
    error: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Type of error (validation, computation, etc.)")
    suggestions: List[str] = Field(default_factory=list, description="Suggestions to fix the error")