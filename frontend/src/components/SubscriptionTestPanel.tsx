import React, { useState, useEffect } from 'react';
import { SubscriptionTestUtils, TEST_SCENARIOS } from '../utils/subscriptionTestUtils';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Settings, TestTube, RefreshCw, X, Check, AlertTriangle, Info } from 'lucide-react';

interface SubscriptionTestPanelProps {
  onClose?: () => void;
}

export const SubscriptionTestPanel: React.FC<SubscriptionTestPanelProps> = ({ onClose }) => {
  const [isTestModeEnabled, setIsTestModeEnabled] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { subscription, usage, billingInfo, canAccess, getRemainingUsage } = useSubscription();

  useEffect(() => {
    setIsTestModeEnabled(SubscriptionTestUtils.isTestModeEnabled());
    setCurrentScenario(SubscriptionTestUtils.getCurrentTestScenario());
  }, []);

  const handleToggleTestMode = () => {
    if (isTestModeEnabled) {
      SubscriptionTestUtils.disableTestMode();
      setIsTestModeEnabled(false);
      setCurrentScenario(null);
    } else {
      SubscriptionTestUtils.enableTestMode();
      setIsTestModeEnabled(true);
    }
  };

  const handleSelectScenario = (scenarioName: string) => {
    SubscriptionTestUtils.setTestScenario(scenarioName as keyof typeof TEST_SCENARIOS);
    setCurrentScenario(scenarioName);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'trial': return '#3b82f6';
      case 'past_due': return '#f59e0b';
      case 'canceled': return '#6b7280';
      default: return '#ef4444';
    }
  };

  const getUsageWarning = (resource: string, limit: number) => {
    if (limit === -1) return null; // Unlimited
    const remaining = getRemainingUsage(resource);
    const percentage = ((limit - remaining) / limit) * 100;
    
    if (percentage >= 90) return 'danger';
    if (percentage >= 75) return 'warning';
    return null;
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: isTestModeEnabled ? '#3b82f6' : '#6b7280',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <TestTube size={24} />
      </button>

      {/* Test Panel */}
      {isVisible && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          width: '400px',
          maxHeight: '80vh',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e5e7eb',
          zIndex: 9999,
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            background: '#f9fafb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TestTube size={20} color="#3b82f6" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                Subscription Testing
              </h3>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: '#6b7280'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
            {/* Test Mode Toggle */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '8px',
                background: isTestModeEnabled ? '#dbeafe' : '#f3f4f6',
                border: `1px solid ${isTestModeEnabled ? '#3b82f6' : '#d1d5db'}`
              }}>
                <input
                  type="checkbox"
                  checked={isTestModeEnabled}
                  onChange={handleToggleTestMode}
                  style={{ margin: 0 }}
                />
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: isTestModeEnabled ? '#1e40af' : '#374151'
                }}>
                  Enable Test Mode
                </span>
              </label>
            </div>

            {isTestModeEnabled && (
              <>
                {/* Current Status */}
                <div style={{
                  background: '#f0f9ff',
                  border: '1px solid #0ea5e9',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Info size={16} color="#0ea5e9" />
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#0c4a6e' }}>
                      CURRENT STATE
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#075985' }}>
                    <div><strong>Plan:</strong> {subscription?.plan || 'free'}</div>
                    <div><strong>Status:</strong> <span style={{ color: getStatusColor(subscription?.status || 'free') }}>{subscription?.status || 'free'}</span></div>
                    {currentScenario && <div><strong>Scenario:</strong> {currentScenario}</div>}
                  </div>
                </div>

                {/* Test Scenarios */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151', 
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Settings size={16} />
                    Test Scenarios
                  </h4>
                  
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {Object.entries(TEST_SCENARIOS).map(([key, scenario]) => (
                      <button
                        key={key}
                        onClick={() => handleSelectScenario(key)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          background: currentScenario === key ? '#dbeafe' : '#f9fafb',
                          border: `1px solid ${currentScenario === key ? '#3b82f6' : '#e5e7eb'}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          transition: 'all 0.1s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (currentScenario !== key) {
                            e.currentTarget.style.background = '#f3f4f6';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentScenario !== key) {
                            e.currentTarget.style.background = '#f9fafb';
                          }
                        }}
                      >
                        <div style={{ fontWeight: '500', color: '#111827', marginBottom: '2px' }}>
                          {key}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '11px' }}>
                          {scenario.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feature Access */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151', 
                    marginBottom: '12px' 
                  }}>
                    Feature Access
                  </h4>
                  
                  <div style={{ display: 'grid', gap: '4px' }}>
                    {[
                      { key: 'ai_insights', label: 'AI Insights' },
                      { key: 'advanced_analytics', label: 'Advanced Analytics' },
                      { key: 'priority_support', label: 'Priority Support' },
                      { key: 'custom_branding', label: 'Custom Branding' }
                    ].map((feature) => {
                      const hasAccess = canAccess(feature.key);
                      return (
                        <div
                          key={feature.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: '#f9fafb',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          <span style={{ color: '#374151' }}>{feature.label}</span>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: hasAccess ? '#10b981' : '#ef4444'
                          }}>
                            {hasAccess ? <Check size={14} /> : <X size={14} />}
                            <span style={{ fontSize: '11px' }}>
                              {hasAccess ? 'Enabled' : 'Blocked'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Usage Limits */}
                {usage && (
                  <div>
                    <h4 style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: '#374151', 
                      marginBottom: '12px' 
                    }}>
                      Usage Limits
                    </h4>
                    
                    <div style={{ display: 'grid', gap: '4px' }}>
                      {[
                        { key: 'datasets', label: 'Datasets', limit: subscription?.plan === 'free' ? 3 : -1 },
                        { key: 'reports', label: 'Reports', limit: subscription?.plan === 'free' ? 5 : -1 },
                        { key: 'exports', label: 'Exports', limit: subscription?.plan === 'free' ? 10 : -1 },
                        { key: 'charts', label: 'Charts', limit: subscription?.plan === 'free' ? 10 : -1 }
                      ].map((resource) => {
                        const remaining = getRemainingUsage(resource.key);
                        const current = resource.limit === -1 ? usage[resource.key as keyof typeof usage] : 
                          resource.limit - remaining;
                        const warning = getUsageWarning(resource.key, resource.limit);
                        
                        return (
                          <div
                            key={resource.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: '#f9fafb',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          >
                            <span style={{ color: '#374151' }}>{resource.label}</span>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {warning && <AlertTriangle size={12} color={warning === 'danger' ? '#ef4444' : '#f59e0b'} />}
                              <span style={{ 
                                fontSize: '11px',
                                color: warning === 'danger' ? '#ef4444' : warning === 'warning' ? '#f59e0b' : '#374151'
                              }}>
                                {current}/{resource.limit === -1 ? '∞' : resource.limit}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SubscriptionTestPanel;