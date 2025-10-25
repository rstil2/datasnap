import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  Subscription, 
  BillingInfo, 
  Usage, 
  SubscriptionContext as ISubscriptionContext 
} from '../types/subscription';
import { SubscriptionService } from '../services/SubscriptionService';
import { useUser } from './UserContext';
import { SubscriptionTestUtils } from '../utils/subscriptionTestUtils';
import toast from 'react-hot-toast';

const SubscriptionContext = createContext<ISubscriptionContext | null>(null);

export const useSubscription = (): ISubscriptionContext => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trialWarningShown, setTrialWarningShown] = useState(false);
  const [usageLimitReached, setUsageLimitReached] = useState<string[]>([]);

  // Check trial expiration and show warnings
  const checkTrialExpiration = useCallback((sub: Subscription | null) => {
    if (!sub || sub.status !== 'trial' || !sub.trialEnd || trialWarningShown) return;
    
    const now = new Date();
    const trialEnd = new Date(sub.trialEnd);
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 3 && daysRemaining > 0) {
      toast.success(
        `⏰ Your free trial expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}! Upgrade now to continue using Pro features.`,
        {
          duration: 8000,
          id: 'trial-warning',
        }
      );
      setTrialWarningShown(true);
    } else if (daysRemaining <= 0) {
      toast.error(
        '🔒 Your free trial has expired. Upgrade to continue using Pro features.',
        {
          duration: 10000,
          id: 'trial-expired',
        }
      );
      setTrialWarningShown(true);
    }
  }, [trialWarningShown]);

  // Check usage limits and show warnings
  const checkUsageLimits = useCallback((sub: Subscription | null, currentUsage: Usage | null) => {
    if (!currentUsage) return;
    
    const newLimitWarnings: string[] = [];
    const resources = ['datasets', 'charts', 'reports', 'exports'];
    
    resources.forEach(resource => {
      const remaining = SubscriptionService.getRemainingUsage(sub, currentUsage, resource);
      const limit = SubscriptionService.getResourceLimit(sub, resource);
      
      if (limit > 0) { // Only check if there's actually a limit
        const usagePercent = ((limit - remaining) / limit) * 100;
        
        if (usagePercent >= 90 && remaining > 0) {
          if (!usageLimitReached.includes(`${resource}-90`)) {
            toast.warning(
              `⚠️ You've used ${Math.round(usagePercent)}% of your ${resource} limit (${remaining} remaining).`,
              { duration: 6000, id: `usage-warning-${resource}` }
            );
            newLimitWarnings.push(`${resource}-90`);
          }
        } else if (remaining <= 0) {
          if (!usageLimitReached.includes(`${resource}-100`)) {
            toast.error(
              `🚫 You've reached your ${resource} limit. Upgrade to continue.`,
              { duration: 8000, id: `usage-limit-${resource}` }
            );
            newLimitWarnings.push(`${resource}-100`);
          }
        }
      }
    });
    
    if (newLimitWarnings.length > 0) {
      setUsageLimitReached(prev => [...prev, ...newLimitWarnings]);
    }
  }, [usageLimitReached]);

  // Load subscription data when user is authenticated
  useEffect(() => {
    const loadSubscriptionData = async () => {
      if (!isAuthenticated || !user) {
        setSubscription(null);
        setBillingInfo(null);
        setUsage(null);
        setIsLoading(false);
        setTrialWarningShown(false);
        setUsageLimitReached([]);
        return;
      }

      // Check if we're in test mode first
      if (SubscriptionTestUtils.isTestModeEnabled()) {
        const testState = SubscriptionTestUtils.getTestState();
        if (testState) {
          console.log('🧪 Using test subscription data:', testState);
          setSubscription(testState.subscription);
          setBillingInfo(testState.billingInfo);
          setUsage(testState.usage);
          setIsLoading(false);
          
          // Check trial and usage limits for test data
          checkTrialExpiration(testState.subscription);
          checkUsageLimits(testState.subscription, testState.usage);
          return;
        }
      }

      setIsLoading(true);
      try {
        const [subscriptionData, billingData, usageData] = await Promise.all([
          SubscriptionService.getCurrentSubscription(),
          SubscriptionService.getBillingInfo(),
          SubscriptionService.getUsage()
        ]);

        setSubscription(subscriptionData);
        setBillingInfo(billingData);
        setUsage(usageData);
        
        // Check trial expiration and usage limits
        checkTrialExpiration(subscriptionData);
        checkUsageLimits(subscriptionData, usageData);
        
      } catch (error) {
        console.error('Failed to load subscription data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionData();
  }, [isAuthenticated, user, checkTrialExpiration, checkUsageLimits]);

  // Refresh subscription data
  const refreshSubscription = async () => {
    if (!isAuthenticated) return;
    
    try {
      const subscriptionData = await SubscriptionService.getCurrentSubscription();
      setSubscription(subscriptionData);
    } catch (error) {
      console.error('Failed to refresh subscription:', error);
    }
  };

  // Refresh usage data  
  const refreshUsage = async () => {
    if (!isAuthenticated) return;
    
    try {
      const usageData = await SubscriptionService.getUsage();
      setUsage(usageData);
      
      // Check usage limits when refreshing
      checkUsageLimits(subscription, usageData);
    } catch (error) {
      console.error('Failed to refresh usage:', error);
    }
  };
  
  // Check if a resource usage limit has been reached
  const isUsageLimitReached = useCallback((resource: string): boolean => {
    return SubscriptionService.isUsageLimitReached(subscription, usage, resource);
  }, [subscription, usage]);
  
  // Get usage percentage for a resource
  const getUsagePercentage = useCallback((resource: string): number => {
    const remaining = SubscriptionService.getRemainingUsage(subscription, usage, resource);
    const limit = SubscriptionService.getResourceLimit(subscription, resource);
    
    if (limit === -1 || limit === 0) return 0; // Unlimited or no limit
    return Math.min(100, Math.round(((limit - remaining) / limit) * 100));
  }, [subscription, usage]);
  
  // Get days remaining in trial
  const getTrialDaysRemaining = useCallback((): number => {
    if (!subscription || subscription.status !== 'trial' || !subscription.trialEnd) {
      return 0;
    }
    
    const now = new Date();
    const trialEnd = new Date(subscription.trialEnd);
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.max(0, daysRemaining);
  }, [subscription]);
  
  // Track resource usage (increment usage counters)
  const trackResourceUsage = useCallback(async (resource: 'datasets' | 'charts' | 'reports' | 'exports', count: number = 1) => {
    if (!usage) return;
    
    try {
      // In a real implementation, this would call an API to update usage
      // For now, we'll update local state optimistically
      const updatedUsage = {
        ...usage,
        [resource]: (usage[resource as keyof Usage] as number) + count
      };
      
      setUsage(updatedUsage);
      
      // Check if this puts us over any limits
      checkUsageLimits(subscription, updatedUsage);
      
      // In a real app, sync with backend
      // await SubscriptionService.updateUsage(resource, count);
    } catch (error) {
      console.error('Failed to track resource usage:', error);
    }
  }, [usage, subscription, checkUsageLimits]);

  // Check if user can access a feature
  const canAccess = (feature: string): boolean => {
    return SubscriptionService.canAccess(subscription, feature);
  };

  // Get remaining usage for a resource
  const getRemainingUsage = (resource: string): number => {
    return SubscriptionService.getRemainingUsage(subscription, usage, resource);
  };

  // Generate upgrade URL
  const upgradeUrl = '/pricing';
  
  // Generate manage subscription URL
  const manageSubscriptionUrl = '/account/billing';

  const contextValue: ISubscriptionContext = {
    subscription,
    billingInfo,
    usage,
    isLoading,
    canAccess,
    getRemainingUsage,
    upgradeUrl,
    manageSubscriptionUrl
  };

  // Expose additional methods via context (not in the interface to avoid breaking changes)
  const extendedContextValue = {
    ...contextValue,
    refreshSubscription,
    refreshUsage,
    updateSubscription: setSubscription,
    updateUsage: setUsage,
    isUsageLimitReached,
    getUsagePercentage,
    getTrialDaysRemaining,
    trackResourceUsage
  };

  return (
    <SubscriptionContext.Provider value={extendedContextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// Hook for extended subscription context with additional methods
export const useSubscriptionActions = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionActions must be used within a SubscriptionProvider');
  }
  return context as ISubscriptionContext & {
    refreshSubscription: () => Promise<void>;
    refreshUsage: () => Promise<void>;
    updateSubscription: (subscription: Subscription | null) => void;
    updateUsage: (usage: Usage | null) => void;
    isUsageLimitReached: (resource: string) => boolean;
    getUsagePercentage: (resource: string) => number;
    getTrialDaysRemaining: () => number;
    trackResourceUsage: (resource: 'datasets' | 'charts' | 'reports' | 'exports', count?: number) => Promise<void>;
  };
};
