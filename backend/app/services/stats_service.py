import pandas as pd
from typing import Dict, Any
from pathlib import Path

async def compute_descriptive_stats(file_path: str) -> Dict[str, Any]:
    """
    Compute descriptive statistics for a CSV file.
    """
    df = pd.read_csv(Path(file_path))
    
    stats = {
        "numeric": {},
        "categorical": {},
        "missing": {k: int(v) for k, v in df.isnull().sum().to_dict().items()}
    }
    
    # Numeric columns
    numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns
    if len(numeric_cols) > 0:
        desc = df[numeric_cols].describe()
        for col in numeric_cols:
            stats["numeric"][col] = {
                "count": int(desc[col]["count"]),
                "mean": float(desc[col]["mean"]),
                "std": float(desc[col]["std"]),
                "min": float(desc[col]["min"]),
                "25%": float(desc[col]["25%"]),
                "50%": float(desc[col]["50%"]),
                "75%": float(desc[col]["75%"]),
                "max": float(desc[col]["max"])
            }
    
    # Categorical columns (including object type)
    cat_cols = df.select_dtypes(include=['object', 'category']).columns
    for col in cat_cols:
        value_counts = df[col].value_counts()
        unique_count = len(value_counts)
        top_values = value_counts.head(5).to_dict()  # Top 5 most frequent values
        
        stats["categorical"][col] = {
            "count": int(df[col].count()),
            "unique": unique_count,
            "top_values": {str(k): int(v) for k, v in top_values.items()}
        }
    
    # Add column types
    stats["column_types"] = {
        col: ("numeric" if col in numeric_cols else "categorical")
        for col in df.columns
    }
    
    # Add overall stats (ensure all values are converted to Python types)
    stats["overall"] = {
        "total_rows": int(len(df)),
        "total_columns": int(len(df.columns)),
        "memory_usage": int(df.memory_usage(deep=True).sum()),
        "numeric_columns": int(len(numeric_cols)),
        "categorical_columns": int(len(cat_cols)),
        "total_missing": int(df.isnull().sum().sum())
    }
    
    return stats