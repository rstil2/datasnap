"""
Narrative generation service for DataSnap Module 5.
Handles template-based and AI-powered narrative generation from statistical results.
"""

import time
import hashlib
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from jinja2 import Environment, BaseLoader, TemplateSyntaxError, UndefinedError
from sqlalchemy.orm import Session

from app.schemas.narratives import (
    NarrativeRequest, StatisticalTestNarrativeRequest, DataSummaryNarrativeRequest, 
    VisualizationNarrativeRequest, NarrativeResponse, NarrativeSection, Insight,
    NarrativeMetadata, NarrativeError, NarrativeType, GenerationMethod, 
    ConfidenceLevel, InsightPriority
)
from app.schemas.statistical_tests import StatisticalTestResult
from app.templates.narrative_templates import NARRATIVE_TEMPLATES, format_p_value, interpret_effect_size, significance_statement

logger = logging.getLogger(__name__)


class TemplateLoader(BaseLoader):
    """Custom Jinja2 template loader for narrative templates"""
    
    def __init__(self, templates: Dict[str, str]):
        self.templates = templates
    
    def get_source(self, environment: Environment, template: str) -> tuple:
        if template not in self.templates:
            raise TemplateSyntaxError(f"Template '{template}' not found")
        
        source = self.templates[template]
        return source, None, lambda: True


class NarrativeService:
    """Core service for generating data narratives from statistical results"""
    
    def __init__(self, db: Session):
        self.db = db
        
        # Initialize Jinja2 environment with custom functions
        template_dict = {k: v.template_content for k, v in NARRATIVE_TEMPLATES.items()}
        self.jinja_env = Environment(
            loader=TemplateLoader(template_dict),
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Add custom template functions
        self.jinja_env.globals.update({
            'format_p_value': format_p_value,
            'interpret_effect_size': interpret_effect_size,
            'significance_statement': significance_statement,
            'abs': abs,
            'len': len,
            'max': max,
            'min': min,
            'sum': sum
        })
    
    def generate_narrative(
        self, 
        request: Union[StatisticalTestNarrativeRequest, DataSummaryNarrativeRequest, VisualizationNarrativeRequest]
    ) -> NarrativeResponse:
        """
        Main entry point for narrative generation.
        Routes to appropriate generation method based on request type and preferences.
        """
        start_time = time.time()
        
        try:
            # Determine generation method
            generation_method = self._determine_generation_method(request)
            
            # Generate narrative using appropriate method
            if generation_method == GenerationMethod.TEMPLATE:
                response = self._generate_template_narrative(request)
            elif generation_method == GenerationMethod.CLOUD_AI:
                # Placeholder for AI integration (will be implemented in next task)
                response = self._generate_template_narrative(request)  # Fallback for now
            elif generation_method == GenerationMethod.LOCAL_AI:
                # Placeholder for local AI integration
                response = self._generate_template_narrative(request)  # Fallback for now
            else:  # HYBRID
                response = self._generate_hybrid_narrative(request)
            
            # Add generation timing
            generation_time = int((time.time() - start_time) * 1000)
            response.metadata.generation_time_ms = generation_time
            
            logger.info(f"Generated {request.narrative_type} narrative in {generation_time}ms using {generation_method}")
            return response
            
        except Exception as e:
            logger.error(f"Failed to generate narrative: {str(e)}", exc_info=True)
            error_response = self._create_narrative_error(
                "generation_failed",
                f"Failed to generate narrative: {str(e)}",
                {"original_error": str(e), "request_type": request.narrative_type}
            )
            raise ValueError(error_response.error_message)
    
    def _determine_generation_method(self, request: NarrativeRequest) -> GenerationMethod:
        """Determine the best generation method based on request and system configuration"""
        
        # Check user preferences
        if request.generation_method:
            return request.generation_method
        
        # Default to template for reliable generation
        # TODO: Add AI availability checks here
        return GenerationMethod.TEMPLATE
    
    def _generate_template_narrative(
        self,
        request: Union[StatisticalTestNarrativeRequest, DataSummaryNarrativeRequest, VisualizationNarrativeRequest]
    ) -> NarrativeResponse:
        """Generate narrative using rule-based templates"""
        
        try:
            # Find appropriate template
            template_key = self._find_template_key(request)
            if not template_key:
                raise ValueError(f"No template found for {request.narrative_type}")
            
            template = NARRATIVE_TEMPLATES[template_key]
            jinja_template = self.jinja_env.get_template(template_key)
            
            # Prepare template context
            context = self._prepare_template_context(request)
            
            # Render narrative
            content = jinja_template.render(**context)
            
            # Extract insights from the generated content and request data
            insights = self._extract_insights_from_request(request)
            
            # Generate sections
            sections = self._generate_narrative_sections(content, insights)
            
            # Create response
            response = NarrativeResponse(
                narrative_type=request.narrative_type,
                title=self._generate_title(request),
                summary=self._generate_summary(request),
                content=content,
                sections=sections,
                key_insights=insights[:5],  # Limit to top 5 insights
                recommendations=self._generate_recommendations(request),
                metadata=NarrativeMetadata(
                    generation_method=GenerationMethod.TEMPLATE,
                    template_version=template.version,
                    source_data_hash=self._hash_request_data(request)
                )
            )
            
            return response
            
        except (TemplateSyntaxError, UndefinedError) as e:
            logger.error(f"Template rendering error: {str(e)}")
            error_response = self._create_narrative_error(
                "template_error",
                f"Error rendering template: {str(e)}",
                {"template_key": template_key, "error": str(e)}
            )
            raise ValueError(error_response.error_message)
    
    def _generate_hybrid_narrative(self, request: NarrativeRequest) -> NarrativeResponse:
        """Generate narrative using hybrid approach (AI + template fallback)"""
        
        # For now, fallback to template generation
        # TODO: Implement AI generation with template fallback
        return self._generate_template_narrative(request)
    
    def _find_template_key(self, request: NarrativeRequest) -> Optional[str]:
        """Find the appropriate template key for the request"""
        
        if isinstance(request, StatisticalTestNarrativeRequest):
            # Map test names to template keys
            test_name_lower = request.test_name.lower()
            
            if 'ttest' in test_name_lower or 't-test' in test_name_lower:
                return 'ttest'
            elif 'correlation' in test_name_lower or 'pearson' in test_name_lower:
                return 'correlation'
            elif 'anova' in test_name_lower:
                return 'anova'
            elif 'chi' in test_name_lower or 'chi-square' in test_name_lower:
                return 'chi_square'
        
        elif isinstance(request, DataSummaryNarrativeRequest):
            return 'data_summary'
        
        return None
    
    def _prepare_template_context(self, request: NarrativeRequest) -> Dict[str, Any]:
        """Prepare context variables for template rendering"""
        
        context = {}
        
        # Add all request fields to context
        for field, value in request.dict().items():
            context[field] = value
        
        # Add helper data
        if isinstance(request, StatisticalTestNarrativeRequest):
            context.update({
                'is_significant': request.p_value < 0.05,
                'significance_level': 'high' if request.p_value < 0.01 else 'medium' if request.p_value < 0.05 else 'low',
                'effect_size_interpretation': interpret_effect_size(request.effect_size, request.test_name) if request.effect_size else None
            })
        
        return context
    
    def _extract_insights_from_request(
        self, 
        request: Union[StatisticalTestNarrativeRequest, DataSummaryNarrativeRequest, VisualizationNarrativeRequest]
    ) -> List[Insight]:
        """Extract structured insights from request data"""
        
        insights = []
        
        if isinstance(request, StatisticalTestNarrativeRequest):
            # Statistical significance insight
            if request.p_value < 0.05:
                insights.append(Insight(
                    title="Statistically Significant Result",
                    description=f"The test shows a significant result with p = {format_p_value(request.p_value)}",
                    priority=InsightPriority.HIGH,
                    confidence=ConfidenceLevel.HIGH if request.p_value < 0.01 else ConfidenceLevel.MEDIUM,
                    statistical_significance=True,
                    evidence={"p_value": request.p_value, "test_statistic": request.test_statistic}
                ))
            
            # Effect size insight
            if request.effect_size is not None:
                magnitude = interpret_effect_size(request.effect_size, request.test_name)
                insights.append(Insight(
                    title=f"{magnitude.title()} Effect Size",
                    description=f"The effect size ({request.effect_size:.3f}) indicates a {magnitude} practical effect",
                    priority=InsightPriority.HIGH if request.effect_size > 0.5 else InsightPriority.MEDIUM,
                    confidence=ConfidenceLevel.HIGH,
                    evidence={"effect_size": request.effect_size, "magnitude": magnitude}
                ))
        
        elif isinstance(request, DataSummaryNarrativeRequest):
            # Data quality insights
            if request.data_quality_score is not None:
                if request.data_quality_score > 0.9:
                    insights.append(Insight(
                        title="Excellent Data Quality",
                        description=f"Data quality score of {request.data_quality_score:.1%} indicates excellent dataset readiness",
                        priority=InsightPriority.HIGH,
                        confidence=ConfidenceLevel.HIGH
                    ))
                elif request.data_quality_score < 0.5:
                    insights.append(Insight(
                        title="Data Quality Concerns",
                        description=f"Data quality score of {request.data_quality_score:.1%} suggests significant preprocessing needed",
                        priority=InsightPriority.CRITICAL,
                        confidence=ConfidenceLevel.HIGH,
                        recommendations=["Review data collection process", "Implement data validation", "Consider data cleaning pipeline"]
                    ))
            
            # Missing values insight
            if request.missing_values:
                total_missing = sum(request.missing_values.values())
                if total_missing > 0:
                    missing_pct = (total_missing / (request.total_rows * request.total_columns)) * 100
                    insights.append(Insight(
                        title=f"Missing Values Detected",
                        description=f"{total_missing} missing values ({missing_pct:.1f}% of total data)",
                        priority=InsightPriority.HIGH if missing_pct > 10 else InsightPriority.MEDIUM,
                        confidence=ConfidenceLevel.HIGH,
                        recommendations=["Consider imputation strategies", "Analyze missing data patterns"]
                    ))
        
        return insights
    
    def _generate_narrative_sections(self, content: str, insights: List[Insight]) -> List[NarrativeSection]:
        """Generate structured sections from narrative content"""
        
        sections = []
        
        # Split content into sections based on markdown headers
        lines = content.split('\n')
        current_section = {"title": "Overview", "content": [], "type": "overview"}
        
        for line in lines:
            line = line.strip()
            if line.startswith('**') and line.endswith('**') and len(line) > 4:
                # New section header
                if current_section["content"]:
                    sections.append(NarrativeSection(
                        title=current_section["title"],
                        content='\n'.join(current_section["content"]),
                        section_type=current_section["type"],
                        insights=[i for i in insights if i.priority in [InsightPriority.HIGH, InsightPriority.CRITICAL]]
                    ))
                
                # Start new section
                title = line.strip('*').strip()
                current_section = {
                    "title": title,
                    "content": [],
                    "type": self._classify_section_type(title)
                }
            else:
                if line:  # Skip empty lines at section boundaries
                    current_section["content"].append(line)
        
        # Add final section
        if current_section["content"]:
            sections.append(NarrativeSection(
                title=current_section["title"],
                content='\n'.join(current_section["content"]),
                section_type=current_section["type"],
                insights=[]
            ))
        
        return sections
    
    def _classify_section_type(self, title: str) -> str:
        """Classify section type based on title"""
        title_lower = title.lower()
        
        if any(word in title_lower for word in ['result', 'finding', 'analysis']):
            return 'analysis'
        elif any(word in title_lower for word in ['recommend', 'suggest', 'next']):
            return 'recommendations'
        elif any(word in title_lower for word in ['interpret', 'meaning', 'conclusion']):
            return 'interpretation'
        elif any(word in title_lower for word in ['summary', 'overview', 'key']):
            return 'summary'
        else:
            return 'general'
    
    def _generate_title(self, request: NarrativeRequest) -> str:
        """Generate appropriate title for the narrative"""
        
        if isinstance(request, StatisticalTestNarrativeRequest):
            return f"{request.test_name} Analysis Results"
        elif isinstance(request, DataSummaryNarrativeRequest):
            return "Dataset Overview and Quality Assessment"
        elif isinstance(request, VisualizationNarrativeRequest):
            return f"{request.chart_type.title()} Chart Analysis"
        else:
            return "Data Analysis Results"
    
    def _generate_summary(self, request: NarrativeRequest) -> str:
        """Generate brief summary of key findings"""
        
        if isinstance(request, StatisticalTestNarrativeRequest):
            if request.p_value < 0.05:
                return f"Statistically significant results found (p {format_p_value(request.p_value)})"
            else:
                return "No statistically significant difference detected"
        
        elif isinstance(request, DataSummaryNarrativeRequest):
            quality = "excellent" if request.data_quality_score and request.data_quality_score > 0.9 else "good"
            return f"Dataset with {request.total_rows:,} rows shows {quality} data quality"
        
        return "Analysis completed successfully"
    
    def _generate_recommendations(self, request: NarrativeRequest) -> List[str]:
        """Generate actionable recommendations based on findings"""
        
        recommendations = []
        
        if isinstance(request, StatisticalTestNarrativeRequest):
            if request.p_value < 0.05:
                recommendations.extend([
                    "Validate results with additional data or replication studies",
                    "Consider practical significance alongside statistical significance"
                ])
                
                if request.effect_size and request.effect_size > 0.5:
                    recommendations.append("The large effect size suggests practical importance for decision-making")
            else:
                recommendations.extend([
                    "Consider collecting more data to increase statistical power",
                    "Review study design and measurement methods",
                    "Examine whether observed trends have practical significance despite lack of statistical significance"
                ])
        
        elif isinstance(request, DataSummaryNarrativeRequest):
            if request.missing_values and sum(request.missing_values.values()) > 0:
                recommendations.append("Address missing values through appropriate imputation or removal strategies")
            
            if request.outliers_detected and sum(request.outliers_detected.values()) > 0:
                recommendations.append("Investigate outliers to determine if they represent valuable insights or data errors")
            
            recommendations.append("Proceed with statistical analysis and visualization based on research objectives")
        
        return recommendations
    
    def _hash_request_data(self, request: NarrativeRequest) -> str:
        """Generate hash of request data for change detection"""
        
        # Create stable hash from key request fields
        hash_data = str(request.dict())
        return hashlib.md5(hash_data.encode()).hexdigest()
    
    def _create_narrative_error(
        self, 
        error_type: str, 
        message: str, 
        details: Optional[Dict[str, Any]] = None
    ) -> NarrativeError:
        """Create structured error response"""
        
        return NarrativeError(
            error_type=error_type,
            error_message=message,
            details=details or {},
            suggestions=self._get_error_suggestions(error_type),
            fallback_available=True  # Templates always available as fallback
        )
    
    def _get_error_suggestions(self, error_type: str) -> List[str]:
        """Get suggestions for fixing specific error types"""
        
        suggestions_map = {
            "template_error": [
                "Check that all required fields are provided",
                "Verify data types match expected template inputs",
                "Review template syntax if using custom templates"
            ],
            "generation_failed": [
                "Try using template generation method as fallback",
                "Check system resources and network connectivity",
                "Verify input data quality and completeness"
            ],
            "ai_unavailable": [
                "Fallback to rule-based template generation",
                "Check AI service configuration and API keys",
                "Verify network connectivity for cloud AI services"
            ]
        }
        
        return suggestions_map.get(error_type, ["Contact support for assistance"])
    
    def generate_from_statistical_result(self, result: StatisticalTestResult) -> NarrativeResponse:
        """
        Convenience method to generate narrative from StatisticalTestResult.
        This provides seamless integration with Module 3.
        """
        
        # Convert StatisticalTestResult to NarrativeRequest
        request = StatisticalTestNarrativeRequest(
            narrative_type=NarrativeType.STATISTICAL_TEST,
            test_name=result.test_name,
            test_statistic=result.test_statistic,
            p_value=result.p_value,
            degrees_of_freedom=result.degrees_of_freedom,
            effect_size=result.effect_size,
            sample_size=result.sample_size,
            confidence_interval_lower=result.confidence_interval_lower,
            confidence_interval_upper=result.confidence_interval_upper,
            columns=result.columns or [],
            group_statistics=result.group_statistics or {}
        )
        
        return self.generate_narrative(request)