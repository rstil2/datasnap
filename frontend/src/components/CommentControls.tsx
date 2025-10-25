import { useState } from 'react';
import { Search, Filter, SortAsc, SortDesc, Heart, MessageCircle } from 'lucide-react';

export type CommentSortOption = 'newest' | 'oldest' | 'most-liked' | 'most-replied';

export interface CommentFilters {
  search: string;
  author: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
  minLikes: number;
}

interface CommentControlsProps {
  totalComments: number;
  sortBy: CommentSortOption;
  onSortChange: (sort: CommentSortOption) => void;
  filters: CommentFilters;
  onFiltersChange: (filters: CommentFilters) => void;
  authors: string[]; // List of all authors in the thread
}

export function CommentControls({
  totalComments,
  sortBy,
  onSortChange,
  filters,
  onFiltersChange,
  authors
}: CommentControlsProps) {
  const [showFilters, setShowFilters] = useState(false);

  const sortOptions: { value: CommentSortOption; label: string; icon: React.ReactNode }[] = [
    { value: 'newest', label: 'Newest first', icon: <SortDesc size={14} /> },
    { value: 'oldest', label: 'Oldest first', icon: <SortAsc size={14} /> },
    { value: 'most-liked', label: 'Most liked', icon: <Heart size={14} /> },
    { value: 'most-replied', label: 'Most replies', icon: <MessageCircle size={14} /> },
  ];

  const dateRangeOptions = [
    { value: 'all' as const, label: 'All time' },
    { value: 'today' as const, label: 'Today' },
    { value: 'week' as const, label: 'This week' },
    { value: 'month' as const, label: 'This month' },
  ];

  const updateFilters = (updates: Partial<CommentFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      author: '',
      dateRange: 'all',
      minLikes: 0
    });
  };

  const hasActiveFilters = filters.search || filters.author || filters.dateRange !== 'all' || filters.minLikes > 0;

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-md)',
      marginBottom: 'var(--space-lg)',
      border: '1px solid var(--border-subtle)'
    }}>
      {/* Header with comment count and controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: showFilters ? 'var(--space-md)' : '0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)'
        }}>
          <span style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            fontWeight: '600'
          }}>
            {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
          </span>

          {/* Search input */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute',
              left: 'var(--space-sm)',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)'
            }} />
            <input
              type="text"
              placeholder="Search comments..."
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              style={{
                padding: 'var(--space-xs) var(--space-sm) var(--space-xs) var(--space-xl)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                minWidth: '200px'
              }}
            />
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)'
        }}>
          {/* Sort dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as CommentSortOption)}
              style={{
                padding: 'var(--space-xs) var(--space-sm)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: 'var(--space-xs) var(--space-sm)',
              border: `1px solid ${hasActiveFilters ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
              borderRadius: 'var(--radius-sm)',
              background: hasActiveFilters ? 'var(--accent-primary)' : 'var(--bg-primary)',
              color: hasActiveFilters ? 'white' : 'var(--text-primary)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)'
            }}
          >
            <Filter size={14} />
            Filters
            {hasActiveFilters && (
              <span style={{
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                !
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expanded filter controls */}
      {showFilters && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-md)',
          paddingTop: 'var(--space-md)',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          {/* Author filter */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-xs)'
            }}>
              Filter by author
            </label>
            <select
              value={filters.author}
              onChange={(e) => updateFilters({ author: e.target.value })}
              style={{
                width: '100%',
                padding: 'var(--space-xs) var(--space-sm)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem'
              }}
            >
              <option value="">All authors</option>
              {authors.map(author => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>

          {/* Date range filter */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-xs)'
            }}>
              Date range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => updateFilters({ dateRange: e.target.value as CommentFilters['dateRange'] })}
              style={{
                width: '100%',
                padding: 'var(--space-xs) var(--space-sm)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem'
              }}
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Minimum likes filter */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-xs)'
            }}>
              Minimum likes
            </label>
            <input
              type="number"
              min="0"
              value={filters.minLikes || ''}
              onChange={(e) => updateFilters({ minLikes: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: 'var(--space-xs) var(--space-sm)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem'
              }}
              placeholder="0"
            />
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <div style={{
              display: 'flex',
              alignItems: 'end'
            }}>
              <button
                onClick={clearFilters}
                style={{
                  padding: 'var(--space-xs) var(--space-sm)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}