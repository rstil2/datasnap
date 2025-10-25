import { Comment } from '../services/storyStorage';
import { CommentFilters, CommentSortOption } from '../components/CommentControls';

export function filterComments(
  comments: Comment[], 
  filters: CommentFilters
): Comment[] {
  return comments.filter(comment => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesContent = comment.content.toLowerCase().includes(searchLower);
      const matchesAuthor = comment.author.toLowerCase().includes(searchLower);
      if (!matchesContent && !matchesAuthor) {
        return false;
      }
    }

    // Author filter
    if (filters.author && comment.author !== filters.author) {
      return false;
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const commentDate = new Date(comment.createdAt);
      const now = new Date();
      const timeDiff = now.getTime() - commentDate.getTime();
      
      switch (filters.dateRange) {
        case 'today':
          if (timeDiff > 24 * 60 * 60 * 1000) return false;
          break;
        case 'week':
          if (timeDiff > 7 * 24 * 60 * 60 * 1000) return false;
          break;
        case 'month':
          if (timeDiff > 30 * 24 * 60 * 60 * 1000) return false;
          break;
      }
    }

    // Minimum likes filter
    if (filters.minLikes > 0 && comment.likes < filters.minLikes) {
      return false;
    }

    return true;
  });
}

export function sortComments(
  comments: Comment[], 
  sortBy: CommentSortOption,
  repliesMap: Record<string, Comment[]> = {}
): Comment[] {
  const sorted = [...comments];
  
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    
    case 'oldest':
      return sorted.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    
    case 'most-liked':
      return sorted.sort((a, b) => b.likes - a.likes);
    
    case 'most-replied':
      return sorted.sort((a, b) => {
        const aReplies = repliesMap[a.id]?.length || 0;
        const bReplies = repliesMap[b.id]?.length || 0;
        return bReplies - aReplies;
      });
    
    default:
      return sorted;
  }
}

export function getAllAuthors(
  topLevelComments: Comment[], 
  repliesMap: Record<string, Comment[]>
): string[] {
  const authorSet = new Set<string>();
  
  // Add authors from top-level comments
  topLevelComments.forEach(comment => authorSet.add(comment.author));
  
  // Add authors from all replies
  Object.values(repliesMap).forEach(replies => {
    replies.forEach(reply => authorSet.add(reply.author));
  });
  
  return Array.from(authorSet).sort();
}

export function getTotalCommentCount(
  topLevelComments: Comment[], 
  repliesMap: Record<string, Comment[]>
): number {
  let total = topLevelComments.length;
  
  // Add all reply counts
  Object.values(repliesMap).forEach(replies => {
    total += replies.length;
  });
  
  return total;
}

export function getFilteredAndSortedComments(
  topLevelComments: Comment[],
  repliesMap: Record<string, Comment[]>,
  filters: CommentFilters,
  sortBy: CommentSortOption
): {
  filteredTopLevel: Comment[];
  filteredReplies: Record<string, Comment[]>;
} {
  // Filter top-level comments
  const filteredTopLevel = sortComments(
    filterComments(topLevelComments, filters),
    sortBy,
    repliesMap
  );

  // Filter replies for each top-level comment
  const filteredReplies: Record<string, Comment[]> = {};
  
  filteredTopLevel.forEach(comment => {
    const replies = repliesMap[comment.id] || [];
    if (replies.length > 0) {
      const filteredCommentReplies = sortComments(
        filterComments(replies, filters),
        sortBy
      );
      if (filteredCommentReplies.length > 0) {
        filteredReplies[comment.id] = filteredCommentReplies;
      }
    }
  });

  return {
    filteredTopLevel,
    filteredReplies
  };
}

export function highlightSearchText(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export function getCommentPermalink(commentId: string): string {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#comment-${commentId}`;
}

export function parseCommentIdFromHash(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/^#comment-(.+)$/);
  return match ? match[1] : null;
}