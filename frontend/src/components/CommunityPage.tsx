import { useState, useMemo, useEffect } from 'react';
import { hybridStoryStorage } from '../services/hybridStoryStorage';
import { CommunityStory } from '../types';
import { useUser } from '../contexts/UserContext';
import { useData } from '../contexts/DataContext';
import { FirebaseSignInModal } from './FirebaseSignInModal';

interface CommunityPageProps {
  onPageChange?: (page: string) => void;
}

export function CommunityPage({ onPageChange }: CommunityPageProps = {}) {
  const { user, isAuthenticated } = useUser();
  const { currentFile, csvData } = useData();
  const [activeTab, setActiveTab] = useState<'trending' | 'recent' | 'featured' | 'collections'>('trending');
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [stories, setStories] = useState<CommunityStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSignInModal, setShowSignInModal] = useState(false);
  const { currentFile, csvData } = useData();
  const [activeTab, setActiveTab] = useState<'trending' | 'recent' | 'featured' | 'collections'>('trending');
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [stories, setStories] = useState<CommunityStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSignInModal, setShowSignInModal] = useState(false);

  // Add CSS to hide URL overlays immediately
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Hide any element that contains URLs */
      *[class*="url"], *[id*="url"], *[class*="overlay"], *[id*="overlay"] {
        display: none !important;
      }
      
      /* Hide elements with high z-index that might be overlays */
      *[style*="z-index: 999"], *[style*="z-index: 1000"], *[style*="position: fixed"] {
        visibility: hidden !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Firebase ID replacement only (no highlighting)
  useEffect(() => {
    
    // More aggressive overlay hiding
    const hideUrlOverlays = () => {
      // Hide any element that looks like a URL overlay
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const text = el.textContent || '';
        const style = window.getComputedStyle(el);
        
        // Hide if it contains URLs and is positioned
        if ((text.includes('http') || text.includes('google.com') || text.includes('firebase')) && 
            (style.position === 'absolute' || style.position === 'fixed' || style.zIndex > 100)) {
          el.style.display = 'none !important';
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
        }
        
        // Also hide any element that's just a plain URL
        if (text.trim().startsWith('http') && text.trim().length > 20) {
          el.style.display = 'none !important';
        }
      });
    };
    
    // Targeted Firebase ID replacement for community feed only
    const replaceFirebaseIdsInCommunity = () => {
      // Only target elements within the community feed area
      const communityFeed = document.querySelector('[data-testid="community-feed"]') || document.body;
      const walker = document.createTreeWalker(
        communityFeed,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let textNode;
      while (textNode = walker.nextNode()) {
        const text = textNode.textContent || '';
        // More specific pattern for Firebase UIDs
        if (text.length > 20 && /^[a-zA-Z0-9]{20,}$/.test(text.trim()) && !text.includes('http')) {
          textNode.textContent = 'User';
        }
      }
    };
    
    // Run URL hiding and Firebase ID replacement
    setTimeout(() => {
      hideUrlOverlays();
      replaceFirebaseIdsInCommunity();
    }, 1000);
    
    const interval = setInterval(() => {
      hideUrlOverlays();
      replaceFirebaseIdsInCommunity();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load initial stories
    loadStories();
    
    // Subscribe to real-time story updates using Firebase or polling for localStorage
    const unsubscribe = hybridStoryStorage.onStoriesChange((updatedStories) => {
      setStories(updatedStories);
      setLoading(false);
    }, getSortByFromActiveTab());
    
    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, [activeTab]); // Re-subscribe when tab changes


  const loadStories = async () => {
    setLoading(true);
    try {
      const sortBy = getSortByFromActiveTab();
      const communityStories = await hybridStoryStorage.getCommunityStories(sortBy);
      setStories(communityStories);
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert activeTab to sort parameter
  const getSortByFromActiveTab = (): 'recent' | 'trending' | 'popular' => {
    switch (activeTab) {
      case 'trending':
        return 'trending';
      case 'featured':
        return 'popular';
      case 'recent':
      default:
        return 'recent';
    }
  };

  // Clean up author names for existing stories with Firebase UIDs
  const cleanedStories = useMemo(() => {
    return stories.map(story => ({
      ...story,
      author: isFirebaseId(story.author) 
        ? formatDisplayName(story.author)
        : story.author
    }));
  }, [stories]);
  
  // Filter and sort stories based on current tab and filters
  const filteredStories = useMemo(() => {
    let filtered = [...cleanedStories];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(story => 
        story.title.toLowerCase().includes(query) ||
        story.summary.toLowerCase().includes(query) ||
        story.author.toLowerCase().includes(query) ||
        story.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(story => 
        story.tags.some(tag => selectedTags.includes(tag))
      );
    }
    
    // Sort based on active tab
    switch (activeTab) {
      case 'trending':
        return filtered.sort((a, b) => (b.likes + b.comments + b.views) - (a.likes + a.comments + a.views));
      case 'recent':
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'featured':
        return filtered.filter(story => story.qualityScore >= 80)
          .sort((a, b) => b.qualityScore - a.qualityScore);
      case 'collections':
        if (selectedCollection) {
          return getStoriesForCollection(selectedCollection)
            .filter(story => 
              // Apply existing filters to collection stories
              (searchQuery.trim() === '' || 
                story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                story.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                story.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                story.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
              ) &&
              (selectedTags.length === 0 || story.tags.some(tag => selectedTags.includes(tag)))
            )
            .sort((a, b) => b.qualityScore - a.qualityScore);
        }
        return [];
      default:
        return filtered;
    }
  }, [cleanedStories, activeTab, selectedTags, searchQuery]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    stories.forEach(story => {
      story.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [stories]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getStoryTypeIcon = (type: string): string => {
    switch (type) {
      case 'executive': return '👔';
      case 'detailed': return '📊';
      case 'insights': return '💡';
      case 'summary': return '📝';
      default: return '📄';
    }
  };

  const getQualityColor = (score: number): string => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--error)';
  };

  const getCollections = () => {
    return [
      {
        id: 'business',
        name: 'Business Intelligence',
        icon: '💼',
        description: 'Sales, revenue, and business performance analytics',
        tags: ['sales', 'revenue', 'business', 'quarterly', 'growth', 'performance', 'kpi']
      },
      {
        id: 'healthcare', 
        name: 'Healthcare Analytics',
        icon: '🏥',
        description: 'Medical data, patient outcomes, and healthcare insights',
        tags: ['healthcare', 'medical', 'patients', 'satisfaction', 'clinical', 'health']
      },
      {
        id: 'marketing',
        name: 'Marketing Insights', 
        icon: '📈',
        description: 'Customer behavior, campaigns, and marketing performance',
        tags: ['marketing', 'campaigns', 'customers', 'conversion', 'engagement', 'advertising']
      },
      {
        id: 'ecommerce',
        name: 'E-commerce Analytics',
        icon: '🛒', 
        description: 'Online sales, conversion rates, and e-commerce optimization',
        tags: ['ecommerce', 'conversion', 'optimization', 'online', 'sales', 'retail']
      },
      {
        id: 'environment',
        name: 'Environmental Data',
        icon: '🌍',
        description: 'Climate, environmental, and sustainability analytics',
        tags: ['climate', 'environment', 'temperature', 'global', 'sustainability', 'carbon']
      }
    ];
  };

  const getStoriesForCollection = (collectionId: string) => {
    const collection = getCollections().find(c => c.id === collectionId);
    if (!collection) return [];
    
    return stories.filter(story => 
      story.tags.some(tag => collection.tags.includes(tag.toLowerCase()))
    );
  };


  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">📸 Data Feed</h1>
          <p className="page-description">Loading your data network...</p>
        </div>
        <div className="card">
          <div className="card-content" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)', opacity: 0.6 }}>📸</div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading data snaps from your network...</p>
          </div>
        </div>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">📸 Data Feed</h1>
          <p className="page-description">Your data network is empty • Be the first to share</p>
        </div>
        <div className="card">
          <div className="card-content" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)', opacity: 0.6 }}>📸</div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>Start Your Data Story</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
              {currentFile && csvData 
                ? `Snap and share insights from ${csvData.filename} • Create your first data story in seconds`
                : 'Upload data and snap your first insight • Share discoveries instantly with your network'
              }
            </p>
            <button
              onClick={() => {
                if (currentFile && csvData) {
                  // If they have data, take them to the Story page to create a story
                  onPageChange && onPageChange('story');
                } else {
                  // If no data, they need to upload first
                  onPageChange && onPageChange('upload');
                }
              }}
              style={{
                padding: 'var(--space-md) var(--space-xl)',
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              {currentFile && csvData ? '📸 Snap Insight' : '🚀 Start Snapping'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title" style={{backgroundColor: 'red', color: 'white', padding: '10px'}}>📸 TESTING - Data Feed</h1>
        <p className="page-description">Share data insights instantly • Discover stories from your network • Snapchat for Data</p>
      </div>

      {/* Community Stats & Leaderboard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
        {/* Community Stats */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🔥 Network Activity</h2>
          </div>
          <div className="card-content">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-lg)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                  {stories.length}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Data Snaps</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)' }}>
                  {stories.reduce((sum, s) => sum + s.likes, 0)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>❤️ Reactions</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--info)' }}>
                  {stories.reduce((sum, s) => sum + s.views, 0)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>👀 Views</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--warning)' }}>
                  {Math.round(stories.reduce((sum, s) => sum + s.qualityScore, 0) / stories.length || 0)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>⭐ Avg Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Contributors Leaderboard */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🏆 Top Contributors</h3>
          </div>
          <div className="card-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {stories
                .reduce((acc, story) => {
                  const existing = acc.find(u => u.authorId === story.authorId);
                  if (existing) {
                    existing.totalLikes += story.likes;
                    existing.totalViews += story.views;
                    existing.storyCount += 1;
                    existing.avgQuality = (existing.avgQuality * (existing.storyCount - 1) + story.qualityScore) / existing.storyCount;
                  } else {
                    acc.push({
                      authorId: story.authorId,
                      author: story.author,
                      authorAvatar: story.authorAvatar,
                      totalLikes: story.likes,
                      totalViews: story.views,
                      storyCount: 1,
                      avgQuality: story.qualityScore
                    });
                  }
                  return acc;
                }, [])
                .sort((a, b) => (b.totalLikes + b.totalViews * 0.1 + b.avgQuality * 0.5) - (a.totalLikes + a.totalViews * 0.1 + a.avgQuality * 0.5))
                .slice(0, 3)
                .map((contributor, index) => (
                  <div key={contributor.authorId} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    padding: 'var(--space-sm)',
                    background: index === 0 ? 'var(--accent-light)' : 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: index === 0 ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ fontSize: '1.5rem' }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: contributor.authorAvatar ? 'transparent' : 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: contributor.authorAvatar ? '1.5rem' : '1rem',
                      color: contributor.authorAvatar ? 'inherit' : 'white',
                      fontWeight: '600'
                    }}>
                      {contributor.authorAvatar || contributor.author.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        color: 'var(--text-primary)',
                        wordBreak: 'break-all',
                        overflowWrap: 'break-word',
                        lineHeight: '1.2',
                        maxWidth: '120px'
                      }}>
                        {cleanFirebaseId(contributor.author)}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        gap: 'var(--space-xs)'
                      }}>
                        <span>❤️ {contributor.totalLikes}</span>
                        <span>📚 {contributor.storyCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-content" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            {[
              { key: 'trending', label: '🔥 Trending Snaps', count: stories.length },
              { key: 'recent', label: '⏰ Latest Feed', count: stories.length },
              { key: 'featured', label: '🎆 Top Snaps', count: stories.filter(s => s.qualityScore >= 80).length },
              { key: 'collections', label: '📁 Snap Collections', count: getCollections().length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                style={{
                  padding: 'var(--space-md) var(--space-lg)',
                  background: activeTab === tab.key ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: activeTab === tab.key ? 'white' : 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)'
                }}
              >
                {tab.label}
                <span style={{
                  background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : 'var(--border-secondary)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '0.75rem'
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <input
              type="text"
              placeholder="Search data snaps, insights, creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-md)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Tag Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>
              Filter by tags:
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    background: selectedTags.includes(tag) ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: selectedTags.includes(tag) ? 'white' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  #{tag}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  style={{
                    padding: 'var(--space-xs) var(--space-sm)',
                    background: 'var(--error)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collections Grid (only shown when Collections tab is active) */}
      {activeTab === 'collections' && !selectedCollection && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card-header">
            <h2 className="card-title">Explore Story Collections</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
              Discover curated stories organized by topic and domain
            </p>
          </div>
          <div className="card-content">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: 'var(--space-lg)' 
            }}>
              {getCollections().map(collection => {
                const collectionStories = getStoriesForCollection(collection.id);
                return (
                  <div
                    key={collection.id}
                    onClick={() => setSelectedCollection(collection.id)}
                    style={{
                      padding: 'var(--space-lg)',
                      border: '2px solid var(--border-primary)',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--bg-elevated)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-primary)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ 
                      fontSize: '3rem', 
                      marginBottom: 'var(--space-md)' 
                    }}>
                      {collection.icon}
                    </div>
                    <h3 style={{
                      color: 'var(--text-primary)',
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      marginBottom: 'var(--space-sm)'
                    }}>
                      {collection.name}
                    </h3>
                    <p style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      lineHeight: '1.4',
                      marginBottom: 'var(--space-md)'
                    }}>
                      {collection.description}
                    </p>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 'var(--space-sm)'
                    }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {collectionStories.length} stories
                      </span>
                      <span style={{
                        color: 'var(--text-tertiary)',
                        fontSize: '0.75rem'
                      }}>
                        Click to explore
                      </span>
                    </div>
                  </div>
          );
        })}
      </div>
          </div>
        </div>
      )}

      {/* Collection Header (shown when viewing a specific collection) */}
      {activeTab === 'collections' && selectedCollection && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card-content">
            {(() => {
              const collection = getCollections().find(c => c.id === selectedCollection);
              return collection ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                    <div style={{ fontSize: '3rem' }}>{collection.icon}</div>
                    <div>
                      <h2 style={{
                        color: 'var(--text-primary)',
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        marginBottom: 'var(--space-xs)'
                      }}>
                        {collection.name}
                      </h2>
                      <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.875rem',
                        margin: 0
                      }}>
                        {collection.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCollection('')}
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)'
                    }}
                  >
                    ← Back to Collections
                  </button>
                </div>
              ) : null;
            })()} 
          </div>
        </div>
      )}

      {/* Share Story Action Button */}
      <div style={{ 
        position: 'fixed', 
        bottom: '2rem', 
        right: '2rem', 
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
        alignItems: 'flex-end'
      }}>
        <button
          onClick={() => {
            if (currentFile && csvData) {
              onPageChange && onPageChange('story');
            } else {
              onPageChange && onPageChange('upload');
            }
          }}
          style={{
            padding: 'var(--space-md) var(--space-lg)',
            background: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            transition: 'all var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
        >
          <span>📸</span>
          <span>{currentFile && csvData ? 'Snap & Share' : 'Snap First Insight'}</span>
        </button>
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          background: 'var(--bg-elevated)',
          padding: 'var(--space-xs) var(--space-sm)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          maxWidth: '200px',
          textAlign: 'center'
        }}>
          {currentFile && csvData 
            ? `Ready to snap from ${csvData.filename}`
            : 'Upload data • Snap insights • Share instantly'
          }
        </div>
      </div>

      {/* Story Feed */}
      <div style={{ display: 'grid', gap: 'var(--space-xl)' }}>
        {filteredStories.map((story) => (
          <div 
            key={story.id} 
            className="card" 
            style={{ 
              transition: 'all var(--transition-fast)',
              cursor: 'pointer'
            }}
            onClick={() => {
              // For now, clicking a story card will do nothing since we don't have a story viewer page
              // in the state-based navigation. You could add this as a new page type if needed.
            }}
          >
            <div className="card-content" style={{ padding: 'var(--space-xl)' }}>
              {/* Story Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '50%', 
                    background: story.authorAvatar ? 'transparent' : 'var(--accent-primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: story.authorAvatar ? 'inherit' : 'white',
                    fontWeight: '600',
                    fontSize: story.authorAvatar ? '2rem' : '1.25rem',
                    border: '2px solid var(--border-subtle)'
                  }}>
                    {story.authorAvatar || story.author.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
                      <span style={{ 
                        fontWeight: '600', 
                        color: 'var(--text-primary)',
                        wordBreak: 'break-all',
                        overflowWrap: 'break-word',
                        maxWidth: '200px',
                        display: 'inline-block',
                        lineHeight: '1.2'
                      }}>
                        {cleanFirebaseId(story.author)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {formatDate(story.createdAt)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <span style={{ fontSize: '1.5rem' }}>{getStoryTypeIcon(story.storyType)}</span>
                  <span style={{
                    padding: '2px 8px',
                    background: getQualityColor(story.qualityScore),
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {story.qualityScore}/100
                  </span>
                </div>
              </div>

              {/* Story Content */}
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ 
                  color: 'var(--text-primary)', 
                  marginBottom: 'var(--space-md)',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  lineHeight: '1.4'
                }}>
                  {story.title}
                </h3>
                <p style={{ 
                  color: 'var(--text-secondary)', 
                  lineHeight: '1.6',
                  marginBottom: 'var(--space-md)'
                }}>
                  {story.summary}
                </p>
              </div>

              {/* Tags */}
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                  {story.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-tertiary)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Engagement Stats */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
                  {/* Like button */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation(); // Prevent navigation to story
                      if (!user || !isAuthenticated) {
                        setShowSignInModal(true);
                        return;
                      }
                      try {
                        await hybridStoryStorage.likeStoryWithUser(story.id, user.id);
                        // Real-time updates will handle UI updates automatically
                      } catch (error) {
                        console.error('Failed to like story:', error);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      color: 'var(--text-secondary)', // We'll update this with async check below
                      fontSize: '0.875rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 'var(--space-xs)',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'all var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      if (user && isAuthenticated) {
                        e.currentTarget.style.color = 'var(--error)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (user && isAuthenticated) {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    <span>❤️</span>
                    <span>{formatNumber(story.likes)}</span>
                  </button>
                  
                  {/* Comments - navigate to story */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent navigation to story
                      // For now, comments navigation is disabled since we don't have story viewer in state-based nav
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 'var(--space-xs)',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'all var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--accent-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <span>💬</span>
                    <span>{formatNumber(story.comments)}</span>
                  </button>
                  
                  {/* Views */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation(); // Prevent navigation to story
                      try {
                        await hybridStoryStorage.incrementViews(story.id);
                        // Real-time updates will handle UI updates automatically
                      } catch (error) {
                        console.error('Failed to increment views:', error);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 'var(--space-xs)',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'all var(--transition-fast)'
                    }}
                    title={`${story.views} views - Click to view story`}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--info)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <span>👀</span>
                    <span>{formatNumber(story.views)}</span>
                  </button>
                  
                  {/* Share button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent navigation to story
                      if (navigator.share) {
                        navigator.share({
                          title: story.title,
                          text: story.summary,
                          url: `${window.location.origin}/share/${story.id}`
                        });
                      } else {
                        // Fallback - copy to clipboard
                        navigator.clipboard.writeText(`${window.location.origin}/share/${story.id}`);
                        // You could add a toast notification here
                        alert('Link copied to clipboard!');
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 'var(--space-xs)',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'all var(--transition-fast)'
                    }}
                    title="Share this story"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--accent-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <span>🔗</span>
                    <span>Share</span>
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <span style={{
                    padding: '2px 8px',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-tertiary)',
                    borderRadius: '12px',
                    fontSize: '0.75rem'
                  }}>
                    Story #{story.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {filteredStories.length === 0 && (searchQuery || selectedTags.length > 0) && (
        <div className="card">
          <div className="card-content" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)', opacity: 0.6 }}>🔍</div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>No Stories Found</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
              No stories match your current filters. Try adjusting your search or clearing filters to see all stories.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer'
                  }}
                >
                  Clear search
                </button>
              )}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'var(--error)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer'
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Sign In Modal */}
      <FirebaseSignInModal 
        isOpen={showSignInModal} 
        onClose={() => setShowSignInModal(false)} 
      />
    </div>
  );
}
