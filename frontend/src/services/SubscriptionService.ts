import { apiService } from './api';
import { 
  Subscription, 
  BillingInfo, 
  Usage, 
  SubscriptionPlan, 
  PricingPlan, 
  PRICING_PLANS 
} from '../types/subscription';

export interface CreateCheckoutSessionRequest {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface CreatePortalSessionRequest {
  returnUrl: string;
}

export interface CreatePortalSessionResponse {
  url: string;
}

export class SubscriptionService {
  
  /**
   * Get current user's subscription
   */
  static async getCurrentSubscription(): Promise<Subscription | null> {
    try {
      const response = await apiService.get('/subscription/current');
      if (response.subscription) {
        return {
          ...response.subscription,
          currentPeriodStart: new Date(response.subscription.currentPeriodStart),
          currentPeriodEnd: new Date(response.subscription.currentPeriodEnd),
          trialEnd: response.subscription.trialEnd ? new Date(response.subscription.trialEnd) : undefined,
          createdAt: new Date(response.subscription.createdAt),
          updatedAt: new Date(response.subscription.updatedAt)
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      return null;
    }
  }

  /**
   * Get billing information
   */
  static async getBillingInfo(): Promise<BillingInfo | null> {
    try {
      const response = await apiService.get('/subscription/billing');
      return response.billingInfo || null;
    } catch (error) {
      console.error('Failed to fetch billing info:', error);
      return null;
    }
  }

  /**
   * Get usage statistics
   */
  static async getUsage(period?: string): Promise<Usage | null> {
    try {
      const params = period ? { period } : {};
      const response = await apiService.get('/subscription/usage', { params });
      return response.usage || null;
    } catch (error) {
      console.error('Failed to fetch usage:', error);
      return null;
    }
  }

  /**
   * Create Stripe checkout session
   */
  static async createCheckoutSession(request: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> {
    try {
      const response = await apiService.post('/subscription/create-checkout-session', request);
      return response;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw new Error('Failed to initiate checkout. Please try again.');
    }
  }

  /**
   * Create Stripe customer portal session
   */
  static async createPortalSession(request: CreatePortalSessionRequest): Promise<CreatePortalSessionResponse> {
    try {
      const response = await apiService.post('/subscription/create-portal-session', request);
      return response;
    } catch (error) {
      console.error('Failed to create portal session:', error);
      throw new Error('Failed to access billing portal. Please try again.');
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(cancelAtPeriodEnd: boolean = true): Promise<Subscription> {
    try {
      const response = await apiService.post('/subscription/cancel', { cancelAtPeriodEnd });
      return {
        ...response.subscription,
        currentPeriodStart: new Date(response.subscription.currentPeriodStart),
        currentPeriodEnd: new Date(response.subscription.currentPeriodEnd),
        trialEnd: response.subscription.trialEnd ? new Date(response.subscription.trialEnd) : undefined,
        createdAt: new Date(response.subscription.createdAt),
        updatedAt: new Date(response.subscription.updatedAt)
      };
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw new Error('Failed to cancel subscription. Please try again.');
    }
  }

  /**
   * Resume subscription
   */
  static async resumeSubscription(): Promise<Subscription> {
    try {
      const response = await apiService.post('/subscription/resume');
      return {
        ...response.subscription,
        currentPeriodStart: new Date(response.subscription.currentPeriodStart),
        currentPeriodEnd: new Date(response.subscription.currentPeriodEnd),
        trialEnd: response.subscription.trialEnd ? new Date(response.subscription.trialEnd) : undefined,
        createdAt: new Date(response.subscription.createdAt),
        updatedAt: new Date(response.subscription.updatedAt)
      };
    } catch (error) {
      console.error('Failed to resume subscription:', error);
      throw new Error('Failed to resume subscription. Please try again.');
    }
  }

  /**
   * Start free trial
   */
  static async startFreeTrial(): Promise<Subscription> {
    try {
      const response = await apiService.post('/subscription/start-trial');
      return {
        ...response.subscription,
        currentPeriodStart: new Date(response.subscription.currentPeriodStart),
        currentPeriodEnd: new Date(response.subscription.currentPeriodEnd),
        trialEnd: response.subscription.trialEnd ? new Date(response.subscription.trialEnd) : undefined,
        createdAt: new Date(response.subscription.createdAt),
        updatedAt: new Date(response.subscription.updatedAt)
      };
    } catch (error) {
      console.error('Failed to start trial:', error);
      throw new Error('Failed to start trial. Please try again.');
    }
  }

  /**
   * Get pricing plans
   */
  static getPricingPlans(): PricingPlan[] {
    return PRICING_PLANS;
  }

  /**
   * Get plan by ID
   */
  static getPlanById(planId: SubscriptionPlan): PricingPlan | undefined {
    return PRICING_PLANS.find(plan => plan.id === planId);
  }

  /**
   * Check if user can access a feature
   */
  static canAccess(subscription: Subscription | null, feature: string): boolean {
    if (!subscription) {
      // Free plan access
      return this.getFreePlanAccess(feature);
    }

    const plan = this.getPlanById(subscription.plan);
    if (!plan) return false;

    // Check subscription status
    if (subscription.status !== 'active' && subscription.status !== 'trial') {
      return this.getFreePlanAccess(feature);
    }

    // Check trial expiry
    if (subscription.status === 'trial' && subscription.trialEnd && subscription.trialEnd < new Date()) {
      return this.getFreePlanAccess(feature);
    }

    switch (feature) {
      case 'ai_insights':
        return plan.limits.aiInsights;
      case 'advanced_analytics':
        return plan.limits.advancedAnalytics;
      case 'priority_support':
        return plan.limits.prioritySupport;
      case 'custom_branding':
        return plan.limits.customBranding;
      default:
        return true; // Basic features are available to all plans
    }
  }

  /**
   * Get remaining usage for a resource
   */
  static getRemainingUsage(subscription: Subscription | null, usage: Usage | null, resource: string): number {
    if (!subscription) {
      // Free plan limits
      const freePlan = PRICING_PLANS.find(p => p.id === 'free');
      if (!freePlan) return 0;
      
      const currentUsage = usage ? this.getUsageForResource(usage, resource) : 0;
      const limit = this.getLimitForResource(freePlan, resource);
      
      return limit === -1 ? -1 : Math.max(0, limit - currentUsage);
    }

    const plan = this.getPlanById(subscription.plan);
    if (!plan) return 0;

    const limit = this.getLimitForResource(plan, resource);
    if (limit === -1) return -1; // Unlimited

    const currentUsage = usage ? this.getUsageForResource(usage, resource) : 0;
    return Math.max(0, limit - currentUsage);
  }

  /**
   * Check if usage limit is reached
   */
  static isUsageLimitReached(subscription: Subscription | null, usage: Usage | null, resource: string): boolean {
    const remaining = this.getRemainingUsage(subscription, usage, resource);
    return remaining === 0;
  }

  /**
   * Get the limit for a specific resource
   */
  static getResourceLimit(subscription: Subscription | null, resource: string): number {
    if (!subscription) {
      // Free plan limits
      const freePlan = PRICING_PLANS.find(p => p.id === 'free');
      if (!freePlan) return 0;
      return this.getLimitForResource(freePlan, resource);
    }

    const plan = this.getPlanById(subscription.plan);
    if (!plan) return 0;

    return this.getLimitForResource(plan, resource);
  }

  private static getFreePlanAccess(feature: string): boolean {
    switch (feature) {
      case 'ai_insights':
      case 'advanced_analytics':
      case 'priority_support':
      case 'custom_branding':
        return false;
      default:
        return true;
    }
  }

  private static getUsageForResource(usage: Usage, resource: string): number {
    switch (resource) {
      case 'datasets':
        return usage.datasets;
      case 'charts':
        return usage.charts;
      case 'reports':
        return usage.reports;
      case 'exports':
        return usage.exports;
      case 'ai_insights':
        return usage.aiInsightRequests;
      default:
        return 0;
    }
  }

  private static getLimitForResource(plan: PricingPlan, resource: string): number {
    switch (resource) {
      case 'datasets':
        return plan.limits.maxDatasets;
      case 'charts':
        return plan.limits.maxCharts;
      case 'reports':
        return plan.limits.maxReports;
      case 'exports':
        return plan.limits.maxExports;
      default:
        return -1; // Unlimited for unknown resources
    }
  }

  /**
   * Format price for display
   */
  static formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }

  /**
   * Calculate yearly savings
   */
  static getYearlySavings(): { amount: number; percentage: number } {
    const monthlyPlan = PRICING_PLANS.find(p => p.id === 'pro_monthly');
    const yearlyPlan = PRICING_PLANS.find(p => p.id === 'pro_yearly');
    
    if (!monthlyPlan || !yearlyPlan) {
      return { amount: 0, percentage: 0 };
    }

    const monthlyYearlyTotal = monthlyPlan.price * 12;
    const yearlyTotal = yearlyPlan.price * 12;
    const savings = monthlyYearlyTotal - yearlyTotal;
    const percentage = Math.round((savings / monthlyYearlyTotal) * 100);

    return { amount: savings, percentage };
  }
}