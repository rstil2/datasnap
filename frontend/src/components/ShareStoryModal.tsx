import { useState, useRef } from 'react';
import { X, Download, Copy, Share2, Image, FileText, Link, MessageCircle } from 'lucide-react';
import { FacebookShareButton, TwitterShareButton, LinkedinShareButton } from 'react-share';
import { StoryExporter, StoryExportOptions, ExportableStory } from '../utils/storyExport';

interface ShareStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: ExportableStory;
}

export default function ShareStoryModal({ isOpen, onClose, story }: ShareStoryModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'social' | 'embed'>('export');
  const [exportFormat, setExportFormat] = useState<'png' | 'pdf' | 'json'>('png');
  const [cardSize, setCardSize] = useState<'square' | 'wide' | 'tall'>('square');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isExporting, setIsExporting] = useState(false);
  const [shareableUrl, setShareableUrl] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  
  const exporter = useRef(StoryExporter.getInstance()).current;

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const options: StoryExportOptions = {
        format: exportFormat,
        size: cardSize,
        theme: theme
      };

      const result = await exporter.exportStoryCard(story, options);

      if (result instanceof Blob) {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `datastory-${story.metadata.story_type}-${timestamp}.${exportFormat}`;
        exporter.downloadBlob(result, filename);
      } else {
        // Handle URL or JSON string result
        await exporter.copyToClipboard(result);
        setCopyFeedback('Copied to clipboard!');
        setTimeout(() => setCopyFeedback(''), 2000);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateShareUrl = async () => {
    try {
      const url = await exporter.exportStoryCard(story, { format: 'url' }) as string;
      setShareableUrl(url);
      await exporter.copyToClipboard(url);
      setCopyFeedback('Shareable URL copied to clipboard!');
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch (error) {
      console.error('Failed to generate share URL:', error);
    }
  };

  const socialMediaText = {
    twitter: exporter.generateSocialMediaText(story, 'twitter'),
    linkedin: exporter.generateSocialMediaText(story, 'linkedin'),
    facebook: exporter.generateSocialMediaText(story, 'facebook')
  };

  const embedCode = `<iframe src="${shareableUrl}" width="800" height="600" frameborder="0"></iframe>`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 id="share-modal-title" className="text-xl font-semibold">Share Your Data Story</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {copyFeedback && (
          <div className="bg-green-100 border border-green-200 text-green-800 px-4 py-2 mx-6 mt-4 rounded-lg text-sm">
            {copyFeedback}
          </div>
        )}

        <div className="flex border-b">
          {[
            { id: 'export', label: 'Export', icon: Download },
            { id: 'social', label: 'Social Media', icon: Share2 },
            { id: 'embed', label: 'Embed & Link', icon: Link }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === id 
                  ? 'border-blue-500 text-blue-600 bg-blue-50' 
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="png">PNG Image</option>
                    <option value="pdf">PDF Document</option>
                    <option value="json">JSON Data</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size
                  </label>
                  <select
                    value={cardSize}
                    onChange={(e) => setCardSize(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={exportFormat === 'json'}
                  >
                    <option value="square">Square (800×800)</option>
                    <option value="wide">Wide (1200×630)</option>
                    <option value="tall">Tall (600×1000)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={exportFormat === 'json'}
                  >
                    <option value="light">Light Theme</option>
                    <option value="dark">Dark Theme</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  {exportFormat === 'png' && <Image size={20} className="text-green-600" />}
                  {exportFormat === 'pdf' && <FileText size={20} className="text-red-600" />}
                  {exportFormat === 'json' && <FileText size={20} className="text-blue-600" />}
                  <div>
                    <div className="font-medium">
                      {exportFormat === 'png' && 'High-quality image for social media'}
                      {exportFormat === 'pdf' && 'Professional document format'}
                      {exportFormat === 'json' && 'Raw story data for developers'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {exportFormat === 'png' && 'Perfect for Instagram, Twitter, LinkedIn posts'}
                      {exportFormat === 'pdf' && 'Great for reports, presentations, and printing'}
                      {exportFormat === 'json' && 'Contains all story data in structured format'}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Export Story
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium mb-2">Share on Social Media</h3>
                <p className="text-gray-600">Choose your platform and customize your message</p>
              </div>

              <div className="space-y-4">
                {/* Twitter */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-400 rounded text-white flex items-center justify-center font-bold text-sm">
                        𝕏
                      </div>
                      <span className="font-medium">Twitter / X</span>
                    </div>
                    <TwitterShareButton
                      url={shareableUrl || window.location.href}
                      title={socialMediaText.twitter}
                      className="bg-blue-400 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Share
                    </TwitterShareButton>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    {socialMediaText.twitter}
                  </div>
                  <button
                    onClick={() => {
                      exporter.copyToClipboard(socialMediaText.twitter);
                      setCopyFeedback('Twitter text copied!');
                      setTimeout(() => setCopyFeedback(''), 2000);
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    <Copy size={14} />
                    Copy text
                  </button>
                </div>

                {/* LinkedIn */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded text-white flex items-center justify-center font-bold text-sm">
                        in
                      </div>
                      <span className="font-medium">LinkedIn</span>
                    </div>
                    <LinkedinShareButton
                      url={shareableUrl || window.location.href}
                      title={story.title}
                      summary={socialMediaText.linkedin}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Share
                    </LinkedinShareButton>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-line">
                    {socialMediaText.linkedin}
                  </div>
                  <button
                    onClick={() => {
                      exporter.copyToClipboard(socialMediaText.linkedin);
                      setCopyFeedback('LinkedIn text copied!');
                      setTimeout(() => setCopyFeedback(''), 2000);
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    <Copy size={14} />
                    Copy text
                  </button>
                </div>

                {/* Facebook */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-700 rounded text-white flex items-center justify-center font-bold text-sm">
                        f
                      </div>
                      <span className="font-medium">Facebook</span>
                    </div>
                    <FacebookShareButton
                      url={shareableUrl || window.location.href}
                      className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Share
                    </FacebookShareButton>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-line">
                    {socialMediaText.facebook}
                  </div>
                  <button
                    onClick={() => {
                      exporter.copyToClipboard(socialMediaText.facebook);
                      setCopyFeedback('Facebook text copied!');
                      setTimeout(() => setCopyFeedback(''), 2000);
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    <Copy size={14} />
                    Copy text
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium mb-2">Embed & Share</h3>
                <p className="text-gray-600">Generate shareable links and embed codes</p>
              </div>

              <div className="space-y-4">
                {/* Shareable URL */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Link size={18} />
                      Shareable URL
                    </h4>
                    <button
                      onClick={handleGenerateShareUrl}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Generate URL
                    </button>
                  </div>
                  {shareableUrl ? (
                    <div className="space-y-2">
                      <div className="bg-gray-50 p-3 rounded text-sm font-mono break-all">
                        {shareableUrl}
                      </div>
                      <button
                        onClick={() => {
                          exporter.copyToClipboard(shareableUrl);
                          setCopyFeedback('URL copied to clipboard!');
                          setTimeout(() => setCopyFeedback(''), 2000);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        <Copy size={14} />
                        Copy URL
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Click "Generate URL" to create a shareable link</p>
                  )}
                </div>

                {/* Embed Code */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <MessageCircle size={18} />
                      Embed Code
                    </h4>
                  </div>
                  {shareableUrl ? (
                    <div className="space-y-2">
                      <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                        {embedCode}
                      </div>
                      <button
                        onClick={() => {
                          exporter.copyToClipboard(embedCode);
                          setCopyFeedback('Embed code copied!');
                          setTimeout(() => setCopyFeedback(''), 2000);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        <Copy size={14} />
                        Copy embed code
                      </button>
                      <p className="text-xs text-gray-500">
                        Paste this code into any website to embed your story
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Generate a shareable URL first to get the embed code</p>
                  )}
                </div>

                {/* QR Code */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <h4 className="font-medium">QR Code (Coming Soon)</h4>
                  </div>
                  <div className="bg-gray-100 p-8 rounded-lg text-center">
                    <div className="w-24 h-24 bg-gray-300 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-gray-500 text-xs">QR</span>
                    </div>
                    <p className="text-sm text-gray-500">QR code generation will be available in the next update</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{story.title}</span> • 
              {story.key_insights.length} insights • 
              Quality: {story.metadata.data_quality_score.toFixed(1)}/100
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}