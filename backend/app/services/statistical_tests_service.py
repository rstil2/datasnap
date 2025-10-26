import pandas as pd
import numpy as np
from scipy import stats
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path

from app.schemas.statistical_tests import (
    StatisticalTestResult,
    StatisticalTestError
)


class StatisticalTestsService:
    """Service for performing statistical tests on CSV data."""
    
    @staticmethod
    def _load_data(file_path: str) -> pd.DataFrame:
        """Load CSV data from file path."""
        return pd.read_csv(Path(file_path))
    
    @staticmethod
    def _validate_numeric_column(df: pd.DataFrame, column: str) -> List[str]:
        """Validate that a column exists and is numeric."""
        errors = []
        
        if column not in df.columns:
            errors.append(f"Column '{column}' not found in dataset")
            return errors
            
        if not pd.api.types.is_numeric_dtype(df[column]):
            errors.append(f"Column '{column}' must be numeric for statistical tests")
            
        return errors
    
    @staticmethod
    def _validate_column_exists(df: pd.DataFrame, column: str) -> List[str]:
        """Validate that a column exists."""
        if column not in df.columns:
            return [f"Column '{column}' not found in dataset"]
        return []
    
    @staticmethod
    def _clean_numeric_data(series: pd.Series) -> pd.Series:
        """Remove NaN values from numeric series."""
        return series.dropna()
    
    @staticmethod
    def _calculate_cohens_d(group1: pd.Series, group2: pd.Series) -> float:
        """Calculate Cohen's d effect size."""
        n1, n2 = len(group1), len(group2)
        s1, s2 = group1.std(ddof=1), group2.std(ddof=1)
        
        # Pooled standard deviation
        pooled_std = np.sqrt(((n1 - 1) * s1**2 + (n2 - 1) * s2**2) / (n1 + n2 - 2))
        
        return (group1.mean() - group2.mean()) / pooled_std
    
    @staticmethod
    def _interpret_result(p_value: float, alpha: float, test_name: str, 
                         effect_size: Optional[float] = None) -> str:
        """Generate plain English interpretation of test results."""
        is_significant = p_value < alpha
        
        base_interpretation = (
            f"The {test_name} {'is' if is_significant else 'is not'} "
            f"statistically significant at the α = {alpha} level "
            f"(p = {p_value:.4f})."
        )
        
        if is_significant:
            conclusion = " We reject the null hypothesis."
            if effect_size is not None:
                if abs(effect_size) < 0.2:
                    magnitude = "small"
                elif abs(effect_size) < 0.8:
                    magnitude = "medium"
                else:
                    magnitude = "large"
                conclusion += f" The effect size is {magnitude} (d = {effect_size:.3f})."
        else:
            conclusion = " We fail to reject the null hypothesis."
            
        return base_interpretation + conclusion
    
    @classmethod
    async def one_sample_ttest(cls, file_path: str, variable_column: str, 
                              test_value: float, alpha: float = 0.05) -> StatisticalTestResult:
        """Perform one-sample t-test."""
        try:
            df = cls._load_data(file_path)
            
            # Validate column
            errors = cls._validate_numeric_column(df, variable_column)
            if errors:
                raise ValueError("; ".join(errors))
            
            # Clean data
            data = cls._clean_numeric_data(df[variable_column])
            
            if len(data) < 2:
                raise ValueError(f"Insufficient data: need at least 2 valid values, got {len(data)}")
            
            # Perform test
            t_stat, p_value = stats.ttest_1samp(data, test_value)
            
            # Calculate confidence interval
            confidence_level = 1 - alpha
            degrees_of_freedom = len(data) - 1
            t_critical = stats.t.ppf(1 - alpha/2, degrees_of_freedom)
            margin_of_error = t_critical * (data.std(ddof=1) / np.sqrt(len(data)))
            mean_diff = data.mean() - test_value
            
            ci_lower = mean_diff - margin_of_error
            ci_upper = mean_diff + margin_of_error
            
            # Effect size (Cohen's d for one-sample)
            effect_size = (data.mean() - test_value) / data.std(ddof=1)
            
            interpretation = cls._interpret_result(p_value, alpha, "one-sample t-test", effect_size)
            
            return StatisticalTestResult(
                test_name="One-Sample t-Test",
                test_statistic=float(t_stat),
                degrees_of_freedom=float(degrees_of_freedom),
                p_value=float(p_value),
                confidence_interval_lower=float(ci_lower),
                confidence_interval_upper=float(ci_upper),
                effect_size=float(effect_size),
                interpretation=interpretation,
                sample_size=len(data),
                group_statistics={
                    "sample_mean": float(data.mean()),
                    "sample_std": float(data.std(ddof=1)),
                    "test_value": float(test_value)
                }
            )
            
        except Exception as e:
            raise ValueError(f"Error in one-sample t-test: {str(e)}")
    
    @classmethod
    async def independent_ttest(cls, file_path: str, variable_column: str, 
                               group_column: str, alpha: float = 0.05) -> StatisticalTestResult:
        """Perform independent samples t-test."""
        try:
            df = cls._load_data(file_path)
            
            # Validate columns
            errors = []
            errors.extend(cls._validate_numeric_column(df, variable_column))
            errors.extend(cls._validate_column_exists(df, group_column))
            if errors:
                raise ValueError("; ".join(errors))
            
            # Get unique groups
            groups = df[group_column].unique()
            groups = [g for g in groups if pd.notna(g)]
            
            if len(groups) != 2:
                raise ValueError(f"Independent t-test requires exactly 2 groups, found {len(groups)}")
            
            # Split data by groups
            group1_data = cls._clean_numeric_data(df[df[group_column] == groups[0]][variable_column])
            group2_data = cls._clean_numeric_data(df[df[group_column] == groups[1]][variable_column])
            
            if len(group1_data) < 2 or len(group2_data) < 2:
                raise ValueError("Each group must have at least 2 valid values")
            
            # Perform test (equal variance assumed)
            t_stat, p_value = stats.ttest_ind(group1_data, group2_data, equal_var=True)
            
            # Calculate confidence interval for difference of means
            n1, n2 = len(group1_data), len(group2_data)
            degrees_of_freedom = n1 + n2 - 2
            
            # Pooled standard error
            s1, s2 = group1_data.std(ddof=1), group2_data.std(ddof=1)
            pooled_var = ((n1 - 1) * s1**2 + (n2 - 1) * s2**2) / degrees_of_freedom
            se_diff = np.sqrt(pooled_var * (1/n1 + 1/n2))
            
            t_critical = stats.t.ppf(1 - alpha/2, degrees_of_freedom)
            mean_diff = group1_data.mean() - group2_data.mean()
            margin_of_error = t_critical * se_diff
            
            ci_lower = mean_diff - margin_of_error
            ci_upper = mean_diff + margin_of_error
            
            # Effect size (Cohen's d)
            effect_size = cls._calculate_cohens_d(group1_data, group2_data)
            
            interpretation = cls._interpret_result(p_value, alpha, "independent samples t-test", effect_size)
            
            return StatisticalTestResult(
                test_name="Independent Samples t-Test",
                test_statistic=float(t_stat),
                degrees_of_freedom=float(degrees_of_freedom),
                p_value=float(p_value),
                confidence_interval_lower=float(ci_lower),
                confidence_interval_upper=float(ci_upper),
                effect_size=float(effect_size),
                interpretation=interpretation,
                sample_size=len(group1_data) + len(group2_data),
                group_statistics={
                    f"group_{groups[0]}_mean": float(group1_data.mean()),
                    f"group_{groups[0]}_std": float(group1_data.std(ddof=1)),
                    f"group_{groups[0]}_n": len(group1_data),
                    f"group_{groups[1]}_mean": float(group2_data.mean()),
                    f"group_{groups[1]}_std": float(group2_data.std(ddof=1)),
                    f"group_{groups[1]}_n": len(group2_data)
                }
            )
            
        except Exception as e:
            raise ValueError(f"Error in independent t-test: {str(e)}")
    
    @classmethod
    async def paired_ttest(cls, file_path: str, variable1_column: str, 
                          variable2_column: str, alpha: float = 0.05) -> StatisticalTestResult:
        """Perform paired samples t-test."""
        try:
            df = cls._load_data(file_path)
            
            # Validate columns
            errors = []
            errors.extend(cls._validate_numeric_column(df, variable1_column))
            errors.extend(cls._validate_numeric_column(df, variable2_column))
            if errors:
                raise ValueError("; ".join(errors))
            
            # Remove rows with missing values in either column
            valid_data = df[[variable1_column, variable2_column]].dropna()
            
            if len(valid_data) < 2:
                raise ValueError("Need at least 2 complete pairs for paired t-test")
            
            var1_data = valid_data[variable1_column]
            var2_data = valid_data[variable2_column]
            
            # Perform test
            t_stat, p_value = stats.ttest_rel(var1_data, var2_data)
            
            # Calculate confidence interval for difference
            differences = var1_data - var2_data
            degrees_of_freedom = len(differences) - 1
            
            t_critical = stats.t.ppf(1 - alpha/2, degrees_of_freedom)
            se_diff = differences.std(ddof=1) / np.sqrt(len(differences))
            mean_diff = differences.mean()
            margin_of_error = t_critical * se_diff
            
            ci_lower = mean_diff - margin_of_error
            ci_upper = mean_diff + margin_of_error
            
            # Effect size (Cohen's d for paired samples)
            effect_size = mean_diff / differences.std(ddof=1)
            
            interpretation = cls._interpret_result(p_value, alpha, "paired samples t-test", effect_size)
            
            return StatisticalTestResult(
                test_name="Paired Samples t-Test",
                test_statistic=float(t_stat),
                degrees_of_freedom=float(degrees_of_freedom),
                p_value=float(p_value),
                confidence_interval_lower=float(ci_lower),
                confidence_interval_upper=float(ci_upper),
                effect_size=float(effect_size),
                interpretation=interpretation,
                sample_size=len(valid_data),
                group_statistics={
                    f"{variable1_column}_mean": float(var1_data.mean()),
                    f"{variable1_column}_std": float(var1_data.std(ddof=1)),
                    f"{variable2_column}_mean": float(var2_data.mean()),
                    f"{variable2_column}_std": float(var2_data.std(ddof=1)),
                    "difference_mean": float(mean_diff),
                    "difference_std": float(differences.std(ddof=1))
                }
            )
            
        except Exception as e:
            raise ValueError(f"Error in paired t-test: {str(e)}")
    
    @classmethod
    async def one_way_anova(cls, file_path: str, variable_column: str, 
                           group_column: str, alpha: float = 0.05) -> StatisticalTestResult:
        """Perform one-way ANOVA."""
        try:
            df = cls._load_data(file_path)
            
            # Validate columns
            errors = []
            errors.extend(cls._validate_numeric_column(df, variable_column))
            errors.extend(cls._validate_column_exists(df, group_column))
            if errors:
                raise ValueError("; ".join(errors))
            
            # Get groups and clean data
            groups = df[group_column].unique()
            groups = [g for g in groups if pd.notna(g)]
            
            if len(groups) < 2:
                raise ValueError("ANOVA requires at least 2 groups")
            
            group_data = []
            group_stats = {}
            total_n = 0
            
            for group in groups:
                group_values = cls._clean_numeric_data(df[df[group_column] == group][variable_column])
                if len(group_values) < 2:
                    raise ValueError(f"Group '{group}' has fewer than 2 valid values")
                group_data.append(group_values)
                group_stats[f"group_{group}_mean"] = float(group_values.mean())
                group_stats[f"group_{group}_std"] = float(group_values.std(ddof=1))
                group_stats[f"group_{group}_n"] = len(group_values)
                total_n += len(group_values)
            
            # Perform ANOVA
            f_stat, p_value = stats.f_oneway(*group_data)
            
            # Degrees of freedom
            df_between = len(groups) - 1
            df_within = total_n - len(groups)
            
            # Effect size (eta-squared)
            # For one-way ANOVA, we calculate eta-squared as an effect size measure
            ss_total = sum([(data - np.concatenate(group_data).mean())**2 
                           for data in np.concatenate(group_data)])
            ss_between = sum([len(data) * (data.mean() - np.concatenate(group_data).mean())**2 
                             for data in group_data])
            eta_squared = ss_between / ss_total if ss_total > 0 else 0
            
            interpretation = cls._interpret_result(p_value, alpha, "one-way ANOVA", eta_squared)
            
            return StatisticalTestResult(
                test_name="One-Way ANOVA",
                test_statistic=float(f_stat),
                degrees_of_freedom=float(df_between),  # Between-groups df
                p_value=float(p_value),
                confidence_interval_lower=None,  # ANOVA doesn't have CI in the same sense
                confidence_interval_upper=None,
                effect_size=float(eta_squared),
                interpretation=interpretation,
                sample_size=total_n,
                group_statistics=group_stats
            )
            
        except Exception as e:
            raise ValueError(f"Error in one-way ANOVA: {str(e)}")