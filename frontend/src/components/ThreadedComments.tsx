import { useState, useEffect } from 'react';
import { Heart, Reply, Edit2, Trash2, MoreHorizontal, Link } from 'lucide-react';
import { Comment } from '../services/storyStorage';
import { useUser } from '../contexts/UserContext';
import { storyStorage } from '../services/storyStorage';
import { toastService } from '../services/toast';
import { getCommentPermalink, parseCommentIdFromHash } from '../utils/commentUtils';

interface ThreadedCommentsProps {
  storyId: string;
  topLevelComments: Comment[];
  replies: Record<string, Comment[]>;
  onReply: (parentId: string, content: string) => void;
  onCommentUpdate: () => void;
}

interface CommentItemProps {
  comment: Comment;
  storyId: string;
  replies?: Comment[];
  level?: number;
  onReply: (parentId: string, content: string) => void;
  onCommentUpdate: () => void;
}

function CommentItem({ 
  comment, 
  storyId, 
  replies = [], 
  level = 0, 
  onReply, 
  onCommentUpdate 
}: CommentItemProps) {
  const { user, isAuthenticated } = useUser();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showMenu, setShowMenu] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);

  const isAuthor = user && comment.authorId === user.id;
  const hasLiked = user && storyStorage.hasUserLikedComment(storyId, comment.id, user.id);
  const maxLevel = 3; // Maximum nesting level

  // Check if this comment should be highlighted from URL hash
  useEffect(() => {
    const commentIdFromHash = parseCommentIdFromHash();
    if (commentIdFromHash === comment.id) {
      setIsHighlighted(true);
      // Scroll to comment
      const commentElement = document.getElementById(`comment-${comment.id}`);
      if (commentElement) {
        commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Remove highlight after animation
      setTimeout(() => setIsHighlighted(false), 3000);
    }
  }, [comment.id]);

  const handleLike = () => {
    if (!user || !isAuthenticated) return;
    const wasLiked = hasLiked;
    storyStorage.likeComment(storyId, comment.id, user.id);
    
    // Show toast notification
    if (wasLiked) {
      toastService.commentUnliked();
    } else {
      toastService.commentLiked();
    }
  };

  const handleReply = () => {
    if (!replyContent.trim()) return;
    onReply(comment.id, replyContent.trim());
    setReplyContent('');
    setShowReplyBox(false);
    toastService.replyAdded();
  };

  const handleEdit = () => {
    if (!user || !editContent.trim()) return;
    const success = storyStorage.editComment(storyId, comment.id, editContent.trim(), user.id);
    if (success) {
      setIsEditing(false);
      onCommentUpdate();
      toastService.commentEdited();
    } else {
      toastService.commentError('edit comment');
    }
  };

  const handleDelete = () => {
    if (!user || !confirm('Are you sure you want to delete this comment?')) return;
    const success = storyStorage.deleteComment(storyId, comment.id, user.id);
    if (success) {
      onCommentUpdate();
      toastService.commentDeleted();
    } else {
      toastService.commentError('delete comment');
    }
  };

  const handleCopyPermalink = async () => {
    const permalink = getCommentPermalink(comment.id);
    try {
      await navigator.clipboard.writeText(permalink);
      toastService.success('Comment link copied to clipboard');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = permalink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toastService.success('Comment link copied to clipboard');
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ marginLeft: level > 0 ? `${Math.min(level, maxLevel) * 24}px` : '0' }}>
      <div 
        id={`comment-${comment.id}`}
        style={{
          padding: 'var(--space-md)',
          marginBottom: 'var(--space-sm)',
          background: isHighlighted 
            ? 'rgba(var(--accent-primary-rgb), 0.1)' 
            : level > 0 ? 'var(--bg-elevated)' : 'transparent',
          borderRadius: level > 0 ? 'var(--radius-md)' : '0',
          borderLeft: level > 0 ? '2px solid var(--border-subtle)' : 'none',
          border: isHighlighted ? '2px solid var(--accent-primary)' : 'none',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--space-md)' }}>
          {/* Author avatar */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: comment.authorAvatar ? 'transparent' : 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: comment.authorAvatar ? '1.25rem' : '0.875rem',
            color: comment.authorAvatar ? 'inherit' : 'white',
            fontWeight: '600',
            border: '1px solid var(--border-subtle)',
            flexShrink: 0
          }}>
            {comment.authorAvatar || comment.author.charAt(0).toUpperCase()}
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Comment header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: 'var(--space-sm)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span style={{ 
                  fontWeight: '600', 
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}>
                  {comment.author}
                </span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--text-tertiary)' 
                }}>
                  {formatDate(comment.createdAt)}
                  {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                    <span style={{ fontStyle: 'italic' }}> (edited)</span>
                  )}
                </span>
              </div>

              {/* Comment menu */}
              {isAuthor && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 'var(--space-xs)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  
                  {showMenu && (
                    <>
                      <div
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 10
                        }}
                        onClick={() => setShowMenu(false)}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 20,
                        minWidth: '120px'
                      }}>
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          style={{
                            width: '100%',
                            padding: 'var(--space-sm) var(--space-md)',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-xs)'
                          }}
                        >
                          <Edit2 size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            handleDelete();
                            setShowMenu(false);
                          }}
                          style={{
                            width: '100%',
                            padding: 'var(--space-sm) var(--space-md)',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            color: 'var(--error)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-xs)'
                          }}
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Comment content */}
            {isEditing ? (
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-sm)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                    minHeight: '60px'
                  }}
                  autoFocus
                />
                <div style={{ 
                  display: 'flex', 
                  gap: 'var(--space-sm)', 
                  marginTop: 'var(--space-sm)' 
                }}>
                  <button
                    onClick={handleEdit}
                    disabled={!editContent.trim()}
                    style={{
                      padding: 'var(--space-xs) var(--space-sm)',
                      background: 'var(--accent-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: editContent.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '0.75rem',
                      opacity: editContent.trim() ? 1 : 0.5
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                    style={{
                      padding: 'var(--space-xs) var(--space-sm)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p style={{
                color: 'var(--text-secondary)',
                lineHeight: '1.5',
                marginBottom: 'var(--space-md)',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap'
              }}>
                {comment.content}
              </p>
            )}
            
            {/* Comment actions */}
            {!isEditing && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--space-md)' 
              }}>
                <button
                  onClick={handleLike}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    color: hasLiked ? 'var(--error)' : 'var(--text-tertiary)',
                    padding: 'var(--space-xs)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <Heart size={12} fill={hasLiked ? 'currentColor' : 'none'} />
                  {comment.likes > 0 && <span>{comment.likes}</span>}
                </button>
                
                {level < maxLevel && (
                  <button
                    onClick={() => setShowReplyBox(!showReplyBox)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      color: 'var(--text-tertiary)',
                      padding: 'var(--space-xs)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <Reply size={12} />
                    Reply
                  </button>
                )}
                
                <button
                  onClick={handleCopyPermalink}
                  title="Copy link to comment"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    color: 'var(--text-tertiary)',
                    padding: 'var(--space-xs)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <Link size={12} />
                </button>
              </div>
            )}
            
            {/* Reply box */}
            {showReplyBox && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  style={{
                    width: '100%',
                    padding: 'var(--space-sm)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                    minHeight: '60px'
                  }}
                  autoFocus
                />
                <div style={{ 
                  display: 'flex', 
                  gap: 'var(--space-sm)', 
                  marginTop: 'var(--space-sm)' 
                }}>
                  <button
                    onClick={handleReply}
                    disabled={!replyContent.trim()}
                    style={{
                      padding: 'var(--space-xs) var(--space-sm)',
                      background: 'var(--accent-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: replyContent.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '0.75rem',
                      opacity: replyContent.trim() ? 1 : 0.5
                    }}
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => {
                      setShowReplyBox(false);
                      setReplyContent('');
                    }}
                    style={{
                      padding: 'var(--space-xs) var(--space-sm)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Render replies */}
      {replies.length > 0 && (
        <div style={{ marginTop: 'var(--space-sm)' }}>
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              storyId={storyId}
              replies={[]} // No nested replies beyond maxLevel
              level={level + 1}
              onReply={onReply}
              onCommentUpdate={onCommentUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ThreadedComments({ 
  storyId, 
  topLevelComments, 
  replies, 
  onReply, 
  onCommentUpdate 
}: ThreadedCommentsProps) {
  if (topLevelComments.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: 'var(--space-2xl)', 
        color: 'var(--text-tertiary)' 
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>💬</div>
        <p>No comments yet. Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div>
      {topLevelComments.map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          storyId={storyId}
          replies={replies[comment.id] || []}
          level={0}
          onReply={onReply}
          onCommentUpdate={onCommentUpdate}
        />
      ))}
    </div>
  );
}