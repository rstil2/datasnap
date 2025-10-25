import React, { useState, useEffect } from 'react';
import { SubscriptionService } from '../services/SubscriptionService';
import { PRICING_PLANS, type PricingPlan, type SubscriptionPlan } from '../types/subscription';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Crown, Check, Loader, Star, Zap, Shield, Headphones } from 'lucide-react';
import toast from 'react-hot-toast';

interface SubscriptionPlansProps {
  onClose?: () => void;
  currentTier?: SubscriptionPlan;
}

export function SubscriptionPlans({ onClose, currentTier }: SubscriptionPlansProps) {
  const { subscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const currentPlan = currentTier || subscription?.plan || 'free';


  const handlePurchase = async (plan: PricingPlan) => {
    if (!plan.stripePriceId) {
      toast.error('This plan is not available for purchase yet.');
      return;
    }

    setPurchasing(plan.id);
    try {
      const { url } = await SubscriptionService.createCheckoutSession({
        priceId: plan.stripePriceId,
        successUrl: `${window.location.origin}/account/billing?success=true`,
        cancelUrl: window.location.href
      });
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const handleStartTrial = async () => {
    if (subscription && subscription.status === 'trial') {
      toast.success('You\'re already on a free trial!');
      return;
    }

    setLoading(true);
    try {
      await SubscriptionService.startFreeTrial();
      toast.success('Free trial started! Enjoy 14 days of DataSnap Pro.');
      onClose?.();
    } catch (error) {
      console.error('Failed to start trial:', error);
      toast.error('Failed to start trial. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPlans = (): PricingPlan[] => {
    return PRICING_PLANS.filter(plan => {
      if (plan.id === 'free') return true;
      if (selectedPeriod === 'monthly') return plan.interval === 'month';
      return plan.interval === 'year';
    });
  };

  const getFeatureIcon = (feature: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'datasets': <Zap size={16} />,
      'charts': <Star size={16} />,
      'reports': <Shield size={16} />,
      'exports': <Check size={16} />,
      'AI': <Crown size={16} />,
      'support': <Headphones size={16} />,
      'branding': <Star size={16} />,
      'analytics': <Shield size={16} />,
    };
    
    for (const [key, icon] of Object.entries(iconMap)) {
      if (feature.toLowerCase().includes(key.toLowerCase())) {
        return icon;
      }
    }
    return <Check size={16} />;
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--bg-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}>
        <div style={{
          background: 'var(--bg-elevated)',
          padding: '3rem',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--border-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-xl)'
        }}>
          <Loader size={24} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
          <span style={{ color: 'var(--text-primary)', fontSize: '1.125rem' }}>Loading plans...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--bg-overlay)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      padding: 'var(--space-16)'
    }}>
      <div style={{
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-2xl)',
        border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-xl)',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 'var(--space-16)',
              right: 'var(--space-16)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'all var(--transition-base)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--error-light)';
              e.currentTarget.style.color = 'var(--error)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            ×
          </button>
        )}

        <div style={{ padding: 'var(--space-24)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-24)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-8)' }}>🚀</div>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-8)'
            }}>
              Upgrade DataSnap
            </h2>
            <p style={{
              fontSize: '1.125rem',
              color: 'var(--text-secondary)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Unlock powerful features and take your data analysis to the next level
            </p>
          </div>

          {/* Period Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 'var(--space-24)'
          }}>
            <div style={{
              display: 'flex',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-primary)',
              padding: 'var(--space-2)'
            }}>
              {['monthly', 'yearly'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period as 'monthly' | 'yearly')}
                  style={{
                    padding: 'var(--space-8) var(--space-16)',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: selectedPeriod === period ? 'var(--accent-primary)' : 'transparent',
                    color: selectedPeriod === period ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-base)',
                    position: 'relative',
                    fontWeight: 'var(--font-weight-medium)'
                  }}
                >
                  <span style={{ textTransform: 'capitalize' }}>{period}</span>
                  {period === 'yearly' && (
                    <span style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: 'var(--success)',
                      color: 'white',
                      fontSize: '0.625rem',
                      fontWeight: 'var(--font-weight-semibold)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase'
                    }}>
                      Save 17%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Plans */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--space-20)',
            marginBottom: 'var(--space-24)'
          }}>
            {getFilteredPlans()
              .sort((a, b) => a.id === 'free' ? -1 : 1)
              .map((plan) => {
                const isCurrentPlan = currentPlan === plan.id;
                const isPurchasing = purchasing === plan.id;
                const isProPlan = plan.id !== 'free';
                
                return (
                  <div
                    key={plan.id}
                    style={{
                      background: (isProPlan && plan.popular) 
                        ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                        : 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-xl)',
                      border: (isProPlan && plan.popular) 
                        ? 'none'
                        : '1px solid var(--border-primary)',
                      padding: 'var(--space-20)',
                      position: 'relative',
                      transition: 'all var(--transition-base)',
                      color: (isProPlan && plan.popular) ? 'white' : 'inherit'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                  >
                    {/* Plan Badge */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-8)',
                      marginBottom: 'var(--space-16)'
                    }}>
                      {isProPlan && <Crown size={20} />}
                      <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: 'var(--font-weight-semibold)'
                      }}>
                        {plan.name}
                      </h3>
                      {plan.popular && (
                        <span style={{
                          background: 'rgba(255,255,255,0.2)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'var(--font-weight-medium)'
                        }}>
                          Most Popular
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div style={{ marginBottom: 'var(--space-16)' }}>
                      <div style={{
                        fontSize: '2.5rem',
                        fontWeight: 'var(--font-weight-bold)',
                        marginBottom: 'var(--space-2)'
                      }}>
                        {SubscriptionService.formatPrice(plan.price)}
                      </div>
                      {plan.price > 0 && (
                        <div style={{
                          fontSize: '0.875rem',
                          opacity: isProPlan ? 0.8 : 0.6,
                          textTransform: 'lowercase'
                        }}>
                          per {plan.interval}
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <div style={{ marginBottom: 'var(--space-20)' }}>
                      {plan.features.map((feature, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-8)',
                            marginBottom: 'var(--space-8)'
                          }}
                        >
                          <div style={{
                            color: (isProPlan && plan.popular) ? 'white' : 'var(--success)'
                          }}>
                            {getFeatureIcon(feature)}
                          </div>
                          <span style={{
                            fontSize: '0.875rem',
                            color: (isProPlan && plan.popular) ? 'white' : 'var(--text-primary)'
                          }}>
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Purchase Button */}
                    <button
                      onClick={() => plan.id === 'free' ? handleStartTrial() : handlePurchase(plan)}
                      disabled={isPurchasing || isCurrentPlan}
                      style={{
                        width: '100%',
                        padding: 'var(--space-12) var(--space-16)',
                        borderRadius: 'var(--radius-lg)',
                        border: 'none',
                        background: isCurrentPlan 
                          ? ((isProPlan && plan.popular) ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)')
                          : ((isProPlan && plan.popular) 
                            ? 'rgba(255,255,255,0.9)' 
                            : 'var(--accent-primary)'),
                        color: isCurrentPlan
                          ? ((isProPlan && plan.popular) ? 'white' : 'var(--text-secondary)')
                          : ((isProPlan && plan.popular) ? 'var(--accent-primary)' : 'white'),
                        fontWeight: 'var(--font-weight-semibold)',
                        cursor: (isPurchasing || isCurrentPlan) ? 'not-allowed' : 'pointer',
                        transition: 'all var(--transition-base)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-8)',
                        opacity: (isPurchasing || isCurrentPlan) ? 0.6 : 1
                      }}
                    >
                      {isPurchasing ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : isCurrentPlan ? (
                        <span>Current Plan</span>
                      ) : (
                        <span>{plan.id === 'free' ? 'Start Free Trial' : `Choose ${plan.name}`}</span>
                      )}
                    </button>
                  </div>
                );
              })}
          </div>

          {/* Footer */}
          <div style={{
            textAlign: 'center',
            borderTop: '1px solid var(--border-primary)',
            paddingTop: 'var(--space-16)'
          }}>
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Subscriptions are processed securely through Stripe and will auto-renew unless canceled.
              You can manage your subscription in your account settings at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}