export type SubscriptionStatus = 'active' | 'inactive' | 'trial' | 'past_due' | 'canceled' | 'incomplete';

export type SubscriptionPlan = 'free' | 'pro_monthly' | 'pro_yearly';

export interface PricingPlan {
  id: SubscriptionPlan;
  name: string;
  price: number;
  interval: 'month' | 'year';
  intervalCount: 1;
  features: string[];
  popular?: boolean;
  stripePriceId?: string;
  limits: {
    maxDatasets: number;
    maxCharts: number;
    maxReports: number;
    maxExports: number;
    aiInsights: boolean;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
  };
}

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingInfo {
  customerId: string;
  paymentMethodId?: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  billingEmail: string;
  billingName?: string;
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface Usage {
  period: string; // YYYY-MM format
  datasets: number;
  charts: number;
  reports: number;
  exports: number;
  aiInsightRequests: number;
}

export interface SubscriptionContext {
  subscription: Subscription | null;
  billingInfo: BillingInfo | null;
  usage: Usage | null;
  isLoading: boolean;
  canAccess: (feature: string) => boolean;
  getRemainingUsage: (resource: string) => number;
  upgradeUrl: string;
  manageSubscriptionUrl: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    intervalCount: 1,
    features: [
      'Up to 3 datasets',
      'Basic charts',
      '5 reports per month',
      '10 exports per month',
      'Community support'
    ],
    limits: {
      maxDatasets: 3,
      maxCharts: 10,
      maxReports: 5,
      maxExports: 10,
      aiInsights: false,
      advancedAnalytics: false,
      prioritySupport: false,
      customBranding: false
    }
  },
  {
    id: 'pro_monthly',
    name: 'DataSnap Pro',
    price: 15.99,
    interval: 'month',
    intervalCount: 1,
    features: [
      'Unlimited datasets',
      'Advanced visualizations',
      'Unlimited reports',
      'Unlimited exports',
      'AI-powered insights',
      'Statistical test wizard',
      'Custom branding',
      'Priority support',
      'Advanced analytics'
    ],
    limits: {
      maxDatasets: -1, // unlimited
      maxCharts: -1,
      maxReports: -1,
      maxExports: -1,
      aiInsights: true,
      advancedAnalytics: true,
      prioritySupport: true,
      customBranding: true
    },
    stripePriceId: 'price_datasnap_pro_monthly' // Replace with actual Stripe price ID
  },
  {
    id: 'pro_yearly',
    name: 'DataSnap Pro (Annual)',
    price: 12.99,
    interval: 'year',
    intervalCount: 1,
    popular: true,
    features: [
      'Unlimited datasets',
      'Advanced visualizations', 
      'Unlimited reports',
      'Unlimited exports',
      'AI-powered insights',
      'Statistical test wizard',
      'Custom branding',
      'Priority support',
      'Advanced analytics',
      '💰 Save $36/year (19% off)'
    ],
    limits: {
      maxDatasets: -1,
      maxCharts: -1,
      maxReports: -1,
      maxExports: -1,
      aiInsights: true,
      advancedAnalytics: true,
      prioritySupport: true,
      customBranding: true
    },
    stripePriceId: 'price_datasnap_pro_yearly' // Replace with actual Stripe price ID
  }
];