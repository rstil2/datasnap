import { apiService } from './api';

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_trial';

export interface PromoCode {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number; // percentage (0-100) or fixed amount in cents
  maxRedemptions: number;
  currentRedemptions: number;
  validFrom: Date;
  validUntil: Date;
  applicablePlans: string[];
  description: string;
  isActive: boolean;
  minOrderAmount?: number; // in cents
  firstTimeUsersOnly?: boolean;
  trialExtensionDays?: number; // for free_trial type
  createdAt: Date;
  updatedAt: Date;
}

export interface PromoCodeValidationResult {
  isValid: boolean;
  promoCode?: PromoCode;
  discount?: {
    type: DiscountType;
    value: number;
    formattedValue: string;
    finalPrice: number;
    savings: number;
  };
  error?: string;
}

export interface PromoCodeApplicationResult {
  success: boolean;
  checkoutSessionId?: string;
  checkoutUrl?: string;
  appliedDiscount?: {
    originalPrice: number;
    discountAmount: number;
    finalPrice: number;
    promoCode: string;
  };
  error?: string;
}

class PromoCodeService {
  private static readonly PROMO_CODE_REGEX = /^[A-Z0-9]{4,20}$/;

  /**
   * Validate a promo code format
   */
  static isValidFormat(code: string): boolean {
    return this.PROMO_CODE_REGEX.test(code.toUpperCase());
  }

  /**
   * Validate a promo code and calculate discount
   */
  static async validatePromoCode(
    code: string, 
    planId: string, 
    userId?: string
  ): Promise<PromoCodeValidationResult> {
    try {
      if (!this.isValidFormat(code)) {
        return {
          isValid: false,
          error: 'Invalid promo code format'
        };
      }

      // In development mode, return mock validation
      if (process.env.VITE_DEVELOPMENT_MODE === 'true') {
        return this.getMockPromoValidation(code, planId);
      }

      const response = await fetch('/api/v1/promo-codes/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.toUpperCase(),
          planId,
          userId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          isValid: false,
          error: error.message || 'Failed to validate promo code'
        };
      }

      const result = await response.json();
      
      return {
        isValid: result.isValid,
        promoCode: result.promoCode ? {
          ...result.promoCode,
          validFrom: new Date(result.promoCode.validFrom),
          validUntil: new Date(result.promoCode.validUntil),
          createdAt: new Date(result.promoCode.createdAt),
          updatedAt: new Date(result.promoCode.updatedAt)
        } : undefined,
        discount: result.discount,
        error: result.error
      };
    } catch (error) {
      console.error('Promo code validation error:', error);
      return {
        isValid: false,
        error: 'Failed to validate promo code. Please try again.'
      };
    }
  }

  /**
   * Apply a promo code to a checkout session
   */
  static async applyPromoCode(
    code: string,
    planId: string,
    successUrl: string,
    cancelUrl: string,
    userId?: string
  ): Promise<PromoCodeApplicationResult> {
    try {
      // First validate the promo code
      const validation = await this.validatePromoCode(code, planId, userId);
      
      if (!validation.isValid || !validation.promoCode) {
        return {
          success: false,
          error: validation.error || 'Invalid promo code'
        };
      }

      // In development mode, return mock application
      if (process.env.VITE_DEVELOPMENT_MODE === 'true') {
        return this.getMockPromoApplication(code, planId, validation);
      }

      const response = await fetch('/api/v1/promo-codes/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.toUpperCase(),
          planId,
          successUrl,
          cancelUrl,
          userId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to apply promo code'
        };
      }

      return await response.json();
    } catch (error) {
      console.error('Promo code application error:', error);
      return {
        success: false,
        error: 'Failed to apply promo code. Please try again.'
      };
    }
  }

  /**
   * Get user's promo code usage history
   */
  static async getUserPromoHistory(userId: string): Promise<Array<{
    id: string;
    code: string;
    usedAt: Date;
    discountType: DiscountType;
    discountValue: number;
    planId: string;
    amountSaved: number;
  }>> {
    try {
      if (process.env.VITE_DEVELOPMENT_MODE === 'true') {
        return this.getMockPromoHistory();
      }

      const response = await fetch(`/api/v1/promo-codes/history/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch promo code history');
      }

      const history = await response.json();
      
      return history.map((item: any) => ({
        ...item,
        usedAt: new Date(item.usedAt)
      }));
    } catch (error) {
      console.error('Failed to fetch promo code history:', error);
      return [];
    }
  }

  /**
   * Generate a referral promo code for a user
   */
  static async generateReferralCode(userId: string, userName: string): Promise<{
    success: boolean;
    promoCode?: PromoCode;
    error?: string;
  }> {
    try {
      if (process.env.VITE_DEVELOPMENT_MODE === 'true') {
        const code = this.generateReferralCodeFromName(userName);
        return {
          success: true,
          promoCode: this.createMockReferralCode(code, userId)
        };
      }

      const response = await fetch('/api/v1/promo-codes/referral/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, userName })
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to generate referral code'
        };
      }

      const result = await response.json();
      
      return {
        success: true,
        promoCode: {
          ...result.promoCode,
          validFrom: new Date(result.promoCode.validFrom),
          validUntil: new Date(result.promoCode.validUntil),
          createdAt: new Date(result.promoCode.createdAt),
          updatedAt: new Date(result.promoCode.updatedAt)
        }
      };
    } catch (error) {
      console.error('Failed to generate referral code:', error);
      return {
        success: false,
        error: 'Failed to generate referral code. Please try again.'
      };
    }
  }

  /**
   * Format discount value for display
   */
  static formatDiscount(discountType: DiscountType, discountValue: number): string {
    switch (discountType) {
      case 'percentage':
        return `${discountValue}% off`;
      case 'fixed_amount':
        return `$${(discountValue / 100).toFixed(2)} off`;
      case 'free_trial':
        return `${discountValue} days free trial`;
      default:
        return 'Discount';
    }
  }

  /**
   * Calculate final price after discount
   */
  static calculateDiscountedPrice(
    originalPrice: number, // in cents
    discountType: DiscountType,
    discountValue: number
  ): { finalPrice: number; savings: number } {
    let savings = 0;
    let finalPrice = originalPrice;

    switch (discountType) {
      case 'percentage':
        savings = Math.round((originalPrice * discountValue) / 100);
        finalPrice = originalPrice - savings;
        break;
      case 'fixed_amount':
        savings = Math.min(discountValue, originalPrice);
        finalPrice = Math.max(0, originalPrice - discountValue);
        break;
      case 'free_trial':
        // For free trials, no immediate price change but extended trial
        savings = 0;
        finalPrice = originalPrice;
        break;
    }

    return { finalPrice, savings };
  }

  // Mock data and functions for development

  private static getMockPromoValidation(code: string, planId: string): PromoCodeValidationResult {
    const mockPromoCodes: Record<string, Partial<PromoCode>> = {
      'WELCOME20': {
        code: 'WELCOME20',
        discountType: 'percentage',
        discountValue: 20,
        description: '20% off your first subscription'
      },
      'SAVE10': {
        code: 'SAVE10',
        discountType: 'fixed_amount',
        discountValue: 1000, // $10 in cents
        description: '$10 off any plan'
      },
      'TRIAL30': {
        code: 'TRIAL30',
        discountType: 'free_trial',
        discountValue: 30,
        trialExtensionDays: 30,
        description: 'Extended 30-day free trial'
      },
      'EXPIRED': {
        code: 'EXPIRED',
        discountType: 'percentage',
        discountValue: 50,
        description: 'Expired promo code'
      }
    };

    const upperCode = code.toUpperCase();
    const mockPromo = mockPromoCodes[upperCode];

    if (!mockPromo) {
      return {
        isValid: false,
        error: 'Promo code not found'
      };
    }

    if (upperCode === 'EXPIRED') {
      return {
        isValid: false,
        error: 'This promo code has expired'
      };
    }

    // Mock price calculation (assuming $15.99 plan)
    const originalPrice = 1599; // $15.99 in cents
    const discount = this.calculateDiscountedPrice(originalPrice, mockPromo.discountType!, mockPromo.discountValue!);

    return {
      isValid: true,
      promoCode: this.createMockPromoCode(mockPromo),
      discount: {
        type: mockPromo.discountType!,
        value: mockPromo.discountValue!,
        formattedValue: this.formatDiscount(mockPromo.discountType!, mockPromo.discountValue!),
        finalPrice: discount.finalPrice,
        savings: discount.savings
      }
    };
  }

  private static getMockPromoApplication(
    code: string, 
    planId: string, 
    validation: PromoCodeValidationResult
  ): PromoCodeApplicationResult {
    if (!validation.discount) {
      return {
        success: false,
        error: 'Invalid discount calculation'
      };
    }

    return {
      success: true,
      checkoutSessionId: `mock_session_${Date.now()}`,
      checkoutUrl: `/checkout/mock?code=${code}&plan=${planId}`,
      appliedDiscount: {
        originalPrice: 1599,
        discountAmount: validation.discount.savings,
        finalPrice: validation.discount.finalPrice,
        promoCode: code
      }
    };
  }

  private static getMockPromoHistory() {
    return [
      {
        id: 'promo_1',
        code: 'WELCOME20',
        usedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        discountType: 'percentage' as DiscountType,
        discountValue: 20,
        planId: 'pro_monthly',
        amountSaved: 320 // $3.20
      },
      {
        id: 'promo_2',
        code: 'SAVE10',
        usedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        discountType: 'fixed_amount' as DiscountType,
        discountValue: 1000,
        planId: 'pro_yearly',
        amountSaved: 1000 // $10.00
      }
    ];
  }

  private static createMockPromoCode(partial: Partial<PromoCode>): PromoCode {
    const now = new Date();
    return {
      id: `promo_${Math.random().toString(36).substring(7)}`,
      code: partial.code || 'MOCK',
      discountType: partial.discountType || 'percentage',
      discountValue: partial.discountValue || 10,
      maxRedemptions: 1000,
      currentRedemptions: 45,
      validFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      applicablePlans: ['pro_monthly', 'pro_yearly'],
      description: partial.description || 'Mock promo code',
      isActive: true,
      firstTimeUsersOnly: false,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: now
    };
  }

  private static createMockReferralCode(code: string, userId: string): PromoCode {
    const now = new Date();
    return {
      id: `referral_${userId}`,
      code,
      discountType: 'percentage',
      discountValue: 15,
      maxRedemptions: 50,
      currentRedemptions: 0,
      validFrom: now,
      validUntil: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      applicablePlans: ['pro_monthly', 'pro_yearly'],
      description: `Referral code - 15% off for new users`,
      isActive: true,
      firstTimeUsersOnly: true,
      createdAt: now,
      updatedAt: now
    };
  }

  private static generateReferralCodeFromName(userName: string): string {
    const cleanName = userName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${cleanName.substring(0, 8)}${randomSuffix}`;
  }
}

export { PromoCodeService };
export default PromoCodeService;