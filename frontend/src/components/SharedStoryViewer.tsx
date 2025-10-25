import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Eye, Share2, ArrowLeft, Clock, User, Tag } from 'lucide-react';
import { storyStorage, StoredStory, Comment } from '../services/storyStorage';
import { useUser } from '../contexts/UserContext';
import { SignInModal } from './SignInModal';
import { ThreadedComments } from './ThreadedComments';
import { ToastContainer } from './Toast';
import { CommentControls, CommentSortOption, CommentFilters } from './CommentControls';
import { realtimeUpdates, StoryUpdateEvent, CommentUpdateEvent } from '../services/realtimeUpdates';
import { toastService } from '../services/toast';
import {
  getAllAuthors,
  getTotalCommentCount,
  getFilteredAndSortedComments
} from '../utils/commentUtils';

export function SharedStoryViewer() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUser();
  const [story, setStory] = useState<StoredStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [topLevelComments, setTopLevelComments] = useState<Comment[]>([]);
  const [commentReplies, setCommentReplies] = useState<Record<string, Comment[]>>({});
  const [commentSortBy, setCommentSortBy] = useState<CommentSortOption>('newest');
  const [commentFilters, setCommentFilters] = useState<CommentFilters>({
    search: '',
    author: '',
    dateRange: 'all',
    minLikes: 0
  });

  useEffect(() => {
    if (!storyId) {
      setError('No story ID provided');
      setLoading(false);
      return;
    }

    try {
      const loadedStory = storyStorage.getStory(storyId);
      if (!loadedStory) {
        setError('Story not found');
      } else if (!loadedStory.isPublic) {
        setError('This story is not publicly available');
      } else {
        setStory(loadedStory);
        
        // Check if current user has liked this story
        if (user && isAuthenticated) {
          setIsLiked(storyStorage.hasUserLikedStory(storyId, user.id));
          // Increment view count with user tracking
          storyStorage.incrementViewsWithUser(storyId, user.id);
        } else {
          // Fallback for non-authenticated users
          storyStorage.incrementViews(storyId);
        }
      }
    } catch (err) {
      setError('Failed to load story');
    } finally {
      setLoading(false);
    }
  }, [storyId, user, isAuthenticated]);

  // Function to refresh threaded comments from storage
  const refreshThreadedComments = () => {
    if (!storyId) return;
    const { topLevel, replies } = storyStorage.getThreadedComments(storyId);
    setTopLevelComments(topLevel);
    setCommentReplies(replies);
  };

  // Load threaded comments when story changes
  useEffect(() => {
    if (story) {
      refreshThreadedComments();
    }
  }, [story, storyId]);

  // Subscribe to real-time updates for this story
  useEffect(() => {
    if (!storyId || !story) return;

    // Subscribe to story updates (likes, comments, views)
    const unsubscribeStory = realtimeUpdates.subscribeToStory(storyId, (event: StoryUpdateEvent) => {
      setStory(prevStory => {
        if (!prevStory) return null;
        
        const updatedStory = { ...prevStory };
        
        // Update based on event type
        if (event.type === 'like' && event.data.likes !== undefined) {
          updatedStory.likes = event.data.likes;
          if (event.data.likedBy) {
            updatedStory.likedBy = event.data.likedBy;
            // Update isLiked state if current user is involved
            if (user) {
              setIsLiked(event.data.likedBy.includes(user.id));
            }
          }
        } else if (event.type === 'comment' && event.data.comments !== undefined) {
          updatedStory.comments = [...updatedStory.comments];
          if (event.data.newComment) {
            // Add the new comment if not already present
            const commentExists = updatedStory.comments.some(c => c.id === event.data.newComment.id);
            if (!commentExists) {
              updatedStory.comments.push(event.data.newComment);
            }
          }
          // Refresh threaded comments when new comments are added
          refreshThreadedComments();
        } else if (event.type === 'view' && event.data.views !== undefined) {
          updatedStory.views = event.data.views;
          if (event.data.viewedBy) {
            updatedStory.viewedBy = event.data.viewedBy;
          }
        }
        
        return updatedStory;
      });
    });

    // Subscribe to comment updates (comment likes)
    const unsubscribeComments = realtimeUpdates.subscribeToComments(storyId, (event: CommentUpdateEvent) => {
      setStory(prevStory => {
        if (!prevStory) return null;
        
        const updatedStory = { ...prevStory };
        const updatedComments = [...updatedStory.comments];
        
        const commentIndex = updatedComments.findIndex(c => c.id === event.commentId);
        if (commentIndex !== -1 && event.type === 'like') {
          updatedComments[commentIndex] = {
            ...updatedComments[commentIndex],
            likes: event.data.likes,
            likedBy: event.data.likedBy
          };
          updatedStory.comments = updatedComments;
          // Refresh threaded comments to update like counts
          refreshThreadedComments();
        }
        
        return updatedStory;
      });
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeStory();
      unsubscribeComments();
    };
  }, [storyId, story, user]);

  const handleLike = () => {
    if (!story) return;
    
    // Check if user is authenticated
    if (!user || !isAuthenticated) {
      setShowSignInModal(true);
      return;
    }
    
    storyStorage.likeStoryWithUser(story.id, user.id);
    // Real-time updates will handle the UI changes
  };

  const handleAddComment = () => {
    if (!story || !newComment.trim()) return;
    
    // Check if user is authenticated
    if (!user || !isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    const commentId = storyStorage.addCommentWithUser(story.id, newComment.trim(), user);
    if (commentId) {
      setNewComment('');
      // Refresh threaded comments to show the new comment
      refreshThreadedComments();
      toastService.commentAdded();
      // Real-time updates will handle adding the comment to the UI
    } else {
      toastService.commentError('add comment');
    }
  };

  const handleReply = (parentId: string, content: string) => {
    if (!story || !content.trim()) return;
    
    // Check if user is authenticated
    if (!user || !isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    const commentId = storyStorage.addCommentWithUser(story.id, content.trim(), user, parentId);
    if (commentId) {
      // Refresh threaded comments to show the new reply
      refreshThreadedComments();
      toastService.replyAdded();
      // Real-time updates will handle adding the comment to the UI
    } else {
      toastService.commentError('add reply');
    }
  };

  const handleShare = async () => {
    if (!story) return;

    const shareUrl = window.location.href;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      // Show success feedback (could add toast notification)

    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'var(--error)';
      case 'high': return 'var(--warning)';
      case 'medium': return 'var(--accent-primary)';
      default: return 'var(--text-secondary)';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner" style={{ margin: '0 auto var(--space-md) auto' }}></div>
          <p className="text-secondary">Loading story...</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-xl">
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>📊</div>
          <h1 className="text-xl font-bold mb-md text-primary">Story Not Found</h1>
          <p className="text-secondary mb-xl">{error || 'The story you are looking for does not exist or is no longer available.'}</p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            <ArrowLeft size={16} />
            Back to DataSnap
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-primary)',
        padding: 'var(--space-lg) 0'
      }}>
        <div className="max-w-4xl mx-auto px-xl flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-sm text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft size={20} />
            Back to DataSnap
          </button>
          
          <div className="flex items-center gap-md">
            <button
              onClick={handleLike}
              className={`flex items-center gap-xs px-md py-sm rounded-md transition-all ${
                isLiked ? 'bg-red-100 text-red-600' : 'hover:bg-tertiary text-secondary'
              }`}
            >
              <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
              {story.likes}
            </button>
            
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-xs px-md py-sm rounded-md hover:bg-tertiary text-secondary transition-colors"
            >
              <MessageCircle size={16} />
              {story.comments.length}
            </button>
            
            <div className="flex items-center gap-xs text-tertiary">
              <Eye size={16} />
              {story.views}
            </div>
            
            <button
              onClick={handleShare}
              className="flex items-center gap-xs px-md py-sm rounded-md hover:bg-tertiary text-secondary transition-colors"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-xl py-2xl">
        {/* Story Header */}
        <div className="mb-2xl">
          <div className="flex items-center gap-md mb-md text-sm text-tertiary">
            <div className="flex items-center gap-xs">
              {story.authorAvatar ? (
                <div style={{ 
                  fontSize: '1.25rem',
                  marginRight: 'var(--space-xs)'
                }}>
                  {story.authorAvatar}
                </div>
              ) : (
                <User size={14} />
              )}
              {story.author}
            </div>
            <div className="flex items-center gap-xs">
              <Clock size={14} />
              {formatDate(story.createdAt)}
            </div>
            <div className="px-sm py-xs bg-elevated rounded text-xs font-mono">
              Quality: {story.metadata.data_quality_score.toFixed(1)}/100
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-primary mb-md">
            {story.title}
          </h1>
          
          {story.tags.length > 0 && (
            <div className="flex flex-wrap gap-xs mb-lg">
              {story.tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-xs px-sm py-xs bg-elevated text-xs rounded border"
                >
                  <Tag size={12} />
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="text-lg text-secondary leading-relaxed">
            {story.summary}
          </div>
        </div>

        {/* Main Narrative */}
        <div className="card mb-xl">
          <div className="card-header">
            <h3 className="card-title">Detailed Analysis</h3>
            <span className="text-sm text-tertiary font-mono">
              {story.metadata.narrative_style} narrative
            </span>
          </div>
          <div className="card-content">
            <div className="whitespace-pre-wrap leading-relaxed text-primary">
              {story.narrative}
            </div>
          </div>
        </div>

        {/* Key Insights */}
        {story.key_insights && story.key_insights.length > 0 && (
          <div className="card mb-xl">
            <div className="card-header">
              <h3 className="card-title">Key Insights</h3>
            </div>
            <div className="card-content">
              <div className="grid gap-md">
                {story.key_insights.map((insight, index) => {
                  const priorityColor = getPriorityColor(insight.priority);
                  const confidenceIcon = insight.confidence === 'high' ? '🔴' :
                                        insight.confidence === 'medium' ? '🟡' : '⚪';
                  
                  return (
                    <div key={index} className="bg-elevated p-lg rounded-md border">
                      <div className="flex justify-between items-start mb-md">
                        <h4 className="font-semibold text-primary">
                          {insight.title}
                        </h4>
                        <div className="flex items-center gap-xs">
                          <span style={{ fontSize: '0.75rem' }} title={`${insight.confidence} confidence`}>
                            {confidenceIcon}
                          </span>
                          <span 
                            className="px-xs py-xs rounded text-xs font-medium text-white"
                            style={{ backgroundColor: priorityColor }}
                          >
                            {insight.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <p className="text-secondary leading-relaxed">
                        {insight.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {story.recommendations && story.recommendations.length > 0 && (
          <div className="card mb-xl">
            <div className="card-header">
              <h3 className="card-title">Strategic Recommendations</h3>
            </div>
            <div className="card-content">
              <div className="grid gap-md">
                {story.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-md p-md bg-elevated rounded-md border">
                    <div className="w-6 h-6 bg-success text-white rounded-full flex items-center justify-center text-sm font-semibold flex-none mt-xs">
                      {index + 1}
                    </div>
                    <div className="text-primary leading-relaxed">
                      {recommendation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Comments Section */}
        {showComments && (() => {
          const authors = getAllAuthors(topLevelComments, commentReplies);
          const totalComments = getTotalCommentCount(topLevelComments, commentReplies);
          const { filteredTopLevel, filteredReplies } = getFilteredAndSortedComments(
            topLevelComments,
            commentReplies,
            commentFilters,
            commentSortBy
          );
          
          return (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Discussion</h3>
              </div>
              <div className="card-content">
                {/* Add Comment */}
                <div className="mb-lg">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts about this analysis..."
                    className="w-full p-md border rounded-md bg-tertiary text-primary resize-none"
                    rows={3}
                    style={{
                      border: '1px solid var(--border-primary)',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <div className="flex justify-end mt-sm">
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Post Comment
                    </button>
                  </div>
                </div>

                {/* Comment Controls */}
                {totalComments > 0 && (
                  <CommentControls
                    totalComments={totalComments}
                    sortBy={commentSortBy}
                    onSortChange={setCommentSortBy}
                    filters={commentFilters}
                    onFiltersChange={setCommentFilters}
                    authors={authors}
                  />
                )}

                {/* Threaded Comments */}
                <ThreadedComments
                  storyId={story.id}
                  topLevelComments={filteredTopLevel}
                  replies={filteredReplies}
                  onReply={handleReply}
                  onCommentUpdate={refreshThreadedComments}
                />
              </div>
            </div>
          );
        })()}
      </div>
      
      {/* Sign In Modal */}
      <SignInModal 
        isOpen={showSignInModal} 
        onClose={() => setShowSignInModal(false)} 
      />
      
      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
