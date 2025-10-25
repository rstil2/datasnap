import React, { useState, useRef } from 'react';
import { 
  EnhancedReportGenerator, 
  ReportTemplate, 
  ReportSection, 
  ReportOptions 
} from '../../services/export/EnhancedReportGenerator';
import { 
  AdvancedSharingService,
  ShareSettings,
  EmbedOptions,
  SocialMediaOptions
} from '../../services/export/AdvancedSharingService';
import { PowerPointExporter, PowerPointOptions } from '../../services/export/PowerPointExporter';
import { ExcelExporter, ExcelExportOptions } from '../../services/export/ExcelExporter';
import { HTMLWidgetGenerator, HTMLWidgetOptions } from '../../services/export/HTMLWidgetGenerator';
import { ChartConfig } from '../../types/VisualizationTypes';
import { InsightGenerationResult } from '../../services/ai/InsightGenerator';
import { 
  FileText, 
  Settings, 
  Download, 
  Share2, 
  Eye, 
  Code, 
  Palette,
  Move,
  Plus,
  Trash2,
  Building,
  User,
  Calendar,
  Hash,
  Globe,
  Lock,
  Zap,
  Image,
  Link2,
  QrCode,
  Copy,
  FileSpreadsheet,
  Presentation,
  Code2
} from 'lucide-react';

interface ReportBuilderProps {
  chartElement: HTMLElement | null;
  config: ChartConfig;
  data: Record<string, any>[];
  insights: InsightGenerationResult | null;
  onClose?: () => void;
}

type TabType = 'template' | 'sections' | 'branding' | 'sharing' | 'preview';
type ShareTabType = 'pdf' | 'powerpoint' | 'excel' | 'html' | 'link' | 'embed' | 'social';

export function ReportBuilder({ chartElement, config, data, insights, onClose }: ReportBuilderProps) {
  const [activeTab, setActiveTab] = useState<TabType>('template');
  const [shareTab, setShareTab] = useState<ShareTabType>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // Report configuration
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>(
    EnhancedReportGenerator.getTemplates()[0]
  );
  const [reportSections, setReportSections] = useState<ReportSection[]>([
    { type: 'cover', title: 'Cover Page', includePageBreak: false },
    { type: 'executive_summary', title: 'Executive Summary', includePageBreak: true },
    { type: 'chart', title: 'Data Visualization', includePageBreak: false },
    { type: 'insights', title: 'AI Insights', includePageBreak: false },
    { type: 'data_summary', title: 'Data Summary', includePageBreak: false },
  ]);
  const [branding, setBranding] = useState({
    companyName: '',
    reportTitle: config.title + ' - Analysis Report',
    author: '',
    date: new Date().toLocaleDateString(),
  });

  // Sharing configuration
  const [shareSettings, setShareSettings] = useState<Partial<ShareSettings>>({
    password: '',
    allowDownload: true,
    allowEmbed: true,
    socialOptimized: false,
  });
  const [embedOptions, setEmbedOptions] = useState<EmbedOptions>({
    width: 800,
    height: 600,
    responsive: true,
    showTitle: true,
    showControls: true,
    allowFullscreen: true,
    theme: 'light',
    borderRadius: 8,
  });
  const [socialOptions, setSocialOptions] = useState<SocialMediaOptions>({
    platform: 'twitter',
    includeInsights: true,
    hashtags: ['DataVisualization', 'Analytics', 'DataSnap'],
    imageFormat: 'landscape',
  });
  const [powerpointOptions, setPowerpointOptions] = useState<PowerPointOptions>({
    template: 'business',
    includeInsights: true,
    includeDataSummary: true,
    slideLayout: 'widescreen',
    branding: {
      companyName: '',
      presentationTitle: config.title + ' - Analysis Presentation',
      author: '',
      date: new Date().toLocaleDateString(),
    },
  });
  const [excelOptions, setExcelOptions] = useState<ExcelExportOptions>({
    includeRawData: true,
    includeInsights: true,
    includeSummaryStats: true,
    includeChartConfig: true,
  });
  const [htmlOptions, setHtmlOptions] = useState<HTMLWidgetOptions>({
    includeInsights: true,
    includeControls: true,
    includeDataTable: false,
    theme: 'auto',
    responsive: true,
    enableFullscreen: true,
    showBranding: true,
  });

  // Results
  const [shareResult, setShareResult] = useState<any>(null);

  const templates = EnhancedReportGenerator.getTemplates();

  const handleGenerateReport = async () => {
    if (!chartElement) return;

    setIsGenerating(true);
    try {
      const reportOptions: ReportOptions = {
        template: selectedTemplate,
        sections: reportSections,
        branding,
        includeTableOfContents: false,
      };

      const result = await EnhancedReportGenerator.generateReport(
        chartElement,
        config,
        data,
        insights,
        reportOptions
      );

      if (result.success) {

      } else {
        console.error('Report generation failed:', result.error);
      }
    } catch (error) {
      console.error('Report generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateShare = async () => {
    if (!chartElement) return;

    setIsSharing(true);
    try {
      let result;

      switch (shareTab) {
        case 'link':
          result = await AdvancedSharingService.createShareableLink(
            config,
            data,
            insights,
            shareSettings
          );
          break;

        case 'embed':
          result = await AdvancedSharingService.generateAdvancedEmbedCode(
            config,
            data,
            insights,
            embedOptions
          );
          break;

        case 'social':
          result = await AdvancedSharingService.generateSocialMediaExport(
            chartElement,
            config,
            insights,
            socialOptions
          );
          break;

        case 'pdf':
          await handleGenerateReport();
          return;

        case 'powerpoint':
          result = await PowerPointExporter.exportPresentation(
            chartElement,
            config,
            data,
            insights,
            powerpointOptions
          );
          break;

        case 'excel':
          result = await ExcelExporter.exportToExcel(
            config,
            data,
            data, // filtered data same as raw for now
            insights,
            excelOptions
          );
          break;

        case 'html':
          result = await HTMLWidgetGenerator.generateWidget(
            config,
            data,
            insights,
            htmlOptions
          );
          break;

        default:
          throw new Error('Invalid share type');
      }

      setShareResult(result);
    } catch (error) {
      console.error('Sharing error:', error);
      setShareResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsSharing(false);
    }
  };

  const addSection = (type: ReportSection['type']) => {
    const newSection: ReportSection = {
      type,
      title: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
      includePageBreak: false,
    };
    setReportSections([...reportSections, newSection]);
  };

  const removeSection = (index: number) => {
    setReportSections(reportSections.filter((_, i) => i !== index));
  };

  const moveSection = (from: number, to: number) => {
    const newSections = [...reportSections];
    const [moved] = newSections.splice(from, 1);
    newSections.splice(to, 0, moved);
    setReportSections(newSections);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className="report-builder-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div 
        className="card" 
        role="dialog"
        aria-labelledby="report-builder-title"
        aria-modal="true"
        data-testid="report-builder-modal"
        style={{
          width: '90vw',
          maxWidth: '1200px',
          height: '85vh',
          maxHeight: '800px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="card-header" style={{ 
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h3 
            id="report-builder-title"
            className="card-title" 
            style={{ 
              fontSize: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
            }}
          >
            <FileText size={20} />
            Professional Report & Sharing
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Report Builder"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          overflowX: 'auto',
        }}>
          {[
            { id: 'template', label: 'Template', icon: Palette },
            { id: 'sections', label: 'Sections', icon: Settings },
            { id: 'branding', label: 'Branding', icon: Building },
            { id: 'sharing', label: 'Share & Export', icon: Share2 },
            { id: 'preview', label: 'Preview', icon: Eye },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id as TabType)}
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                border: 'none',
                background: activeTab === id ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                borderBottom: `2px solid ${activeTab === id ? 'var(--accent-primary)' : 'transparent'}`,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="card-content" style={{ 
          flex: 1, 
          overflow: 'auto',
          padding: 'var(--space-lg)',
        }}>
          {activeTab === 'template' && (
            <div>
              <h4 style={{ margin: '0 0 var(--space-lg) 0' }}>Select Report Template</h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: 'var(--space-lg)',
              }}>
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    style={{
                      padding: 'var(--space-lg)',
                      border: `2px solid ${selectedTemplate.id === template.id ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: selectedTemplate.id === template.id ? 'var(--bg-elevated)' : 'transparent',
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 'var(--space-sm)',
                      marginBottom: 'var(--space-sm)',
                    }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: template.layout.colorScheme.primary,
                        }}
                      />
                      <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                        {template.name}
                      </h5>
                      <span style={{
                        padding: '2px 8px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        textTransform: 'capitalize',
                      }}>
                        {template.category}
                      </span>
                    </div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.875rem', 
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}>
                      {template.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sections' && (
            <div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: 'var(--space-lg)',
              }}>
                <h4 style={{ margin: 0 }}>Report Sections</h4>
                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                  {['cover', 'executive_summary', 'chart', 'insights', 'data_summary', 'appendix'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addSection(type as ReportSection['type'])}
                      disabled={reportSections.some(s => s.type === type)}
                      style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        opacity: reportSections.some(s => s.type === type) ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={12} />
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {reportSections.map((section, index) => (
                  <div
                    key={`${section.type}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-md)',
                      padding: 'var(--space-md)',
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-primary)',
                    }}
                  >
                    <Move size={16} color="var(--text-secondary)" style={{ cursor: 'grab' }} />
                    
                    <div style={{ flex: 1 }}>
                      <strong>{section.title}</strong>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--text-secondary)',
                        marginTop: '2px',
                      }}>
                        {section.type.replace('_', ' ')}
                      </div>
                    </div>

                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 'var(--space-xs)',
                      fontSize: '0.875rem',
                    }}>
                      <input
                        type="checkbox"
                        checked={section.includePageBreak}
                        onChange={(e) => {
                          const newSections = [...reportSections];
                          newSections[index].includePageBreak = e.target.checked;
                          setReportSections(newSections);
                        }}
                      />
                      Page break
                    </label>

                    <button
                      type="button"
                      onClick={() => removeSection(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        padding: 'var(--space-xs)',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div>
              <h4 style={{ margin: '0 0 var(--space-lg) 0' }}>Branding & Customization</h4>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 'var(--space-lg)',
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>
                    <Building size={16} style={{ marginRight: 'var(--space-xs)' }} />
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={branding.companyName}
                    onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                    placeholder="Your Company"
                    style={{
                      width: '100%',
                      padding: 'var(--space-sm)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-tertiary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>
                    <FileText size={16} style={{ marginRight: 'var(--space-xs)' }} />
                    Report Title
                  </label>
                  <input
                    type="text"
                    value={branding.reportTitle}
                    onChange={(e) => setBranding({ ...branding, reportTitle: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 'var(--space-sm)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-tertiary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>
                    <User size={16} style={{ marginRight: 'var(--space-xs)' }} />
                    Author
                  </label>
                  <input
                    type="text"
                    value={branding.author}
                    onChange={(e) => setBranding({ ...branding, author: e.target.value })}
                    placeholder="Report Author"
                    style={{
                      width: '100%',
                      padding: 'var(--space-sm)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-tertiary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>
                    <Calendar size={16} style={{ marginRight: 'var(--space-xs)' }} />
                    Date
                  </label>
                  <input
                    type="text"
                    value={branding.date}
                    onChange={(e) => setBranding({ ...branding, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 'var(--space-sm)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-tertiary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sharing' && (
            <div>
              <div style={{ 
                display: 'flex', 
                borderBottom: '1px solid var(--border-primary)',
                marginBottom: 'var(--space-lg)',
              }}>
                {[
                  { id: 'pdf', label: 'PDF Report', icon: FileText },
                  { id: 'powerpoint', label: 'PowerPoint', icon: Presentation },
                  { id: 'excel', label: 'Excel Export', icon: FileSpreadsheet },
                  { id: 'html', label: 'HTML Widget', icon: Code2 },
                  { id: 'link', label: 'Share Link', icon: Link2 },
                  { id: 'embed', label: 'Embed Code', icon: Code },
                  { id: 'social', label: 'Social Media', icon: Hash },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setShareTab(id as ShareTabType)}
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      border: 'none',
                      background: shareTab === id ? 'var(--bg-elevated)' : 'transparent',
                      color: shareTab === id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      borderBottom: `2px solid ${shareTab === id ? 'var(--accent-primary)' : 'transparent'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                    }}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>

              {shareTab === 'pdf' && (
                <div>
                  <h5 style={{ margin: '0 0 var(--space-md) 0' }}>Generate PDF Report</h5>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                    Create a comprehensive PDF report with your selected template and sections.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateReport}
                    disabled={isGenerating || !chartElement}
                    style={{
                      padding: 'var(--space-md) var(--space-lg)',
                      background: 'var(--accent-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      opacity: isGenerating ? 0.6 : 1,
                    }}
                  >
                    <Download size={16} />
                    {isGenerating ? 'Generating...' : 'Generate PDF Report'}
                  </button>
                </div>
              )}

              {shareTab === 'powerpoint' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <h5 style={{ margin: '0 0 var(--space-md) 0' }}>PowerPoint Presentation</h5>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                      Create a professional PowerPoint presentation with charts and AI insights.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>Template</label>
                      <select 
                        value={powerpointOptions.template}
                        onChange={(e) => setPowerpointOptions({ ...powerpointOptions, template: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: 'var(--space-sm)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-tertiary)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="business">Business</option>
                        <option value="executive">Executive</option>
                        <option value="technical">Technical</option>
                        <option value="minimal">Minimal</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>Layout</label>
                      <select 
                        value={powerpointOptions.slideLayout}
                        onChange={(e) => setPowerpointOptions({ ...powerpointOptions, slideLayout: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: 'var(--space-sm)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-tertiary)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="standard">Standard (4:3)</option>
                        <option value="widescreen">Widescreen (16:9)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <input
                        type="checkbox"
                        checked={powerpointOptions.includeInsights}
                        onChange={(e) => setPowerpointOptions({ ...powerpointOptions, includeInsights: e.target.checked })}
                      />
                      Include AI insights
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <input
                        type="checkbox"
                        checked={powerpointOptions.includeDataSummary}
                        onChange={(e) => setPowerpointOptions({ ...powerpointOptions, includeDataSummary: e.target.checked })}
                      />
                      Include data summary
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateShare}
                    disabled={isSharing || !chartElement}
                    style={{
                      padding: 'var(--space-md) var(--space-lg)',
                      background: 'var(--success)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: isSharing ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      alignSelf: 'flex-start',
                      opacity: isSharing ? 0.6 : 1,
                    }}
                  >
                    <Presentation size={16} />
                    {isSharing ? 'Creating...' : 'Generate PowerPoint'}
                  </button>

                  {shareResult && shareResult.success && (
                    <div style={{
                      padding: 'var(--space-md)',
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-primary)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                        <Zap size={16} color="var(--success)" />
                        <strong>PowerPoint presentation created!</strong>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        {shareResult.filename} ({shareResult.slideCount} slides)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {shareTab === 'excel' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <h5 style={{ margin: '0 0 var(--space-md) 0' }}>Excel Data Export</h5>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                      Export your data, insights, and analysis to Excel with multiple worksheets.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    <h6 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600' }}>Include in Export:</h6>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-sm)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <input
                          type="checkbox"
                          checked={excelOptions.includeRawData}
                          onChange={(e) => setExcelOptions({ ...excelOptions, includeRawData: e.target.checked })}
                        />
                        Raw data
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <input
                          type="checkbox"
                          checked={excelOptions.includeInsights}
                          onChange={(e) => setExcelOptions({ ...excelOptions, includeInsights: e.target.checked })}
                        />
                        AI insights
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <input
                          type="checkbox"
                          checked={excelOptions.includeSummaryStats}
                          onChange={(e) => setExcelOptions({ ...excelOptions, includeSummaryStats: e.target.checked })}
                        />
                        Summary statistics
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <input
                          type="checkbox"
                          checked={excelOptions.includeChartConfig}
                          onChange={(e) => setExcelOptions({ ...excelOptions, includeChartConfig: e.target.checked })}
                        />
                        Chart configuration
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateShare}
                    disabled={isSharing || !chartElement}
                    style={{
                      padding: 'var(--space-md) var(--space-lg)',
                      background: 'var(--success)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: isSharing ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      alignSelf: 'flex-start',
                      opacity: isSharing ? 0.6 : 1,
                    }}
                  >
                    <FileSpreadsheet size={16} />
                    {isSharing ? 'Creating...' : 'Export to Excel'}
                  </button>

                  {shareResult && shareResult.success && (
                    <div style={{
                      padding: 'var(--space-md)',
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-primary)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                        <Zap size={16} color="var(--success)" />
                        <strong>Excel file created!</strong>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        {shareResult.filename} ({shareResult.worksheetCount} worksheets)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {shareTab === 'html' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <h5 style={{ margin: '0 0 var(--space-md) 0' }}>Interactive HTML Widget</h5>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                      Generate a standalone HTML file with interactive charts that works offline.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>Theme</label>
                      <select 
                        value={htmlOptions.theme}
                        onChange={(e) => setHtmlOptions({ ...htmlOptions, theme: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: 'var(--space-sm)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-tertiary)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto (System)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <input
                          type="checkbox"
                          checked={htmlOptions.responsive}
                          onChange={(e) => setHtmlOptions({ ...htmlOptions, responsive: e.target.checked })}
                        />
                        Responsive design
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <input
                          type="checkbox"
                          checked={htmlOptions.enableFullscreen}
                          onChange={(e) => setHtmlOptions({ ...htmlOptions, enableFullscreen: e.target.checked })}
                        />
                        Fullscreen button
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <input
                        type="checkbox"
                        checked={htmlOptions.includeInsights}
                        onChange={(e) => setHtmlOptions({ ...htmlOptions, includeInsights: e.target.checked })}
                      />
                      Include insights
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <input
                        type="checkbox"
                        checked={htmlOptions.includeControls}
                        onChange={(e) => setHtmlOptions({ ...htmlOptions, includeControls: e.target.checked })}
                      />
                      Chart controls
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <input
                        type="checkbox"
                        checked={htmlOptions.includeDataTable}
                        onChange={(e) => setHtmlOptions({ ...htmlOptions, includeDataTable: e.target.checked })}
                      />
                      Data table
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateShare}
                    disabled={isSharing || !chartElement}
                    style={{
                      padding: 'var(--space-md) var(--space-lg)',
                      background: 'var(--success)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: isSharing ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      alignSelf: 'flex-start',
                      opacity: isSharing ? 0.6 : 1,
                    }}
                  >
                    <Code2 size={16} />
                    {isSharing ? 'Creating...' : 'Generate HTML Widget'}
                  </button>

                  {shareResult && shareResult.success && (
                    <div style={{
                      padding: 'var(--space-md)',
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-primary)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                        <Zap size={16} color="var(--success)" />
                        <strong>HTML widget created!</strong>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        {shareResult.filename} ({shareResult.size})
                      </p>
                    </div>
                  )}
                </div>
              )}

              {shareTab === 'link' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <h5 style={{ margin: '0 0 var(--space-md) 0' }}>Share Settings</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <input
                          type="checkbox"
                          checked={shareSettings.allowDownload}
                          onChange={(e) => setShareSettings({ ...shareSettings, allowDownload: e.target.checked })}
                        />
                        Allow downloads
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <input
                          type="checkbox"
                          checked={shareSettings.allowEmbed}
                          onChange={(e) => setShareSettings({ ...shareSettings, allowEmbed: e.target.checked })}
                        />
                        Allow embedding
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>
                      <Lock size={16} style={{ marginRight: 'var(--space-xs)' }} />
                      Password Protection (Optional)
                    </label>
                    <input
                      type="password"
                      value={shareSettings.password || ''}
                      onChange={(e) => setShareSettings({ ...shareSettings, password: e.target.value })}
                      placeholder="Leave empty for public access"
                      style={{
                        width: '100%',
                        padding: 'var(--space-sm)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-tertiary)',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateShare}
                    disabled={isSharing || !chartElement}
                    style={{
                      padding: 'var(--space-md) var(--space-lg)',
                      background: 'var(--accent-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: isSharing ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      alignSelf: 'flex-start',
                      opacity: isSharing ? 0.6 : 1,
                    }}
                  >
                    <Globe size={16} />
                    {isSharing ? 'Creating...' : 'Create Share Link'}
                  </button>

                  {shareResult && shareResult.success && shareResult.shareUrl && (
                    <div style={{
                      padding: 'var(--space-md)',
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-primary)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                        <Zap size={16} color="var(--success)" />
                        <strong>Share link created!</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <input
                          type="text"
                          value={shareResult.shareUrl}
                          readOnly
                          style={{
                            flex: 1,
                            padding: 'var(--space-sm)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-tertiary)',
                            fontSize: '0.875rem',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(shareResult.shareUrl)}
                          style={{
                            padding: 'var(--space-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                          }}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                      {shareResult.qrCode && (
                        <div style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
                          <img src={shareResult.qrCode} alt="QR Code" style={{ maxWidth: '150px' }} />
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>
                            QR Code for easy sharing
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Other share tabs would be implemented here */}
            </div>
          )}

          {activeTab === 'preview' && (
            <div>
              <h4 style={{ margin: '0 0 var(--space-lg) 0' }}>Report Preview</h4>
              <div style={{
                padding: 'var(--space-xl)',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📄</div>
                <h5 style={{ margin: '0 0 var(--space-sm) 0' }}>Preview Coming Soon</h5>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Generate your report to see the final result
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}