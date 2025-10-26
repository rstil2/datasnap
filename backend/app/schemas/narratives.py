from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class NarrativeType(str, Enum):
    """Types of narratives that can be generated"""
    STATISTICAL_TEST = "statistical_test"
    DATA_SUMMARY = "data_summary"
    VISUALIZATION = "visualization"
    EXECUTIVE_SUMMARY = "executive_summary"
    PATTERN_ANALYSIS = "pattern_analysis"
    INSIGHT_CARD = "insight_card"


class GenerationMethod(str, Enum):
    """Methods used to generate narratives"""
    TEMPLATE = "template"
    CLOUD_AI = "cloud_ai"
    LOCAL_AI = "local_ai"
    HYBRID = "hybrid"


class ConfidenceLevel(str, Enum):
    """Confidence levels for narrative insights"""
    HIGH = "high"          # Strong statistical significance, clear patterns
    MEDIUM = "medium"      # Moderate evidence, likely patterns
    LOW = "low"           # Weak evidence, uncertain patterns
    UNKNOWN = "unknown"   # Insufficient data or unclear results


class InsightPriority(str, Enum):
    """Priority levels for insights"""
    CRITICAL = "critical"    # Action required
    HIGH = "high"           # Important finding
    MEDIUM = "medium"       # Notable observation
    LOW = "low"            # Minor detail
    INFO = "info"          # Contextual information


# Base request models
class NarrativeRequest(BaseModel):
    """Base request for narrative generation"""
    narrative_type: NarrativeType = Field(..., description="Type of narrative to generate")
    generation_method: Optional[GenerationMethod] = Field(None, description="Preferred generation method")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context for generation")
    user_preferences: Optional[Dict[str, Any]] = Field(default_factory=dict, description="User preferences for narrative style")


class StatisticalTestNarrativeRequest(NarrativeRequest):
    """Request for statistical test narrative generation"""
    test_name: str = Field(..., description="Name of the statistical test")
    test_statistic: float = Field(..., description="Test statistic value")
    p_value: float = Field(..., description="P-value from the test")
    degrees_of_freedom: Optional[float] = Field(None, description="Degrees of freedom")
    effect_size: Optional[float] = Field(None, description="Effect size measure")
    sample_size: int = Field(..., description="Sample size")
    confidence_interval_lower: Optional[float] = Field(None, description="Lower bound of confidence interval")
    confidence_interval_upper: Optional[float] = Field(None, description="Upper bound of confidence interval")
    columns: Optional[List[str]] = Field(default_factory=list, description="Columns involved in the test")
    group_statistics: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Descriptive statistics by group")
    
    class Config:
        json_schema_extra = {
            "example": {
                "narrative_type": "statistical_test",
                "test_name": "Independent T-Test",
                "test_statistic": 3.47,
                "p_value": 0.001,
                "degrees_of_freedom": 98,
                "effect_size": 0.68,
                "sample_size": 100,
                "confidence_interval_lower": 1.23,
                "confidence_interval_upper": 4.56,
                "columns": ["treatment_group", "outcome_score"],
                "group_statistics": {
                    "group_a_mean": 75.3,
                    "group_b_mean": 68.1,
                    "group_a_std": 12.4,
                    "group_b_std": 15.2
                }
            }
        }


class DataSummaryNarrativeRequest(NarrativeRequest):
    """Request for data summary narrative generation"""
    total_rows: int = Field(..., description="Total number of rows")
    total_columns: int = Field(..., description="Total number of columns")
    missing_values: Dict[str, int] = Field(default_factory=dict, description="Missing values per column")
    column_types: Dict[str, str] = Field(default_factory=dict, description="Data types per column")
    numeric_summary: Optional[Dict[str, Dict[str, float]]] = Field(default_factory=dict, description="Summary statistics for numeric columns")
    categorical_summary: Optional[Dict[str, Dict[str, int]]] = Field(default_factory=dict, description="Value counts for categorical columns")
    outliers_detected: Optional[Dict[str, int]] = Field(default_factory=dict, description="Number of outliers per column")
    data_quality_score: Optional[float] = Field(None, description="Overall data quality score (0-1)")


class VisualizationNarrativeRequest(NarrativeRequest):
    """Request for visualization narrative generation"""
    chart_type: str = Field(..., description="Type of chart (scatter, histogram, boxplot, etc.)")
    x_column: Optional[str] = Field(None, description="X-axis column")
    y_column: Optional[str] = Field(None, description="Y-axis column")
    grouping_column: Optional[str] = Field(None, description="Column used for grouping/coloring")
    summary_statistics: Dict[str, Any] = Field(default_factory=dict, description="Summary statistics from the visualization")
    patterns_detected: Optional[List[str]] = Field(default_factory=list, description="Patterns detected in the visualization")


# Insight and finding models
class Insight(BaseModel):
    """Individual insight or finding"""
    title: str = Field(..., description="Brief title for the insight")
    description: str = Field(..., description="Detailed description of the insight")
    priority: InsightPriority = Field(..., description="Priority level of this insight")
    confidence: ConfidenceLevel = Field(..., description="Confidence level in this insight")
    evidence: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Supporting evidence for the insight")
    recommendations: Optional[List[str]] = Field(default_factory=list, description="Recommended actions based on this insight")
    related_columns: Optional[List[str]] = Field(default_factory=list, description="Columns related to this insight")
    statistical_significance: Optional[bool] = Field(None, description="Whether this insight is statistically significant")


class NarrativeSection(BaseModel):
    """Section within a narrative"""
    title: str = Field(..., description="Section title")
    content: str = Field(..., description="Section content")
    insights: List[Insight] = Field(default_factory=list, description="Key insights in this section")
    section_type: str = Field(..., description="Type of section (summary, analysis, recommendations, etc.)")


class NarrativeMetadata(BaseModel):
    """Metadata about the generated narrative"""
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="When the narrative was generated")
    generation_method: GenerationMethod = Field(..., description="Method used to generate the narrative")
    generation_time_ms: Optional[int] = Field(None, description="Time taken to generate in milliseconds")
    model_version: Optional[str] = Field(None, description="Version of AI model used (if applicable)")
    template_version: Optional[str] = Field(None, description="Version of template used (if applicable)")
    source_data_hash: Optional[str] = Field(None, description="Hash of source data for change detection")
    quality_score: Optional[float] = Field(None, description="Quality score of generated narrative (0-1)")
    user_id: Optional[str] = Field(None, description="ID of user who requested the narrative")


# Response models
class NarrativeResponse(BaseModel):
    """Response containing generated narrative"""
    narrative_type: NarrativeType = Field(..., description="Type of narrative generated")
    title: str = Field(..., description="Main title of the narrative")
    summary: str = Field(..., description="Brief summary of key findings")
    content: str = Field(..., description="Full narrative content")
    sections: List[NarrativeSection] = Field(default_factory=list, description="Structured sections of the narrative")
    key_insights: List[Insight] = Field(default_factory=list, description="Most important insights")
    recommendations: List[str] = Field(default_factory=list, description="Action recommendations")
    metadata: NarrativeMetadata = Field(..., description="Generation metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "narrative_type": "statistical_test",
                "title": "T-Test Analysis Results",
                "summary": "Strong evidence of significant difference between groups",
                "content": "Your independent t-test analysis reveals a statistically significant difference between the two groups (t=3.47, p<0.001)...",
                "sections": [
                    {
                        "title": "Statistical Results",
                        "content": "The test statistic of 3.47 with 98 degrees of freedom...",
                        "section_type": "analysis",
                        "insights": []
                    }
                ],
                "key_insights": [
                    {
                        "title": "Significant Group Difference",
                        "description": "Treatment group scored 7.2 points higher on average",
                        "priority": "high",
                        "confidence": "high",
                        "statistical_significance": True
                    }
                ],
                "recommendations": [
                    "Consider implementing the treatment more broadly",
                    "Investigate factors contributing to the difference"
                ],
                "metadata": {
                    "generation_method": "cloud_ai",
                    "generation_time_ms": 1250,
                    "model_version": "gpt-4o-mini"
                }
            }
        }


class BatchNarrativeRequest(BaseModel):
    """Request for generating multiple narratives at once"""
    requests: List[Union[StatisticalTestNarrativeRequest, DataSummaryNarrativeRequest, VisualizationNarrativeRequest]] = Field(..., description="List of narrative requests")
    global_context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Global context applied to all narratives")
    combine_insights: bool = Field(False, description="Whether to combine insights across all narratives")


class BatchNarrativeResponse(BaseModel):
    """Response containing multiple generated narratives"""
    narratives: List[NarrativeResponse] = Field(..., description="Generated narratives")
    combined_insights: Optional[List[Insight]] = Field(default_factory=list, description="Combined insights across all narratives")
    executive_summary: Optional[str] = Field(None, description="Executive summary combining all narratives")
    total_generation_time_ms: int = Field(..., description="Total time for all generations")


class NarrativeTemplate(BaseModel):
    """Template for rule-based narrative generation"""
    template_id: str = Field(..., description="Unique identifier for the template")
    narrative_type: NarrativeType = Field(..., description="Type of narrative this template generates")
    test_types: Optional[List[str]] = Field(default_factory=list, description="Statistical test types this template supports")
    template_content: str = Field(..., description="Jinja2 template content")
    required_fields: List[str] = Field(default_factory=list, description="Required fields for this template")
    optional_fields: List[str] = Field(default_factory=list, description="Optional fields for this template")
    conditions: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Conditions for when to use this template")
    priority: int = Field(1, description="Priority when multiple templates match (higher = preferred)")
    version: str = Field("1.0.0", description="Template version")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When template was created")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="When template was last updated")


class NarrativeSettings(BaseModel):
    """User preferences for narrative generation"""
    preferred_method: GenerationMethod = Field(GenerationMethod.HYBRID, description="Preferred generation method")
    detail_level: str = Field("medium", description="Level of detail (brief, medium, detailed)")
    language_style: str = Field("professional", description="Language style (casual, professional, technical)")
    include_statistics: bool = Field(True, description="Whether to include statistical details")
    include_recommendations: bool = Field(True, description="Whether to include recommendations")
    confidence_threshold: float = Field(0.05, description="P-value threshold for significance")
    max_insights: int = Field(5, description="Maximum number of key insights to include")
    enable_ai_generation: bool = Field(True, description="Whether to use AI generation")
    openai_api_key: Optional[str] = Field(None, description="OpenAI API key for cloud AI generation")
    local_model_path: Optional[str] = Field(None, description="Path to local AI model")


# Error models
class NarrativeError(BaseModel):
    """Error response for narrative generation"""
    error_type: str = Field(..., description="Type of error that occurred")
    error_message: str = Field(..., description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional error details")
    suggestions: List[str] = Field(default_factory=list, description="Suggestions for fixing the error")
    fallback_available: bool = Field(False, description="Whether a fallback generation method is available")