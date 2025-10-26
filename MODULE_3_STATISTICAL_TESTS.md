# Module 3: Statistical Tests

This module implements comprehensive statistical testing capabilities for DataSnap, allowing users to perform t-tests and ANOVA on their uploaded datasets.

## Features Implemented

### Backend (FastAPI)
- **Four Statistical Tests**:
  - One-Sample t-Test
  - Independent Samples t-Test  
  - Paired Samples t-Test
  - One-Way ANOVA

- **Full Statistical Computation**:
  - Test statistics and p-values using SciPy
  - Confidence intervals  
  - Effect sizes (Cohen's d, eta-squared)
  - Plain English interpretations
  - Comprehensive error handling

### Frontend (React + TypeScript)
- **Interactive Test Selection**: Grid-based selection of statistical tests
- **Dynamic Parameter Forms**: Forms adapt based on selected test type
- **Results Display**: Professional formatting with statistics cards
- **Export Functionality**: Download results as text or copy to clipboard
- **Real-time Validation**: Form validation with helpful error messages

## API Endpoints

All endpoints require authentication and use the `/api/v1/statistical_tests/` prefix:

### POST `/one_sample_ttest`
Tests whether a sample mean differs significantly from a specified value.

**Request:**
```json
{
  "file_id": 1,
  "variable_column": "height",
  "test_value": 170.0,
  "alpha": 0.05
}
```

### POST `/independent_ttest` 
Tests whether means of two independent groups differ significantly.

**Request:**
```json
{
  "file_id": 1,
  "variable_column": "score",
  "group_column": "treatment",
  "alpha": 0.05
}
```

### POST `/paired_ttest`
Tests whether means of two related measurements differ significantly.

**Request:**
```json
{
  "file_id": 1,
  "variable1_column": "pre_test",
  "variable2_column": "post_test", 
  "alpha": 0.05
}
```

### POST `/one_way_anova`
Tests whether means across three or more groups differ significantly.

**Request:**
```json
{
  "file_id": 1,
  "variable_column": "outcome",
  "group_column": "condition",
  "alpha": 0.05
}
```

**Response Format (All Tests):**
```json
{
  "test_name": "One-Sample t-Test",
  "test_statistic": 2.345,
  "degrees_of_freedom": 49,
  "p_value": 0.023,
  "confidence_interval_lower": 0.12,
  "confidence_interval_upper": 4.56,
  "effect_size": 0.334,
  "interpretation": "The one-sample t-test is statistically significant at the α = 0.05 level (p = 0.0230). We reject the null hypothesis. The effect size is medium (d = 0.334).",
  "sample_size": 50,
  "group_statistics": {
    "sample_mean": 172.5,
    "sample_std": 8.2,
    "test_value": 170.0
  }
}
```

## Usage Workflow

1. **Upload Dataset**: User uploads CSV file through existing upload flow
2. **Navigate to Statistical Tests**: Click "Statistical Tests" in sidebar navigation  
3. **Select Test Type**: Choose from four available statistical tests
4. **Configure Parameters**: Select variables and set significance level
5. **Run Analysis**: Execute test and view results with interpretation
6. **Export Results**: Download or copy formatted results

## Technical Implementation

### Backend Architecture
- **Service Layer**: `StatisticalTestsService` handles all computations
- **API Layer**: Clean REST endpoints with Pydantic validation
- **Statistical Engine**: SciPy for robust statistical computation
- **Error Handling**: Comprehensive validation and user-friendly error messages

### Frontend Architecture  
- **Modular Components**: 
  - `TestSelector` - Test type selection
  - `ParametersForm` - Dynamic parameter input
  - `TestResults` - Results display and export
- **State Management**: React hooks for form state and API calls
- **Styling**: CSS modules following existing design system
- **Type Safety**: Full TypeScript coverage

## Testing

### Backend Tests (`tests/test_statistical_tests.py`)
- Unit tests for all four statistical tests
- Validation of statistical accuracy
- Error handling edge cases
- Boundary condition testing

### Manual Testing Checklist
- [ ] All four tests execute successfully with real data
- [ ] Error handling works for invalid inputs
- [ ] Results display correctly formatted
- [ ] Export functionality works
- [ ] Responsive design on mobile devices
- [ ] Accessibility with keyboard navigation

## Files Created/Modified

### Backend
- `app/schemas/statistical_tests.py` - Pydantic models
- `app/services/statistical_tests_service.py` - Statistical computation
- `app/api/v1/endpoints/statistical_tests.py` - API endpoints
- `tests/test_statistical_tests.py` - Unit tests
- `requirements.txt` - Added scipy dependency

### Frontend  
- `src/services/statisticalTests.ts` - API service layer
- `src/components/analysis/AnalysisPage.tsx` - Main page component
- `src/components/analysis/TestSelector.tsx` - Test selection
- `src/components/analysis/ParametersForm.tsx` - Parameter input
- `src/components/analysis/TestResults.tsx` - Results display
- `src/components/analysis/AnalysisPage.module.css` - Styling
- `src/styles/global.css` - Added CSS variables

## Dependencies Added
- **Backend**: `scipy>=1.11.0` for statistical computation
- **Frontend**: No new dependencies (uses existing React Query, React Router)

## Future Enhancements
- Additional statistical tests (chi-square, correlation analysis)
- Data visualization integration  
- Statistical power analysis
- Report generation with charts
- Batch processing for multiple tests

---

**Module Status**: ✅ Complete and Ready for Production

This implementation provides a solid foundation for statistical analysis within DataSnap, with room for future expansion as user needs grow.