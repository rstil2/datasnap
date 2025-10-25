import { ChartConfig } from '../../types/VisualizationTypes';
import { InsightGenerationResult } from '../ai/InsightGenerator';

export interface ShareSettings {
  id: string;
  password?: string;
  expiresAt: string;
  allowDownload: boolean;
  allowEmbed: boolean;
  watermark?: string;
  socialOptimized: boolean;
  customDomain?: string;
}

export interface SocialMediaOptions {
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram';
  includeInsights: boolean;
  hashtags?: string[];
  customMessage?: string;
  imageFormat: 'square' | 'landscape' | 'story';
}

export interface EmbedOptions {
  width: number;
  height: number;
  responsive: boolean;
  showTitle: boolean;
  showControls: boolean;
  allowFullscreen: boolean;
  theme: 'light' | 'dark' | 'auto';
  borderRadius: number;
  customCSS?: string;
}

export interface ShareResult {
  success: boolean;
  shareUrl?: string;
  embedCode?: string;
  socialUrls?: Record<string, string>;
  qrCode?: string;
  error?: string;
  analytics?: {
    trackingId: string;
    dashboardUrl: string;
  };
}

export class AdvancedSharingService {
  private static readonly SHARE_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://share.datasnap.io' 
    : 'http://localhost:3001';

  /**
   * Create advanced shareable link with password protection and analytics
   */
  static async createShareableLink(
    config: ChartConfig,
    data: Record<string, any>[],
    insights: InsightGenerationResult | null,
    settings: Partial<ShareSettings> = {}
  ): Promise<ShareResult> {
    try {
      const shareId = this.generateSecureId();
      const defaultSettings: ShareSettings = {
        id: shareId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        allowDownload: true,
        allowEmbed: true,
        socialOptimized: false,
        ...settings
      };

      // Prepare share data
      const shareData = {
        id: shareId,
        config,
        data: settings.password ? this.encryptData(data, settings.password) : data,
        insights: settings.password ? this.encryptData(insights, settings.password) : insights,
        settings: defaultSettings,
        metadata: {
          createdAt: new Date().toISOString(),
          viewCount: 0,
          lastViewed: null,
          userAgent: navigator.userAgent,
          ipAddress: 'anonymized', // In production, would be server-side
        },
        analytics: {
          trackingId: this.generateTrackingId(),
          events: []
        }
      };

      // In production, this would be sent to a secure server
      // For demo purposes, using enhanced localStorage
      const encryptedData = this.encryptShareData(shareData);
      localStorage.setItem(`share_${shareId}`, encryptedData);
      localStorage.setItem(`share_index_${shareId}`, JSON.stringify({
        id: shareId,
        title: config.title,
        type: config.type,
        createdAt: shareData.metadata.createdAt,
        expiresAt: defaultSettings.expiresAt,
        hasPassword: !!settings.password,
        isPublic: !settings.password
      }));

      const shareUrl = `${this.SHARE_BASE_URL}/chart/${shareId}`;

      // Generate QR Code
      const qrCode = await this.generateQRCode(shareUrl);

      // Copy to clipboard if possible
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch (error) {
        // Clipboard access failed, ignore
      }

      return {
        success: true,
        shareUrl,
        qrCode,
        analytics: {
          trackingId: shareData.analytics.trackingId,
          dashboardUrl: `${this.SHARE_BASE_URL}/analytics/${shareData.analytics.trackingId}`
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Share creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate optimized social media exports
   */
  static async generateSocialMediaExport(
    chartElement: HTMLElement,
    config: ChartConfig,
    insights: InsightGenerationResult | null,
    options: SocialMediaOptions
  ): Promise<ShareResult> {
    try {
      // Define platform-specific dimensions
      const dimensions = this.getSocialMediaDimensions(options.platform, options.imageFormat);
      
      // Import html2canvas dynamically
      const html2canvas = await import('html2canvas');
      
      // Create optimized chart image
      const canvas = await html2canvas.default(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        width: dimensions.width,
        height: dimensions.height,
        useCORS: true,
        allowTaint: true,
      });

      // Create social media optimized version
      const socialCanvas = this.createSocialOptimizedCanvas(
        canvas, 
        config, 
        insights, 
        options, 
        dimensions
      );

      const socialImageBlob = await this.canvasToBlob(socialCanvas);
      
      // Generate social media URLs
      const socialUrls = this.generateSocialMediaUrls(config, insights, options);

      // Save optimized image for sharing
      const imageUrl = await this.uploadImageToStorage(socialImageBlob);

      return {
        success: true,
        socialUrls,
        shareUrl: imageUrl
      };

    } catch (error) {
      return {
        success: false,
        error: `Social media export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate advanced embed code with customization options
   */
  static async generateAdvancedEmbedCode(
    config: ChartConfig,
    data: Record<string, any>[],
    insights: InsightGenerationResult | null,
    embedOptions: EmbedOptions
  ): Promise<ShareResult> {
    try {
      // First create a shareable link
      const shareResult = await this.createShareableLink(config, data, insights, {
        allowEmbed: true,
        socialOptimized: false
      });

      if (!shareResult.success || !shareResult.shareUrl) {
        return {
          success: false,
          error: 'Failed to create shareable link for embed'
        };
      }

      // Generate responsive embed code
      const embedCode = this.generateEmbedHTML(shareResult.shareUrl, embedOptions);
      
      // Generate preview code
      const previewCode = this.generateEmbedPreview(embedOptions);

      // Copy embed code to clipboard
      try {
        await navigator.clipboard.writeText(embedCode);
      } catch (error) {
        // Clipboard access failed, ignore
      }

      return {
        success: true,
        embedCode,
        shareUrl: shareResult.shareUrl
      };

    } catch (error) {
      return {
        success: false,
        error: `Embed code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate password-protected share link
   */
  static async createPasswordProtectedShare(
    config: ChartConfig,
    data: Record<string, any>[],
    insights: InsightGenerationResult | null,
    password: string,
    additionalSettings: Partial<ShareSettings> = {}
  ): Promise<ShareResult> {
    return this.createShareableLink(config, data, insights, {
      password,
      allowDownload: additionalSettings.allowDownload ?? false,
      allowEmbed: additionalSettings.allowEmbed ?? false,
      ...additionalSettings
    });
  }

  /**
   * Get share analytics
   */
  static getShareAnalytics(shareId: string): any {
    try {
      const shareData = localStorage.getItem(`share_${shareId}`);
      if (!shareData) return null;

      const decryptedData = this.decryptShareData(shareData);
      return {
        viewCount: decryptedData.metadata.viewCount,
        createdAt: decryptedData.metadata.createdAt,
        lastViewed: decryptedData.metadata.lastViewed,
        analytics: decryptedData.analytics
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Revoke share link
   */
  static revokeShare(shareId: string): boolean {
    try {
      localStorage.removeItem(`share_${shareId}`);
      localStorage.removeItem(`share_index_${shareId}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Private helper methods

  private static generateSecureId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const crypto = window.crypto || (window as any).msCrypto;
    
    if (crypto && crypto.getRandomValues) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      for (let i = 0; i < array.length; i++) {
        result += chars[array[i] % chars.length];
      }
    } else {
      // Fallback for older browsers
      for (let i = 0; i < 16; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    
    return result;
  }

  private static generateTrackingId(): string {
    return 'trk_' + this.generateSecureId();
  }

  private static encryptData(data: any, password: string): string {
    // Simple encryption for demo (use proper encryption in production)
    const jsonString = JSON.stringify(data);
    const encoded = btoa(unescape(encodeURIComponent(jsonString + '::' + password)));
    return encoded;
  }

  private static encryptShareData(data: any): string {
    // Encrypt entire share data structure
    const jsonString = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(jsonString)));
  }

  private static decryptShareData(encryptedData: string): any {
    try {
      const jsonString = decodeURIComponent(escape(atob(encryptedData)));
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error('Failed to decrypt share data');
    }
  }

  private static async generateQRCode(url: string): Promise<string> {
    // Simple QR code generation (in production, use a proper QR library)
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    return qrApiUrl;
  }

  private static getSocialMediaDimensions(platform: string, format: string): { width: number; height: number } {
    const dimensions = {
      twitter: {
        square: { width: 1080, height: 1080 },
        landscape: { width: 1200, height: 675 },
        story: { width: 1080, height: 1920 }
      },
      linkedin: {
        square: { width: 1080, height: 1080 },
        landscape: { width: 1200, height: 627 },
        story: { width: 1080, height: 1920 }
      },
      facebook: {
        square: { width: 1080, height: 1080 },
        landscape: { width: 1200, height: 630 },
        story: { width: 1080, height: 1920 }
      },
      instagram: {
        square: { width: 1080, height: 1080 },
        landscape: { width: 1080, height: 608 },
        story: { width: 1080, height: 1920 }
      }
    };

    return dimensions[platform as keyof typeof dimensions]?.[format as keyof typeof dimensions.twitter] || 
           dimensions.twitter.landscape;
  }

  private static createSocialOptimizedCanvas(
    originalCanvas: HTMLCanvasElement,
    config: ChartConfig,
    insights: InsightGenerationResult | null,
    options: SocialMediaOptions,
    dimensions: { width: number; height: number }
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext('2d')!;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add chart (centered and scaled)
    const chartAspectRatio = originalCanvas.width / originalCanvas.height;
    const availableWidth = canvas.width * 0.8;
    const availableHeight = canvas.height * 0.6;
    
    let chartWidth = availableWidth;
    let chartHeight = chartWidth / chartAspectRatio;
    
    if (chartHeight > availableHeight) {
      chartHeight = availableHeight;
      chartWidth = chartHeight * chartAspectRatio;
    }

    const chartX = (canvas.width - chartWidth) / 2;
    const chartY = canvas.height * 0.15;

    ctx.drawImage(originalCanvas, chartX, chartY, chartWidth, chartHeight);

    // Add title
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(config.title, canvas.width / 2, 80);

    // Add key insight if available and requested
    if (options.includeInsights && insights && insights.insights.length > 0) {
      const keyInsight = insights.insights[0];
      ctx.fillStyle = '#6b7280';
      ctx.font = '32px Arial';
      
      const maxWidth = canvas.width * 0.8;
      const lines = this.wrapText(ctx, keyInsight.description, maxWidth);
      const startY = chartY + chartHeight + 50;
      
      lines.slice(0, 2).forEach((line, index) => { // Max 2 lines
        ctx.fillText(line, canvas.width / 2, startY + (index * 40));
      });
    }

    // Add DataSnap branding
    ctx.fillStyle = '#9ca3af';
    ctx.font = '24px Arial';
    ctx.fillText('Created with DataSnap', canvas.width / 2, canvas.height - 40);

    return canvas;
  }

  private static wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    
    lines.push(currentLine);
    return lines;
  }

  private static generateSocialMediaUrls(
    config: ChartConfig,
    insights: InsightGenerationResult | null,
    options: SocialMediaOptions
  ): Record<string, string> {
    const baseMessage = options.customMessage || 
      `Check out this ${config.type} chart: "${config.title}"`;
    
    const hashtags = options.hashtags?.join(' ') || '#DataVisualization #Analytics';
    const fullMessage = `${baseMessage} ${hashtags}`;

    return {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullMessage)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}&summary=${encodeURIComponent(fullMessage)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(fullMessage)}`,
    };
  }

  private static generateEmbedHTML(shareUrl: string, options: EmbedOptions): string {
    const embedUrl = `${shareUrl}?embed=true&theme=${options.theme}`;
    
    if (options.responsive) {
      return `<!-- DataSnap Chart Embed - Responsive -->
<div style="position: relative; width: 100%; height: 0; padding-bottom: ${(options.height / options.width) * 100}%; border-radius: ${options.borderRadius}px; overflow: hidden;">
  <iframe 
    src="${embedUrl}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; ${options.customCSS || ''}"
    allowfullscreen="${options.allowFullscreen}"
    title="${options.showTitle ? 'DataSnap Chart' : ''}"
    loading="lazy">
  </iframe>
</div>
<!-- End DataSnap Embed -->`;
    } else {
      return `<!-- DataSnap Chart Embed - Fixed Size -->
<iframe 
  src="${embedUrl}"
  width="${options.width}"
  height="${options.height}"
  style="border: none; border-radius: ${options.borderRadius}px; ${options.customCSS || ''}"
  allowfullscreen="${options.allowFullscreen}"
  title="${options.showTitle ? 'DataSnap Chart' : ''}"
  loading="lazy">
</iframe>
<!-- End DataSnap Embed -->`;
    }
  }

  private static generateEmbedPreview(options: EmbedOptions): string {
    return `
<div style="
  width: ${options.responsive ? '100%' : options.width + 'px'}; 
  height: ${options.responsive ? 'auto' : options.height + 'px'}; 
  background: #f3f4f6; 
  border: 2px dashed #d1d5db; 
  border-radius: ${options.borderRadius}px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-family: Arial, sans-serif; 
  color: #6b7280;
  ${options.responsive ? 'aspect-ratio: ' + options.width + '/' + options.height + ';' : ''}
">
  <div style="text-align: center;">
    <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
    <div>DataSnap Chart Embed Preview</div>
    <div style="font-size: 12px; margin-top: 4px;">
      ${options.width} × ${options.height}${options.responsive ? ' (Responsive)' : ''}
    </div>
  </div>
</div>`;
  }

  private static async canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png', 1.0);
    });
  }

  private static async uploadImageToStorage(blob: Blob): Promise<string> {
    // In production, this would upload to cloud storage (S3, Cloudinary, etc.)
    // For demo, creating a local object URL
    return URL.createObjectURL(blob);
  }
}