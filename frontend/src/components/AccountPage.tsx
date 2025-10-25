import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { FirebaseSignInModal } from './FirebaseSignInModal';
import { SubscriptionPlans } from './SubscriptionPlans';
import { macAppStoreIAP } from '../services/macAppStoreIAP';
import { Crown, User, Mail, Calendar, Settings, LogOut, Shield } from 'lucide-react';

export function AccountPage() {
  const { user, isAuthenticated, signOut } = useUser();
  const { subscription } = useSubscription();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSubscriptionPlans, setShowSubscriptionPlans] = useState(false);
  const [macSubscriptionStatus, setMacSubscriptionStatus] = useState<any>(null);

  useEffect(() => {
    // Initialize Mac App Store IAP and get current status
    initializeMacAppStore();
  }, []);

  const initializeMacAppStore = async () => {
    try {
      await macAppStoreIAP.initialize();
      const status = macAppStoreIAP.getSubscriptionStatus();
      setMacSubscriptionStatus(status);
    } catch (error) {
      console.error('Failed to initialize Mac App Store IAP:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">👤 Account</h1>
          <p className="page-description">Sign in to access your account and unlock community features</p>
        </div>

        {/* Sign In Card */}
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div className="card-content" style={{ padding: '3rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem', opacity: 0.6 }}>👤</div>
            
            <h2 style={{ 
              fontSize: '1.75rem', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--text-primary)', 
              marginBottom: '1rem' 
            }}>
              Welcome to DataSnap
            </h2>
            
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '1rem', 
              lineHeight: '1.6',
              marginBottom: '2rem',
              maxWidth: '400px',
              margin: '0 auto 2rem'
            }}>
              Sign in to share data stories, engage with the community, and unlock advanced analytics features.
            </p>

            <button
              onClick={() => setShowSignInModal(true)}
              style={{
                padding: '1rem 2rem',
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                fontSize: '1rem',
                fontWeight: 'var(--font-weight-medium)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                boxShadow: 'var(--shadow-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-primary-hover)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--accent-primary)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
            >
              <User size={18} />
              <span>Sign In</span>
            </button>

            <div style={{ 
              marginTop: '2rem', 
              padding: '1.5rem', 
              background: 'var(--bg-tertiary)', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)'
            }}>
              <h4 style={{ 
                color: 'var(--text-primary)', 
                marginBottom: '1rem',
                fontSize: '1rem',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                What you get with an account:
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--success)' }}>✓</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Share data stories</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--success)' }}>✓</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Like & comment</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--success)' }}>✓</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Cloud sync</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--success)' }}>✓</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Advanced analytics</span>
                </div>
              </div>
            </div>
          </div>
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">👤 Account</h1>
        <p className="page-description">Manage your profile, subscription, and account settings</p>
      </div>

      <div style={{ display: 'grid', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Profile Card */}
        <div className="card">
          <div className="card-content" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                color: 'white',
                fontWeight: 'var(--font-weight-semibold)'
              }}>
                👤
              </div>
              <div>
                <h2 style={{ 
                  color: 'var(--text-primary)', 
                  fontSize: '1.5rem',
                  fontWeight: 'var(--font-weight-semibold)',
                  marginBottom: '0.5rem'
                }}>
                  {user.name}
                </h2>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.25rem'
                }}>
                  <Mail size={16} />
                  <span>{user.email}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem'
                }}>
                  <Calendar size={16} />
                  <span>Member since {formatDate(user.joinedAt || new Date().toISOString())}</span>
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '1rem',
              padding: '1.5rem',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'var(--font-weight-semibold)', color: 'var(--accent-primary)' }}>
                  {user.storiesCount || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Stories</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'var(--font-weight-semibold)', color: 'var(--success)' }}>
                  {user.totalLikes || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Likes</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'var(--font-weight-semibold)', color: 'var(--info)' }}>
                  {macSubscriptionStatus?.tier || 'Free'}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Plan</div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="card">
          <div className="card-content" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <Crown size={24} style={{ color: macSubscriptionStatus?.isSubscribed ? 'var(--warning)' : 'var(--text-secondary)' }} />
              <div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Subscription</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {macSubscriptionStatus?.isSubscribed
                    ? `You have DataSnap ${macSubscriptionStatus.tier?.charAt(0).toUpperCase()}${macSubscriptionStatus.tier?.slice(1)}`
                    : 'You are on the free plan'
                  }
                  {macSubscriptionStatus?.expiresAt && (
                    <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {macSubscriptionStatus.autoRenewing ? 'Renews' : 'Expires'} on {new Date(macSubscriptionStatus.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {subscription?.plan === 'free' && (
              <div style={{ 
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                color: 'white',
                marginBottom: '1rem'
              }}>
                <h4 style={{ marginBottom: '0.5rem', fontWeight: 'var(--font-weight-semibold)' }}>
                  Upgrade to Pro
                </h4>
                <p style={{ marginBottom: '1rem', fontSize: '0.875rem', opacity: 0.9 }}>
                  Unlock unlimited uploads, advanced analytics, and priority support.
                </p>
                <button style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-base)'
                }}>
                  View Plans
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Account Actions */}
        <div className="card">
          <div className="card-content" style={{ padding: '2rem' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Account Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              <button style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: 'transparent',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                width: '100%',
                textAlign: 'left'
              }}>
                <Settings size={20} style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Account Settings</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Manage your profile and preferences
                  </div>
                </div>
              </button>

              <button style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: 'transparent',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                width: '100%',
                textAlign: 'left'
              }}>
                <Shield size={20} style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Privacy & Security</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Control your data and privacy settings
                  </div>
                </div>
              </button>

              <button 
                onClick={handleSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'transparent',
                  border: '1px solid var(--error-light)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--error)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-base)',
                  width: '100%',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--error-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <LogOut size={20} />
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Sign Out</div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    Sign out of your DataSnap account
                  </div>
                </div>
              </button>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}