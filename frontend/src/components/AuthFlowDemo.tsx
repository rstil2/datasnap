import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { userService } from '../services/userService';
import { SignInModal } from './SignInModal';
import { UserMenu } from './UserMenu';
import { Logo3D } from './Logo3D';
import { FeatureGate } from './FeatureGate';
import { 
  User, 
  Crown, 
  Zap, 
  Lock, 
  Unlock, 
  TrendingUp, 
  BarChart3,
  Brain,
  Palette,
  RefreshCw,
  LogOut,
  ArrowLeft,
  Home
} from 'lucide-react';

export const AuthFlowDemo: React.FC = () => {
  const { user, isAuthenticated, signOut } = useUser();
  const { subscription, canAccess, usage } = useSubscription();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showFeatureDemo, setShowFeatureDemo] = useState(false);

  // Demo steps progression
  const steps = [
    { id: 1, title: 'Initial State', description: 'User visits DataSnap for first time' },
    { id: 2, title: 'Sign In Process', description: 'User clicks Sign In and enters details' },
    { id: 3, title: 'Authenticated State', description: 'User is signed in, sees personalized experience' },
    { id: 4, title: 'Feature Access', description: 'User tries premium features and sees subscription prompts' },
    { id: 5, title: 'Subscription Flow', description: 'User sees upgrade options and subscription management' }
  ];

  const resetDemo = () => {
    signOut();
    setCurrentStep(1);
    setShowFeatureDemo(false);
    setIsSignInModalOpen(false);
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Auto-progress demo based on authentication state
  useEffect(() => {
    if (isAuthenticated && currentStep === 2) {
      setTimeout(() => setCurrentStep(3), 1000);
    }
  }, [isAuthenticated, currentStep]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'var(--bg-primary, #0a0a0a)',
      color: 'var(--text-primary, #ffffff)',
      overflow: 'hidden'
    }}>
      <div style={{
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1.5rem',
          paddingBottom: '3rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          minHeight: 'calc(100vh - 3rem)'
        }}>
          {/* Navigation Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border-primary, #2a2a2a)'
          }}>
            <button
              onClick={() => window.history.back()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--bg-secondary, #141414)',
                color: 'var(--text-secondary, #b4b4b4)',
                border: '1px solid var(--border-primary, #2a2a2a)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary, #ffffff)';
                e.currentTarget.style.background = 'var(--bg-tertiary, #1a1a1a)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary, #b4b4b4)';
                e.currentTarget.style.background = 'var(--bg-secondary, #141414)';
              }}
            >
              <ArrowLeft size={16} />
              Back to DataSnap
            </button>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-tertiary, #8a8a8a)',
              fontSize: '0.875rem'
            }}>
              <Home size={14} />
              Authentication & Subscription Demo
            </div>
          </div>
      {/* Demo Header */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: 'var(--text-primary, #ffffff)',
          marginBottom: '1rem',
          margin: 0
        }}>
          DataSnap Authentication & Subscription Flow Demo
        </h1>
        <p style={{
          color: 'var(--text-secondary, #b4b4b4)',
          marginBottom: '1.5rem',
          fontSize: '1rem',
          lineHeight: '1.5'
        }}>
          See how users experience the complete login and subscription journey
        </p>
        
        {/* Demo Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={resetDemo}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-secondary, #141414)',
              color: 'var(--text-primary, #ffffff)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-primary, #2a2a2a)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary, #1a1a1a)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-secondary, #141414)';
            }}
          >
            <RefreshCw size={16} />
            Reset Demo
          </button>
          <button
            onClick={() => setShowFeatureDemo(!showFeatureDemo)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--accent-primary, #007AFF)',
              color: 'white',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-primary-hover, #0056CC)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent-primary, #007AFF)';
            }}
          >
            <Zap size={16} />
            {showFeatureDemo ? 'Hide' : 'Show'} Feature Demo
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div style={{
        background: 'var(--bg-secondary, #141414)',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '1px solid var(--border-primary, #2a2a2a)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          marginBottom: '1rem',
          color: 'var(--text-primary, #ffffff)',
          margin: 0
        }}>Demo Flow Progress</h2>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          {steps.map((step, index) => (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                border: '2px solid',
                borderColor: currentStep >= step.id ? 'var(--accent-primary, #007AFF)' : 'var(--border-secondary, #383838)',
                background: currentStep >= step.id ? 'var(--accent-primary, #007AFF)' : 'transparent',
                color: currentStep >= step.id ? 'white' : 'var(--text-tertiary, #8a8a8a)',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                {step.id}
              </div>
              {index < steps.length - 1 && (
                <div style={{
                  width: '4rem',
                  height: '2px',
                  margin: '0 0.5rem',
                  background: currentStep > step.id ? 'var(--accent-primary, #007AFF)' : 'var(--border-secondary, #383838)',
                  borderRadius: '1px'
                }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--text-primary, #ffffff)',
            margin: '0 0 0.5rem 0'
          }}>{steps[currentStep - 1].title}</h3>
          <p style={{
            color: 'var(--text-secondary, #b4b4b4)',
            fontSize: '0.875rem',
            margin: 0,
            lineHeight: '1.4'
          }}>{steps[currentStep - 1].description}</p>
        </div>
      </div>

      {/* Current State Display */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '2rem'
      }}>
        
        {/* Authentication State */}
        <div style={{
          background: 'var(--bg-secondary, #141414)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid var(--border-primary, #2a2a2a)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: 'var(--text-primary, #ffffff)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: 0
          }}>
            <User size={20} />
            Authentication State
          </h2>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              background: 'var(--bg-elevated, #212121)',
              borderRadius: '8px',
              border: '1px solid var(--border-primary, #2a2a2a)'
            }}>
              <span style={{ color: 'var(--text-primary, #ffffff)' }}>Is Authenticated:</span>
              <span style={{
                fontWeight: '600',
                color: isAuthenticated ? 'var(--success, #30D158)' : 'var(--error, #FF453A)'
              }}>
                {isAuthenticated ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            
            {user ? (
              <div style={{
                padding: '1rem',
                border: '1px solid var(--success, #30D158)',
                background: 'var(--success-light, rgba(48, 209, 88, 0.1))',
                borderRadius: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ fontSize: '2rem' }}>{user.avatar}</div>
                  <div>
                    <div style={{
                      fontWeight: '600',
                      color: 'var(--text-primary, #ffffff)',
                      marginBottom: '0.25rem'
                    }}>{user.name}</div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary, #b4b4b4)'
                    }}>
                      Member since {new Date(user.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary, #b4b4b4)'
                }}>
                  {user.storiesCount} stories • {user.totalLikes} likes
                </div>
              </div>
            ) : (
              <div style={{
                padding: '1rem',
                border: '1px solid var(--border-primary, #2a2a2a)',
                background: 'var(--bg-elevated, #212121)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <p style={{
                  color: 'var(--text-secondary, #b4b4b4)',
                  marginBottom: '0.75rem',
                  margin: 0
                }}>No user signed in</p>
                <button
                  onClick={() => {
                    setIsSignInModalOpen(true);
                    if (currentStep === 1) setCurrentStep(2);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'var(--accent-primary, #007AFF)',
                    color: 'white',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginTop: '0.75rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--accent-primary-hover, #0056CC)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--accent-primary, #007AFF)';
                  }}
                >
                  <User size={16} />
                  Sign In to DataSnap
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Subscription State */}
        <div style={{
          background: 'var(--bg-secondary, #141414)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid var(--border-primary, #2a2a2a)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: 'var(--text-primary, #ffffff)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: 0
          }}>
            <Crown size={20} />
            Subscription State
          </h2>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              background: 'var(--bg-elevated, #212121)',
              borderRadius: '8px',
              border: '1px solid var(--border-primary, #2a2a2a)'
            }}>
              <span style={{ color: 'var(--text-primary, #ffffff)' }}>Current Plan:</span>
              <span style={{
                fontWeight: '600',
                color: subscription?.plan === 'pro' ? 'var(--success, #30D158)' : 'var(--warning, #FF9F0A)'
              }}>
                {subscription?.plan || 'Free'}
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              background: 'var(--bg-elevated, #212121)',
              borderRadius: '8px',
              border: '1px solid var(--border-primary, #2a2a2a)'
            }}>
              <span style={{ color: 'var(--text-primary, #ffffff)' }}>Status:</span>
              <span style={{
                fontWeight: '600',
                color: subscription?.status === 'active' ? 'var(--success, #30D158)' : 
                       subscription?.status === 'trial' ? 'var(--accent-primary, #007AFF)' : 'var(--text-secondary, #b4b4b4)'
              }}>
                {subscription?.status || 'Free'}
              </span>
            </div>

            {usage && (
              <div style={{
                padding: '1rem',
                border: '1px solid var(--accent-primary, #007AFF)',
                background: 'var(--accent-light, rgba(0, 122, 255, 0.1))',
                borderRadius: '8px'
              }}>
                <h4 style={{
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                  color: 'var(--text-primary, #ffffff)',
                  margin: 0
                }}>Current Usage:</h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  fontSize: '0.875rem'
                }}>
                  <div style={{ color: 'var(--text-secondary, #b4b4b4)' }}>Reports: {usage.reports}</div>
                  <div style={{ color: 'var(--text-secondary, #b4b4b4)' }}>Exports: {usage.exports}</div>
                  <div style={{ color: 'var(--text-secondary, #b4b4b4)' }}>Charts: {usage.charts}</div>
                  <div style={{ color: 'var(--text-secondary, #b4b4b4)' }}>AI Requests: {usage.aiInsightRequests}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulated App Header */}
      <div style={{
        background: 'var(--bg-secondary, #141414)',
        borderRadius: '12px',
        padding: '1rem',
        border: '1px solid var(--border-primary, #2a2a2a)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          marginBottom: '1rem',
          color: 'var(--text-primary, #ffffff)',
          margin: 0
        }}>Simulated DataSnap Header</h2>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          background: 'var(--bg-primary, #0a0a0a)',
          color: 'var(--text-primary, #ffffff)',
          borderRadius: '8px',
          border: '1px solid var(--border-primary, #2a2a2a)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Logo3D size={18} />
            <h1 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'var(--text-primary, #ffffff)',
              margin: 0
            }}>DataSnap</h1>
          </div>
          
          {/* This shows the actual UserMenu component */}
          <div style={{
            background: 'var(--bg-secondary, #141414)',
            borderRadius: '8px',
            padding: '0.5rem'
          }}>
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Feature Access Demo */}
      {showFeatureDemo && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            textAlign: 'center',
            color: 'var(--text-primary, #ffffff)',
            margin: 0
          }}>Feature Access Demo</h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Feature Gate Demo Note */}
            <div style={{
              background: 'var(--bg-secondary, #141414)',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid var(--border-primary, #2a2a2a)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
              textAlign: 'center'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: 'var(--text-primary, #ffffff)',
                marginBottom: '1rem',
                margin: 0
              }}>
                Feature Gate Demo
              </h3>
              <p style={{
                color: 'var(--text-secondary, #b4b4b4)',
                marginBottom: '1rem',
                lineHeight: '1.5'
              }}>
                The FeatureGate component controls access to premium features like:
              </p>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                color: 'var(--text-secondary, #b4b4b4)'
              }}>
                <li>🧠 AI-Powered Insights</li>
                <li>📈 Advanced Analytics</li>
                <li>🎨 Custom Branding</li>
                <li>📄 Unlimited Exports</li>
              </ul>
            </div>

            {/* Subscription Benefits */}
            <div style={{
              background: 'var(--bg-secondary, #141414)',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid var(--accent-primary, #007AFF)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: 'var(--text-primary, #ffffff)',
                marginBottom: '1rem',
                margin: 0
              }}>
                Pro Plan Benefits
              </h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                color: 'var(--text-secondary, #b4b4b4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--success, #30D158)' }}>✓</span>
                  Unlimited reports and exports
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--success, #30D158)' }}>✓</span>
                  AI-powered insights and recommendations
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--success, #30D158)' }}>✓</span>
                  Advanced statistical tests
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--success, #30D158)' }}>✓</span>
                  Custom branding and white-label reports
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade Prompt Demo */}
          {(!subscription || subscription.plan === 'free') && (
            <div style={{
              background: 'linear-gradient(135deg, var(--accent-primary, #007AFF) 0%, #5856D6 100%)',
              color: 'white',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    margin: 0
                  }}>Unlock All Features</h3>
                  <p style={{
                    opacity: 0.9,
                    fontSize: '0.875rem',
                    lineHeight: '1.4',
                    margin: 0
                  }}>
                    Get unlimited access to AI insights, advanced analytics, and custom branding.
                  </p>
                </div>
                <button 
                  onClick={() => window.open('/pricing', '_blank')}
                  style={{
                    background: 'white',
                    color: 'var(--accent-primary, #007AFF)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '0.875rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  View Plans
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Demo Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem'
      }}>
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          style={{
            padding: '0.75rem 1rem',
            background: currentStep === 1 ? 'var(--bg-secondary, #141414)' : 'var(--bg-elevated, #212121)',
            color: currentStep === 1 ? 'var(--text-muted, #6a6a6a)' : 'var(--text-primary, #ffffff)',
            borderRadius: '8px',
            border: '1px solid var(--border-primary, #2a2a2a)',
            cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
            opacity: currentStep === 1 ? 0.5 : 1,
            fontSize: '0.875rem',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          Previous Step
        </button>
        <button
          onClick={nextStep}
          disabled={currentStep === steps.length}
          style={{
            padding: '0.75rem 1rem',
            background: currentStep === steps.length ? 'var(--bg-secondary, #141414)' : 'var(--accent-primary, #007AFF)',
            color: 'white',
            borderRadius: '8px',
            border: 'none',
            cursor: currentStep === steps.length ? 'not-allowed' : 'pointer',
            opacity: currentStep === steps.length ? 0.5 : 1,
            fontSize: '0.875rem',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
        >
          Next Step
        </button>
      </div>

        {/* SignIn Modal */}
        <SignInModal 
          isOpen={isSignInModalOpen} 
          onClose={() => setIsSignInModalOpen(false)} 
        />
        </div>
      </div>
    </div>
  );
};