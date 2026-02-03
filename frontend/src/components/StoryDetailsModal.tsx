import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, Eye, MessageCircle, Share2, Calendar } from 'lucide-react';
import { CommunityStory } from '../types';
import { hybridStoryStorage } from '../services/hybridStoryStorage';
import { useUser } from '../contexts/UserContext';
import { FirebaseSignInModal } from './FirebaseSignInModal';

interface StoryDetailsModalProps {
  isOpen: boolean;
  storyId: string;
  onClose: () => void;
}

export function StoryDetailsModal({ isOpen, storyId, onClose }: StoryDetailsModalProps) {
  const { user, isAuthenticated } = useUser();
  const [story, setStory] = useState<CommunityStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (isOpen && storyId) {
      loadStoryDetails();
    }
  }, [isOpen, storyId]);

  const loadStoryDetails = async () => {
    setLoading(true);
    try {
      const storyDetails = await hybridStoryStorage.getStory(storyId);
      if (storyDetails) {
        setStory(storyDetails);
        // Check if user has liked this story
        if (user && isAuthenticated) {
          const hasLiked = await hybridStoryStorage.hasUserLikedStory(storyId, user.id);
          setIsLiked(hasLiked);
        }
      }
    } catch (error) {
      console.error('Failed to load story details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user || !isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    try {
      // For unlike, we'll need to check if user already liked it
      // and toggle the like state by calling likeStoryWithUser which should handle toggling
      if (isLiked) {
        // Toggle by calling likeStoryWithUser again (assuming it toggles)
        // In a real implementation, you'd want a proper unlike method
        setIsLiked(false);
        setStory(prev => prev ? { ...prev, likes: Math.max(0, prev.likes - 1) } : null);
      } else {
        await hybridStoryStorage.likeStoryWithUser(storyId, user.id);
        setIsLiked(true);
        setStory(prev => prev ? { ...prev, likes: prev.likes + 1 } : null);
      }
    } catch (error) {
      console.error('Failed to like/unlike story:', error);
    }
  };

  const handleShare = () => {
    if (story && navigator.share) {
      navigator.share({
        title: story.title,
        text: story.summary,
        url: window.location.href
      }).catch(() => {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href);
      });
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Recently';
    }
  };

  if (!isOpen) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    console.error('Modal root not found');
    return null;
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}
      >
        {/* Modal Content */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            border: '1px solid var(--border-primary)',
            boxShadow: 'var(--shadow-xl)'
          }}
        >
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📸</div>
              <p style={{ color: 'var(--text-secondary)' }}>Loading story...</p>
            </div>
          ) : !story ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📸</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Story Not Found</h3>
              <p style={{ color: 'var(--text-secondary)' }}>This story may have been deleted or is no longer available.</p>
              <button
                onClick={onClose}
                style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{
                padding: '2rem',
                borderBottom: '1px solid var(--border-primary)',
                position: 'sticky',
                top: 0,
                background: 'var(--bg-secondary)',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h2 style={{
                      color: 'var(--text-primary)',
                      fontSize: '1.75rem',
                      fontWeight: '600',
                      margin: '0 0 0.5rem 0',
                      lineHeight: '1.3'
                    }}>
                      {story.title}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
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
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {story.author || 'Anonymous'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <Calendar size={14} />
                        <span>{formatDate(story.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Story Stats */}
                <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={handleLike}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: isLiked ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                      border: `1px solid ${isLiked ? '#ef4444' : 'var(--border-primary)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: user && isAuthenticated ? 'pointer' : 'not-allowed',
                      color: isLiked ? '#ef4444' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                      opacity: user && isAuthenticated ? 1 : 0.7
                    }}
                  >
                    <Heart size={16} fill={isLiked ? '#ef4444' : 'none'} />
                    <span>{story.likes}</span>
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Eye size={16} />
                    <span>{story.views}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <MessageCircle size={16} />
                    <span>{story.comments || 0}</span>
                  </div>
                  <button
                    onClick={handleShare}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: 'transparent',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <Share2 size={16} />
                    <span>Share</span>
                  </button>
                </div>
              </div>

              {/* Story Content */}
              <div style={{ padding: '2rem' }}>
                <div style={{
                  color: 'var(--text-secondary)',
                  lineHeight: '1.8',
                  marginBottom: '2rem',
                  fontSize: '1rem'
                }}>
                  {story.summary}
                </div>

                {/* Tags */}
                {story.tags && story.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
                    {story.tags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          padding: '0.375rem 0.75rem',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quality Score */}
                {story.qualityScore > 0 && (
                  <div style={{
                    padding: '1rem',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)',
                    marginBottom: '2rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Data Quality Score</span>
                      <span style={{
                        fontFamily: 'var(--font-family-mono)',
                        fontWeight: '600',
                        color: 'var(--accent-primary)',
                        fontSize: '1.25rem'
                      }}>
                        {story.qualityScore}/100
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sign In Modal */}
      {showSignInModal && (
        <FirebaseSignInModal
          isOpen={showSignInModal}
          onClose={() => setShowSignInModal(false)}
        />
      )}
    </>,
    modalRoot
  );
}

