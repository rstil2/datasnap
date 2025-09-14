import React from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2>Recent Files</h2>
          <div className="recent-files">
            <p className="empty-state">No files uploaded yet</p>
          </div>
        </div>

        <div className="dashboard-card">
          <h2>Quick Stats</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">0</span>
              <span className="stat-label">Total Files</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">0 KB</span>
              <span className="stat-label">Total Size</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">0</span>
              <span className="stat-label">Files Today</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <h2>Activity Feed</h2>
          <div className="activity-feed">
            <p className="empty-state">No recent activity</p>
          </div>
        </div>

        <div className="dashboard-card">
          <h2>Storage Usage</h2>
          <div className="storage-usage">
            <div className="usage-bar">
              <div className="usage-fill" style={{ width: '0%' }}></div>
            </div>
            <p className="usage-text">0% of 1GB used</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};