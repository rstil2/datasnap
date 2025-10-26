import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Union
from pathlib import Path

from app.schemas.visualizations import (
    ChartType,
    ColorScheme,
    PlotData,
    VisualizationResponse,
    ChartSuggestion,
    ChartSuggestionsResponse
)


class VisualizationService:
    """Service for generating visualization data from CSV files."""
    
    # Color schemes mapping
    COLOR_SCHEMES = {
        ColorScheme.DEFAULT: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316'],
        ColorScheme.VIRIDIS: ['#440154', '#31688e', '#35b779', '#fde725'],
        ColorScheme.PLASMA: ['#0d0887', '#7e03a8', '#cc4778', '#f89441', '#f0f921'],
        ColorScheme.BLUES: ['#08519c', '#3182bd', '#6baed6', '#9ecae1', '#c6dbef'],
        ColorScheme.REDS: ['#a50f15', '#de2d26', '#fb6a4a', '#fc9272', '#fcbba1'],
        ColorScheme.GREENS: ['#00441b', '#238b45', '#66c2a4', '#b2e2e2', '#edf8fb']
    }
    
    @staticmethod
    def _load_data(file_path: str) -> pd.DataFrame:
        """Load CSV data from file path."""
        return pd.read_csv(Path(file_path))
    
    @staticmethod
    def _validate_columns(df: pd.DataFrame, required_columns: List[str], optional_columns: List[str] = None) -> List[str]:
        """Validate that required columns exist and return error messages if any."""
        errors = []
        
        for col in required_columns:
            if col not in df.columns:
                errors.append(f"Required column '{col}' not found in dataset")
        
        if optional_columns:
            for col in optional_columns:
                if col and col not in df.columns:
                    errors.append(f"Optional column '{col}' not found in dataset")
        
        return errors
    
    @staticmethod
    def _get_colors(color_scheme: ColorScheme, n_colors: int = 1) -> List[str]:
        """Get colors from the specified color scheme."""
        colors = VisualizationService.COLOR_SCHEMES[color_scheme]
        if n_colors <= len(colors):
            return colors[:n_colors]
        else:
            # Repeat colors if we need more than available
            return (colors * ((n_colors // len(colors)) + 1))[:n_colors]
    
    @staticmethod
    def _clean_data_for_plot(df: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
        """Clean data by removing rows with NaN values in specified columns."""
        return df[columns].dropna()
    
    @classmethod
    async def create_scatter_plot(cls, file_path: str, x_column: str, y_column: str,
                                color_column: Optional[str] = None, size_column: Optional[str] = None,
                                title: Optional[str] = None, x_label: Optional[str] = None,
                                y_label: Optional[str] = None, color_scheme: ColorScheme = ColorScheme.DEFAULT) -> VisualizationResponse:
        """Create scatter plot data."""
        try:
            df = cls._load_data(file_path)
            
            # Validate required columns
            required_columns = [x_column, y_column]
            optional_columns = [col for col in [color_column, size_column] if col]
            errors = cls._validate_columns(df, required_columns, optional_columns)
            if errors:
                raise ValueError("; ".join(errors))
            
            # Validate numeric columns
            for col in required_columns:
                if not pd.api.types.is_numeric_dtype(df[col]):
                    raise ValueError(f"Column '{col}' must be numeric for scatter plot")
            
            if size_column and not pd.api.types.is_numeric_dtype(df[size_column]):
                raise ValueError(f"Size column '{size_column}' must be numeric")
            
            # Clean data
            plot_columns = [x_column, y_column]
            if color_column:
                plot_columns.append(color_column)
            if size_column:
                plot_columns.append(size_column)
            
            clean_df = cls._clean_data_for_plot(df, plot_columns)
            
            if len(clean_df) == 0:
                raise ValueError("No valid data points after removing missing values")
            
            # Create plot data
            data = []
            
            if color_column:
                # Group by color column
                groups = clean_df.groupby(color_column)
                colors = cls._get_colors(color_scheme, len(groups))
                
                for i, (group_name, group_data) in enumerate(groups):
                    trace = {
                        'x': group_data[x_column].tolist(),
                        'y': group_data[y_column].tolist(),
                        'mode': 'markers',
                        'type': 'scatter',
                        'name': str(group_name),
                        'marker': {
                            'color': colors[i % len(colors)],
                            'size': group_data[size_column].tolist() if size_column else 8,
                            'sizemode': 'diameter',
                            'sizeref': 2. * max(group_data[size_column]) / (40.**2) if size_column else None,
                            'sizemin': 4 if size_column else None
                        }
                    }
                    data.append(trace)
            else:
                # Single series
                colors = cls._get_colors(color_scheme, 1)
                trace = {
                    'x': clean_df[x_column].tolist(),
                    'y': clean_df[y_column].tolist(),
                    'mode': 'markers',
                    'type': 'scatter',
                    'marker': {
                        'color': colors[0],
                        'size': clean_df[size_column].tolist() if size_column else 8,
                        'sizemode': 'diameter',
                        'sizeref': 2. * max(clean_df[size_column]) / (40.**2) if size_column else None,
                        'sizemin': 4 if size_column else None
                    }
                }
                data.append(trace)
            
            # Create layout
            layout = {
                'title': title or f'{y_column} vs {x_column}',
                'xaxis': {
                    'title': x_label or x_column,
                    'showgrid': True,
                    'gridcolor': 'rgba(128,128,128,0.2)'
                },
                'yaxis': {
                    'title': y_label or y_column,
                    'showgrid': True,
                    'gridcolor': 'rgba(128,128,128,0.2)'
                },
                'plot_bgcolor': 'rgba(0,0,0,0)',
                'paper_bgcolor': 'rgba(0,0,0,0)',
                'showlegend': bool(color_column),
                'hovermode': 'closest'
            }
            
            # Create config
            config = {
                'displayModeBar': True,
                'modeBarButtonsToRemove': ['pan2d', 'select2d', 'lasso2d'],
                'displaylogo': False,
                'toImageButtonOptions': {
                    'format': 'png',
                    'filename': 'scatter_plot',
                    'height': 500,
                    'width': 700,
                    'scale': 1
                }
            }
            
            # Generate summary
            summary = {
                'total_points': len(clean_df),
                'x_range': [float(clean_df[x_column].min()), float(clean_df[x_column].max())],
                'y_range': [float(clean_df[y_column].min()), float(clean_df[y_column].max())],
                'correlation': float(clean_df[x_column].corr(clean_df[y_column]))
            }
            
            if color_column:
                summary['groups'] = len(clean_df[color_column].unique())
                summary['group_names'] = clean_df[color_column].unique().tolist()
            
            data_info = {
                'rows_used': len(clean_df),
                'rows_total': len(df),
                'columns_used': plot_columns,
                'missing_data_removed': len(df) - len(clean_df)
            }
            
            return VisualizationResponse(
                chart_type=ChartType.SCATTER,
                plot_data=PlotData(data=data, layout=layout, config=config),
                summary=summary,
                data_info=data_info
            )
            
        except Exception as e:
            raise ValueError(f"Error creating scatter plot: {str(e)}")
    
    @classmethod
    async def create_histogram(cls, file_path: str, column: str, bins: int = 30,
                              group_column: Optional[str] = None, title: Optional[str] = None,
                              x_label: Optional[str] = None, y_label: str = "Count",
                              color_scheme: ColorScheme = ColorScheme.DEFAULT) -> VisualizationResponse:
        """Create histogram data."""
        try:
            df = cls._load_data(file_path)
            
            # Validate required columns
            required_columns = [column]
            optional_columns = [group_column] if group_column else []
            errors = cls._validate_columns(df, required_columns, optional_columns)
            if errors:
                raise ValueError("; ".join(errors))
            
            # Validate numeric column
            if not pd.api.types.is_numeric_dtype(df[column]):
                raise ValueError(f"Column '{column}' must be numeric for histogram")
            
            # Clean data
            plot_columns = [column]
            if group_column:
                plot_columns.append(group_column)
            
            clean_df = cls._clean_data_for_plot(df, plot_columns)
            
            if len(clean_df) == 0:
                raise ValueError("No valid data points after removing missing values")
            
            # Create plot data
            data = []
            
            if group_column:
                # Group by group column
                groups = clean_df.groupby(group_column)
                colors = cls._get_colors(color_scheme, len(groups))
                
                for i, (group_name, group_data) in enumerate(groups):
                    trace = {
                        'x': group_data[column].tolist(),
                        'type': 'histogram',
                        'name': str(group_name),
                        'nbinsx': bins,
                        'marker': {
                            'color': colors[i % len(colors)],
                            'line': {
                                'color': 'white',
                                'width': 0.5
                            }
                        },
                        'opacity': 0.7
                    }
                    data.append(trace)
            else:
                # Single histogram
                colors = cls._get_colors(color_scheme, 1)
                trace = {
                    'x': clean_df[column].tolist(),
                    'type': 'histogram',
                    'nbinsx': bins,
                    'marker': {
                        'color': colors[0],
                        'line': {
                            'color': 'white',
                            'width': 0.5
                        }
                    }
                }
                data.append(trace)
            
            # Create layout
            layout = {
                'title': title or f'Distribution of {column}',
                'xaxis': {
                    'title': x_label or column,
                    'showgrid': True,
                    'gridcolor': 'rgba(128,128,128,0.2)'
                },
                'yaxis': {
                    'title': y_label,
                    'showgrid': True,
                    'gridcolor': 'rgba(128,128,128,0.2)'
                },
                'plot_bgcolor': 'rgba(0,0,0,0)',
                'paper_bgcolor': 'rgba(0,0,0,0)',
                'showlegend': bool(group_column),
                'barmode': 'overlay' if group_column else 'group'
            }
            
            # Create config
            config = {
                'displayModeBar': True,
                'modeBarButtonsToRemove': ['pan2d', 'select2d', 'lasso2d'],
                'displaylogo': False,
                'toImageButtonOptions': {
                    'format': 'png',
                    'filename': 'histogram',
                    'height': 500,
                    'width': 700,
                    'scale': 1
                }
            }
            
            # Generate summary
            summary = {
                'total_values': len(clean_df),
                'mean': float(clean_df[column].mean()),
                'median': float(clean_df[column].median()),
                'std': float(clean_df[column].std()),
                'min': float(clean_df[column].min()),
                'max': float(clean_df[column].max()),
                'bins': bins
            }
            
            if group_column:
                summary['groups'] = len(clean_df[group_column].unique())
                summary['group_stats'] = {}
                for group_name, group_data in clean_df.groupby(group_column):
                    summary['group_stats'][str(group_name)] = {
                        'count': len(group_data),
                        'mean': float(group_data[column].mean()),
                        'std': float(group_data[column].std())
                    }
            
            data_info = {
                'rows_used': len(clean_df),
                'rows_total': len(df),
                'columns_used': plot_columns,
                'missing_data_removed': len(df) - len(clean_df)
            }
            
            return VisualizationResponse(
                chart_type=ChartType.HISTOGRAM,
                plot_data=PlotData(data=data, layout=layout, config=config),
                summary=summary,
                data_info=data_info
            )
            
        except Exception as e:
            raise ValueError(f"Error creating histogram: {str(e)}")
    
    @classmethod
    async def create_boxplot(cls, file_path: str, y_column: str, x_column: Optional[str] = None,
                            title: Optional[str] = None, x_label: Optional[str] = None,
                            y_label: Optional[str] = None, color_scheme: ColorScheme = ColorScheme.DEFAULT) -> VisualizationResponse:
        """Create boxplot data."""
        try:
            df = cls._load_data(file_path)
            
            # Validate required columns
            required_columns = [y_column]
            optional_columns = [x_column] if x_column else []
            errors = cls._validate_columns(df, required_columns, optional_columns)
            if errors:
                raise ValueError("; ".join(errors))
            
            # Validate numeric column
            if not pd.api.types.is_numeric_dtype(df[y_column]):
                raise ValueError(f"Column '{y_column}' must be numeric for boxplot")
            
            # Clean data
            plot_columns = [y_column]
            if x_column:
                plot_columns.append(x_column)
            
            clean_df = cls._clean_data_for_plot(df, plot_columns)
            
            if len(clean_df) == 0:
                raise ValueError("No valid data points after removing missing values")
            
            # Create plot data
            data = []
            
            if x_column:
                # Group by x column
                groups = clean_df.groupby(x_column)
                colors = cls._get_colors(color_scheme, len(groups))
                
                for i, (group_name, group_data) in enumerate(groups):
                    trace = {
                        'y': group_data[y_column].tolist(),
                        'type': 'box',
                        'name': str(group_name),
                        'marker': {
                            'color': colors[i % len(colors)]
                        },
                        'boxpoints': 'outliers'
                    }
                    data.append(trace)
            else:
                # Single boxplot
                colors = cls._get_colors(color_scheme, 1)
                trace = {
                    'y': clean_df[y_column].tolist(),
                    'type': 'box',
                    'name': y_column,
                    'marker': {
                        'color': colors[0]
                    },
                    'boxpoints': 'outliers'
                }
                data.append(trace)
            
            # Create layout
            layout = {
                'title': title or f'Distribution of {y_column}' + (f' by {x_column}' if x_column else ''),
                'xaxis': {
                    'title': x_label or (x_column if x_column else ''),
                    'showgrid': True,
                    'gridcolor': 'rgba(128,128,128,0.2)'
                },
                'yaxis': {
                    'title': y_label or y_column,
                    'showgrid': True,
                    'gridcolor': 'rgba(128,128,128,0.2)'
                },
                'plot_bgcolor': 'rgba(0,0,0,0)',
                'paper_bgcolor': 'rgba(0,0,0,0)',
                'showlegend': bool(x_column)
            }
            
            # Create config
            config = {
                'displayModeBar': True,
                'modeBarButtonsToRemove': ['pan2d', 'select2d', 'lasso2d'],
                'displaylogo': False,
                'toImageButtonOptions': {
                    'format': 'png',
                    'filename': 'boxplot',
                    'height': 500,
                    'width': 700,
                    'scale': 1
                }
            }
            
            # Generate summary
            summary = {
                'total_values': len(clean_df),
                'overall_median': float(clean_df[y_column].median()),
                'overall_q1': float(clean_df[y_column].quantile(0.25)),
                'overall_q3': float(clean_df[y_column].quantile(0.75)),
                'overall_iqr': float(clean_df[y_column].quantile(0.75) - clean_df[y_column].quantile(0.25))
            }
            
            if x_column:
                summary['groups'] = len(clean_df[x_column].unique())
                summary['group_stats'] = {}
                for group_name, group_data in clean_df.groupby(x_column):
                    summary['group_stats'][str(group_name)] = {
                        'count': len(group_data),
                        'median': float(group_data[y_column].median()),
                        'q1': float(group_data[y_column].quantile(0.25)),
                        'q3': float(group_data[y_column].quantile(0.75)),
                        'iqr': float(group_data[y_column].quantile(0.75) - group_data[y_column].quantile(0.25))
                    }
            
            data_info = {
                'rows_used': len(clean_df),
                'rows_total': len(df),
                'columns_used': plot_columns,
                'missing_data_removed': len(df) - len(clean_df)
            }
            
            return VisualizationResponse(
                chart_type=ChartType.BOXPLOT,
                plot_data=PlotData(data=data, layout=layout, config=config),
                summary=summary,
                data_info=data_info
            )
            
        except Exception as e:
            raise ValueError(f"Error creating boxplot: {str(e)}")
    
    @classmethod
    async def suggest_charts(cls, file_path: str) -> ChartSuggestionsResponse:
        """Analyze data and suggest appropriate chart types."""
        try:
            df = cls._load_data(file_path)
            
            # Analyze columns
            numeric_columns = df.select_dtypes(include=['int64', 'float64']).columns.tolist()
            categorical_columns = df.select_dtypes(include=['object', 'category']).columns.tolist()
            
            column_analysis = {
                'total_columns': len(df.columns),
                'numeric_columns': len(numeric_columns),
                'categorical_columns': len(categorical_columns),
                'total_rows': len(df),
                'numeric_column_names': numeric_columns,
                'categorical_column_names': categorical_columns
            }
            
            suggestions = []
            
            # Scatter plot suggestions
            if len(numeric_columns) >= 2:
                suggestions.append(ChartSuggestion(
                    chart_type=ChartType.SCATTER,
                    confidence=0.9,
                    reason="Multiple numeric columns available for correlation analysis",
                    required_columns=numeric_columns[:2],
                    optional_columns=categorical_columns + numeric_columns[2:]
                ))
            
            # Histogram suggestions
            if len(numeric_columns) >= 1:
                suggestions.append(ChartSuggestion(
                    chart_type=ChartType.HISTOGRAM,
                    confidence=0.8,
                    reason="Numeric columns available for distribution analysis",
                    required_columns=numeric_columns[:1],
                    optional_columns=categorical_columns
                ))
            
            # Boxplot suggestions
            if len(numeric_columns) >= 1:
                confidence = 0.9 if len(categorical_columns) >= 1 else 0.7
                reason = "Numeric columns available for distribution analysis"
                if len(categorical_columns) >= 1:
                    reason += " with categorical grouping available"
                
                suggestions.append(ChartSuggestion(
                    chart_type=ChartType.BOXPLOT,
                    confidence=confidence,
                    reason=reason,
                    required_columns=numeric_columns[:1],
                    optional_columns=categorical_columns
                ))
            
            # Bar chart suggestions
            if len(categorical_columns) >= 1 and len(numeric_columns) >= 1:
                suggestions.append(ChartSuggestion(
                    chart_type=ChartType.BAR,
                    confidence=0.8,
                    reason="Categorical and numeric columns available for aggregated comparison",
                    required_columns=[categorical_columns[0], numeric_columns[0]],
                    optional_columns=categorical_columns[1:] + numeric_columns[1:]
                ))
            
            # Sort by confidence
            suggestions.sort(key=lambda x: x.confidence, reverse=True)
            
            return ChartSuggestionsResponse(
                suggestions=suggestions,
                column_analysis=column_analysis
            )
            
        except Exception as e:
            raise ValueError(f"Error analyzing data for chart suggestions: {str(e)}")