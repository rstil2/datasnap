import React, { useState } from 'react';
import { SubscriptionPlans } from './SubscriptionPlans';
import { useSubscription } from '../contexts/SubscriptionContext';

export const SubscriptionPlansExample: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const { subscription, isLoading } = useSubscription();

  if (isLoading) {
    return <div>Loading subscription info...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>DataSnap Subscription Example</h1>
        <p>Current Plan: <strong>{subscription?.plan || 'Free'}</strong></p>
        <p>Status: <strong>{subscription?.status || 'Free'}</strong></p>
        
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            marginTop: '1rem',
            fontSize: '1rem'
          }}
        >
          {subscription?.plan && subscription?.plan !== 'free' ? 'Manage Subscription' : 'Upgrade Now'}
        </button>
      </div>

      {showModal && (
        <SubscriptionPlans
          currentTier={subscription?.plan}
          onClose={() => setShowModal(false)}
        />
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <h2>Features Based on Current Plan</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
            <h3>Datasets</h3>
            <p>{subscription?.plan === 'free' ? '3 datasets max' : 'Unlimited datasets'}</p>
          </div>
          <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
            <h3>Reports</h3>
            <p>{subscription?.plan === 'free' ? '5 reports/month' : 'Unlimited reports'}</p>
          </div>
          <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
            <h3>AI Insights</h3>
            <p>{subscription?.plan === 'free' ? 'Not available' : 'Available'}</p>
          </div>
          <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
            <h3>Priority Support</h3>
            <p>{subscription?.plan === 'free' ? 'Community only' : 'Priority support'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};