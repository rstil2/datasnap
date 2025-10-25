// Development utilities for testing subscription functionality
// Only available in development mode

import { Subscription, Usage, BillingInfo, SubscriptionPlan, SubscriptionStatus } from '../types/subscription';

export interface TestSubscriptionState {
  subscription: Subscription | null;
  usage: Usage | null;
  billingInfo: BillingInfo | null;
}

// Mock subscription data for different test scenarios
export const MOCK_SUBSCRIPTIONS = {
  free: null,
  
  pro_monthly_active: {
    id: 'sub_test_pro_monthly',
    userId: 'user_test_123',
    plan: 'pro_monthly' as SubscriptionPlan,
    status: 'active' as SubscriptionStatus,
    currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    cancelAtPeriodEnd: false,
    stripeSubscriptionId: 'sub_test_stripe_123',
    stripeCustomerId: 'cus_test_stripe_456',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  } as Subscription,
  
  pro_yearly_active: {
    id: 'sub_test_pro_yearly',
    userId: 'user_test_123',
    plan: 'pro_yearly' as SubscriptionPlan,
    status: 'active' as SubscriptionStatus,
    currentPeriodStart: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    currentPeriodEnd: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000), // ~9 months from now
    cancelAtPeriodEnd: false,
    stripeSubscriptionId: 'sub_test_stripe_yearly_123',
    stripeCustomerId: 'cus_test_stripe_456',
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  } as Subscription,
  
  trial: {
    id: 'sub_test_trial',
    userId: 'user_test_123',
    plan: 'pro_monthly' as SubscriptionPlan,
    status: 'trial' as SubscriptionStatus,
    currentPeriodStart: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    currentPeriodEnd: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000), // 11 days from now
    cancelAtPeriodEnd: false,
    trialEnd: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
    stripeCustomerId: 'cus_test_stripe_456',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  } as Subscription,
  
  expired_trial: {
    id: 'sub_test_expired_trial',
    userId: 'user_test_123',
    plan: 'pro_monthly' as SubscriptionPlan,
    status: 'trial' as SubscriptionStatus,
    currentPeriodStart: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
    currentPeriodEnd: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago (expired)
    cancelAtPeriodEnd: false,
    trialEnd: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // expired 6 days ago
    stripeCustomerId: 'cus_test_stripe_456',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
  } as Subscription,
  
  canceled: {
    id: 'sub_test_canceled',
    userId: 'user_test_123',
    plan: 'pro_monthly' as SubscriptionPlan,
    status: 'active' as SubscriptionStatus, // Still active until period ends
    currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: true, // Canceled but still active
    stripeSubscriptionId: 'sub_test_stripe_canceled_123',
    stripeCustomerId: 'cus_test_stripe_456',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  } as Subscription,
  
  past_due: {
    id: 'sub_test_past_due',
    userId: 'user_test_123',
    plan: 'pro_monthly' as SubscriptionPlan,
    status: 'past_due' as SubscriptionStatus,
    currentPeriodStart: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days overdue
    cancelAtPeriodEnd: false,
    stripeSubscriptionId: 'sub_test_stripe_past_due_123',
    stripeCustomerId: 'cus_test_stripe_456',
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  } as Subscription
};

// Mock usage data for different scenarios
export const MOCK_USAGE = {
  free_under_limits: {
    period: '2024-01',
    datasets: 1,
    charts: 3,
    reports: 2,
    exports: 5,
    aiInsightRequests: 0
  } as Usage,
  
  free_at_limits: {
    period: '2024-01',
    datasets: 3,
    charts: 10,
    reports: 5,
    exports: 10,
    aiInsightRequests: 0
  } as Usage,
  
  free_over_limits: {
    period: '2024-01',
    datasets: 5,
    charts: 15,
    reports: 8,
    exports: 12,
    aiInsightRequests: 0
  } as Usage,
  
  pro_light_usage: {
    period: '2024-01',
    datasets: 10,
    charts: 25,
    reports: 15,
    exports: 30,
    aiInsightRequests: 5
  } as Usage,
  
  pro_heavy_usage: {
    period: '2024-01',
    datasets: 50,
    charts: 200,
    reports: 100,
    exports: 150,
    aiInsightRequests: 75
  } as Usage
};

// Mock billing info
export const MOCK_BILLING_INFO: BillingInfo = {
  customerId: 'cus_test_stripe_456',
  paymentMethodId: 'pm_test_visa_123',
  last4: '4242',
  brand: 'visa',
  expiryMonth: 12,
  expiryYear: 2025,
  billingEmail: 'test@example.com',
  billingName: 'Test User',
  billingAddress: {
    line1: '123 Test Street',
    city: 'Test City',
    state: 'CA',
    postalCode: '12345',
    country: 'US'
  }
};

// Test scenarios
export const TEST_SCENARIOS = {
  'Free User - New': {
    subscription: MOCK_SUBSCRIPTIONS.free,
    usage: MOCK_USAGE.free_under_limits,
    billingInfo: null,
    description: 'New user on free plan with minimal usage'
  },
  'Free User - At Limits': {
    subscription: MOCK_SUBSCRIPTIONS.free,
    usage: MOCK_USAGE.free_at_limits,
    billingInfo: null,
    description: 'Free user who has hit their usage limits'
  },
  'Free User - Over Limits': {
    subscription: MOCK_SUBSCRIPTIONS.free,
    usage: MOCK_USAGE.free_over_limits,
    billingInfo: null,
    description: 'Free user who has exceeded limits (should be blocked)'
  },
  'Pro Monthly - Active': {
    subscription: MOCK_SUBSCRIPTIONS.pro_monthly_active,
    usage: MOCK_USAGE.pro_light_usage,
    billingInfo: MOCK_BILLING_INFO,
    description: 'Active Pro monthly subscriber with normal usage'
  },
  'Pro Yearly - Active': {
    subscription: MOCK_SUBSCRIPTIONS.pro_yearly_active,
    usage: MOCK_USAGE.pro_heavy_usage,
    billingInfo: MOCK_BILLING_INFO,
    description: 'Active Pro yearly subscriber with heavy usage'
  },
  'Trial - Active': {
    subscription: MOCK_SUBSCRIPTIONS.trial,
    usage: MOCK_USAGE.pro_light_usage,
    billingInfo: null,
    description: 'User on active free trial'
  },
  'Trial - Expired': {
    subscription: MOCK_SUBSCRIPTIONS.expired_trial,
    usage: MOCK_USAGE.pro_light_usage,
    billingInfo: null,
    description: 'User with expired trial (should revert to free)'
  },
  'Pro - Canceled': {
    subscription: MOCK_SUBSCRIPTIONS.canceled,
    usage: MOCK_USAGE.pro_light_usage,
    billingInfo: MOCK_BILLING_INFO,
    description: 'Pro user who canceled but still has access until period ends'
  },
  'Pro - Past Due': {
    subscription: MOCK_SUBSCRIPTIONS.past_due,
    usage: MOCK_USAGE.pro_light_usage,
    billingInfo: MOCK_BILLING_INFO,
    description: 'Pro user with failed payment (should lose access)'
  }
};

// Local storage keys for development testing
const STORAGE_KEYS = {
  TEST_MODE: 'datasnap_subscription_test_mode',
  TEST_SCENARIO: 'datasnap_subscription_test_scenario',
  CUSTOM_STATE: 'datasnap_subscription_custom_state'
};

export class SubscriptionTestUtils {
  static isTestModeEnabled(): boolean {
    if (process.env.NODE_ENV !== 'development') return false;
    return localStorage.getItem(STORAGE_KEYS.TEST_MODE) === 'true';
  }

  static enableTestMode(): void {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Test mode can only be enabled in development');
      return;
    }
    localStorage.setItem(STORAGE_KEYS.TEST_MODE, 'true');
    console.log('🧪 Subscription test mode enabled');
  }

  static disableTestMode(): void {
    localStorage.removeItem(STORAGE_KEYS.TEST_MODE);
    localStorage.removeItem(STORAGE_KEYS.TEST_SCENARIO);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_STATE);
    console.log('✅ Subscription test mode disabled');
  }

  static setTestScenario(scenarioName: keyof typeof TEST_SCENARIOS): void {
    if (!this.isTestModeEnabled()) {
      console.warn('Enable test mode first');
      return;
    }
    
    localStorage.setItem(STORAGE_KEYS.TEST_SCENARIO, scenarioName);
    console.log(`🔄 Test scenario set to: ${scenarioName}`);
    
    // Trigger a page refresh to apply the new scenario
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  static getCurrentTestScenario(): keyof typeof TEST_SCENARIOS | null {
    if (!this.isTestModeEnabled()) return null;
    return localStorage.getItem(STORAGE_KEYS.TEST_SCENARIO) as keyof typeof TEST_SCENARIOS;
  }

  static getTestState(): TestSubscriptionState | null {
    if (!this.isTestModeEnabled()) return null;
    
    const scenarioName = this.getCurrentTestScenario();
    if (scenarioName && TEST_SCENARIOS[scenarioName]) {
      return TEST_SCENARIOS[scenarioName];
    }
    
    // Check for custom state
    const customState = localStorage.getItem(STORAGE_KEYS.CUSTOM_STATE);
    if (customState) {
      try {
        return JSON.parse(customState);
      } catch (e) {
        console.error('Failed to parse custom test state:', e);
      }
    }
    
    return null;
  }

  static setCustomTestState(state: TestSubscriptionState): void {
    if (!this.isTestModeEnabled()) {
      console.warn('Enable test mode first');
      return;
    }
    
    localStorage.setItem(STORAGE_KEYS.CUSTOM_STATE, JSON.stringify(state));
    localStorage.removeItem(STORAGE_KEYS.TEST_SCENARIO); // Clear predefined scenario
    console.log('🎛️ Custom test state applied');
    
    // Trigger a page refresh to apply the new state
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  static listAvailableScenarios(): void {
    console.log('📋 Available test scenarios:');
    Object.entries(TEST_SCENARIOS).forEach(([key, scenario]) => {
      console.log(`  ${key}: ${scenario.description}`);
    });
  }

  // Helper methods for quick testing
  static testFreeUser(): void {
    this.enableTestMode();
    this.setTestScenario('Free User - New');
  }

  static testFreeLimits(): void {
    this.enableTestMode();
    this.setTestScenario('Free User - At Limits');
  }

  static testProUser(): void {
    this.enableTestMode();
    this.setTestScenario('Pro Monthly - Active');
  }

  static testTrial(): void {
    this.enableTestMode();
    this.setTestScenario('Trial - Active');
  }

  static testExpiredTrial(): void {
    this.enableTestMode();
    this.setTestScenario('Trial - Expired');
  }
}

// Make utilities available globally in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).SubscriptionTestUtils = SubscriptionTestUtils;
  (window as any).TEST_SCENARIOS = TEST_SCENARIOS;
  console.log('🔧 Subscription test utilities loaded. Use SubscriptionTestUtils in console.');
}