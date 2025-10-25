# Quick Stripe Setup for DataSnap

This guide will get your Stripe test environment set up in under 5 minutes.

## 🚀 Quick Setup (Automated)

1. **Install Stripe CLI** (if you haven't already):
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Run the setup script**:
   ```bash
   ./scripts/setup-stripe-test.sh
   ```

4. **Follow the output instructions** to update your environment files

## 📱 Manual Setup

### 1. Create Stripe Account
- Go to [Stripe Dashboard](https://dashboard.stripe.com)
- Create account if needed
- Switch to **Test Mode** (toggle in left sidebar)

### 2. Get API Keys
- Go to **Developers** → **API Keys**
- Copy your **Publishable key** (`pk_test_...`)
- Copy your **Secret key** (`sk_test_...`)

### 3. Environment Variables
Create/update your environment files:

**Frontend** (`.env.local`):
```bash
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
REACT_APP_API_URL=http://localhost:3001
```

**Backend** (`.env`):
```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 4. Create Products in Stripe Dashboard
1. Go to **Products** → **Add Product**
2. Create two products:

**DataSnap Pro Monthly**:
- Name: `DataSnap Pro Monthly`
- Pricing: `$15.99/month` recurring
- Copy the Price ID (`price_...`)

**DataSnap Pro Yearly**:
- Name: `DataSnap Pro Yearly`  
- Pricing: `$155.88/year` recurring (19% discount)
- Copy the Price ID (`price_...`)

### 5. Update Price IDs
In `src/types/subscription.ts`, update:
```typescript
{
  id: 'pro_monthly',
  // ...
  stripePriceId: 'price_your_monthly_price_id_here'
},
{
  id: 'pro_yearly', 
  // ...
  stripePriceId: 'price_your_yearly_price_id_here'
}
```

## 🧪 Testing

### 1. Start Development Testing
Add to your main App component:
```tsx
import SubscriptionTestPanel from './components/SubscriptionTestPanel';

function App() {
  return (
    <div>
      {/* Your app content */}
      <SubscriptionTestPanel />
    </div>
  );
}
```

### 2. Test Without Payments
1. Look for the blue test tube icon in top-right
2. Click to open test panel
3. Enable test mode
4. Try different scenarios

### 3. Test With Stripe
1. Use test mode (disabled by default)
2. Test cards:
   - **Success**: `4242424242424242`
   - **Decline**: `4000000000000002`

### 4. Webhook Testing (Optional)
```bash
# In separate terminal
stripe listen --forward-to localhost:3001/webhooks/stripe
```

## 🎯 Quick Test

```javascript
// In browser console
SubscriptionTestUtils.enableTestMode();
SubscriptionTestUtils.testFreeUser();
// Page will reload with free user state

// Test feature gating
SubscriptionTestUtils.testProUser(); 
// Page will reload with pro user state
```

## 🆘 Troubleshooting

**Test mode not working?**
```javascript
console.log(process.env.NODE_ENV); // Should be 'development'
localStorage.clear(); // Clear if needed
```

**Stripe checkout not loading?**
- Check environment variables are set
- Verify price IDs in `subscription.ts`
- Check browser network tab for API errors

**Need help?** Check the full guide: `src/docs/SUBSCRIPTION_TESTING.md`

---

✅ **You're all set!** Your subscription system is ready to test.