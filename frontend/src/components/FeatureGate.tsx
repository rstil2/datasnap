import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Zap, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
  customMessage?: string;
  customTitle?: string;
}

interface UpgradePromptProps {
  feature: string;
  title?: string;
  message?: string;
  benefits?: string[];
  compact?: boolean;
  className?: string;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  feature, 
  children, 
  fallback,
  showUpgrade = true,
  customMessage,
  customTitle
}) => {
  const { canAccess } = useSubscription();
  
  const hasAccess = canAccess(feature);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (showUpgrade) {
    return (
      <UpgradePrompt 
        feature={feature}
        title={customTitle}
        message={customMessage}
      />
    );
  }
  
  return null;
};

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({ 
  feature,
  title,
  message,
  benefits = [],
  compact = false,
  className = ''
}) => {
  const navigate = useNavigate();
  const { subscription } = useSubscription();

  const getFeatureConfig = (featureName: string) => {
    switch (featureName) {
      case 'ai_insights':
        return {
          title: 'AI-Powered Insights',
          message: 'Get intelligent recommendations and automated insights from your data.',
          icon: <Sparkles className="w-8 h-8 text-blue-600" />,
          benefits: [
            'Automated pattern detection',
            'Smart recommendations',
            'Advanced correlation analysis',
            'Predictive insights'
          ]
        };
      case 'advanced_analytics':
        return {
          title: 'Advanced Analytics',
          message: 'Access powerful statistical tests and advanced data analysis tools.',
          icon: <Zap className="w-8 h-8 text-purple-600" />,
          benefits: [
            'Statistical test wizard',
            'Regression analysis',
            'Hypothesis testing',
            'Advanced visualizations'
          ]
        };
      case 'custom_branding':
        return {
          title: 'Custom Branding',
          message: 'Add your logo and customize the look of your reports and exports.',
          icon: <Crown className="w-8 h-8 text-yellow-600" />,
          benefits: [
            'Custom logos and colors',
            'White-label reports',
            'Professional presentation',
            'Brand consistency'
          ]
        };
      case 'priority_support':
        return {
          title: 'Priority Support',
          message: 'Get faster response times and direct access to our technical team.',
          icon: <Crown className="w-8 h-8 text-green-600" />,
          benefits: [
            '24/7 priority support',
            'Direct access to experts',
            'Phone and video support',
            'Faster response times'
          ]
        };
      default:
        return {
          title: 'Premium Feature',
          message: 'This feature is available with DataSnap Pro.',
          icon: <Lock className="w-8 h-8 text-gray-600" />,
          benefits: [
            'Unlimited access',
            'Advanced features',
            'Priority support',
            'Regular updates'
          ]
        };
    }
  };

  const config = getFeatureConfig(feature);
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;
  const displayBenefits = benefits.length > 0 ? benefits : config.benefits;

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  const handleStartTrial = async () => {
    try {
      const { SubscriptionService } = await import('../services/SubscriptionService');
      await SubscriptionService.startFreeTrial();
      // Navigate to pricing page to see trial status
      navigate('/pricing');
    } catch (error) {
      console.error('Failed to start trial:', error);
      // Still navigate to pricing page even if trial start fails
      navigate('/pricing');
    }
  };

  if (compact) {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 text-center border border-blue-200 ${className}`}>
        <div className="mb-3">{config.icon}</div>
        <h3 className="font-semibold text-gray-900 mb-2">{displayTitle}</h3>
        <p className="text-sm text-gray-600 mb-4">{displayMessage}</p>
        <div className="flex gap-2 justify-center">
          {!subscription && (
            <button
              onClick={handleStartTrial}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Start Free Trial
            </button>
          )}
          <button
            onClick={handleUpgrade}
            className="bg-white hover:bg-gray-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {subscription ? 'Upgrade' : 'View Plans'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <div className="flex items-center text-white">
          {config.icon}
          <div className="ml-3">
            <h3 className="text-xl font-semibold">{displayTitle}</h3>
            <p className="text-blue-100 mt-1">{displayMessage}</p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">What you'll get:</h4>
          <ul className="space-y-2">
            {displayBenefits.map((benefit, index) => (
              <li key={index} className="flex items-center text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex gap-3">
          {!subscription && (
            <button
              onClick={handleStartTrial}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center"
            >
              <Zap className="w-4 h-4 mr-2" />
              Start Free Trial
            </button>
          )}
          <button
            onClick={handleUpgrade}
            className="flex-1 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center"
          >
            {subscription ? 'Upgrade Plan' : 'View All Plans'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
        
        {!subscription && (
          <p className="text-center text-sm text-gray-500 mt-4">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        )}
      </div>
    </div>
  );
};

// Usage limit component
interface UsageLimitPromptProps {
  resource: string;
  remaining: number;
  limit: number;
  className?: string;
}

export const UsageLimitPrompt: React.FC<UsageLimitPromptProps> = ({ 
  resource, 
  remaining, 
  limit,
  className = ''
}) => {
  const navigate = useNavigate();
  const { subscription } = useSubscription();

  const percentage = (remaining / limit) * 100;
  const isNearLimit = percentage <= 20;
  const isAtLimit = remaining === 0;

  const getResourceName = (resourceKey: string) => {
    switch (resourceKey) {
      case 'datasets': return 'datasets';
      case 'charts': return 'charts';
      case 'reports': return 'reports';  
      case 'exports': return 'exports';
      default: return resourceKey;
    }
  };

  if (limit === -1) {
    // Unlimited
    return null;
  }

  if (!isNearLimit && !isAtLimit) {
    return null;
  }

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {isAtLimit ? (
            <Lock className="w-5 h-5 text-red-500" />
          ) : (
            <Crown className="w-5 h-5 text-yellow-500" />
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900">
            {isAtLimit 
              ? `You've reached your ${getResourceName(resource)} limit`
              : `Running low on ${getResourceName(resource)}`
            }
          </h3>
          <div className="mt-1">
            <p className="text-sm text-gray-600">
              {isAtLimit 
                ? `You've used all ${limit} of your ${getResourceName(resource)} this month.`
                : `You have ${remaining} of ${limit} ${getResourceName(resource)} remaining this month.`
              }
            </p>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={handleUpgrade}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md font-medium transition-colors"
                >
                  {subscription ? 'Upgrade Plan' : 'Get Unlimited'}
                </button>
              </div>
              <span className="text-sm text-gray-500">
                {limit - remaining}/{limit} used
              </span>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${ 
                  isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, ((limit - remaining) / limit) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};