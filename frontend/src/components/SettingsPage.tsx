import React from 'react';
import { Sun, Moon, Monitor, Info } from 'lucide-react';

interface SettingsPageProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export function SettingsPage({ theme, toggleTheme }: SettingsPageProps) {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">
          Customize your DataSnap experience and preferences
        </p>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-2xl)' }}>
        
        {/* Appearance Section */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              Appearance
            </h2>
          </div>
          <div className="card-content">
            <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
              Choose how DataSnap looks with light and dark appearance options.
            </p>
            
            {/* Theme Options */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
              gap: 'var(--space-md)' 
            }}>
              {/* Light Theme */}
              <button
                onClick={() => theme !== 'light' && toggleTheme()}
                style={{
                  padding: 'var(--space-lg)',
                  border: `2px solid ${theme === 'light' ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                  borderRadius: 'var(--radius-lg)',
                  background: theme === 'light' ? 'var(--accent-light)' : 'var(--bg-elevated)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  if (theme !== 'light') {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (theme !== 'light') {
                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                  }
                }}
              >
                <Sun 
                  size={32} 
                  style={{ 
                    color: theme === 'light' ? 'var(--accent-primary)' : 'var(--text-secondary)' 
                  }} 
                />
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: theme === 'light' ? 'var(--accent-primary)' : 'var(--text-primary)',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    Light Theme
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.4'
                  }}>
                    Clean, bright interface for daytime use
                  </div>
                </div>
              </button>

              {/* Dark Theme */}
              <button
                onClick={() => theme !== 'dark' && toggleTheme()}
                style={{
                  padding: 'var(--space-lg)',
                  border: `2px solid ${theme === 'dark' ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                  borderRadius: 'var(--radius-lg)',
                  background: theme === 'dark' ? 'var(--accent-light)' : 'var(--bg-elevated)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  if (theme !== 'dark') {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (theme !== 'dark') {
                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                  }
                }}
              >
                <Moon 
                  size={32} 
                  style={{ 
                    color: theme === 'dark' ? 'var(--accent-primary)' : 'var(--text-secondary)' 
                  }} 
                />
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: theme === 'dark' ? 'var(--accent-primary)' : 'var(--text-primary)',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    Dark Theme
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.4'
                  }}>
                    Easy on the eyes for extended use
                  </div>
                </div>
              </button>

              {/* Auto Theme (Coming Soon) */}
              <button
                disabled
                style={{
                  padding: 'var(--space-lg)',
                  border: '2px solid var(--border-primary)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-elevated)',
                  cursor: 'not-allowed',
                  opacity: 0.6,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  textAlign: 'center'
                }}
              >
                <Monitor size={32} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: 'var(--text-muted)',
                    marginBottom: 'var(--space-xs)'
                  }}>
                    Auto Theme
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    lineHeight: '1.4'
                  }}>
                    Follows system preference
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: 'var(--space-xs)',
                    fontStyle: 'italic'
                  }}>
                    Coming Soon
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <Info size={20} />
              About DataSnap
            </h2>
          </div>
          <div className="card-content">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem'
                }}>
                  <span>Version</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--text-primary)' }}>
                    v2.0.0
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem'
                }}>
                  <span>Build</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--text-primary)' }}>
                    Pro Edition
                  </span>
                </div>
              </div>
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem'
                }}>
                  <span>Current Theme</span>
                  <span style={{ 
                    fontFamily: 'var(--font-family-mono)',
                    color: 'var(--accent-primary)',
                    textTransform: 'capitalize',
                    fontWeight: '600'
                  }}>
                    {theme}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem'
                }}>
                  <span>Platform</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--text-primary)' }}>
                    Electron
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}