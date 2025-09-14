import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from typing import Dict, List, Tuple, Optional
import json


class ColumnAnalysis:
    def __init__(self, name: str, dtype: str):
        self.name = name
        self.dtype = dtype
        self.count = 0
        self.missing = 0
        self.unique = 0
        self.mean = None
        self.std = None
        self.min = None
        self.q1 = None
        self.median = None
        self.q3 = None
        self.max = None
        self.mode = None
        self.histogram = None
        self.boxplot = None
        self.bar_chart = None
        

def analyze_csv(file_path: str) -> Dict:
    """Analyze a CSV file and return descriptive statistics and visualizations."""
    try:
        # Read CSV file
        df = pd.read_csv(file_path)
        
        # Initialize results
        results = {
            'summary': {
                'rows': len(df),
                'columns': len(df.columns),
                'total_missing': df.isna().sum().sum(),
            },
            'columns': {}
        }
        
        # Analyze each column
        for column in df.columns:
            col_analysis = ColumnAnalysis(column, str(df[column].dtype))
            series = df[column]
            
            # Basic statistics
            col_analysis.count = series.count()
            col_analysis.missing = series.isna().sum()
            col_analysis.unique = series.nunique()
            
            # Type-specific analysis
            if pd.api.types.is_numeric_dtype(series):
                col_analysis.mean = series.mean()
                col_analysis.std = series.std()
                col_analysis.min = series.min()
                col_analysis.q1 = series.quantile(0.25)
                col_analysis.median = series.median()
                col_analysis.q3 = series.quantile(0.75)
                col_analysis.max = series.max()
                
                # Generate histogram
                plt.figure(figsize=(6, 4))
                plt.hist(series.dropna(), bins='auto', edgecolor='black')
                plt.title(f'Histogram of {column}')
                plt.xlabel(column)
                plt.ylabel('Frequency')
                
                # Convert plot to base64
                buffer = io.BytesIO()
                plt.savefig(buffer, format='png', bbox_inches='tight')
                plt.close()
                buffer.seek(0)
                col_analysis.histogram = base64.b64encode(buffer.read()).decode()
                
                # Generate boxplot
                plt.figure(figsize=(6, 2))
                plt.boxplot(series.dropna(), vert=False)
                plt.title(f'Boxplot of {column}')
                
                buffer = io.BytesIO()
                plt.savefig(buffer, format='png', bbox_inches='tight')
                plt.close()
                buffer.seek(0)
                col_analysis.boxplot = base64.b64encode(buffer.read()).decode()
                
            else:
                # For categorical columns
                value_counts = series.value_counts()
                col_analysis.mode = value_counts.index[0] if not value_counts.empty else None
                
                # Generate bar chart for top 10 categories
                plt.figure(figsize=(8, 4))
                value_counts.head(10).plot(kind='bar')
                plt.title(f'Top 10 Categories in {column}')
                plt.xlabel(column)
                plt.ylabel('Count')
                plt.xticks(rotation=45, ha='right')
                
                buffer = io.BytesIO()
                plt.savefig(buffer, format='png', bbox_inches='tight')
                plt.close()
                buffer.seek(0)
                col_analysis.bar_chart = base64.b64encode(buffer.read()).decode()
            
            # Convert analysis to dict for JSON serialization
            results['columns'][column] = {
                k: v for k, v in col_analysis.__dict__.items()
                if v is not None
            }
        
        return results
    
    except Exception as e:
        raise ValueError(f"Error analyzing CSV file: {str(e)}")


def get_data_preview(file_path: str, rows: int = 5) -> Dict:
    """Get a preview of the CSV data."""
    try:
        df = pd.read_csv(file_path)
        preview = df.head(rows).to_dict(orient='records')
        return {
            'columns': list(df.columns),
            'data': preview,
            'total_rows': len(df)
        }
    except Exception as e:
        raise ValueError(f"Error reading CSV file: {str(e)}")


def get_column_statistics(file_path: str, column: str) -> Dict:
    """Get detailed statistics for a specific column."""
    try:
        df = pd.read_csv(file_path)
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found in CSV file")
            
        series = df[column]
        stats = {
            'name': column,
            'dtype': str(series.dtype),
            'count': series.count(),
            'missing': series.isna().sum(),
            'unique': series.nunique(),
        }
        
        if pd.api.types.is_numeric_dtype(series):
            stats.update({
                'mean': series.mean(),
                'std': series.std(),
                'min': series.min(),
                'q1': series.quantile(0.25),
                'median': series.median(),
                'q3': series.quantile(0.75),
                'max': series.max(),
                'skew': series.skew(),
                'kurtosis': series.kurtosis(),
            })
            
            # Generate detailed histogram
            plt.figure(figsize=(10, 6))
            sns.histplot(data=series.dropna(), kde=True)
            plt.title(f'Distribution of {column}')
            plt.xlabel(column)
            plt.ylabel('Count')
            
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', bbox_inches='tight')
            plt.close()
            buffer.seek(0)
            stats['histogram'] = base64.b64encode(buffer.read()).decode()
            
        else:
            # For categorical columns
            value_counts = series.value_counts()
            stats.update({
                'mode': value_counts.index[0] if not value_counts.empty else None,
                'top_categories': value_counts.head(10).to_dict(),
            })
            
            # Generate detailed bar chart
            plt.figure(figsize=(12, 6))
            sns.barplot(x=value_counts.head(10).index, y=value_counts.head(10).values)
            plt.title(f'Top 10 Categories in {column}')
            plt.xlabel(column)
            plt.ylabel('Count')
            plt.xticks(rotation=45, ha='right')
            
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', bbox_inches='tight')
            plt.close()
            buffer.seek(0)
            stats['bar_chart'] = base64.b64encode(buffer.read()).decode()
            
        return stats
    
    except Exception as e:
        raise ValueError(f"Error analyzing column: {str(e)}")


def detect_anomalies(file_path: str, column: str, threshold: float = 1.5) -> Dict:
    """Detect anomalies in a numeric column using IQR method."""
    try:
        df = pd.read_csv(file_path)
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found in CSV file")
            
        series = df[column]
        if not pd.api.types.is_numeric_dtype(series):
            raise ValueError(f"Column '{column}' is not numeric")
            
        Q1 = series.quantile(0.25)
        Q3 = series.quantile(0.75)
        IQR = Q3 - Q1
        
        lower_bound = Q1 - threshold * IQR
        upper_bound = Q3 + threshold * IQR
        
        anomalies = series[(series < lower_bound) | (series > upper_bound)]
        
        return {
            'anomaly_count': len(anomalies),
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
            'anomalies': anomalies.to_dict()
        }
    
    except Exception as e:
        raise ValueError(f"Error detecting anomalies: {str(e)}")