# Module 4: Data Visualizations

## Overview

Module 4 provides interactive data visualization capabilities using Plotly.js, allowing users to create scatter plots, histograms, and box plots from their uploaded datasets. The module seamlessly integrates with Module 3 (Statistical Tests) to provide contextual visualization suggestions.

## Features

### 📊 Chart Types
- **Scatter Plots**: Explore relationships between two numeric variables
- **Histograms**: Visualize data distributions with customizable binning
- **Box Plots**: Compare distributions across groups and identify outliers

### 🔗 Statistical Integration
- Automatic chart suggestions based on statistical test results
- Pre-populated form parameters from statistical context
- One-click transition from statistical analysis to visualization

### 🎨 Customization Options
- Multiple color schemes (default, viridis, plasma, cividis)
- Custom titles and axis labels
- Grouping and color coding by categorical variables
- Interactive features (zoom, pan, hover tooltips)

### 💾 Export Capabilities
- Download plots as PNG images
- High-resolution export for publications
- Responsive design for various screen sizes

## API Endpoints

### Chart Suggestions
```
GET /api/visualizations/suggestions?file_id={id}
```
Returns intelligent chart recommendations based on column types and data characteristics.

**Response:**
```json
{
  "suggestions": [
    {
      "chart_type": "scatter",
      "title": "Explore Variable Relationships",
      "description": "Create scatter plots to visualize correlations",
      "recommended_columns": ["numeric_col1", "numeric_col2"]
    }
  ]
}
```

### Scatter Plot
```
POST /api/visualizations/scatter
```
Creates scatter plot data for two numeric variables.

**Request:**
```json
{
  "file_id": 1,
  "x_column": "height",
  "y_column": "weight",
  "color_column": "gender",
  "size_column": "age",
  "title": "Height vs Weight by Gender",
  "x_label": "Height (cm)",
  "y_label": "Weight (kg)",
  "color_scheme": "viridis"
}
```

**Response:**
```json
{
  "plot_data": {
    "data": [
      {
        "x": [170, 175, 165, ...],
        "y": [70, 80, 60, ...],
        "mode": "markers",
        "type": "scatter",
        "marker": {
          "color": [0, 1, 0, ...],
          "colorscale": "Viridis"
        }
      }
    ],
    "layout": {
      "title": "Height vs Weight by Gender",
      "xaxis": {"title": "Height (cm)"},
      "yaxis": {"title": "Weight (kg)"}
    }
  },
  "summary": {
    "total_points": 150,
    "x_range": [160, 190],
    "y_range": [55, 95]
  }
}
```

### Histogram
```
POST /api/visualizations/histogram
```
Creates histogram data for a numeric variable.

**Request:**
```json
{
  "file_id": 1,
  "column": "age",
  "bins": 20,
  "group_column": "department",
  "title": "Age Distribution by Department",
  "x_label": "Age (years)",
  "y_label": "Count",
  "color_scheme": "default"
}
```

### Box Plot
```
POST /api/visualizations/boxplot
```
Creates box plot data for comparing distributions.

**Request:**
```json
{
  "file_id": 1,
  "y_column": "salary",
  "x_column": "department",
  "title": "Salary Distribution by Department",
  "x_label": "Department",
  "y_label": "Salary ($)",
  "color_scheme": "plasma"
}
```

## User Workflow

### 1. From Data Upload
1. Upload CSV file via Module 1
2. Navigate to "Visualize" tab
3. Select chart type and configure parameters
4. Generate and interact with visualization

### 2. From Statistical Analysis
1. Run statistical test in Module 3
2. Click "📊 Visualize Data" button in results
3. Automatically redirected with pre-populated form
4. Customize and generate visualization

## Technical Architecture

### Backend Components
- `VisualizationService`: Core data processing using pandas and numpy
- `VisualizationController`: FastAPI endpoints with Pydantic validation
- `schemas/visualizations.py`: Request/response models
- Chart-specific data generators for each plot type

### Frontend Components
- `VisualizePage.tsx`: Main visualization interface
- `PlotlyChart.tsx`: Reusable Plotly.js wrapper component
- `services/visualizations.ts`: API client with TypeScript types
- CSS modules for responsive styling

### Key Dependencies
- **Backend**: `matplotlib`, `scipy`, `pandas`, `numpy`
- **Frontend**: `react-plotly.js`, `plotly.js`, `@tanstack/react-query`

## Integration with Module 3

The visualization module intelligently suggests appropriate chart types based on statistical test context:

| Statistical Test | Suggested Chart | Pre-populated Parameters |
|------------------|----------------|--------------------------|
| Correlation | Scatter Plot | X/Y columns from test |
| T-test, Mann-Whitney | Box Plot | Variable column |
| ANOVA, Kruskal-Wallis | Histogram | Primary variable |
| Chi-square | Histogram | Categorical variable |

URL parameters automatically configure the visualization form:
```
/visualize?chart_type=scatter&x_column=height&y_column=weight&fileId=1
```

## Color Schemes

Available color schemes for enhanced data visualization:
- **default**: Standard blue palette
- **viridis**: Perceptually uniform, colorblind-friendly
- **plasma**: High contrast purple-pink gradient  
- **cividis**: Blue-yellow gradient, colorblind-friendly

## Error Handling

The module includes comprehensive error handling for:
- Invalid column selections (non-existent or wrong data type)
- Empty datasets or insufficient data points
- Network connectivity issues
- Malformed API requests
- Plot rendering failures

## Performance Considerations

- Efficient pandas operations for large datasets
- Client-side plot caching to reduce API calls
- Responsive design with mobile-optimized layouts
- Lazy loading of Plotly.js components

## Future Enhancements

Potential additions for advanced functionality:
- Multiple plots per page with custom layouts
- Plot annotations and text overlays
- Advanced filtering and data transformation
- Plot templates and styling presets
- Real-time data updates and streaming plots

## Accessibility

- High contrast color schemes available
- Keyboard navigation support
- Screen reader compatible chart descriptions
- Responsive design for various screen sizes and devices