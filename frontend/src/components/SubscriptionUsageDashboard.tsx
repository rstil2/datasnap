import React from 'react';
import { useSubscription, useSubscriptionActions } from '../contexts/SubscriptionContext';
import { SubscriptionService } from '../services/SubscriptionService';
import { Crown, Clock, BarChart3, Database, FileText, Download, AlertCircle, Zap } from 'lucide-react';

interface UsageProgressBarProps {
  label: string;
  current: number;
  limit: number;
  percentage: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'red';
}

const UsageProgressBar: React.FC<UsageProgressBarProps> = ({ label, current, limit, percentage, icon, color }) => {
  const getColorClass = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'orange':
        return 'bg-orange-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getBackgroundClass = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100';
      case 'orange':
        return 'bg-orange-100';
      case 'red':
        return 'bg-red-100';
      default:
        return 'bg-blue-100';
    }
  };

  return (
    <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {icon}
          <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
            {label}
          </span>
        </div>
        <div style={{ 
          fontSize: '0.875rem', 
          color: percentage >= 90 ? 'var(--error)' : percentage >= 70 ? 'var(--warning)' : 'var(--text-secondary)' 
        }}>
          {limit === -1 ? 'Unlimited' : `${current.toLocaleString()} / ${limit.toLocaleString()}`}
        </div>
      </div>
      
      <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
        <div
          style={{
            width: limit === -1 ? '100%' : `${Math.min(100, percentage)}%`,
            height: '100%',
            background: limit === -1 
              ? 'linear-gradient(90deg, var(--success), var(--accent-primary))' 
              : percentage >= 90 
                ? 'var(--error)' 
                : percentage >= 70 
                  ? 'var(--warning)' 
                  : 'var(--success)',
            transition: 'width 0.3s ease'
          }}
        />
      </div>
      
      {limit !== -1 && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text-tertiary)', 
          marginTop: 'var(--space-xs)',
          textAlign: 'right' 
        }}>
          {percentage.toFixed(1)}% used
        </div>
      )}
    </div>
  );
};

interface SubscriptionUsageDashboardProps {
  showUpgradePrompt?: boolean;
  compact?: boolean;
}

export const SubscriptionUsageDashboard: React.FC<SubscriptionUsageDashboardProps> = ({ 
  showUpgradePrompt = true, 
  compact = false 
}) => {
  const { subscription, usage, isLoading } = useSubscription();
  const { getUsagePercentage, getTrialDaysRemaining, isUsageLimitReached } = useSubscriptionActions();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          border: '3px solid var(--border-primary)', 
          borderTop: '3px solid var(--accent-primary)', 
          borderRadius: '50%', 
          margin: '0 auto var(--space-md)', 
          animation: 'spin 1s linear infinite' 
        }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading usage data...</p>
      </div>
    );
  }

  const planName = subscription ? 
    SubscriptionService.getPlanById(subscription.plan)?.name || 'Unknown Plan' : 
    'Free Plan';
    
  const isTrialUser = subscription?.status === 'trial';
  const trialDaysLeft = getTrialDaysRemaining();
  
  const usageItems = [
    {
      key: 'datasets',
      label: 'Datasets',
      icon: <Database size={16} style={{ color: 'var(--accent-primary)' }} />,
      current: usage?.datasets || 0,
      limit: SubscriptionService.getResourceLimit(subscription, 'datasets'),
    },
    {
      key: 'charts',
      label: 'Charts Created',
      icon: <BarChart3 size={16} style={{ color: 'var(--success)' }} />,
      current: usage?.charts || 0,
      limit: SubscriptionService.getResourceLimit(subscription, 'charts'),
    },
    {
      key: 'reports',
      label: 'Reports Generated',
      icon: <FileText size={16} style={{ color: 'var(--warning)' }} />,
      current: usage?.reports || 0,
      limit: SubscriptionService.getResourceLimit(subscription, 'reports'),
    },
    {
      key: 'exports',
      label: 'Data Exports',
      icon: <Download size={16} style={{ color: 'var(--info)' }} />,
      current: usage?.exports || 0,
      limit: SubscriptionService.getResourceLimit(subscription, 'exports'),
    }
  ];

  return (
    <div style={{ 
      background: 'var(--bg-elevated)', 
      borderRadius: 'var(--radius-xl)', 
      border: '1px solid var(--border-primary)',
      padding: compact ? 'var(--space-lg)' : 'var(--space-xl)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
          <Crown size={24} style={{ color: subscription?.plan === 'free' ? 'var(--text-tertiary)' : 'var(--accent-primary)' }} />
          <h2 style={{ 
            fontSize: compact ? '1.25rem' : '1.5rem', 
            fontWeight: 'var(--font-weight-bold)', 
            color: 'var(--text-primary)' 
          }}>
            {planName}
          </h2>
        </div>
        
        {isTrialUser && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)', 
            padding: 'var(--space-sm) var(--space-md)',
            background: trialDaysLeft <= 3 ? 'var(--error-light)' : 'var(--accent-light)',
            color: trialDaysLeft <= 3 ? 'var(--error)' : 'var(--accent-primary)',
            borderRadius: 'var(--radius-lg)',
            fontSize: '0.875rem',
            fontWeight: 'var(--font-weight-medium)'
          }}>
            <Clock size={16} />
            <span>
              {trialDaysLeft > 0 
                ? `${trialDaysLeft} day${trialDaysLeft > 1 ? 's' : ''} left in trial`
                : 'Trial expired'
              }
            </span>
          </div>
        )}
      </div>

      {/* Usage Overview */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: 'var(--space-lg)',
        marginBottom: showUpgradePrompt ? 'var(--space-xl)' : 0
      }}>
        {usageItems.map(item => {
          const percentage = getUsagePercentage(item.key);
          const color = percentage >= 90 ? 'red' : percentage >= 70 ? 'orange' : 'green';
          
          return (
            <UsageProgressBar
              key={item.key}
              label={item.label}
              current={item.current}
              limit={item.limit}
              percentage={percentage}
              icon={item.icon}
              color={color}
            />
          );
        })}
      </div>

      {/* Upgrade Prompt */}
      {showUpgradePrompt && subscription?.plan === 'free' && (
        <div style={{
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl)',
          color: 'white',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <Zap size={24} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'var(--font-weight-bold)' }}>
              Unlock Unlimited Power
            </h3>
          </div>
          
          <p style={{ opacity: 0.9, marginBottom: 'var(--space-lg)', fontSize: '1rem' }}>
            Get unlimited access to all features, remove usage limits, and unlock AI-powered insights.
          </p>
          
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.href = '/pricing'}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                padding: 'var(--space-md) var(--space-lg)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 'var(--font-weight-medium)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              View Pricing Plans
            </button>
            
            {!isTrialUser && (
              <button
                onClick={() => {
                  // Start trial logic would go here
                  window.location.href = '/pricing?trial=true';
                }}
                style={{
                  background: 'white',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  padding: 'var(--space-md) var(--space-lg)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 'var(--font-weight-semibold)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                Start Free Trial
              </button>
            )}
          </div>
        </div>
      )}

      {/* Usage Warnings */}
      {usageItems.some(item => isUsageLimitReached(item.key)) && (
        <div style={{
          background: 'var(--error-light)',
          border: '1px solid var(--error)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-lg)',
          marginTop: 'var(--space-lg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <AlertCircle size={20} style={{ color: 'var(--error)' }} />
            <h4 style={{ color: 'var(--error)', fontSize: '1rem', fontWeight: 'var(--font-weight-semibold)' }}>
              Usage Limits Reached
            </h4>
          </div>
          
          <p style={{ color: 'var(--error)', fontSize: '0.875rem', lineHeight: '1.5' }}>
            You've reached the limit for some resources. Upgrade your plan to continue using DataSnap without restrictions.
          </p>
        </div>
      )}
    </div>
  );
};

export default SubscriptionUsageDashboard;