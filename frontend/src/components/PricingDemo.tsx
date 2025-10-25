import React from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { FeatureGate, UpgradePrompt, UsageLimitPrompt } from './FeatureGate';
import { Crown, Zap, Lock, TrendingUp } from 'lucide-react';

export const PricingDemo: React.FC = () => {
  const { subscription, canAccess, getRemainingUsage, usage } = useSubscription();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          DataSnap Pricing System Demo
        </h1>
        <p className="text-gray-600">
          See how monetization works throughout the app
        </p>
      </div>

      {/* Current Subscription Status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5" />
          Current Subscription Status
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <strong>Plan:</strong> {subscription?.plan || 'Free'}
          </div>
          <div>
            <strong>Status:</strong> {subscription?.status || 'Free'}
          </div>
          {usage && (
            <>
              <div><strong>Reports Used:</strong> {usage.reports}</div>
              <div><strong>Exports Used:</strong> {usage.exports}</div>
              <div><strong>Charts Created:</strong> {usage.charts}</div>
              <div><strong>AI Requests:</strong> {usage.aiInsightRequests}</div>
            </>
          )}
        </div>
      </div>

      {/* Feature Access Examples */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Feature Access Examples</h2>

        {/* AI Insights Feature Gate */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            AI-Powered Insights
          </h3>
          <FeatureGate feature="ai_insights">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h4 className="font-medium text-blue-900">✨ AI Insights Active!</h4>
              <p className="text-blue-700 text-sm">
                You have access to AI-powered data analysis, pattern detection, 
                and intelligent recommendations.
              </p>
              <div className="mt-2 flex gap-2">
                <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                  Generate Insights
                </button>
                <button className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm">
                  View Recommendations
                </button>
              </div>
            </div>
          </FeatureGate>
        </div>

        {/* Advanced Analytics Feature Gate */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Advanced Analytics
          </h3>
          <FeatureGate feature="advanced_analytics">
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h4 className="font-medium text-green-900">📊 Advanced Analytics Enabled!</h4>
              <p className="text-green-700 text-sm">
                Access statistical tests, regression analysis, hypothesis testing,
                and professional-grade analytics tools.
              </p>
              <div className="mt-2 flex gap-2">
                <button className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                  Statistical Tests
                </button>
                <button className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm">
                  Correlation Analysis
                </button>
              </div>
            </div>
          </FeatureGate>
        </div>

        {/* Custom Branding Feature Gate */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Custom Branding
          </h3>
          <FeatureGate feature="custom_branding">
            <div className="bg-purple-50 border border-purple-200 rounded p-4">
              <h4 className="font-medium text-purple-900">🎨 Custom Branding Available!</h4>
              <p className="text-purple-700 text-sm">
                Add your logo, customize colors, and create white-label reports
                with your brand identity.
              </p>
              <div className="mt-2 flex gap-2">
                <button className="bg-purple-600 text-white px-3 py-1 rounded text-sm">
                  Upload Logo
                </button>
                <button className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-sm">
                  Brand Settings
                </button>
              </div>
            </div>
          </FeatureGate>
        </div>
      </div>

      {/* Usage Limits Demo */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Usage Limit Examples</h2>

        {/* Reports Usage */}
        <UsageLimitPrompt 
          resource="reports"
          remaining={getRemainingUsage('reports')}
          limit={subscription?.plan === 'free' ? 5 : -1}
        />

        {/* Exports Usage */}
        <UsageLimitPrompt 
          resource="exports"
          remaining={getRemainingUsage('exports')}
          limit={subscription?.plan === 'free' ? 10 : -1}
        />

        {/* Datasets Usage */}
        <UsageLimitPrompt 
          resource="datasets"
          remaining={getRemainingUsage('datasets')}
          limit={subscription?.plan === 'free' ? 3 : -1}
        />
      </div>

      {/* Compact Upgrade Prompts */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Compact Upgrade Prompts</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <UpgradePrompt feature="ai_insights" compact />
          <UpgradePrompt feature="advanced_analytics" compact />
        </div>
      </div>

      {/* Feature Access Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Current Feature Access</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span>AI Insights:</span>
            <span className={canAccess('ai_insights') ? 'text-green-600' : 'text-red-600'}>
              {canAccess('ai_insights') ? '✓ Enabled' : '✗ Upgrade Required'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Advanced Analytics:</span>
            <span className={canAccess('advanced_analytics') ? 'text-green-600' : 'text-red-600'}>
              {canAccess('advanced_analytics') ? '✓ Enabled' : '✗ Upgrade Required'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Custom Branding:</span>
            <span className={canAccess('custom_branding') ? 'text-green-600' : 'text-red-600'}>
              {canAccess('custom_branding') ? '✓ Enabled' : '✗ Upgrade Required'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Priority Support:</span>
            <span className={canAccess('priority_support') ? 'text-green-600' : 'text-red-600'}>
              {canAccess('priority_support') ? '✓ Enabled' : '✗ Upgrade Required'}
            </span>
          </div>
        </div>
      </div>

      {/* Direct Pricing Page Link */}
      <div className="text-center">
        <a 
          href="/pricing" 
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
        >
          <Crown className="w-5 h-5" />
          View All Plans & Pricing
        </a>
      </div>
    </div>
  );
};