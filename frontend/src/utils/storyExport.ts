import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface StoryExportOptions {
  format: 'png' | 'pdf' | 'url' | 'json';
  size?: 'square' | 'wide' | 'tall';
  theme?: 'dark' | 'light';
  includeCharts?: boolean;
  includeData?: boolean;
}

export interface ExportableStory {
  id: string;
  title: string;
  summary: string;
  narrative: string;
  key_insights: Array<{
    title: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  recommendations: string[];
  metadata: {
    generation_time_ms: number;
    data_quality_score: number;
    story_type: string;
    narrative_style: string;
  };
  charts?: any[];
}

export class StoryExporter {
  private static instance: StoryExporter;
  
  static getInstance(): StoryExporter {
    if (!StoryExporter.instance) {
      StoryExporter.instance = new StoryExporter();
    }
    return StoryExporter.instance;
  }

  async exportStoryCard(story: ExportableStory, options: StoryExportOptions = { format: 'png' }): Promise<string | Blob> {
    const cardElement = this.createStoryCard(story, options);
    document.body.appendChild(cardElement);
    
    try {
      switch (options.format) {
        case 'png':
          return await this.exportAsPNG(cardElement);
        case 'pdf':
          return await this.exportAsPDF(cardElement);
        case 'url':
          return this.generateShareableURL(story);
        case 'json':
          return JSON.stringify(story, null, 2);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } finally {
      document.body.removeChild(cardElement);
    }
  }

  private createStoryCard(story: ExportableStory, options: StoryExportOptions): HTMLElement {
    const card = document.createElement('div');
    const isDark = options.theme === 'dark';
    const size = options.size || 'square';
    
    // Calculate dimensions based on size
    const dimensions = {
      square: { width: 800, height: 800 },
      wide: { width: 1200, height: 630 },
      tall: { width: 600, height: 1000 }
    };
    
    const { width, height } = dimensions[size];
    
    card.style.cssText = `
      position: absolute;
      top: -10000px;
      left: -10000px;
      width: ${width}px;
      height: ${height}px;
      background: ${isDark ? '#0a0a0a' : '#ffffff'};
      color: ${isDark ? '#ffffff' : '#000000'};
      font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 48px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 24px;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, ${isDark ? 0.8 : 0.15});
    `;

    // Header with branding
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    `;
    
    const brand = document.createElement('div');
    brand.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 24px;
      font-weight: 700;
    `;
    brand.innerHTML = `
      <span style="font-size: 32px;">📊</span>
      <span>DataSnap</span>
    `;
    
    const qualityBadge = document.createElement('div');
    const qualityColor = story.metadata.data_quality_score >= 80 ? '#30D158' :
                        story.metadata.data_quality_score >= 60 ? '#FF9F0A' : '#FF453A';
    qualityBadge.style.cssText = `
      background: ${qualityColor};
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    `;
    qualityBadge.textContent = `${story.metadata.data_quality_score.toFixed(1)}/100 Quality`;
    
    header.appendChild(brand);
    header.appendChild(qualityBadge);

    // Title
    const title = document.createElement('h1');
    title.style.cssText = `
      font-size: 36px;
      font-weight: 700;
      line-height: 1.2;
      margin: 0 0 16px 0;
      color: ${isDark ? '#ffffff' : '#000000'};
    `;
    title.textContent = story.title.length > 80 ? 
      story.title.substring(0, 80) + '...' : story.title;

    // Summary
    const summary = document.createElement('p');
    summary.style.cssText = `
      font-size: 18px;
      line-height: 1.6;
      color: ${isDark ? '#b4b4b4' : '#666666'};
      margin: 0 0 24px 0;
    `;
    summary.textContent = story.summary.length > 200 ? 
      story.summary.substring(0, 200) + '...' : story.summary;

    // Key insights (top 3)
    const insights = document.createElement('div');
    insights.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    `;
    
    const insightsTitle = document.createElement('h3');
    insightsTitle.style.cssText = `
      font-size: 20px;
      font-weight: 600;
      margin: 0;
      color: ${isDark ? '#ffffff' : '#000000'};
    `;
    insightsTitle.textContent = 'Key Insights';
    insights.appendChild(insightsTitle);
    
    story.key_insights.slice(0, 3).forEach((insight) => {
      const insightCard = document.createElement('div');
      const priorityColor = insight.priority === 'critical' ? '#FF453A' :
                          insight.priority === 'high' ? '#FF9F0A' :
                          insight.priority === 'medium' ? '#007AFF' : '#8E8E93';
      
      insightCard.style.cssText = `
        background: ${isDark ? '#1a1a1a' : '#f8f9fa'};
        border-radius: 12px;
        padding: 16px;
        border-left: 4px solid ${priorityColor};
      `;
      
      insightCard.innerHTML = `
        <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: ${isDark ? '#ffffff' : '#000000'};">
          ${insight.title}
        </div>
        <div style="font-size: 14px; color: ${isDark ? '#b4b4b4' : '#666666'}; line-height: 1.4;">
          ${insight.description.length > 120 ? insight.description.substring(0, 120) + '...' : insight.description}
        </div>
      `;
      insights.appendChild(insightCard);
    });

    // Footer with metadata
    const footer = document.createElement('div');
    footer.style.cssText = `
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 24px;
      border-top: 1px solid ${isDark ? '#2a2a2a' : '#e0e0e0'};
      font-size: 14px;
      color: ${isDark ? '#8a8a8a' : '#999999'};
    `;
    
    footer.innerHTML = `
      <div>
        <span style="text-transform: capitalize;">${story.metadata.story_type}</span> • 
        <span>${story.metadata.narrative_style}</span>
      </div>
      <div>
        ${story.key_insights.length} insights • ${story.recommendations.length} recommendations
      </div>
    `;

    // Assemble card
    card.appendChild(header);
    card.appendChild(title);
    card.appendChild(summary);
    card.appendChild(insights);
    card.appendChild(footer);

    return card;
  }

  private async exportAsPNG(element: HTMLElement): Promise<Blob> {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2, // High DPI
      useCORS: true,
      allowTaint: true
    });
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png', 1.0);
    });
  }

  private async exportAsPDF(element: HTMLElement): Promise<Blob> {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: true
    });
    
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    return pdf.output('blob');
  }

  private generateShareableURL(story: ExportableStory): string {
    const baseUrl = window.location.origin;
    // Generate a proper shareable URL using the story ID
    return `${baseUrl}/share/${story.id}`;
  }

  generateSocialMediaText(story: ExportableStory, platform: 'twitter' | 'linkedin' | 'facebook'): string {
    const title = story.title.length > 100 ? story.title.substring(0, 100) + '...' : story.title;
    const quality = story.metadata.data_quality_score.toFixed(1);
    const insights = story.key_insights.length;
    
    switch (platform) {
      case 'twitter':
        return `📊 Data Story: ${title}\n\n✨ ${insights} key insights discovered\n📈 ${quality}/100 data quality\n\n#DataAnalysis #DataStory #Analytics #DataSnap`;
      
      case 'linkedin':
        return `🚀 Excited to share my latest data analysis!\n\n${title}\n\nKey highlights:\n• ${insights} actionable insights identified\n• ${quality}/100 data quality score\n• ${story.metadata.story_type} narrative style\n\nData storytelling continues to be a powerful way to communicate insights and drive decisions. What patterns are you discovering in your data?\n\n#DataAnalysis #DataStory #Analytics #BusinessIntelligence`;
      
      case 'facebook':
        return `📈 Just completed a fascinating data analysis!\n\n"${title}"\n\nI discovered ${insights} key insights with a data quality score of ${quality}/100. The patterns revealed were truly interesting!\n\nData tells such compelling stories when we take the time to listen. 📊\n\n#DataAnalysis #Analytics #DataStory`;
      
      default:
        return title;
    }
  }

  async copyToClipboard(content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}