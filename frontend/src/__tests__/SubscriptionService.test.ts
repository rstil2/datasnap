// @jest/globals
import { SubscriptionService } from '../services/SubscriptionService';
import { PRICING_PLANS } from '../types/subscription';
import { MOCK_SUBSCRIPTIONS, MOCK_USAGE, SubscriptionTestUtils } from '../utils/subscriptionTestUtils';

// Mock API service
jest.mock('../services/api', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

describe('SubscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Feature Access', () => {
    test('free user cannot access premium features', () => {
      expect(SubscriptionService.canAccess(null, 'ai_insights')).toBe(false);
      expect(SubscriptionService.canAccess(null, 'advanced_analytics')).toBe(false);
      expect(SubscriptionService.canAccess(null, 'priority_support')).toBe(false);
      expect(SubscriptionService.canAccess(null, 'custom_branding')).toBe(false);
    });

    test('free user can access basic features', () => {
      expect(SubscriptionService.canAccess(null, 'basic_charts')).toBe(true);
      expect(SubscriptionService.canAccess(null, 'data_upload')).toBe(true);
    });

    test('active pro user can access all features', () => {
      const proSubscription = MOCK_SUBSCRIPTIONS.pro_monthly_active;
      expect(SubscriptionService.canAccess(proSubscription, 'ai_insights')).toBe(true);
      expect(SubscriptionService.canAccess(proSubscription, 'advanced_analytics')).toBe(true);
      expect(SubscriptionService.canAccess(proSubscription, 'priority_support')).toBe(true);
      expect(SubscriptionService.canAccess(proSubscription, 'custom_branding')).toBe(true);
    });

    test('trial user can access premium features', () => {
      const trialSubscription = MOCK_SUBSCRIPTIONS.trial;
      expect(SubscriptionService.canAccess(trialSubscription, 'ai_insights')).toBe(true);
      expect(SubscriptionService.canAccess(trialSubscription, 'advanced_analytics')).toBe(true);
    });

    test('expired trial user cannot access premium features', () => {
      const expiredTrialSubscription = MOCK_SUBSCRIPTIONS.expired_trial;
      expect(SubscriptionService.canAccess(expiredTrialSubscription, 'ai_insights')).toBe(false);
      expect(SubscriptionService.canAccess(expiredTrialSubscription, 'advanced_analytics')).toBe(false);
    });

    test('past due user cannot access premium features', () => {
      const pastDueSubscription = MOCK_SUBSCRIPTIONS.past_due;
      expect(SubscriptionService.canAccess(pastDueSubscription, 'ai_insights')).toBe(false);
      expect(SubscriptionService.canAccess(pastDueSubscription, 'advanced_analytics')).toBe(false);
    });

    test('canceled user still has access until period ends', () => {
      const canceledSubscription = MOCK_SUBSCRIPTIONS.canceled;
      expect(SubscriptionService.canAccess(canceledSubscription, 'ai_insights')).toBe(true);
      expect(SubscriptionService.canAccess(canceledSubscription, 'advanced_analytics')).toBe(true);
    });
  });

  describe('Usage Limits', () => {
    test('free user has correct usage limits', () => {
      const freeUsage = MOCK_USAGE.free_under_limits;
      
      expect(SubscriptionService.getRemainingUsage(null, freeUsage, 'datasets')).toBe(2); // 3 - 1 used
      expect(SubscriptionService.getRemainingUsage(null, freeUsage, 'reports')).toBe(3); // 5 - 2 used
      expect(SubscriptionService.getRemainingUsage(null, freeUsage, 'exports')).toBe(5); // 10 - 5 used
    });

    test('pro user has unlimited usage', () => {
      const proSubscription = MOCK_SUBSCRIPTIONS.pro_monthly_active;
      const proUsage = MOCK_USAGE.pro_light_usage;
      
      expect(SubscriptionService.getRemainingUsage(proSubscription, proUsage, 'datasets')).toBe(-1); // Unlimited
      expect(SubscriptionService.getRemainingUsage(proSubscription, proUsage, 'reports')).toBe(-1); // Unlimited
      expect(SubscriptionService.getRemainingUsage(proSubscription, proUsage, 'exports')).toBe(-1); // Unlimited
    });

    test('usage limit reached correctly detected', () => {
      const atLimitsUsage = MOCK_USAGE.free_at_limits;
      
      expect(SubscriptionService.isUsageLimitReached(null, atLimitsUsage, 'datasets')).toBe(true);
      expect(SubscriptionService.isUsageLimitReached(null, atLimitsUsage, 'reports')).toBe(true);
      expect(SubscriptionService.isUsageLimitReached(null, atLimitsUsage, 'exports')).toBe(true);
    });

    test('usage under limits correctly detected', () => {
      const underLimitsUsage = MOCK_USAGE.free_under_limits;
      
      expect(SubscriptionService.isUsageLimitReached(null, underLimitsUsage, 'datasets')).toBe(false);
      expect(SubscriptionService.isUsageLimitReached(null, underLimitsUsage, 'reports')).toBe(false);
      expect(SubscriptionService.isUsageLimitReached(null, underLimitsUsage, 'exports')).toBe(false);
    });
  });

  describe('Plan Information', () => {
    test('getPricingPlans returns all plans', () => {
      const plans = SubscriptionService.getPricingPlans();
      expect(plans).toHaveLength(3); // free, pro_monthly, pro_yearly
      expect(plans.map(p => p.id)).toEqual(['free', 'pro_monthly', 'pro_yearly']);
    });

    test('getPlanById returns correct plan', () => {
      const freePlan = SubscriptionService.getPlanById('free');
      expect(freePlan?.name).toBe('Free');
      expect(freePlan?.price).toBe(0);

      const proPlan = SubscriptionService.getPlanById('pro_monthly');
      expect(proPlan?.name).toBe('DataSnap Pro');
      expect(proPlan?.price).toBe(15.99);
    });

    test('getPlanById returns undefined for invalid plan', () => {
      const invalidPlan = SubscriptionService.getPlanById('invalid' as any);
      expect(invalidPlan).toBeUndefined();
    });
  });

  describe('Price Formatting', () => {
    test('formats prices correctly', () => {
      expect(SubscriptionService.formatPrice(0)).toBe('$0.00');
      expect(SubscriptionService.formatPrice(15.99)).toBe('$15.99');
      expect(SubscriptionService.formatPrice(100)).toBe('$100.00');
    });
  });

  describe('Yearly Savings Calculation', () => {
    test('calculates yearly savings correctly', () => {
      const savings = SubscriptionService.getYearlySavings();
      const monthlyPrice = 15.99;
      const yearlyPrice = 12.99;
      const expectedSavings = (monthlyPrice * 12) - (yearlyPrice * 12);
      const expectedPercentage = Math.round((expectedSavings / (monthlyPrice * 12)) * 100);

      expect(savings.amount).toBeCloseTo(expectedSavings, 2);
      expect(savings.percentage).toBe(expectedPercentage);
    });
  });
});

describe('SubscriptionTestUtils', () => {
  beforeEach(() => {
    localStorage.clear();
    // Mock NODE_ENV as development
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('test mode can be enabled in development', () => {
    expect(SubscriptionTestUtils.isTestModeEnabled()).toBe(false);
    
    SubscriptionTestUtils.enableTestMode();
    expect(SubscriptionTestUtils.isTestModeEnabled()).toBe(true);
  });

  test('test mode can be disabled', () => {
    SubscriptionTestUtils.enableTestMode();
    expect(SubscriptionTestUtils.isTestModeEnabled()).toBe(true);
    
    SubscriptionTestUtils.disableTestMode();
    expect(SubscriptionTestUtils.isTestModeEnabled()).toBe(false);
  });

  test('cannot enable test mode in production', () => {
    process.env.NODE_ENV = 'production';
    
    SubscriptionTestUtils.enableTestMode();
    expect(SubscriptionTestUtils.isTestModeEnabled()).toBe(false);
  });

  test('can set and get test scenarios', () => {
    SubscriptionTestUtils.enableTestMode();
    SubscriptionTestUtils.setTestScenario('Free User - New');
    
    expect(SubscriptionTestUtils.getCurrentTestScenario()).toBe('Free User - New');
  });

  test('getTestState returns correct scenario data', () => {
    SubscriptionTestUtils.enableTestMode();
    SubscriptionTestUtils.setTestScenario('Pro Monthly - Active');
    
    const testState = SubscriptionTestUtils.getTestState();
    expect(testState?.subscription?.plan).toBe('pro_monthly');
    expect(testState?.subscription?.status).toBe('active');
  });

  test('helper methods work correctly', () => {
    // Mock window.location.reload to prevent actual page reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    SubscriptionTestUtils.testFreeUser();
    expect(SubscriptionTestUtils.isTestModeEnabled()).toBe(true);
    expect(mockReload).toHaveBeenCalled();
  });

  test('returns null when test mode is disabled', () => {
    expect(SubscriptionTestUtils.getTestState()).toBeNull();
    expect(SubscriptionTestUtils.getCurrentTestScenario()).toBeNull();
  });
});

describe('Pricing Plan Validation', () => {
  test('all pricing plans have required fields', () => {
    PRICING_PLANS.forEach(plan => {
      expect(plan.id).toBeDefined();
      expect(plan.name).toBeDefined();
      expect(plan.price).toBeGreaterThanOrEqual(0);
      expect(plan.interval).toMatch(/^(month|year)$/);
      expect(plan.features).toBeInstanceOf(Array);
      expect(plan.features.length).toBeGreaterThan(0);
      expect(plan.limits).toBeDefined();
      expect(typeof plan.limits.maxDatasets).toBe('number');
      expect(typeof plan.limits.maxCharts).toBe('number');
      expect(typeof plan.limits.maxReports).toBe('number');
      expect(typeof plan.limits.maxExports).toBe('number');
      expect(typeof plan.limits.aiInsights).toBe('boolean');
      expect(typeof plan.limits.advancedAnalytics).toBe('boolean');
      expect(typeof plan.limits.prioritySupport).toBe('boolean');
      expect(typeof plan.limits.customBranding).toBe('boolean');
    });
  });

  test('free plan has no premium features', () => {
    const freePlan = PRICING_PLANS.find(p => p.id === 'free');
    expect(freePlan?.limits.aiInsights).toBe(false);
    expect(freePlan?.limits.advancedAnalytics).toBe(false);
    expect(freePlan?.limits.prioritySupport).toBe(false);
    expect(freePlan?.limits.customBranding).toBe(false);
  });

  test('pro plans have all premium features', () => {
    const proPlans = PRICING_PLANS.filter(p => p.id.startsWith('pro_'));
    proPlans.forEach(plan => {
      expect(plan.limits.aiInsights).toBe(true);
      expect(plan.limits.advancedAnalytics).toBe(true);
      expect(plan.limits.prioritySupport).toBe(true);
      expect(plan.limits.customBranding).toBe(true);
      expect(plan.limits.maxDatasets).toBe(-1); // Unlimited
      expect(plan.limits.maxCharts).toBe(-1); // Unlimited
      expect(plan.limits.maxReports).toBe(-1); // Unlimited
      expect(plan.limits.maxExports).toBe(-1); // Unlimited
    });
  });

  test('yearly plan is marked as popular', () => {
    const yearlyPlan = PRICING_PLANS.find(p => p.id === 'pro_yearly');
    expect(yearlyPlan?.popular).toBe(true);
  });
});