from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from enum import Enum


class ChartType(str, Enum):
    SCATTER = "scatter"
    HISTOGRAM = "histogram"
    BOXPLOT = "boxplot"
    BAR = "bar"
    LINE = "line"


class ColorScheme(str, Enum):
    DEFAULT = "default"
    VIRIDIS = "viridis"
    PLASMA = "plasma"
    BLUES = "blues"
    REDS = "reds"
    GREENS = "greens"


class ScatterPlotRequest(BaseModel):
    file_id: int = Field(..., description="ID of the uploaded CSV file")
    x_column: str = Field(..., description="Column name for X-axis")
    y_column: str = Field(..., description="Column name for Y-axis")
    color_column: Optional[str] = Field(None, description="Optional column for color grouping")
    size_column: Optional[str] = Field(None, description="Optional column for point sizes")
    title: Optional[str] = Field(None, description="Custom plot title")
    x_label: Optional[str] = Field(None, description="Custom X-axis label")
    y_label: Optional[str] = Field(None, description="Custom Y-axis label")
    color_scheme: ColorScheme = Field(ColorScheme.DEFAULT, description="Color scheme")


class HistogramRequest(BaseModel):
    file_id: int = Field(..., description="ID of the uploaded CSV file")
    column: str = Field(..., description="Column name for histogram")
    bins: Optional[int] = Field(30, description="Number of bins", ge=5, le=100)
    group_column: Optional[str] = Field(None, description="Optional column for grouping/overlay")
    title: Optional[str] = Field(None, description="Custom plot title")
    x_label: Optional[str] = Field(None, description="Custom X-axis label")
    y_label: Optional[str] = Field("Count", description="Custom Y-axis label")
    color_scheme: ColorScheme = Field(ColorScheme.DEFAULT, description="Color scheme")


class BoxplotRequest(BaseModel):
    file_id: int = Field(..., description="ID of the uploaded CSV file")
    y_column: str = Field(..., description="Column name for values")
    x_column: Optional[str] = Field(None, description="Optional column for grouping")
    title: Optional[str] = Field(None, description="Custom plot title")
    x_label: Optional[str] = Field(None, description="Custom X-axis label")
    y_label: Optional[str] = Field(None, description="Custom Y-axis label")
    color_scheme: ColorScheme = Field(ColorScheme.DEFAULT, description="Color scheme")


class BarChartRequest(BaseModel):
    file_id: int = Field(..., description="ID of the uploaded CSV file")
    category_column: str = Field(..., description="Column name for categories")
    value_column: str = Field(..., description="Column name for values")
    aggregation: str = Field("mean", description="Aggregation method", pattern="^(mean|sum|count|median|min|max)$")
    group_column: Optional[str] = Field(None, description="Optional column for grouping")
    title: Optional[str] = Field(None, description="Custom plot title")
    x_label: Optional[str] = Field(None, description="Custom X-axis label")
    y_label: Optional[str] = Field(None, description="Custom Y-axis label")
    color_scheme: ColorScheme = Field(ColorScheme.DEFAULT, description="Color scheme")


class LineChartRequest(BaseModel):
    file_id: int = Field(..., description="ID of the uploaded CSV file")
    x_column: str = Field(..., description="Column name for X-axis")
    y_column: str = Field(..., description="Column name for Y-axis")
    group_column: Optional[str] = Field(None, description="Optional column for line grouping")
    title: Optional[str] = Field(None, description="Custom plot title")
    x_label: Optional[str] = Field(None, description="Custom X-axis label")
    y_label: Optional[str] = Field(None, description="Custom Y-axis label")
    color_scheme: ColorScheme = Field(ColorScheme.DEFAULT, description="Color scheme")


class PlotData(BaseModel):
    """Plotly.js compatible plot data structure"""
    data: List[Dict[str, Any]] = Field(..., description="Plot data traces")
    layout: Dict[str, Any] = Field(..., description="Plot layout configuration")
    config: Dict[str, Any] = Field(default_factory=dict, description="Plot configuration options")


class VisualizationResponse(BaseModel):
    chart_type: ChartType = Field(..., description="Type of chart generated")
    plot_data: PlotData = Field(..., description="Plotly.js compatible plot data")
    summary: Dict[str, Any] = Field(..., description="Summary statistics about the visualization")
    data_info: Dict[str, Any] = Field(..., description="Information about the data used")


class VisualizationError(BaseModel):
    error: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Type of error (validation, data, etc.)")
    suggestions: List[str] = Field(default_factory=list, description="Suggestions to fix the error")


class ChartSuggestion(BaseModel):
    """Suggested chart type based on data characteristics"""
    chart_type: ChartType = Field(..., description="Suggested chart type")
    confidence: float = Field(..., description="Confidence score (0-1)")
    reason: str = Field(..., description="Reason for suggestion")
    required_columns: List[str] = Field(..., description="Required columns for this chart")
    optional_columns: List[str] = Field(default_factory=list, description="Optional columns")


class ChartSuggestionsResponse(BaseModel):
    suggestions: List[ChartSuggestion] = Field(..., description="List of chart suggestions")
    column_analysis: Dict[str, Any] = Field(..., description="Analysis of available columns")