"""
Narrative templates for rule-based statistical test interpretation.
These templates use Jinja2 syntax for dynamic content generation.
"""

from typing import Dict, List
from app.schemas.narratives import NarrativeTemplate, NarrativeType

# Template helper functions
def format_p_value(p_value: float) -> str:
    """Format p-value for display"""
    if p_value < 0.001:
        return "< 0.001"
    elif p_value < 0.01:
        return f"= {p_value:.3f}"
    else:
        return f"= {p_value:.3f}"

def interpret_effect_size(effect_size: float, test_type: str) -> str:
    """Interpret effect size magnitude"""
    if test_type.lower() in ['ttest', 't-test', 'independent t-test']:
        if effect_size < 0.2:
            return "small"
        elif effect_size < 0.5:
            return "small to medium"
        elif effect_size < 0.8:
            return "medium to large"
        else:
            return "large"
    else:
        if effect_size < 0.1:
            return "small"
        elif effect_size < 0.3:
            return "medium"
        else:
            return "large"

def significance_statement(p_value: float, alpha: float = 0.05) -> str:
    """Generate significance statement"""
    if p_value < alpha:
        return "statistically significant"
    else:
        return "not statistically significant"

# Statistical Test Templates
TTEST_TEMPLATE = """
📊 **{{ test_name }} Results**

Your analysis reveals {{ significance_statement(p_value) }} results (t = {{ "%.2f"|format(test_statistic) }}, p {{ format_p_value(p_value) }}).

**Key Findings:**
{% if p_value < 0.05 %}
• The difference between groups is statistically significant
• {% if group_statistics %}The {{ columns[0] if columns else 'treatment' }} group showed {{ "%.1f"|format(abs(group_statistics.get('group_a_mean', 0) - group_statistics.get('group_b_mean', 0))) }} points difference on average{% endif %}
{% if effect_size %}• Effect size is {{ interpret_effect_size(effect_size, test_name) }} (d = {{ "%.2f"|format(effect_size) }}){% endif %}
{% if confidence_interval_lower and confidence_interval_upper %}• 95% confidence interval: [{{ "%.2f"|format(confidence_interval_lower) }}, {{ "%.2f"|format(confidence_interval_upper) }}]{% endif %}
{% else %}
• No statistically significant difference was found between groups
• The observed difference could reasonably be due to random variation
{% if effect_size and effect_size < 0.2 %}• Effect size is small (d = {{ "%.2f"|format(effect_size) }}), suggesting minimal practical difference{% endif %}
{% endif %}

**Sample Information:**
• Sample size: {{ sample_size }} observations
{% if degrees_of_freedom %}• Degrees of freedom: {{ "%.0f"|format(degrees_of_freedom) }}{% endif %}

**Interpretation:**
{% if p_value < 0.001 %}
This result is highly significant (p < 0.001), providing very strong evidence against the null hypothesis. There is less than a 0.1% chance this difference occurred by random chance alone.
{% elif p_value < 0.01 %}
This result is significant at the 0.01 level, providing strong evidence of a real difference between groups.
{% elif p_value < 0.05 %}
This result meets the conventional significance threshold (p < 0.05), suggesting a meaningful difference exists.
{% else %}
The p-value ({{ "%.3f"|format(p_value) }}) exceeds the typical significance threshold of 0.05. While there may be a trend, we cannot confidently conclude a significant difference exists.
{% endif %}

{% if p_value < 0.05 %}
**Recommendations:**
{% if effect_size and effect_size > 0.5 %}
✓ The {{ interpret_effect_size(effect_size, test_name) }} effect size suggests this difference has practical importance
✓ Consider implementing changes based on these findings
{% endif %}
⚠️ Validate results with additional data or replication studies
📈 Investigate factors that might explain the observed difference
{% else %}
**Recommendations:**
• Consider collecting more data to increase statistical power
• Examine whether the effect size, while not significant, might still be practically meaningful
• Review study design and measurement methods for potential improvements
{% endif %}
"""

CORRELATION_TEMPLATE = """
📈 **Correlation Analysis Results**

Your analysis reveals a {{ 'strong' if abs(test_statistic) > 0.7 else 'moderate' if abs(test_statistic) > 0.3 else 'weak' }} {{ 'positive' if test_statistic > 0 else 'negative' }} correlation between {{ columns[0] if columns and len(columns) > 0 else 'Variable X' }} and {{ columns[1] if columns and len(columns) > 1 else 'Variable Y' }}.

**Statistical Results:**
• Correlation coefficient (r): {{ "%.3f"|format(test_statistic) }}
• P-value: {{ format_p_value(p_value) }}
• Sample size: {{ sample_size }} observations
{% if degrees_of_freedom %}• Degrees of freedom: {{ "%.0f"|format(degrees_of_freedom) }}{% endif %}

**Key Insights:**
{% if p_value < 0.05 %}
• This correlation is {{ significance_statement(p_value) }}
• {{ "%.1f"|format((test_statistic**2) * 100) }}% of the variation in {{ columns[1] if columns and len(columns) > 1 else 'the dependent variable' }} is explained by {{ columns[0] if columns and len(columns) > 0 else 'the independent variable' }}
{% if abs(test_statistic) > 0.7 %}
• This is considered a strong relationship in most contexts
{% elif abs(test_statistic) > 0.3 %}
• This represents a moderate relationship that may have practical significance
{% else %}
• While statistically significant, the relationship strength is relatively weak
{% endif %}
{% else %}
• The correlation is not statistically significant
• Any apparent relationship could reasonably be due to random variation
• Consider collecting more data or examining potential confounding factors
{% endif %}

**Interpretation:**
{% if test_statistic > 0 %}
As {{ columns[0] if columns and len(columns) > 0 else 'one variable' }} increases, {{ columns[1] if columns and len(columns) > 1 else 'the other variable' }} tends to increase as well.
{% else %}
As {{ columns[0] if columns and len(columns) > 0 else 'one variable' }} increases, {{ columns[1] if columns and len(columns) > 1 else 'the other variable' }} tends to decrease.
{% endif %}

{% if p_value < 0.05 %}
**Recommendations:**
{% if abs(test_statistic) > 0.7 %}
✓ Strong correlation suggests potential causal investigation
✓ Consider this relationship in predictive models or decision-making
{% elif abs(test_statistic) > 0.3 %}
✓ Moderate correlation warrants further investigation
✓ Look for underlying factors that might explain this relationship
{% endif %}
⚠️ Remember: correlation does not imply causation
📊 Consider creating a scatter plot to visualize this relationship
{% else %}
**Next Steps:**
• Increase sample size if possible to improve statistical power
• Examine data quality and potential measurement errors
• Consider whether the variables need transformation (e.g., log scale)
• Look for non-linear relationships that correlation might miss
{% endif %}
"""

ANOVA_TEMPLATE = """
🔬 **ANOVA Results**

Your one-way ANOVA analysis {{ 'shows' if p_value < 0.05 else 'does not show' }} statistically significant differences between groups.

**Statistical Results:**
• F-statistic: {{ "%.3f"|format(test_statistic) }}
• P-value: {{ format_p_value(p_value) }}
{% if degrees_of_freedom %}• Degrees of freedom: {{ "%.0f"|format(degrees_of_freedom) }}{% endif %}
• Sample size: {{ sample_size }} total observations
{% if effect_size %}• Effect size (η²): {{ "%.3f"|format(effect_size) }}{% endif %}

**Key Findings:**
{% if p_value < 0.05 %}
• At least one group differs significantly from the others
{% if effect_size %}
{% if effect_size > 0.14 %}
• Large effect size (η² = {{ "%.3f"|format(effect_size) }}) suggests substantial group differences
{% elif effect_size > 0.06 %}
• Medium effect size (η² = {{ "%.3f"|format(effect_size) }}) indicates moderate group differences
{% else %}
• Small effect size (η² = {{ "%.3f"|format(effect_size) }}) suggests minor but significant differences
{% endif %}
{% endif %}

{% if group_statistics %}
**Group Summary:**
{% for key, value in group_statistics.items() %}
• {{ key.replace('_', ' ').title() }}: {{ "%.2f"|format(value) if value is number else value }}
{% endfor %}
{% endif %}
{% else %}
• No statistically significant differences found between groups
• Observed variations could reasonably be due to random chance
• All groups appear to be drawn from populations with similar means
{% endif %}

**Interpretation:**
{% if p_value < 0.001 %}
The highly significant result (p < 0.001) provides very strong evidence that the groups have different population means.
{% elif p_value < 0.01 %}
The significant result (p < 0.01) provides strong evidence of group differences.
{% elif p_value < 0.05 %}
The result meets conventional significance criteria (p < 0.05), suggesting meaningful group differences.
{% else %}
The result (p = {{ "%.3f"|format(p_value) }}) does not reach statistical significance. This could indicate either no real differences exist, or the study lacks sufficient power to detect existing differences.
{% endif %}

{% if p_value < 0.05 %}
**Recommendations:**
✓ Conduct post-hoc tests to identify which specific groups differ
📊 Create box plots or bar charts to visualize group differences
{% if effect_size and effect_size > 0.06 %}
✓ The {{ 'large' if effect_size > 0.14 else 'medium' }} effect size suggests practical importance
{% endif %}
⚠️ Consider potential confounding variables that might explain group differences
📈 Investigate what factors distinguish the significantly different groups
{% else %}
**Next Steps:**
• Consider increasing sample size to improve statistical power
• Examine whether groups are truly comparable (check for confounders)
• Review measurement methods for potential improvements
• Consider whether the grouping variable is optimal for your research question
{% endif %}
"""

CHI_SQUARE_TEMPLATE = """
🎲 **Chi-Square Test Results**

Your chi-square test {{ 'reveals' if p_value < 0.05 else 'does not reveal' }} a statistically significant association between the variables.

**Statistical Results:**
• Chi-square statistic (χ²): {{ "%.3f"|format(test_statistic) }}
• P-value: {{ format_p_value(p_value) }}
{% if degrees_of_freedom %}• Degrees of freedom: {{ "%.0f"|format(degrees_of_freedom) }}{% endif %}
• Sample size: {{ sample_size }} observations
{% if effect_size %}• Effect size (Cramér's V): {{ "%.3f"|format(effect_size) }}{% endif %}

**Key Findings:**
{% if p_value < 0.05 %}
• There is a statistically significant association between {{ columns[0] if columns and len(columns) > 0 else 'the row variable' }} and {{ columns[1] if columns and len(columns) > 1 else 'the column variable' }}
• The observed pattern of frequencies differs significantly from what we would expect by chance

{% if effect_size %}
{% if effect_size > 0.5 %}
• Large effect size (V = {{ "%.3f"|format(effect_size) }}) indicates a strong association
{% elif effect_size > 0.3 %}
• Medium effect size (V = {{ "%.3f"|format(effect_size) }}) indicates a moderate association  
{% elif effect_size > 0.1 %}
• Small effect size (V = {{ "%.3f"|format(effect_size) }}) indicates a weak but significant association
{% else %}
• Very small effect size (V = {{ "%.3f"|format(effect_size) }}) suggests the association, while significant, is minimal
{% endif %}
{% endif %}
{% else %}
• No statistically significant association was found between the variables
• The observed frequencies could reasonably occur by random chance alone
• The variables appear to be independent of each other
{% endif %}

**Interpretation:**
{% if p_value < 0.001 %}
This highly significant result (p < 0.001) provides very strong evidence of association between the variables.
{% elif p_value < 0.01 %}
This significant result (p < 0.01) provides strong evidence of association.
{% elif p_value < 0.05 %}
This result meets the conventional significance threshold, suggesting a meaningful association exists.
{% else %}
The result (p = {{ "%.3f"|format(p_value) }}) suggests the variables may be independent. Any apparent association could be due to random variation.
{% endif %}

{% if group_statistics %}
**Observed Patterns:**
{% for key, value in group_statistics.items() %}
• {{ key.replace('_', ' ').title() }}: {{ value }}
{% endfor %}
{% endif %}

{% if p_value < 0.05 %}
**Recommendations:**
✓ Examine the contingency table to understand which specific combinations drive the association
📊 Create a heatmap or stacked bar chart to visualize the association pattern
{% if effect_size and effect_size > 0.3 %}
✓ The {{ 'large' if effect_size > 0.5 else 'medium' }} effect size suggests practical importance
{% endif %}
🔍 Investigate potential explanatory factors for this association
⚠️ Consider whether there might be confounding variables affecting this relationship
{% else %}
**Next Steps:**
• Consider collecting more data to increase statistical power
• Check if the categories are appropriately defined and mutually exclusive
• Examine whether combining or restructuring categories might reveal patterns
• Consider alternative analyses if the assumption of independence is questionable
{% endif %}
"""

# Template registry
NARRATIVE_TEMPLATES: Dict[str, NarrativeTemplate] = {
    "ttest": NarrativeTemplate(
        template_id="ttest_v1",
        narrative_type=NarrativeType.STATISTICAL_TEST,
        test_types=["ttest", "t-test", "independent t-test", "one-sample t-test", "paired t-test"],
        template_content=TTEST_TEMPLATE,
        required_fields=["test_name", "test_statistic", "p_value", "sample_size"],
        optional_fields=["degrees_of_freedom", "effect_size", "confidence_interval_lower", 
                        "confidence_interval_upper", "columns", "group_statistics"],
        conditions={"test_name": ["ttest", "t-test", "independent t-test"]},
        priority=10
    ),
    
    "correlation": NarrativeTemplate(
        template_id="correlation_v1", 
        narrative_type=NarrativeType.STATISTICAL_TEST,
        test_types=["correlation", "pearson", "spearman", "kendall"],
        template_content=CORRELATION_TEMPLATE,
        required_fields=["test_statistic", "p_value", "sample_size"],
        optional_fields=["degrees_of_freedom", "columns"],
        conditions={"test_name": ["correlation", "pearson", "spearman"]},
        priority=10
    ),
    
    "anova": NarrativeTemplate(
        template_id="anova_v1",
        narrative_type=NarrativeType.STATISTICAL_TEST, 
        test_types=["anova", "one-way anova", "f-test"],
        template_content=ANOVA_TEMPLATE,
        required_fields=["test_statistic", "p_value", "sample_size"],
        optional_fields=["degrees_of_freedom", "effect_size", "group_statistics", "columns"],
        conditions={"test_name": ["anova", "one-way anova"]},
        priority=10
    ),
    
    "chi_square": NarrativeTemplate(
        template_id="chi_square_v1",
        narrative_type=NarrativeType.STATISTICAL_TEST,
        test_types=["chi_square", "chi-square", "chi2"],
        template_content=CHI_SQUARE_TEMPLATE,
        required_fields=["test_statistic", "p_value", "sample_size"],
        optional_fields=["degrees_of_freedom", "effect_size", "columns", "group_statistics"],
        conditions={"test_name": ["chi_square", "chi-square"]},
        priority=10
    )
}

# Data summary template
DATA_SUMMARY_TEMPLATE = """
📊 **Dataset Overview**

Your dataset contains {{ "{:,}".format(total_rows) }} rows and {{ total_columns }} columns{% if data_quality_score %}, with an overall data quality score of {{ "%.1f"|format(data_quality_score * 100) }}%{% endif %}.

**Data Composition:**
{% if column_types %}
{% set numeric_count = column_types.values()|select("equalto", "numeric")|list|length %}
{% set categorical_count = column_types.values()|select("equalto", "categorical")|list|length %}
{% set datetime_count = column_types.values()|select("equalto", "datetime")|list|length %}
• {{ numeric_count }} numeric column{{ 's' if numeric_count != 1 else '' }}
• {{ categorical_count }} categorical column{{ 's' if categorical_count != 1 else '' }}
{% if datetime_count > 0 %}• {{ datetime_count }} datetime column{{ 's' if datetime_count != 1 else '' }}{% endif %}
{% endif %}

**Data Quality Assessment:**
{% if missing_values %}
{% set total_missing = missing_values.values()|sum %}
{% if total_missing == 0 %}
✅ Excellent: No missing values detected
{% elif total_missing < (total_rows * total_columns * 0.05) %}
✅ Good: Minimal missing values ({{ total_missing }} total, {{ "%.1f"|format((total_missing / (total_rows * total_columns)) * 100) }}%)
{% elif total_missing < (total_rows * total_columns * 0.15) %}
⚠️ Fair: Some missing values detected ({{ total_missing }} total, {{ "%.1f"|format((total_missing / (total_rows * total_columns)) * 100) }}%)
{% else %}
❌ Concerning: High number of missing values ({{ total_missing }} total, {{ "%.1f"|format((total_missing / (total_rows * total_columns)) * 100) }}%)
{% endif %}

{% if missing_values.values()|max > 0 %}
**Columns with missing values:**
{% for column, count in missing_values.items() %}
{% if count > 0 %}
• {{ column }}: {{ count }} missing ({{ "%.1f"|format((count / total_rows) * 100) }}%)
{% endif %}
{% endfor %}
{% endif %}
{% endif %}

{% if outliers_detected %}
{% set total_outliers = outliers_detected.values()|sum %}
{% if total_outliers > 0 %}
**Outliers Detected:**
• {{ total_outliers }} potential outlier{{ 's' if total_outliers != 1 else '' }} across {{ outliers_detected.values()|select('>', 0)|list|length }} column{{ 's' if outliers_detected.values()|select('>', 0)|list|length != 1 else '' }}
{% for column, count in outliers_detected.items() %}
{% if count > 0 %}
• {{ column }}: {{ count }} outlier{{ 's' if count != 1 else '' }}
{% endif %}
{% endfor %}
{% endif %}
{% endif %}

{% if numeric_summary %}
**Numeric Variables Summary:**
{% for column, stats in numeric_summary.items() %}
• **{{ column }}**: Mean = {{ "%.2f"|format(stats.get('mean', 0)) }}, Range = {{ "%.2f"|format(stats.get('min', 0)) }} to {{ "%.2f"|format(stats.get('max', 0)) }}
{% endfor %}
{% endif %}

{% if categorical_summary %}
**Categorical Variables:**
{% for column, counts in categorical_summary.items() %}
• **{{ column }}**: {{ counts.keys()|length }} unique categories{% if counts %}, most common: {{ counts.keys()|list|first }} ({{ counts.values()|list|first }} occurrences){% endif %}
{% endfor %}
{% endif %}

**Dataset Readiness:**
{% if data_quality_score %}
{% if data_quality_score > 0.9 %}
✅ **Excellent** - This dataset is ready for analysis with minimal preprocessing
{% elif data_quality_score > 0.7 %}
✅ **Good** - Minor data cleaning recommended before analysis
{% elif data_quality_score > 0.5 %}
⚠️ **Fair** - Moderate preprocessing needed to optimize for analysis
{% else %}
❌ **Poor** - Significant data cleaning required before reliable analysis
{% endif %}
{% endif %}

**recommended Next Steps:**
{% if missing_values and missing_values.values()|sum > 0 %}
📝 Address missing values through imputation or removal strategies
{% endif %}
{% if outliers_detected and outliers_detected.values()|sum > 0 %}
🔍 Investigate outliers - they may represent valuable insights or data errors
{% endif %}
📊 Proceed with descriptive statistics and visualization
🔬 Consider statistical tests based on your research questions
"""

NARRATIVE_TEMPLATES["data_summary"] = NarrativeTemplate(
    template_id="data_summary_v1",
    narrative_type=NarrativeType.DATA_SUMMARY,
    template_content=DATA_SUMMARY_TEMPLATE,
    required_fields=["total_rows", "total_columns"],
    optional_fields=["missing_values", "column_types", "numeric_summary", 
                    "categorical_summary", "outliers_detected", "data_quality_score"],
    priority=10
)