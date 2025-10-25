import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useUser } from '../contexts/UserContext';
import { hybridStoryStorage } from '../services/hybridStoryStorage';
import { FirebaseSignInModal } from './FirebaseSignInModal';
import * as ss from 'simple-statistics';
import { ExportableStory } from '../utils/storyExport';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type StoryType = 'executive' | 'detailed' | 'insights' | 'summary';

interface DataStory {
  title: string;
  narrative: string;
  key_insights: Array<{
    title: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  recommendations: string[];
  patterns: Array<{
    type: string;
    description: string;
    statistical_evidence: string;
  }>;
  executive_summary: string;
  metadata: {
    generation_time_ms: number;
    data_quality_score: number;
    story_type: StoryType;
    narrative_style: string;
  };
  error?: string;
}

// Intelligent story generation function
function generateDataStory(analysis: any, storyType: StoryType, filename: string): DataStory {
  const numericCols = analysis.columns.filter((col: any) => col.type === 'numeric');
  const categoricalCols = analysis.columns.filter((col: any) => col.type === 'categorical');
  
  // Generate title based on data characteristics
  const generateTitle = (): string => {
    return 'Summary';
  };
  
  // Generate executive summary
  const generateExecutiveSummary = (): string => {
    const completeness = analysis.completeness;
    const quality = analysis.qualityScore;
    
    return `This analysis examines ${analysis.totalRows.toLocaleString()} records across ${analysis.totalColumns} variables from ${filename}. ` +
      `The dataset demonstrates ${quality > 80 ? 'excellent' : quality > 60 ? 'good' : 'moderate'} data quality (${quality.toFixed(1)}/100) ` +
      `with ${completeness.toFixed(1)}% completeness. ` +
      `Key findings include ${numericCols.length} quantitative measures and ${categoricalCols.length} categorical dimensions, ` +
      `revealing significant patterns in data distribution and relationships.`;
  };
  
  // Generate detailed narrative based on story type
  const generateNarrative = (): string => {
    const narrativeParts: string[] = [];
    
    // Dataset overview
    narrativeParts.push(`**Dataset Overview**\n\n` +
      `Our analysis focuses on "${filename}", a ${analysis.totalRows > 1000 ? 'substantial' : 'focused'} dataset containing ` +
      `${analysis.totalRows.toLocaleString()} observations across ${analysis.totalColumns} variables. ` +
      `This represents a ${numericCols.length > categoricalCols.length ? 'quantitative-heavy' : 'balanced'} dataset ` +
      `with ${numericCols.length} numeric measurements and ${categoricalCols.length} categorical classifications.`);
    
    // Data quality assessment
    const qualityInsight = analysis.qualityScore > 80 ? 
      'The data demonstrates exceptional quality with minimal missing values and consistent formatting.' :
      analysis.qualityScore > 60 ?
      'The data shows good quality overall, though some areas may benefit from additional validation.' :
      'The data quality is moderate, suggesting careful interpretation of results and potential data cleaning needs.';
    
    narrativeParts.push(`**Data Quality Assessment**\n\n` +
      `${qualityInsight} With ${analysis.completeness.toFixed(1)}% completeness across all fields, ` +
      `the dataset provides ${analysis.completeness > 90 ? 'excellent' : analysis.completeness > 75 ? 'solid' : 'adequate'} ` +
      `coverage for analytical purposes.`);
    
    // Key variable insights
    if (numericCols.length > 0) {
      const mostVariable = numericCols.reduce((prev: any, curr: any) => curr.cv > prev.cv ? curr : prev);
      const leastVariable = numericCols.reduce((prev: any, curr: any) => curr.cv < prev.cv ? curr : prev);
      
      narrativeParts.push(`**Quantitative Analysis**\n\n` +
        `Among the numeric variables, "${mostVariable.name}" shows the highest variability ` +
        `(CV: ${mostVariable.cv.toFixed(1)}%), indicating ${mostVariable.cv > 50 ? 'significant diversity' : 'moderate variation'} in values. ` +
        `Conversely, "${leastVariable.name}" demonstrates ${leastVariable.cv < 20 ? 'remarkable consistency' : 'relative stability'} ` +
        `(CV: ${leastVariable.cv.toFixed(1)}%). ` +
        `${numericCols.filter((col: any) => col.distribution !== 'symmetric').length > 0 ? 
          `Several variables show skewed distributions, suggesting underlying patterns in data generation.` :
          'The numeric variables generally follow symmetric distributions.'}`);
    }
    
    if (categoricalCols.length > 0) {
      const mostDiverse = categoricalCols.reduce((prev: any, curr: any) => curr.diversity > prev.diversity ? curr : prev);
      const leastDiverse = categoricalCols.reduce((prev: any, curr: any) => curr.diversity < prev.diversity ? curr : prev);
      
      narrativeParts.push(`**Categorical Analysis**\n\n` +
        `The categorical variables reveal interesting diversity patterns. "${mostDiverse.name}" ` +
        `exhibits ${mostDiverse.diversity > 0.5 ? 'high diversity' : mostDiverse.diversity > 0.2 ? 'moderate diversity' : 'low diversity'} ` +
        `with ${mostDiverse.unique} unique values across ${mostDiverse.count} observations. ` +
        `In contrast, "${leastDiverse.name}" shows more concentrated patterns, ` +
        `with "${leastDiverse.mostCommon}" representing ${leastDiverse.mostCommonPercent.toFixed(1)}% of all values.`);
    }
    
    // Missing data patterns
    const missingDataInsights = analysis.columns.filter((col: any) => col.missingPercent > 5);
    if (missingDataInsights.length > 0) {
      narrativeParts.push(`**Data Completeness Patterns**\n\n` +
        `Several variables show notable missing data patterns: ` +
        missingDataInsights.map((col: any) => `"${col.name}" (${col.missingPercent.toFixed(1)}% missing)`).join(', ') + '. ' +
        `These patterns may indicate ${missingDataInsights.length > analysis.totalColumns / 2 ? 'systematic collection issues' : 'selective data availability'} ` +
        `and should be considered when interpreting results.`);
    }
    
    return narrativeParts.join('\n\n');
  };
  
  // Generate key insights
  const generateInsights = (): DataStory['key_insights'] => {
    const insights: DataStory['key_insights'] = [];
    
    // Data scale insight
    insights.push({
      title: 'Dataset Scale and Scope',
      description: `This dataset contains ${analysis.totalRows.toLocaleString()} records with ${analysis.totalColumns} variables, providing ${
        analysis.totalRows > 10000 ? 'substantial statistical power for robust analysis' :
        analysis.totalRows > 1000 ? 'adequate sample size for meaningful insights' :
        'focused scope suitable for exploratory analysis'
      }.`,
      confidence: analysis.totalRows > 1000 ? 'high' : 'medium',
      priority: 'high'
    });
    
    // Data quality insight
    insights.push({
      title: 'Data Quality Assessment',
      description: `With ${analysis.completeness.toFixed(1)}% completeness and a quality score of ${analysis.qualityScore.toFixed(1)}/100, ${
        analysis.qualityScore > 80 ? 'this dataset meets high standards for analytical rigor' :
        analysis.qualityScore > 60 ? 'this dataset provides reliable foundation for analysis with minor limitations' :
        'this dataset requires careful interpretation due to quality considerations'
      }.`,
      confidence: analysis.qualityScore > 70 ? 'high' : analysis.qualityScore > 50 ? 'medium' : 'low',
      priority: analysis.qualityScore < 60 ? 'critical' : 'medium'
    });
    
    // Variable distribution insight
    if (numericCols.length > 0) {
      const skewedCols = numericCols.filter((col: any) => Math.abs(col.skewness) > 1);
      insights.push({
        title: 'Distribution Patterns',
        description: `${skewedCols.length} of ${numericCols.length} numeric variables show significant skewness, ${
          skewedCols.length > numericCols.length / 2 ? 'indicating non-normal distributions that may require transformation' :
          'suggesting generally well-behaved data distributions'
        }.`,
        confidence: 'high',
        priority: skewedCols.length > numericCols.length / 2 ? 'high' : 'medium'
      });
    }
    
    // Outlier detection insight
    if (numericCols.length > 0) {
      const totalOutliers = numericCols.reduce((sum: number, col: any) => sum + col.outliers, 0);
      if (totalOutliers > 0) {
        insights.push({
          title: 'Outlier Detection',
          description: `Identified ${totalOutliers} potential outliers across numeric variables, representing ${(
            totalOutliers / (analysis.totalRows * numericCols.length) * 100
          ).toFixed(2)}% of numeric data points. These require investigation for data integrity or genuine extreme values.`,
          confidence: 'high',
          priority: totalOutliers > analysis.totalRows * 0.05 ? 'high' : 'medium'
        });
      }
    }
    
    return insights;
  };
  
  // Generate recommendations
  const generateRecommendations = (): string[] => {
    const recommendations: string[] = [];
    
    // Data quality recommendations
    if (analysis.qualityScore < 70) {
      recommendations.push('Implement data validation procedures to improve overall data quality and reduce missing values.');
    }
    
    if (analysis.completeness < 90) {
      recommendations.push('Investigate patterns in missing data to determine if they are random or systematic.');
    }
    
    // Statistical analysis recommendations
    if (numericCols.some((col: any) => Math.abs(col.skewness) > 1)) {
      recommendations.push('Consider data transformations (log, square root) for skewed variables before parametric testing.');
    }
    
    if (numericCols.some((col: any) => col.outliers > 0)) {
      recommendations.push('Investigate outliers to determine whether they represent data errors or genuine extreme observations.');
    }
    
    // Sample size recommendations
    if (analysis.totalRows < 100) {
      recommendations.push('Consider collecting additional data to increase statistical power and generalizability of findings.');
    }
    
    // Analysis approach recommendations
    if (numericCols.length > 5) {
      recommendations.push('Explore dimensionality reduction techniques (PCA) to identify key underlying factors.');
    }
    
    if (categoricalCols.length > 0 && numericCols.length > 0) {
      recommendations.push('Investigate relationships between categorical groupings and numeric outcomes through comparative analysis.');
    }
    
    return recommendations;
  };
  
  // Generate patterns
  const generatePatterns = (): DataStory['patterns'] => {
    const patterns: DataStory['patterns'] = [];
    
    // Distribution patterns
    if (numericCols.length > 0) {
      const symmetricCount = numericCols.filter((col: any) => col.distribution === 'symmetric').length;
      patterns.push({
        type: 'Distribution Shape',
        description: `${symmetricCount} of ${numericCols.length} numeric variables follow symmetric distributions`,
        statistical_evidence: `Distribution analysis reveals ${((symmetricCount / numericCols.length) * 100).toFixed(1)}% symmetric variables`
      });
    }
    
    // Variability patterns
    if (numericCols.length > 1) {
      const highVariability = numericCols.filter((col: any) => col.cv > 50).length;
      patterns.push({
        type: 'Variability Structure',
        description: `${highVariability} variables show high coefficient of variation (>50%), indicating diverse value ranges`,
        statistical_evidence: `CV analysis identifies ${highVariability}/${numericCols.length} highly variable measurements`
      });
    }
    
    // Completeness patterns
    const highMissing = analysis.columns.filter((col: any) => col.missingPercent > 10).length;
    if (highMissing > 0) {
      patterns.push({
        type: 'Data Completeness',
        description: `${highMissing} variables have substantial missing data (>10%), suggesting systematic collection patterns`,
        statistical_evidence: `Missing data analysis shows ${highMissing}/${analysis.totalColumns} variables with >10% missingness`
      });
    }
    
    return patterns;
  };
  
  return {
    title: generateTitle(),
    narrative: generateNarrative(),
    key_insights: generateInsights(),
    recommendations: generateRecommendations(),
    patterns: generatePatterns(),
    executive_summary: generateExecutiveSummary(),
    metadata: {
      generation_time_ms: 0, // Will be set by caller
      data_quality_score: analysis.qualityScore,
      story_type: storyType,
      narrative_style: storyType === 'executive' ? 'business-focused' :
                      storyType === 'detailed' ? 'comprehensive' :
                      storyType === 'insights' ? 'key-findings' : 'summary'
    }
  };
}

export function StoryPage() {
  const { csvData, currentFile } = useData();
  const { user, isAuthenticated, signIn } = useUser();
  const [storyType, setStoryType] = useState<StoryType>('executive');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [isExportingPNG, setIsExportingPNG] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  
  
  // Comprehensive data analysis for story generation
  const dataAnalysis = useMemo(() => {
    if (!csvData || csvData.data.length === 0) return null;
    
    const startTime = performance.now();
    
    try {
      const analysis = {
        // Basic metadata
        totalRows: csvData.data.length,
        totalColumns: csvData.headers.length,
        filename: csvData.filename,
        
        // Column analysis
        columns: csvData.headers.map(header => {
          const values = csvData.data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== '');
          const nonEmptyValues = values.filter(val => typeof val === 'string' ? val.trim() !== '' : true);
          const numericValues = nonEmptyValues.map(val => {
            const num = parseFloat(String(val));
            return isNaN(num) ? null : num;
          }).filter(val => val !== null) as number[];
          
          const isNumeric = numericValues.length > nonEmptyValues.length * 0.8;
          
          if (isNumeric && numericValues.length > 1) {
            const mean = ss.mean(numericValues);
            const stdDev = ss.standardDeviation(numericValues);
            const median = ss.median(numericValues);
            const min = ss.min(numericValues);
            const max = ss.max(numericValues);
            const cv = (stdDev / mean) * 100;
            
            return {
              name: header,
              type: 'numeric' as const,
              count: numericValues.length,
              missing: csvData.data.length - values.length,
              missingPercent: ((csvData.data.length - values.length) / csvData.data.length) * 100,
              mean,
              median,
              stdDev,
              min,
              max,
              cv,
              skewness: numericValues.length > 2 ? ss.sampleSkewness(numericValues) : 0,
              outliers: numericValues.filter(v => Math.abs((v - mean) / stdDev) > 2).length,
              distribution: mean > median ? 'right-skewed' : mean < median ? 'left-skewed' : 'symmetric'
            };
          } else {
            const counts = new Map<string, number>();
            nonEmptyValues.forEach(val => {
              const key = String(val);
              counts.set(key, (counts.get(key) || 0) + 1);
            });
            const sortedCounts = Array.from(counts.entries()).sort(([,a], [,b]) => b - a);
            
            return {
              name: header,
              type: 'categorical' as const,
              count: nonEmptyValues.length,
              missing: csvData.data.length - values.length,
              missingPercent: ((csvData.data.length - values.length) / csvData.data.length) * 100,
              unique: counts.size,
              uniquePercent: (counts.size / nonEmptyValues.length) * 100,
              mostCommon: sortedCounts[0] ? sortedCounts[0][0] : null,
              mostCommonCount: sortedCounts[0] ? sortedCounts[0][1] : 0,
              mostCommonPercent: sortedCounts[0] ? (sortedCounts[0][1] / nonEmptyValues.length) * 100 : 0,
              diversity: counts.size / nonEmptyValues.length // Higher = more diverse
            };
          }
        }),
        
        // Data quality metrics
        qualityScore: 0, // Will be calculated below
        completeness: 0, // Will be calculated below
        
        generationTime: performance.now() - startTime
      };
      
      // Calculate data quality and completeness
      const totalCells = analysis.totalRows * analysis.totalColumns;
      const totalMissing = analysis.columns.reduce((sum, col) => sum + col.missing, 0);
      analysis.completeness = ((totalCells - totalMissing) / totalCells) * 100;
      
      // Quality score based on completeness, consistency, and diversity
      const completenessScore = Math.min(analysis.completeness / 95, 1) * 40; // Up to 40 points for completeness
      const consistencyScore = analysis.columns.filter(col => col.type === 'numeric' && col.cv < 100).length / analysis.columns.length * 30; // Up to 30 points for consistency
      const diversityScore = analysis.columns.filter(col => col.type === 'categorical' ? col.diversity > 0.1 : true).length / analysis.columns.length * 30; // Up to 30 points for diversity
      
      analysis.qualityScore = completenessScore + consistencyScore + diversityScore;
      
      return analysis;
    } catch (err) {
      console.error('Error analyzing data:', err);
      return null;
    }
  }, [csvData]);
  
  // Generate intelligent story based on analysis
  const generatedStory = useMemo((): DataStory | null => {
    if (!dataAnalysis || !csvData) return null;
    
    const startTime = performance.now();
    
    try {
      const story = generateDataStory(dataAnalysis, storyType, csvData.filename);
      story.metadata.generation_time_ms = performance.now() - startTime;
      return story;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate story');
      return null;
    }
  }, [dataAnalysis, storyType, csvData]);
  
  const generateNarrative = () => {
    setIsGenerating(true);
    // Simulate generation time for better UX
    setTimeout(() => {
      setIsGenerating(false);
    }, 1000);
  };
  
  // Convert story to exportable format
  const getExportableStory = (): ExportableStory | null => {
    if (!generatedStory) return null;
    
    return {
      id: `story-${Date.now()}`,
      title: generatedStory.title,
      summary: generatedStory.executive_summary,
      narrative: generatedStory.narrative,
      key_insights: generatedStory.key_insights,
      recommendations: generatedStory.recommendations,
      metadata: generatedStory.metadata
    };
  };
  
  // Export story as PNG image
  const exportAsPNG = async () => {
    if (!generatedStory) {
      alert('No story available to export. Please generate a story first.');
      return;
    }
    
    setIsExportingPNG(true);
    
    try {
      // Find the story content container
      const storyElement = document.querySelector('.story-content-container');
      
      if (!storyElement) {
        throw new Error('Story content container not found. The story may not be fully rendered.');
      }
      
      const canvas = await html2canvas(storyElement as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 1200,
        height: 800,
        logging: false
      });
      
      // Generate filename
      const filename = `${generatedStory.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_story.png`;
      
      // Download the image
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png', 1.0); // Max quality
      document.body.appendChild(link); // Append to ensure it works in all browsers
      link.click();
      document.body.removeChild(link); // Clean up
      
      alert('🖼️ PNG export successful! Check your downloads folder.');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to export as PNG: ${errorMessage}\n\nThis might be due to browser security restrictions or rendering issues. Please try again.`);
    } finally {
      setIsExportingPNG(false);
    }
  };
  
  // Export story as PDF
  const exportAsPDF = async () => {
    if (!generatedStory) {
      alert('No story available to export. Please generate a story first.');
      return;
    }
    
    setIsExportingPDF(true);
    
    try {
      // Create PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const textWidth = pageWidth - (margin * 2);
      let yPosition = margin;
      
      // Helper function to check if we need a new page
      const checkNewPage = (requiredHeight: number = 20) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };
      
      // Title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(generatedStory.title, textWidth);
      pdf.text(titleLines, margin, yPosition);
      yPosition += titleLines.length * 8 + 15;
      
      // Date and metadata
      checkNewPage();
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const date = new Date().toLocaleDateString();
      pdf.text(`Generated on: ${date}`, margin, yPosition);
      pdf.text(`Story Type: ${generatedStory.metadata.story_type}`, margin + 80, yPosition);
      pdf.text(`Quality Score: ${generatedStory.metadata.data_quality_score.toFixed(1)}/100`, margin + 140, yPosition);
      yPosition += 15;
      
      // Executive Summary
      checkNewPage(30);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Executive Summary', margin, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const summaryLines = pdf.splitTextToSize(generatedStory.executive_summary, textWidth);
      pdf.text(summaryLines, margin, yPosition);
      yPosition += summaryLines.length * 5 + 15;
      
      // Key Insights
      if (generatedStory.key_insights && generatedStory.key_insights.length > 0) {
        checkNewPage(40);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Key Insights', margin, yPosition);
        yPosition += 12;
        
        generatedStory.key_insights.forEach((insight, index) => {
          checkNewPage(25);
          
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          const insightTitle = `${index + 1}. ${insight.title}`;
          pdf.text(insightTitle, margin, yPosition);
          yPosition += 8;
          
          // Priority and confidence badges
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Priority: ${insight.priority.toUpperCase()}`, margin + 5, yPosition);
          pdf.text(`Confidence: ${insight.confidence.toUpperCase()}`, margin + 60, yPosition);
          yPosition += 6;
          
          pdf.setFontSize(10);
          const insightLines = pdf.splitTextToSize(insight.description, textWidth - 10);
          pdf.text(insightLines, margin + 5, yPosition);
          yPosition += insightLines.length * 4 + 8;
        });
        yPosition += 5;
      }
      
      // Recommendations
      if (generatedStory.recommendations && generatedStory.recommendations.length > 0) {
        checkNewPage(40);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Strategic Recommendations', margin, yPosition);
        yPosition += 12;
        
        generatedStory.recommendations.forEach((rec, index) => {
          checkNewPage(15);
          
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}.`, margin, yPosition);
          
          pdf.setFont('helvetica', 'normal');
          const recLines = pdf.splitTextToSize(rec, textWidth - 10);
          pdf.text(recLines, margin + 8, yPosition);
          yPosition += recLines.length * 4 + 6;
        });
      }
      
      // Footer on each page
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
        pdf.text('Generated by DataSnap', margin, pageHeight - 10);
      }
      
      // Generate filename
      const filename = `${generatedStory.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_story.pdf`;
      
      // Save the PDF
      pdf.save(filename);
      
      alert('📄 PDF export successful! Check your downloads folder.');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to export as PDF: ${errorMessage}\n\nPlease check the console for details and try again.`);
    } finally {
      setIsExportingPDF(false);
    }
  };
  
  if (!csvData || !currentFile) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Data Story</h1>
          <p className="page-description">Generate narratives from your analysis</p>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">No Data Available</h2>
          </div>
          <div className="card-content">
            <p>Upload a CSV file first to generate compelling stories and insights from your data.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Data Story</h1>
        <p className="page-description">AI-powered insights and narratives from your data</p>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card-content">
            <div style={{ 
              padding: 'var(--space-lg)',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--error)',
              textAlign: 'center'
            }}>
              <div style={{ color: 'var(--error)', marginBottom: 'var(--space-md)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-sm)' }}>⚠️</div>
                <strong>Narrative Generation Error:</strong>
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Story Type Selection */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <h2 className="card-title">Story Configuration</h2>
        </div>
        <div className="card-content">
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>Narrative Style:</label>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              {[
                { key: 'executive', label: '👔 Executive Summary', desc: 'High-level overview for decision makers' },
                { key: 'detailed', label: '📊 Detailed Analysis', desc: 'Comprehensive technical narrative' },
                { key: 'insights', label: '💡 Key Insights', desc: 'Focus on actionable findings' },
                { key: 'summary', label: '📝 Quick Summary', desc: 'Concise overview of main points' }
              ].map(type => (
                <button
                  key={type.key}
                  onClick={() => setStoryType(type.key as StoryType)}
                  style={{
                    padding: 'var(--space-md)',
                    background: storyType === type.key ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: storyType === type.key ? 'white' : 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    minWidth: '200px',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: 'var(--space-xs)' }}>{type.label}</div>
                  <div style={{ fontSize: '0.8125rem', opacity: 0.8 }}>{type.desc}</div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Generation Status */}
          {!generatedStory && !isGenerating && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)' }}>📚</div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>AI Story Ready</h4>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', maxWidth: '500px', margin: '0 auto var(--space-lg) auto' }}>
                Transform your data into intelligent insights and actionable stories.
              </p>
              <button
                onClick={generateNarrative}
                style={{
                  padding: 'var(--space-md) var(--space-2xl)',
                  background: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}
              >
                🚀 Generate {storyType.charAt(0).toUpperCase() + storyType.slice(1)} Story
              </button>
            </div>
          )}
          
          {isGenerating && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)' }}>⟳</div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>Analyzing your data...</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Generating intelligent insights and narrative from {csvData?.data.length.toLocaleString()} records...</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Generated Story */}
      {generatedStory && !isGenerating && (
        <div className="story-content-container">
          {/* Title and Executive Summary */}
          <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="card-header">
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <h3 className="card-title" style={{ margin: '0 0 var(--space-sm) 0' }}>{generatedStory.title}</h3>
                <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowPublishModal(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '14px 24px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                      transform: 'translateY(0)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
                    }}
                  >
                    <span>🌍</span>
                    Publish
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '14px 24px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                      transform: 'translateY(0)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)';
                    }}
                  >
                    <span>📤</span>
                    Share
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
                <span style={{ 
                  padding: '2px 8px', 
                  background: 'var(--success)', 
                  color: 'white', 
                  borderRadius: '12px', 
                  fontSize: '0.8125rem' 
                }}>
                  ✓ {generatedStory.metadata.story_type.charAt(0).toUpperCase() + generatedStory.metadata.story_type.slice(1)} Story
                </span>
                <span style={{ 
                  padding: '2px 8px', 
                  background: 'var(--border-secondary)', 
                  color: 'var(--text-secondary)', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem' 
                }}>
                  Quality: {generatedStory.metadata.data_quality_score.toFixed(1)}/100
                </span>
                <span style={{ 
                  padding: '2px 8px', 
                  background: 'var(--border-secondary)', 
                  color: 'var(--text-secondary)', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem' 
                }}>
                  {generatedStory.metadata.generation_time_ms.toFixed(0)}ms
                </span>
              </div>
            </div>
            <div className="card-content">
              <div style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                {generatedStory.executive_summary}
              </div>
            </div>
          </div>
          
          {/* Main Narrative */}
          <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="card-header">
              <h2 className="card-title">Detailed Analysis</h2>
              <span style={{ 
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                fontStyle: 'italic'
              }}>
                {generatedStory.metadata.narrative_style} narrative
              </span>
            </div>
            <div className="card-content">
              <div style={{ 
                fontSize: '1rem', 
                lineHeight: '1.7', 
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap'
              }}>
                {generatedStory.narrative}
              </div>
            </div>
          </div>
          
          {/* Key Insights */}
          {generatedStory.key_insights && generatedStory.key_insights.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="card-header">
                <h2 className="card-title">Key Insights</h2>
              </div>
              <div className="card-content">
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                  {generatedStory.key_insights.map((insight, index) => {
                    const priorityColor = insight.priority === 'critical' ? 'var(--error)' :
                                        insight.priority === 'high' ? 'var(--warning)' :
                                        insight.priority === 'medium' ? 'var(--accent-primary)' : 'var(--text-secondary)';
                    const confidenceIcon = insight.confidence === 'high' ? '🔴' :
                                          insight.confidence === 'medium' ? '🟡' : '⚪';
                    
                    return (
                      <div key={index} style={{
                        padding: 'var(--space-lg)',
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-primary)',
                        position: 'relative'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                          <h3 style={{ 
                            color: 'var(--text-primary)', 
                            margin: 0,
                            fontSize: '1.1rem',
                            fontWeight: '600'
                          }}>
                            {insight.title}
                          </h3>
                          <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem' }} title={`${insight.confidence} confidence`}>
                              {confidenceIcon}
                            </span>
                            <span style={{ 
                              padding: '1px 6px', 
                              background: priorityColor, 
                              color: 'white', 
                              borderRadius: '8px', 
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              fontWeight: '500'
                            }}>
                              {insight.priority}
                            </span>
                          </div>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
                          {insight.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Patterns */}
          {generatedStory.patterns && generatedStory.patterns.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="card-header">
                <h2 className="card-title">Statistical Patterns</h2>
              </div>
              <div className="card-content">
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                  {generatedStory.patterns.map((pattern, index) => (
                    <div key={index} style={{
                      padding: 'var(--space-md)',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: 'var(--space-sm)'
                      }}>
                        <h3 style={{ 
                          color: 'var(--text-primary)', 
                          margin: 0,
                          fontSize: '1rem',
                          fontWeight: '600'
                        }}>
                          {pattern.type}
                        </h3>
                        <span style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-tertiary)',
                          fontFamily: 'var(--font-family-mono)'
                        }}>
                          Statistical Evidence
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', margin: '0 0 var(--space-sm) 0', lineHeight: '1.5' }}>
                        {pattern.description}
                      </p>
                      <div style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-tertiary)',
                        fontFamily: 'var(--font-family-mono)',
                        fontStyle: 'italic',
                        padding: 'var(--space-xs)',
                        background: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        {pattern.statistical_evidence}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Recommendations */}
          {generatedStory.recommendations && generatedStory.recommendations.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Strategic Recommendations</h2>
              </div>
              <div className="card-content">
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                  {generatedStory.recommendations.map((recommendation, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-md)',
                      padding: 'var(--space-md)',
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-primary)'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--success)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        flexShrink: 0,
                        marginTop: '2px'
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1, color: 'var(--text-primary)', lineHeight: '1.6' }}>
                        {recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Simple Publish Modal */}
      {showPublishModal && generatedStory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>🌍 Publish to Community</h2>
              <button 
                onClick={() => setShowPublishModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Show sign-in prompt if not authenticated */}
            {!isAuthenticated || !user ? (
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '32px 20px',
                  marginBottom: '24px'
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔐</div>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#1f2937' }}>Sign In to Publish</h3>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
                    Please sign in to publish your story to the community feed and sync across devices.
                  </p>
                  <button
                    onClick={() => setShowSignInModal(true)}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🚀 Sign In to Continue
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#1f2937' }}>{generatedStory.title}</h3>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '15px', lineHeight: '1.5' }}>
                    {generatedStory.executive_summary.substring(0, 180)}...
                  </p>
                </div>
                
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '16px', fontWeight: '600', fontSize: '16px', color: '#374151' }}>Choose Visibility</label>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer',
                      padding: '12px 16px',
                      background: '#f0f9ff',
                      border: '2px solid #0ea5e9',
                      borderRadius: '10px',
                      minWidth: '200px',
                      transition: 'all 0.2s ease'
                    }}>
                      <input type="radio" name="visibility" value="public" defaultChecked style={{ margin: 0 }} />
                      <div>
                        <div style={{ fontWeight: '600', color: '#0369a1' }}>🌍 Public</div>
                        <div style={{ fontSize: '13px', color: '#075985' }}>Visible in community feed</div>
                      </div>
                    </label>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer',
                      padding: '12px 16px',
                      background: '#fef3c7',
                      border: '2px solid #f59e0b',
                      borderRadius: '10px',
                      minWidth: '200px',
                      transition: 'all 0.2s ease'
                    }}>
                      <input type="radio" name="visibility" value="private" style={{ margin: 0 }} />
                      <div>
                        <div style={{ fontWeight: '600', color: '#d97706' }}>🔒 Private</div>
                        <div style={{ fontSize: '13px', color: '#92400e' }}>Only you can see it</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowPublishModal(false)}
                style={{
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                  color: '#475569',
                  border: '1px solid #d1d5db',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Cancel
              </button>
              {/* Show different button based on authentication */}
              {!isAuthenticated || !user ? (
                <button 
                  onClick={() => setShowSignInModal(true)}
                  style={{
                    padding: '14px 24px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                    transform: 'translateY(0)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)';
                  }}
                >
                  🔑 Sign In to Publish
                </button>
              ) : (
                <button 
                  onClick={async () => {
                    setIsPublishing(true);
                    
                    try {
                      const story = getExportableStory();
                      if (!story) {
                        throw new Error('No story to publish');
                      }
                      
                      // Get visibility setting from radio buttons
                      const visibilityRadio = document.querySelector('input[name="visibility"]:checked') as HTMLInputElement;
                      const isPublic = visibilityRadio?.value === 'public';
                      
                      // Publish to community using hybrid Firebase storage
                      await hybridStoryStorage.publishStory(story, user, isPublic, [
                        'data-analysis', 'insights', storyType
                      ]);
                      
                      setPublishSuccess(true);
                      
                      // Show success message with more details
                      setTimeout(() => {
                        alert(`Story successfully published to the community! \n\nTitle: "${story.title}"\nVisibility: ${isPublic ? 'Public' : 'Private'}\n\nCheck the 📸 Data Feed to see your story.`);
                        setPublishSuccess(false);
                        setShowPublishModal(false);
                      }, 1000);
                      
                    } catch (error) {
                      alert(`Failed to publish story: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
                    } finally {
                      setIsPublishing(false);
                    }
                  }}
                  disabled={isPublishing}
                  style={{
                    padding: '14px 24px',
                    background: isPublishing ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: isPublishing ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    boxShadow: isPublishing ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.25)',
                    transform: 'translateY(0)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isPublishing) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = isPublishing ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.25)';
                  }}
                >
                  {isPublishing ? '🔄 Publishing...' : publishSuccess ? '✅ Published!' : '🚀 Publish Story'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Simple Share Modal */}
      {showShareModal && generatedStory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>📤 Share & Export</h2>
              <button 
                onClick={() => setShowShareModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{generatedStory.title}</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                  {generatedStory.executive_summary.substring(0, 150)}...
                </p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <button
                  onClick={exportAsPNG}
                  disabled={isExportingPNG}
                  style={{
                    padding: '16px',
                    background: isExportingPNG ? '#e2e8f0' : '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: isExportingPNG ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    opacity: isExportingPNG ? 0.7 : 1
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                    {isExportingPNG ? '🔄' : '🖼️'}
                  </div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {isExportingPNG ? 'Exporting...' : 'Export as Image'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>High-resolution PNG</div>
                </button>
                
                <button
                  onClick={exportAsPDF}
                  disabled={isExportingPDF}
                  style={{
                    padding: '16px',
                    background: isExportingPDF ? '#e2e8f0' : '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: isExportingPDF ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    opacity: isExportingPDF ? 0.7 : 1
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                    {isExportingPDF ? '🔄' : '📄'}
                  </div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {isExportingPDF ? 'Generating...' : 'Export as PDF'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Professional document</div>
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      const story = getExportableStory();
                      if (!story) {
                        throw new Error('No story data available');
                      }
                      
                      const url = `${window.location.origin}/story/${story.id}`;
                      
                      // Check if clipboard API is available
                      if (!navigator.clipboard) {
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = url;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        alert('🔗 Shareable link copied to clipboard!');
                      } else {
                        await navigator.clipboard.writeText(url);
                        alert('🔗 Shareable link copied to clipboard!');
                      }
                    } catch (error) {
                      const story = getExportableStory();
                      const url = story ? `${window.location.origin}/story/${story.id}` : 'Unable to generate URL';
                      alert(`Failed to copy link to clipboard. Here's the URL:\n\n${url}`);
                    }
                  }}
                  style={{
                    padding: '16px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔗</div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Copy Link</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Share URL with others</div>
                </button>
                
                <button
                  onClick={() => {
                    try {
                      const text = `📊 Check out this data insight: "${generatedStory.title}" \n\n${generatedStory.executive_summary.substring(0, 200)}...\n\n#DataAnalytics #Insights #DataScience`;
                      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                      const popup = window.open(twitterUrl, '_blank', 'width=550,height=420');
                      if (!popup) {
                        throw new Error('Popup blocked by browser');
                      }
                    } catch (error) {
                      alert('Failed to open Twitter. Please check your popup blocker settings.');
                    }
                  }}
                  style={{
                    padding: '16px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🐦</div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Share on Twitter</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Share with hashtags</div>
                </button>
                
                <button
                  onClick={() => {
                    try {
                      const story = getExportableStory();
                      if (!story) {
                        throw new Error('No story data available');
                      }
                      
                      const shareUrl = `${window.location.origin}/story/${story.id}`;
                      const title = generatedStory.title;
                      const summary = `I discovered some interesting insights: "${title}" - ${generatedStory.executive_summary.substring(0, 150)}...`;
                      
                      const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary)}`;
                      
                      const popup = window.open(linkedinUrl, '_blank', 'width=550,height=420');
                      if (!popup) {
                        throw new Error('Popup blocked by browser');
                      }
                    } catch (error) {
                      alert('Failed to open LinkedIn. Please check your popup blocker settings.');
                    }
                  }}
                  style={{
                    padding: '16px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>💼</div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Share on LinkedIn</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Professional network</div>
                </button>
                
                <button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/story/${getExportableStory()?.id}`;
                    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(`📊 ${generatedStory.title}\n\n${generatedStory.executive_summary.substring(0, 200)}...`)}`;
                    window.open(facebookUrl, '_blank');
                  }}
                  style={{
                    padding: '16px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📱</div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Share on Facebook</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Social network</div>
                </button>
                
                <button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/story/${getExportableStory()?.id}`;
                    const subject = `Data Insights: ${generatedStory.title}`;
                    const body = `I wanted to share these interesting data insights with you:\n\n"${generatedStory.title}"\n\n${generatedStory.executive_summary}\n\nView the full analysis here: ${shareUrl}`;
                    const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.location.href = emailUrl;
                  }}
                  style={{
                    padding: '16px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>✉️</div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Share via Email</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Send to colleagues</div>
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowShareModal(false)}
                style={{
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)';
                }}
              >
                ✨ Done
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Firebase Sign In Modal */}
      {showSignInModal && (
        <FirebaseSignInModal
          isOpen={showSignInModal}
          onClose={() => setShowSignInModal(false)}
          onSuccess={() => {
            setShowSignInModal(false);
            // The publish modal will automatically update when authentication state changes
          }}
        />
      )}
    </div>
  );
}
