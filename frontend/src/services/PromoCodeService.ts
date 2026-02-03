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

      // Production: validate via API

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

      // Production: apply via API

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

  private static generateReferralCodeFromName(userName: string): string {
    const cleanName = userName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${cleanName.substring(0, 8)}${randomSuffix}`;
  }
}

export { PromoCodeService };
export default PromoCodeService;