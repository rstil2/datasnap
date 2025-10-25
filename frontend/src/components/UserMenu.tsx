import { useState, useEffect, useRef } from 'react';
import { ChevronDown, LogOut, User, Settings, Crown, Zap } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { SubscriptionService } from '../services/SubscriptionService';
import { SignInModal } from './SignInModal';
import { SettingsModal } from './SettingsModal';

export function UserMenu() {
  const { user, isAuthenticated, signOut } = useUser();
  const { subscription, usage } = useSubscription();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Handle escape key and outside clicks
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };
    
    if (isDropdownOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDropdownOpen]);

  const handleSignOut = () => {
    signOut();
    setIsDropdownOpen(false);
  };

  if (!isAuthenticated || !user) {
    return (
      <>
        <button
          onClick={() => setIsSignInModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            transition: 'all var(--transition-fast)'
          }}
        >
          <User size={16} />
          Sign In
        </button>
        
        <SignInModal 
          isOpen={isSignInModalOpen} 
          onClose={() => setIsSignInModalOpen(false)} 
        />
      </>
    );
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-label="User menu"
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          color: 'var(--text-primary)'
        }}
      >
        <div style={{
          fontSize: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {typeof user.avatar === 'string' && user.avatar.startsWith('http') ? '👤' : user.avatar}
        </div>
        <span style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600',
          maxWidth: '120px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {user.name}
        </span>
        <ChevronDown 
          size={14} 
          style={{ 
            transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--transition-fast)'
          }} 
        />
      </button>

      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10
            }}
            onClick={() => setIsDropdownOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 'var(--space-xs)',
            minWidth: '200px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 20,
            overflow: 'hidden'
          }}>
            {/* User Info Header */}
            <div style={{
              padding: 'var(--space-md)',
              borderBottom: '1px solid var(--border-primary)',
              background: 'var(--bg-elevated)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-xs)'
              }}>
                <div style={{ fontSize: '1.5rem' }}>{typeof user.avatar === 'string' && user.avatar.startsWith('http') ? '👤' : user.avatar}</div>
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}>
                    {user.name}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)'
                  }}>
                    Member since {new Date(user.joinedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                  <span>{user.storiesCount} stories</span>
                  <span>{user.totalLikes} likes</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: subscription && subscription.plan !== 'free' ? '#dcfce7' : '#f3f4f6',
                  color: subscription && subscription.plan !== 'free' ? '#166534' : '#6b7280',
                  fontSize: '0.625rem',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {subscription && subscription.plan !== 'free' ? (
                    <><Crown size={10} /> Pro</>
                  ) : (
                    'Free'
                  )}
                </div>
              </div>
            </div>

            {/* Subscription Section */}
            {(!subscription || subscription.plan === 'free') && (
              <div style={{
                padding: 'var(--space-md)',
                borderBottom: '1px solid var(--border-primary)',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  marginBottom: 'var(--space-sm)'
                }}>
                  <Zap size={16} style={{ color: 'white' }} />
                  <span style={{
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    Unlock Pro Features
                  </span>
                </div>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.75rem',
                  marginBottom: 'var(--space-sm)'
                }}>
                  Get unlimited access, AI insights, and advanced analytics.
                </p>
                <button
                  onClick={() => {
                    window.location.href = '/pricing';
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: 'var(--space-sm)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  Start Free Trial
                </button>
              </div>
            )}
            
            {/* Usage Stats for Pro Users */}
            {subscription && subscription.plan !== 'free' && usage && (
              <div style={{
                padding: 'var(--space-md)',
                borderBottom: '1px solid var(--border-primary)',
                background: 'var(--bg-elevated)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  marginBottom: 'var(--space-sm)'
                }}>
                  <Crown size={16} style={{ color: '#16a34a' }} />
                  <span style={{
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    DataSnap Pro
                  </span>
                  {subscription.status === 'trial' && (
                    <span style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      fontSize: '0.625rem',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: '600'
                    }}>
                      TRIAL
                    </span>
                  )}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)'
                }}>
                  <div>Reports: {usage.reports}</div>
                  <div>Exports: {usage.exports}</div>
                  <div>Charts: {usage.charts}</div>
                  <div>AI Requests: {usage.aiInsightRequests}</div>
                </div>
              </div>
            )}

            {/* Menu Items */}
            <div style={{ padding: 'var(--space-xs)' }}>
              <button
                onClick={() => {
                  setIsSettingsModalOpen(true);
                  setIsDropdownOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'none',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                }}
              >
                <Settings size={16} />
                Settings
              </button>
              
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'none',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'var(--error)',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--error-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}
