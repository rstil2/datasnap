import React, { useState, useEffect } from 'react';
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
  const [stories, setStories] = useState<CommunityStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'trending' | 'popular'>('recent');
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());

  // Helper function to get human-readable time ago
  const getTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'recently';
    }
  };

  // Track story view when it's displayed
  const trackStoryView = async (storyId: string) => {
    if (!user || !isAuthenticated) return;
    
    try {
      await hybridStoryStorage.incrementStoryViews(storyId, user.id);
    } catch (error) {
      console.error('Failed to track story view:', error);
    }
  };

  // Generate a unique but readable user ID from email or Firebase data
  const generateUserDisplayId = (authorId: string, authorEmail?: string) => {
    // If we have an email, use the part before @ and add a short hash
    if (authorEmail && authorEmail.includes('@')) {
      const emailPrefix = authorEmail.split('@')[0];
      // Clean up the email prefix
      const cleanPrefix = emailPrefix
        .replace(/[._-]/g, '')
        .replace(/\d+/g, '') // Remove numbers
        .substring(0, 8); // Take first 8 characters
      
      // Generate a short hash from the full authorId for uniqueness
      const hash = authorId.substring(0, 4);
      return `${cleanPrefix}${hash}`;
    }
    
    // If no email but we have author ID, create a readable ID
    if (authorId) {
      return `user${authorId.substring(0, 6)}`;
    }
    
    // Final fallback
    return 'anonymous';
  };

  useEffect(() => {
    loadStories();
    const unsubscribe = hybridStoryStorage.onStoriesChange((updatedStories) => {
      setStories(updatedStories);
      setLoading(false);
    }, activeTab);
    return () => unsubscribe();
  }, [activeTab]);

  // Track views for stories that are displayed
  useEffect(() => {
    if (user && isAuthenticated && stories.length > 0) {
      stories.forEach(story => {
        if (!viewedStories.has(story.id)) {
          // Track view after a delay
          setTimeout(() => {
            trackStoryView(story.id);
            setViewedStories(prev => new Set([...prev, story.id]));
          }, 1000);
        }
      });
    }
  }, [stories, user?.id, isAuthenticated, viewedStories]);

  const loadStories = async () => {
    setLoading(true);
    try {
      const communityStories = await hybridStoryStorage.getCommunityStories(activeTab);
      setStories(communityStories);
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Recently';
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
            <p style={{ color: 'var(--text-secondary)' }}>Loading community stories...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📸 Data Feed</h1>
        <p className="page-description">Share data insights instantly • Discover stories from your network</p>
      </div>

      {/* Filtering Tabs */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.5rem',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-primary)'
        }}>
          {[
            { key: 'recent' as const, label: 'Recent', icon: '🕒', description: 'Latest stories' },
            { key: 'trending' as const, label: 'Trending', icon: '🔥', description: 'Most viewed recently' },
            { key: 'popular' as const, label: 'Popular', icon: '❤️', description: 'Most liked stories' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setLoading(true);
              }}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: activeTab === tab.key ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: activeTab === tab.key ? '600' : '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
              title={tab.description}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {activeTab === tab.key && (
                <div style={{
                  marginLeft: '0.25rem',
                  padding: '0.125rem 0.375rem',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '0.75rem',
                  fontSize: '0.625rem',
                  fontWeight: '600'
                }}>
                  {stories.length}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Publish Button */}
      <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
        <button
          onClick={() => {
            if (currentFile && csvData) {
              onPageChange && onPageChange('story');
            } else {
              onPageChange && onPageChange('upload');
            }
          }}
          style={{
            padding: '1rem 1.5rem',
            background: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>📸</span>
          <span>{currentFile ? 'Share Story' : 'Upload & Share'}</span>
        </button>
      </div>

      {/* Story Feed */}
      <div style={{ display: 'grid', gap: '2rem' }}>
        {stories.length === 0 ? (
          <div className="card">
            <div className="card-content" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📸</div>
              <h3>No Stories Yet</h3>
              <p>Be the first to share a data story with the community!</p>
            </div>
          </div>
        ) : (
          stories.map((story, index) => (
            <div
                key={story.id} 
                className="card"
                style={{
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = '';
                }}
                onClick={() => {
                  // TODO: Open story details modal
                  console.log('Story clicked:', story.title);
                }}
              >
                <div className="card-content" style={{ padding: '2rem' }}>
                {/* Story Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600'
                  }}>
                    👤
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      @{generateUserDisplayId(story.authorId || '', story.authorEmail)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {formatDate(story.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Story Content */}
                <h3 style={{ 
                  color: 'var(--text-primary)', 
                  marginBottom: '1rem',
                  fontSize: '1.25rem',
                  fontWeight: '600'
                }}>
                  {story.title}
                </h3>
                <p style={{ 
                  color: 'var(--text-secondary)', 
                  lineHeight: '1.6',
                  marginBottom: '1rem'
                }}>
                  {story.summary}
                </p>

                {/* Story Stats */}
                <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!user || !isAuthenticated) {
                        setShowSignInModal(true);
                        return;
                      }
                      try {
                        await hybridStoryStorage.likeStoryWithUser(story.id, user.id);
                        // Optimistically update the UI
                        setStories(prev => prev.map(s => 
                          s.id === story.id 
                            ? { ...s, likes: s.likes + 1 }
                            : s
                        ));
                      } catch (error) {
                        console.error('Failed to like story:', error);
                        // Revert optimistic update on error
                        setStories(prev => prev.map(s => 
                          s.id === story.id 
                            ? { ...s, likes: Math.max(0, s.likes - 1) }
                            : s
                        ));
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (user && isAuthenticated) {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.color = '#ef4444';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: user && isAuthenticated ? 'pointer' : 'not-allowed',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      borderRadius: '0.5rem',
                      transition: 'all 0.2s ease',
                      opacity: user && isAuthenticated ? 1 : 0.7
                    }}
                    title={user && isAuthenticated ? 'Like this story' : 'Sign in to like stories'}
                  >
                    <span>❤️</span>
                    <span>{story.likes}</span>
                  </button>
                  
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    title="Story views"
                  >
                    <span>👀</span>
                    <span>{story.views}</span>
                  </div>
                  
                  {story.qualityScore > 0 && (
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      title={`Data quality score: ${story.qualityScore}/100`}
                    >
                      <span>⭐</span>
                      <span>{story.qualityScore}/100</span>
                    </div>
                  )}
                  
                  {/* Add story age */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      marginLeft: 'auto',
                      fontSize: '0.75rem'
                    }}
                  >
                    <span>{getTimeAgo(story.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sign In Modal */}
      {showSignInModal && (
        <FirebaseSignInModal 
          isOpen={showSignInModal} 
          onClose={() => setShowSignInModal(false)} 
        />
      )}
    </div>
  );
}