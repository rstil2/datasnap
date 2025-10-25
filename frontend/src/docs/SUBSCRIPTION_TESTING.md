# Subscription System Testing Guide

This guide covers all aspects of testing the DataSnap subscription system, from development mocking to production Stripe integration.

## 🧪 Development Testing (Recommended Start Point)

### Quick Start with Test Panel

1. **Start your development server**:
   ```bash
   npm start
   # or
   yarn start
   ```

2. **Add the test panel to your main App component**:
   ```tsx
   import SubscriptionTestPanel from './components/SubscriptionTestPanel';
   
   function App() {
     return (
       <div>
         {/* Your existing app content */}
         
         {/* Add this for development testing */}
         <SubscriptionTestPanel />
       </div>
     );
   }
   ```

3. **Look for the blue test tube icon** in the top-right corner of your app

4. **Click to open the test panel** and enable test mode

### Console Testing (Alternative Method)

Open browser console and use these commands:

```javascript
// Enable test mode and see available scenarios
SubscriptionTestUtils.enableTestMode();
SubscriptionTestUtils.listAvailableScenarios();

// Quick test scenarios
SubscriptionTestUtils.testFreeUser();     // New free user
SubscriptionTestUtils.testFreeLimits();   // Free user at limits
SubscriptionTestUtils.testProUser();      // Active Pro subscriber
SubscriptionTestUtils.testTrial();        // Active trial user
SubscriptionTestUtils.testExpiredTrial(); // Expired trial

// Disable test mode
SubscriptionTestUtils.disableTestMode();
```

## 📋 Test Scenarios

### 1. Free User - New
- **Purpose**: Test new user experience
- **Features**: No premium features, low usage
- **Expected**: Upgrade prompts, feature gates block premium features

### 2. Free User - At Limits
- **Purpose**: Test usage limit warnings
- **Features**: At maximum free tier limits
- **Expected**: Usage warnings, upgrade prompts become urgent

### 3. Free User - Over Limits
- **Purpose**: Test enforcement of limits
- **Features**: Usage exceeds free limits
- **Expected**: Features should be blocked, force upgrade or limit usage

### 4. Pro Monthly - Active
- **Purpose**: Test paid subscriber experience
- **Features**: All premium features unlocked
- **Expected**: No restrictions, all features available

### 5. Pro Yearly - Active
- **Purpose**: Test annual subscriber benefits
- **Features**: All premium features + savings display
- **Expected**: Same as monthly but with billing cycle info

### 6. Trial - Active
- **Purpose**: Test trial user experience
- **Features**: Temporary premium access
- **Expected**: Trial countdown, conversion prompts

### 7. Trial - Expired
- **Purpose**: Test trial expiration
- **Features**: Should revert to free tier
- **Expected**: Premium features locked, upgrade required

### 8. Pro - Canceled
- **Purpose**: Test cancellation grace period
- **Features**: Still active until period ends
- **Expected**: Cancellation notice, still has access

### 9. Pro - Past Due
- **Purpose**: Test payment failure handling
- **Features**: Should lose premium access
- **Expected**: Payment retry prompts, limited access

## 🔍 What to Test

### Feature Gating
Test these features are properly gated:
- ✅ AI Insights (Pro only)
- ✅ Advanced Analytics (Pro only)  
- ✅ Priority Support (Pro only)
- ✅ Custom Branding (Pro only)
- ✅ Unlimited uploads (Pro only)

### Usage Limits
Test these limits are enforced:
- ✅ Datasets: 3 (free) vs Unlimited (pro)
- ✅ Charts: 10 (free) vs Unlimited (pro)
- ✅ Reports: 5/month (free) vs Unlimited (pro)
- ✅ Exports: 10/month (free) vs Unlimited (pro)

### UI Components
- ✅ SubscriptionPlans modal opens and displays correctly
- ✅ FeatureGate components show/hide content appropriately
- ✅ UpgradePrompt appears when needed
- ✅ UsageLimitPrompt shows when approaching limits
- ✅ PricingDemo displays current status

### User Flows
1. **Upgrade Flow**: Free → View Plans → Select Plan → Checkout
2. **Trial Flow**: Free → Start Trial → Trial Active → Trial Expiry
3. **Billing Flow**: Pro → Manage Billing → Cancel/Modify

## 💳 Stripe Test Environment

### Setup Stripe Test Mode

1. **Get Stripe Test Keys**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/test/dashboard)
   - Go to Developers → API Keys
   - Copy your **Publishable Key** (starts with `pk_test_`)
   - Copy your **Secret Key** (starts with `sk_test_`)

2. **Environment Variables**:
   ```bash
   # Frontend (.env.local)
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   REACT_APP_API_URL=http://localhost:3001
   
   # Backend (.env)
   STRIPE_SECRET_KEY=sk_test_your_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

3. **Create Products in Stripe**:
   ```bash
   # Using Stripe CLI
   stripe products create --name "DataSnap Pro Monthly" --description "Monthly Pro subscription"
   stripe prices create --product prod_xxx --unit-amount 1599 --currency usd --recurring interval=month
   
   stripe products create --name "DataSnap Pro Yearly" --description "Annual Pro subscription"  
   stripe prices create --product prod_yyy --unit-amount 12999 --currency usd --recurring interval=year
   ```

4. **Update Price IDs**:
   ```typescript
   // In src/types/subscription.ts
   export const PRICING_PLANS: PricingPlan[] = [
     // ...
     {
       // ...
       stripePriceId: 'price_your_actual_stripe_price_id' // Update with real IDs
     }
   ];
   ```

### Test Payment Methods

Use these Stripe test cards:
- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **Auth Required**: `4000002500003155`
- **Insufficient Funds**: `4000000000009995`

### Webhook Testing

1. **Install Stripe CLI**:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Login
   stripe login
   ```

2. **Forward Webhooks**:
   ```bash
   stripe listen --forward-to localhost:3001/webhooks/stripe
   ```

3. **Test Webhook Events**:
   ```bash
   # Test successful payment
   stripe trigger payment_intent.succeeded
   
   # Test failed payment
   stripe trigger payment_intent.payment_failed
   
   # Test subscription events
   stripe trigger customer.subscription.created
   stripe trigger customer.subscription.updated
   stripe trigger customer.subscription.deleted
   ```

## 🚀 Testing Checklist

### Development Testing ✅
- [ ] Test panel loads and functions correctly
- [ ] All 9 test scenarios work as expected
- [ ] Feature gating works for all premium features
- [ ] Usage limits are properly enforced
- [ ] UI components render correctly in all states
- [ ] Console commands work properly

### Stripe Integration Testing ✅
- [ ] Environment variables configured
- [ ] Stripe products and prices created
- [ ] Test checkout flows work
- [ ] Webhook events are received and processed
- [ ] Subscription status updates correctly
- [ ] Payment failures are handled gracefully

### End-to-End Testing ✅
- [ ] Full upgrade flow: Free → Trial → Pro
- [ ] Billing management works
- [ ] Cancellation flow preserves access until period end
- [ ] Trial expiration reverts to free tier
- [ ] Failed payments trigger appropriate actions

### Edge Cases ✅
- [ ] Network failures during checkout
- [ ] Webhook delivery failures
- [ ] Concurrent subscription changes
- [ ] Browser refresh during checkout
- [ ] Invalid payment methods
- [ ] Expired cards

## 🐛 Common Issues & Solutions

### Test Mode Not Working
```javascript
// Check if test mode is enabled
console.log(SubscriptionTestUtils.isTestModeEnabled());

// Ensure you're in development
console.log(process.env.NODE_ENV); // Should be 'development'

// Clear browser storage if needed
localStorage.clear();
```

### Stripe Checkout Not Loading
```bash
# Check environment variables
echo $REACT_APP_STRIPE_PUBLISHABLE_KEY

# Verify network requests in browser DevTools
# Look for failed API calls to your backend
```

### Webhook Events Not Received
```bash
# Check webhook endpoint is running
curl -X POST http://localhost:3001/webhooks/stripe

# Verify Stripe CLI is forwarding
stripe listen --forward-to localhost:3001/webhooks/stripe
```

### Feature Gates Not Working
```typescript
// Debug feature access in console
const { canAccess } = useSubscription();
console.log('AI Insights:', canAccess('ai_insights'));
console.log('Current subscription:', subscription);
```

## 📱 Testing on Different Devices

### Desktop Browser Testing
- Chrome DevTools device simulation
- Firefox responsive design mode  
- Safari Web Inspector

### Mobile Testing
- iOS Safari (real device recommended)
- Chrome on Android
- Test touch interactions on subscription modal

### Stripe Checkout Mobile
- Test Apple Pay integration
- Test Google Pay integration  
- Verify mobile-optimized checkout flow

## 🔒 Security Testing

### Subscription Tampering
- Verify server-side validation of subscription status
- Test that client-side changes don't affect access
- Ensure JWT tokens expire appropriately

### Payment Security
- Verify PCI compliance with Stripe
- Test that no payment data touches your servers
- Ensure webhook signatures are validated

## 📊 Monitoring & Analytics

### Key Metrics to Track
- Subscription conversion rates
- Trial-to-paid conversion  
- Churn rates by plan
- Feature usage by tier
- Failed payment recovery

### Testing Analytics
```javascript
// Test analytics events are fired
// (Replace with your actual analytics service)
analytics.track('Subscription Upgraded', {
  from_plan: 'free',
  to_plan: 'pro_monthly',
  trial_used: true
});
```

## 🆘 Need Help?

1. **Check browser console** for errors and test utilities
2. **Use the test panel** for quick scenario switching  
3. **Verify Stripe dashboard** for payment and subscription events
4. **Check webhook logs** for integration issues
5. **Review network requests** in DevTools for API failures

Happy testing! 🎉