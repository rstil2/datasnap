import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { config } from './config';
import { UploadPage } from './components/UploadPage';
import { EnhancedUploadPage } from './components/upload/EnhancedUploadPage';
import { StatsPage } from './components/StatsPage';
import { VisualizePage } from './components/VisualizePage';
import { EnhancedVisualizePage } from './components/EnhancedVisualizePage';
import { AnalysisPage } from './components/AnalysisPage';
import { StoryPage } from './components/StoryPage';
import { CommunityPage } from './components/CommunityPageSimple';
import { AccountPage } from './components/AccountPage';
import { SettingsPage } from './components/SettingsPage';
import { SharedStoryViewer } from './components/SharedStoryViewer';
import PricingPage from './components/PricingPage';
import { AuthFlowDemo } from './components/AuthFlowDemo';
import { Logo3D } from './components/Logo3D';
import { DataProvider } from './contexts/DataContext';
import { UserProvider } from './contexts/UserContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { useTheme } from './contexts/ThemeContext';
import styles from './App.module.css';

if (!styles) {
  console.error('App.module.css failed to load!');
}

function MainApp() {
  const location = useLocation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState('upload');
  
  
  // Listen for chart navigation events from AI recommendations
  React.useEffect(() => {
    const handleChartNavigation = () => {
      // Navigate to enhanced visualization page
      setCurrentPage('enhanced-viz');
    };
    
    window.addEventListener('navigateToChart', handleChartNavigation as EventListener);
    
    return () => {
      window.removeEventListener('navigateToChart', handleChartNavigation as EventListener);
    };
  }, []);
  
  // Check if we're on a shared story route
  if (location.pathname.startsWith('/share/')) {
    return <SharedStoryViewer />;
  }

  const navItems = [
    { id: 'upload', label: 'Upload CSV', icon: '📁' },
    { id: 'enhanced-upload', label: 'Multi-Format Import', icon: '📊' },
    { id: 'stats', label: 'Stats', icon: '📈' },
    { id: 'visualize', label: 'Visualize', icon: '📊' },
    { id: 'enhanced-viz', label: 'Pro Charts', icon: '🎨' },
    { id: 'analysis', label: 'Analysis', icon: '🔍' },
    { id: 'story', label: 'Story', icon: '📝' },
    { id: 'community', label: 'Community', icon: '🌍' },
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  function renderPage() {
    switch(currentPage) {
      case 'upload':
        return <UploadPage onPageChange={setCurrentPage} />;
      case 'enhanced-upload':
        return <EnhancedUploadPage />;
      case 'stats':
        return <StatsPage />;
      case 'visualize':
        return <VisualizePage />;
      case 'enhanced-viz':
        return <EnhancedVisualizePage />;
      case 'analysis':
        return <AnalysisPage />;
      case 'story':
        return <StoryPage />;
      case 'community':
        try {
          return <CommunityPage onPageChange={setCurrentPage} />;
        } catch {
          return (
            <div className="page-container">
              <div className="page-header">
                <h1 className="page-title">Community</h1>
                <p className="page-description">Loading community features...</p>
              </div>
              <div className="card">
                <div className="card-content">
                  <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)' }}>🚀</div>
                    <h3>Community Features Coming Online</h3>
                    <p>The community system is being initialized. Please try refreshing the page.</p>
                    <p style={{ marginTop: 'var(--space-md)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Debug: Community page navigation is working!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        }
      case 'account':
        return <AccountPage />;
      case 'settings':
        return <SettingsPage theme={resolvedTheme} toggleTheme={toggleTheme} />;
      default:
        return <div>Page not found</div>;
    }
  }

  return (
    <ErrorBoundary>
      <div className={styles?.appContainer || 'app-container'}>
        {/* Professional Sidebar */}
        <div className={styles?.sidebar}>
          {/* Brand Header */}
          <div className={styles?.brandHeader}>
            <div className={styles?.brandLogo}>
              <Logo3D size={20} />
              <h1 className={styles?.brandTitle}>DataSnap</h1>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className={styles?.navMenu} role="navigation" aria-label="Main navigation">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`${styles?.navItem} ${currentPage === item.id ? styles?.navItemActive : ''}`}
                aria-current={currentPage === item.id ? 'page' : undefined}
                aria-label={`Navigate to ${item.label}`}
                tabIndex={0}
              >
                <span className={styles?.navIcon} aria-hidden="true">{item.icon}</span>
                <span className={styles?.navLabel}>{item.label}</span>
                {currentPage === item.id && <div className={styles?.navIndicator} />}
              </button>
            ))}
          </nav>
          
          
          {/* Footer */}
          <div className={styles?.sidebarFooter}>
            <div className={styles?.versionInfo}>v{config.appVersion}</div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <main className={styles?.mainContent}>
          <div className={styles?.contentWrapper}>
            {renderPage()}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <SubscriptionProvider>
          <DataProvider>
          <Routes>
            <Route path="/share/:storyId" element={<SharedStoryViewer />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/auth-demo" element={<AuthFlowDemo />} />
            <Route path="*" element={<MainApp />} />
          </Routes>
          </DataProvider>
        </SubscriptionProvider>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
