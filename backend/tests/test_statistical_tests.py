import pytest
from httpx import AsyncClient
from fastapi import FastAPI
import pandas as pd
import numpy as np
from pathlib import Path
import tempfile
import os

from app.services.statistical_tests_service import StatisticalTestsService


class TestStatisticalTestsService:
    """Test the statistical tests service directly."""
    
    @pytest.fixture
    def sample_data(self):
        """Create a sample dataset for testing."""
        np.random.seed(42)  # For reproducible results
        data = {
            'numeric_col': np.random.normal(100, 15, 50),
            'group_col': ['A'] * 25 + ['B'] * 25,
            'numeric_col2': np.random.normal(95, 12, 50),
            'three_group_col': ['X'] * 17 + ['Y'] * 16 + ['Z'] * 17
        }
        return pd.DataFrame(data)
    
    @pytest.fixture
    def temp_csv_file(self, sample_data):
        """Create a temporary CSV file for testing."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            sample_data.to_csv(f.name, index=False)
            yield f.name
        os.unlink(f.name)
    
    @pytest.mark.asyncio
    async def test_one_sample_ttest_significant(self, temp_csv_file):
        """Test one-sample t-test with significant result."""
        result = await StatisticalTestsService.one_sample_ttest(
            file_path=temp_csv_file,
            variable_column='numeric_col',
            test_value=85,  # This should be significantly different from ~100
            alpha=0.05
        )
        
        assert result.test_name == "One-Sample t-Test"
        assert result.p_value < 0.05  # Should be significant
        assert result.degrees_of_freedom == 49  # n-1
        assert result.sample_size == 50
        assert "reject the null hypothesis" in result.interpretation.lower()
        assert result.effect_size is not None
        assert result.confidence_interval_lower is not None
        assert result.confidence_interval_upper is not None
    
    @pytest.mark.asyncio
    async def test_one_sample_ttest_non_significant(self, temp_csv_file):
        """Test one-sample t-test with non-significant result."""
        result = await StatisticalTestsService.one_sample_ttest(
            file_path=temp_csv_file,
            variable_column='numeric_col',
            test_value=100,  # Close to actual mean
            alpha=0.05
        )
        
        assert result.test_name == "One-Sample t-Test"
        assert result.p_value >= 0.05  # Should not be significant
        assert "fail to reject the null hypothesis" in result.interpretation.lower()
    
    @pytest.mark.asyncio
    async def test_independent_ttest(self, temp_csv_file):
        """Test independent samples t-test."""
        result = await StatisticalTestsService.independent_ttest(
            file_path=temp_csv_file,
            variable_column='numeric_col',
            group_column='group_col',
            alpha=0.05
        )
        
        assert result.test_name == "Independent Samples t-Test"
        assert result.degrees_of_freedom == 48  # n1 + n2 - 2
        assert result.sample_size == 50
        assert result.effect_size is not None
        assert "group_A_mean" in result.group_statistics
        assert "group_B_mean" in result.group_statistics
    
    @pytest.mark.asyncio
    async def test_paired_ttest(self, temp_csv_file):
        """Test paired samples t-test."""
        result = await StatisticalTestsService.paired_ttest(
            file_path=temp_csv_file,
            variable1_column='numeric_col',
            variable2_column='numeric_col2',
            alpha=0.05
        )
        
        assert result.test_name == "Paired Samples t-Test"
        assert result.degrees_of_freedom == 49  # n-1
        assert result.sample_size == 50
        assert result.effect_size is not None
        assert "numeric_col_mean" in result.group_statistics
        assert "numeric_col2_mean" in result.group_statistics
        assert "difference_mean" in result.group_statistics
    
    @pytest.mark.asyncio
    async def test_one_way_anova(self, temp_csv_file):
        """Test one-way ANOVA."""
        result = await StatisticalTestsService.one_way_anova(
            file_path=temp_csv_file,
            variable_column='numeric_col',
            group_column='three_group_col',
            alpha=0.05
        )
        
        assert result.test_name == "One-Way ANOVA"
        assert result.degrees_of_freedom == 2  # k-1 where k is number of groups
        assert result.sample_size == 50
        assert result.effect_size is not None  # eta-squared
        assert "group_X_mean" in result.group_statistics
        assert "group_Y_mean" in result.group_statistics
        assert "group_Z_mean" in result.group_statistics
    
    @pytest.mark.asyncio
    async def test_invalid_column_error(self, temp_csv_file):
        """Test error handling for invalid column names."""
        with pytest.raises(ValueError, match="Column 'nonexistent' not found"):
            await StatisticalTestsService.one_sample_ttest(
                file_path=temp_csv_file,
                variable_column='nonexistent',
                test_value=100,
                alpha=0.05
            )
    
    @pytest.mark.asyncio
    async def test_non_numeric_column_error(self, temp_csv_file):
        """Test error handling for non-numeric columns."""
        with pytest.raises(ValueError, match="must be numeric"):
            await StatisticalTestsService.one_sample_ttest(
                file_path=temp_csv_file,
                variable_column='group_col',  # This is categorical
                test_value=100,
                alpha=0.05
            )
    
    @pytest.mark.asyncio
    async def test_insufficient_groups_error(self, temp_csv_file):
        """Test error handling for insufficient groups in independent t-test."""
        # Create a dataset with only one group
        single_group_data = pd.DataFrame({
            'numeric_col': [1, 2, 3, 4, 5],
            'group_col': ['A'] * 5
        })
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            single_group_data.to_csv(f.name, index=False)
            
            try:
                with pytest.raises(ValueError, match="requires exactly 2 groups"):
                    await StatisticalTestsService.independent_ttest(
                        file_path=f.name,
                        variable_column='numeric_col',
                        group_column='group_col',
                        alpha=0.05
                    )
            finally:
                os.unlink(f.name)
    
    @pytest.mark.asyncio 
    async def test_insufficient_sample_size(self):
        """Test error handling for insufficient sample size."""
        # Create a dataset with only one data point
        tiny_data = pd.DataFrame({
            'numeric_col': [100]
        })
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            tiny_data.to_csv(f.name, index=False)
            
            try:
                with pytest.raises(ValueError, match="need at least 2 valid values"):
                    await StatisticalTestsService.one_sample_ttest(
                        file_path=f.name,
                        variable_column='numeric_col',
                        test_value=100,
                        alpha=0.05
                    )
            finally:
                os.unlink(f.name)


# Note: API endpoint tests would require additional setup with test database
# and test client. For now, we focus on service-level testing.