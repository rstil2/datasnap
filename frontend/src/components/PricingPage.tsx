import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Zap, Crown, Shield, Users } from 'lucide-react';
import { PRICING_PLANS, PricingPlan } from '../types/subscription';
import { SubscriptionService } from '../services/SubscriptionService';
import { useUser } from '../contexts/UserContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import toast from 'react-hot-toast';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useUser();
  const { subscription } = useSubscription();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const savings = SubscriptionService.getYearlySavings();

  const handlePlanSelection = async (plan: PricingPlan) => {
    if (!isAuthenticated) {
      // Redirect to sign up/login
      navigate('/auth', { state: { plan: plan.id, returnTo: '/pricing' } });
      return;
    }

    if (plan.id === 'free') {
      toast.success('You\'re already on the free plan!');
      return;
    }

    if (subscription && subscription.plan === plan.id) {
      toast.success('You\'re already subscribed to this plan!');
      return;
    }

    if (!plan.stripePriceId) {
      toast.error('This plan is not available for purchase yet.');
      return;
    }

    setIsLoading(plan.id);
    
    try {
      const { url } = await SubscriptionService.createCheckoutSession({
        priceId: plan.stripePriceId,
        successUrl: `${window.location.origin}/account/billing?success=true`,
        cancelUrl: window.location.href
      });
      
      window.location.href = url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      toast.error('Failed to start checkout. Please try again.');
      setIsLoading(null);
    }
  };

  const handleStartTrial = async () => {
    if (!isAuthenticated) {
      navigate('/auth', { state: { returnTo: '/pricing' } });
      return;
    }

    if (subscription && subscription.status === 'trial') {
      toast.success('You\'re already on a free trial!');
      return;
    }

    setIsLoading('trial');
    
    try {
      await SubscriptionService.startFreeTrial();
      toast.success('Free trial started! Enjoy 14 days of DataSnap Pro.');
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to start trial:', error);
      toast.error('Failed to start trial. Please try again.');
      setIsLoading(null);
    }
  };

  const getButtonText = (plan: PricingPlan) => {
    if (isLoading === plan.id) return 'Loading...';
    
    if (!isAuthenticated) {
      return plan.id === 'free' ? 'Get Started' : 'Start Free Trial';
    }

    if (subscription?.plan === plan.id) {
      return 'Current Plan';
    }

    if (plan.id === 'free') {
      return subscription ? 'Downgrade' : 'Get Started';
    }

    return subscription ? 'Upgrade Now' : 'Start Free Trial';
  };

  const getButtonStyle = (plan: PricingPlan) => {
    const isCurrentPlan = subscription?.plan === plan.id;
    const isPro = plan.id !== 'free';
    
    if (isCurrentPlan) {
      return 'bg-gray-100 text-gray-500 cursor-not-allowed';
    }
    
    if (plan.popular) {
      return 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white';
    }
    
    if (isPro) {
      return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
    
    return 'bg-gray-900 hover:bg-gray-800 text-white';
  };

  const filteredPlans = PRICING_PLANS.filter(plan => {
    if (plan.id === 'free') return true;
    if (billingCycle === 'monthly') return plan.interval === 'month';
    return plan.interval === 'year';
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your DataSnap Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transform your data into actionable insights with our powerful analytics platform. 
            Start with our free plan or upgrade for unlimited access.
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center mb-12">
          <div className="bg-gray-100 p-1 rounded-lg flex items-center">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              {savings.percentage > 0 && (
                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Save {savings.percentage}%
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
                plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-2 text-sm font-medium">
                  <Star className="inline w-4 h-4 mr-1" />
                  Most Popular
                </div>
              )}

              <div className={`p-8 ${plan.popular ? 'pt-16' : ''}`}>
                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div className="mb-4">
                    {plan.id === 'free' && <Users className="w-12 h-12 mx-auto text-gray-500" />}
                    {plan.id !== 'free' && <Crown className="w-12 h-12 mx-auto text-blue-600" />}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {SubscriptionService.formatPrice(plan.price)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600">
                        /{plan.interval === 'year' ? 'month' : 'month'}
                      </span>
                    )}
                  </div>
                  {plan.interval === 'year' && plan.price > 0 && (
                    <p className="text-sm text-green-600 font-medium">
                      Billed annually ({SubscriptionService.formatPrice(plan.price * 12)}/year)
                    </p>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handlePlanSelection(plan)}
                  disabled={isLoading === plan.id || subscription?.plan === plan.id}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-center transition-all ${
                    getButtonStyle(plan)
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {getButtonText(plan)}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Free Trial Banner */}
        {!subscription && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
            <div className="max-w-3xl mx-auto">
              <Zap className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-4">Start Your Free Trial Today</h2>
              <p className="text-xl mb-6 opacity-90">
                Try DataSnap Pro free for 14 days. No credit card required.
                Full access to all features, cancel anytime.
              </p>
              <button
                onClick={handleStartTrial}
                disabled={isLoading === 'trial'}
                className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-3 rounded-lg font-medium text-lg transition-all disabled:opacity-50"
              >
                {isLoading === 'trial' ? 'Starting Trial...' : 'Start Free Trial'}
              </button>
            </div>
          </div>
        )}

        {/* Features Comparison */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose DataSnap Pro?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Insights</h3>
              <p className="text-gray-600">
                Get intelligent recommendations and automated insights from your data
                using advanced machine learning algorithms.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
              <p className="text-gray-600">
                Access powerful statistical tests, correlation analysis, and 
                professional-grade data visualization tools.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Priority Support</h3>
              <p className="text-gray-600">
                Get dedicated support with faster response times and direct access
                to our technical team.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I switch plans anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately,
                and you'll be prorated for any difference in cost.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens when my trial ends?
              </h3>
              <p className="text-gray-600">
                Your account will automatically downgrade to the free plan. You can upgrade
                to a paid plan at any time to regain access to Pro features.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-600">
                We offer a 30-day money-back guarantee for all paid plans. If you're not
                satisfied, contact us for a full refund.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is my data secure?
              </h3>
              <p className="text-gray-600">
                Absolutely! We use enterprise-grade security with end-to-end encryption,
                SOC 2 compliance, and regular security audits to protect your data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;