// Mac App Store In-App Purchase Service
// Handles StoreKit integration for Electron Mac App Store apps

// Conditional import for Electron modules to avoid browser build issues
let Store: any = null;
if (typeof window !== 'undefined' && window.require) {
  try {
    Store = window.require('electron-store');
  } catch {
    // electron-store not available in browser context
  }
} else if (typeof require !== 'undefined') {
  try {
    Store = require('electron-store');
  } catch {
    // electron-store not available
  }
}

// Product IDs - These must match your App Store Connect configuration
export const PRODUCT_IDS = {
  PRO_MONTHLY: 'com.datasnap.pro.monthly',
  PRO_YEARLY: 'com.datasnap.pro.yearly',
  PREMIUM_MONTHLY: 'com.datasnap.premium.monthly',
  PREMIUM_YEARLY: 'com.datasnap.premium.yearly',
} as const;

export interface Product {
  productId: string;
  price: number;
  localizedPrice: string;
  title: string;
  description: string;
  period?: 'monthly' | 'yearly';
  tier: 'pro' | 'premium';
}

export interface Purchase {
  productId: string;
  transactionId: string;
  purchaseDate: string;
  expiresDate?: string;
  isActive: boolean;
}

export interface SubscriptionStatus {
  isSubscribed: boolean;
  tier: 'free' | 'pro' | 'premium';
  expiresAt?: string;
  autoRenewing: boolean;
  productId?: string;
}

class MacAppStoreIAPService {
  private store: any;
  private products: Product[] = [];
  private isInitialized = false;

  constructor() {
    // Only initialize Store if electron-store is available
    if (Store) {
      this.store = new Store({
        name: 'datasnap-iap',
        defaults: {
          purchases: [],
          subscriptionStatus: {
            isSubscribed: false,
            tier: 'free',
            autoRenewing: false
          }
        }
      });
    } else {
      // Use localStorage fallback when electron-store is not available
      this.store = {
        get: (key: string) => {
          try {
            const data = localStorage.getItem(`datasnap-iap.${key}`);
            return data ? JSON.parse(data) : undefined;
          } catch {
            return undefined;
          }
        },
        set: (key: string, value: any) => {
          try {
            localStorage.setItem(`datasnap-iap.${key}`, JSON.stringify(value));
          } catch {
            // localStorage not available
          }
        }
      };
    }
  }

  // Initialize StoreKit and fetch products
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if running in Mac App Store environment
      if (!this.isMacAppStore()) {
        console.warn('Not running in Mac App Store environment - using mock data');
        this.initializeMockData();
        this.isInitialized = true;
        return;
      }

      // Initialize StoreKit through Electron's main process
      const { ipcRenderer } = await import('electron');
      
      // Request products from StoreKit
      const products = await ipcRenderer.invoke('store-kit-get-products', Object.values(PRODUCT_IDS));
      this.products = this.formatProducts(products);
      
      // Restore previous purchases
      await this.restorePurchases();
      
      this.isInitialized = true;
      console.log('Mac App Store IAP initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Mac App Store IAP:', error);
      this.initializeMockData();
      this.isInitialized = true;
    }
  }

  // Check if running in Mac App Store sandboxed environment
  private isMacAppStore(): boolean {
    if (typeof window !== 'undefined' && window.process) {
      return window.process.mas === true;
    }
    return process.env.NODE_ENV === 'production' && process.platform === 'darwin';
  }

  // Initialize with mock data for development/testing
  private initializeMockData(): void {
    this.products = [
      {
        productId: PRODUCT_IDS.PRO_MONTHLY,
        price: 7.99,
        localizedPrice: '$7.99',
        title: 'DataSnap Pro',
        description: 'Unlimited uploads, advanced analytics, and priority processing',
        period: 'monthly',
        tier: 'pro'
      },
      {
        productId: PRODUCT_IDS.PRO_YEARLY,
        price: 79.99,
        localizedPrice: '$79.99',
        title: 'DataSnap Pro (Annual)',
        description: 'Everything in Pro - Save 17% with annual billing',
        period: 'yearly',
        tier: 'pro'
      },
      {
        productId: PRODUCT_IDS.PREMIUM_MONTHLY,
        price: 14.99,
        localizedPrice: '$14.99',
        title: 'DataSnap Premium',
        description: 'AI insights, custom branding, and priority support',
        period: 'monthly',
        tier: 'premium'
      },
      {
        productId: PRODUCT_IDS.PREMIUM_YEARLY,
        price: 149.99,
        localizedPrice: '$149.99',
        title: 'DataSnap Premium (Annual)',
        description: 'Everything in Premium - Save 17% with annual billing',
        period: 'yearly',
        tier: 'premium'
      }
    ];
  }

  // Format products from StoreKit response
  private formatProducts(storeKitProducts: any[]): Product[] {
    return storeKitProducts.map(product => ({
      productId: product.productIdentifier,
      price: product.price,
      localizedPrice: product.localizedPrice,
      title: product.localizedTitle,
      description: product.localizedDescription,
      period: product.productIdentifier.includes('yearly') ? 'yearly' : 'monthly',
      tier: product.productIdentifier.includes('premium') ? 'premium' : 'pro'
    }));
  }

  // Get available products
  async getProducts(): Promise<Product[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.products;
  }

  // Purchase a product
  async purchaseProduct(productId: string): Promise<boolean> {
    try {
      if (!this.isMacAppStore()) {
        // Mock purchase for development
        return this.mockPurchase(productId);
      }

      const { ipcRenderer } = await import('electron');
      const result = await ipcRenderer.invoke('store-kit-purchase', productId);
      
      if (result.success) {
        await this.handleSuccessfulPurchase(result.transaction);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Purchase failed:', error);
      throw new Error(`Purchase failed: ${error.message}`);
    }
  }

  // Mock purchase for development/testing
  private async mockPurchase(productId: string): Promise<boolean> {
    const product = this.products.find(p => p.productId === productId);
    if (!product) return false;

    const mockTransaction = {
      productId,
      transactionId: `mock_${Date.now()}`,
      purchaseDate: new Date().toISOString(),
      expiresDate: product.period === 'yearly' 
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    await this.handleSuccessfulPurchase(mockTransaction);
    return true;
  }

  // Handle successful purchase
  private async handleSuccessfulPurchase(transaction: any): Promise<void> {
    const purchase: Purchase = {
      productId: transaction.productId,
      transactionId: transaction.transactionId,
      purchaseDate: transaction.purchaseDate,
      expiresDate: transaction.expiresDate,
      isActive: true
    };

    // Store purchase
    const purchases = this.store.get('purchases') as Purchase[];
    purchases.push(purchase);
    this.store.set('purchases', purchases);

    // Update subscription status
    await this.updateSubscriptionStatus();

    console.log('Purchase completed successfully:', purchase);
  }

  // Restore previous purchases
  async restorePurchases(): Promise<void> {
    try {
      if (!this.isMacAppStore()) {
        console.log('Restore purchases called in development mode');
        return;
      }

      const { ipcRenderer } = await import('electron');
      const transactions = await ipcRenderer.invoke('store-kit-restore-purchases');
      
      // Clear existing purchases
      this.store.set('purchases', []);
      
      // Process restored transactions
      for (const transaction of transactions) {
        await this.handleSuccessfulPurchase(transaction);
      }
      
      await this.updateSubscriptionStatus();
      console.log('Purchases restored successfully');
      
    } catch (error) {
      console.error('Failed to restore purchases:', error);
    }
  }

  // Update subscription status based on purchases
  private async updateSubscriptionStatus(): Promise<void> {
    const purchases = this.store.get('purchases') as Purchase[];
    const now = new Date();
    
    // Find active subscription
    const activeSubscription = purchases
      .filter(purchase => {
        if (!purchase.expiresDate) return false;
        return new Date(purchase.expiresDate) > now;
      })
      .sort((a, b) => {
        // Sort by tier priority (premium > pro) and expiry date
        const aTier = a.productId.includes('premium') ? 2 : 1;
        const bTier = b.productId.includes('premium') ? 2 : 1;
        if (aTier !== bTier) return bTier - aTier;
        return new Date(b.expiresDate!).getTime() - new Date(a.expiresDate!).getTime();
      })[0];

    const subscriptionStatus: SubscriptionStatus = activeSubscription ? {
      isSubscribed: true,
      tier: activeSubscription.productId.includes('premium') ? 'premium' : 'pro',
      expiresAt: activeSubscription.expiresDate,
      autoRenewing: true, // Assume auto-renewing for subscriptions
      productId: activeSubscription.productId
    } : {
      isSubscribed: false,
      tier: 'free',
      autoRenewing: false
    };

    this.store.set('subscriptionStatus', subscriptionStatus);
  }

  // Get current subscription status
  getSubscriptionStatus(): SubscriptionStatus {
    return this.store.get('subscriptionStatus') as SubscriptionStatus;
  }

  // Get all purchases
  getPurchases(): Purchase[] {
    return this.store.get('purchases') as Purchase[];
  }

  // Check if user has access to specific features
  hasFeatureAccess(feature: 'unlimited_uploads' | 'advanced_analytics' | 'ai_insights' | 'priority_support'): boolean {
    const status = this.getSubscriptionStatus();
    
    if (!status.isSubscribed) return false;
    
    const featureMap = {
      'unlimited_uploads': ['pro', 'premium'],
      'advanced_analytics': ['pro', 'premium'], 
      'ai_insights': ['premium'],
      'priority_support': ['premium']
    };
    
    return featureMap[feature]?.includes(status.tier) || false;
  }

  // Cancel subscription (redirect to App Store)
  async cancelSubscription(): Promise<void> {
    if (this.isMacAppStore()) {
      const { shell } = await import('electron');
      await shell.openExternal('macappstore://showSubscriptions');
    } else {
      console.log('Cancel subscription called in development mode');
    }
  }
}

// Export singleton instance
export const macAppStoreIAP = new MacAppStoreIAPService();
export default macAppStoreIAP;