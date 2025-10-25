#!/bin/bash

# DataSnap Stripe Test Environment Setup Script
# This script helps set up Stripe test products and prices for development

set -e  # Exit on any error

echo "🚀 DataSnap Stripe Test Environment Setup"
echo "========================================"

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI is not installed."
    echo "Please install it first:"
    echo ""
    echo "macOS: brew install stripe/stripe-cli/stripe"
    echo "Other: https://stripe.com/docs/stripe-cli"
    echo ""
    exit 1
fi

# Check if user is logged in to Stripe
if ! stripe config --list &> /dev/null; then
    echo "❌ You need to login to Stripe first."
    echo "Run: stripe login"
    echo ""
    exit 1
fi

echo ""
echo "📦 Creating DataSnap products in Stripe..."

# Create DataSnap Pro Monthly product
echo "Creating DataSnap Pro Monthly..."
PRO_MONTHLY_PRODUCT=$(stripe products create \
    --name "DataSnap Pro Monthly" \
    --description "Monthly subscription with unlimited datasets, AI insights, and advanced analytics" \
    --format json)

PRO_MONTHLY_PRODUCT_ID=$(echo $PRO_MONTHLY_PRODUCT | jq -r '.id')
echo "✅ Created product: $PRO_MONTHLY_PRODUCT_ID"

# Create monthly price
PRO_MONTHLY_PRICE=$(stripe prices create \
    --product $PRO_MONTHLY_PRODUCT_ID \
    --unit-amount 1599 \
    --currency usd \
    --recurring interval=month \
    --nickname "DataSnap Pro Monthly" \
    --format json)

PRO_MONTHLY_PRICE_ID=$(echo $PRO_MONTHLY_PRICE | jq -r '.id')
echo "✅ Created monthly price: $PRO_MONTHLY_PRICE_ID ($15.99/month)"

# Create DataSnap Pro Yearly product  
echo ""
echo "Creating DataSnap Pro Yearly..."
PRO_YEARLY_PRODUCT=$(stripe products create \
    --name "DataSnap Pro Yearly" \
    --description "Annual subscription with unlimited datasets, AI insights, and advanced analytics. Save 19%!" \
    --format json)

PRO_YEARLY_PRODUCT_ID=$(echo $PRO_YEARLY_PRODUCT | jq -r '.id')
echo "✅ Created product: $PRO_YEARLY_PRODUCT_ID"

# Create yearly price
PRO_YEARLY_PRICE=$(stripe prices create \
    --product $PRO_YEARLY_PRODUCT_ID \
    --unit-amount 15588 \
    --currency usd \
    --recurring interval=year \
    --nickname "DataSnap Pro Yearly" \
    --format json)

PRO_YEARLY_PRICE_ID=$(echo $PRO_YEARLY_PRICE | jq -r '.id')
echo "✅ Created yearly price: $PRO_YEARLY_PRICE_ID ($155.88/year, save 19%)"

# Create webhook endpoint for local development
echo ""
echo "🔗 Setting up webhook endpoint..."
WEBHOOK_ENDPOINT=$(stripe webhook_endpoints create \
    --url "http://localhost:3001/webhooks/stripe" \
    --enabled-events customer.subscription.created \
    --enabled-events customer.subscription.updated \
    --enabled-events customer.subscription.deleted \
    --enabled-events invoice.payment_succeeded \
    --enabled-events invoice.payment_failed \
    --enabled-events payment_intent.succeeded \
    --enabled-events payment_intent.payment_failed \
    --format json)

WEBHOOK_SECRET=$(echo $WEBHOOK_ENDPOINT | jq -r '.secret')
WEBHOOK_ID=$(echo $WEBHOOK_ENDPOINT | jq -r '.id')
echo "✅ Created webhook endpoint: $WEBHOOK_ID"

# Output configuration
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Add these to your environment files:"
echo ""
echo "Frontend (.env.local):"
echo "REACT_APP_STRIPE_PUBLISHABLE_KEY=$(stripe config --list | grep publishable_key | cut -d= -f2)"
echo "REACT_APP_API_URL=http://localhost:3001"
echo ""
echo "Backend (.env):"
echo "STRIPE_SECRET_KEY=$(stripe config --list | grep secret_key | cut -d= -f2)"
echo "STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET"
echo ""
echo "Update your pricing plans in src/types/subscription.ts:"
echo ""
echo "  pro_monthly: {"
echo "    // ..."
echo "    stripePriceId: '$PRO_MONTHLY_PRICE_ID'"
echo "  },"
echo "  pro_yearly: {"
echo "    // ..."
echo "    stripePriceId: '$PRO_YEARLY_PRICE_ID'"  
echo "  }"
echo ""
echo "🔧 Next Steps:"
echo "1. Update your environment files with the keys above"
echo "2. Update the price IDs in your subscription types"
echo "3. Start your backend server"
echo "4. Run: stripe listen --forward-to localhost:3001/webhooks/stripe"
echo "5. Test the subscription flow!"
echo ""
echo "📖 For detailed testing instructions, see:"
echo "   src/docs/SUBSCRIPTION_TESTING.md"