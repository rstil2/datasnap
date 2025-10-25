import React from 'react';
import { createPortal } from 'react-dom';
import { X, Moon, Sun, Monitor, Bell, Download, Shield, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, toggleTheme } = useTheme();

  if (!isOpen) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    console.error('Modal root not found');
    return null;
  }

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem'
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        padding: '2rem',
        width: '100%',
        maxWidth: '480px',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative',
        border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-xl)'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '2rem' 
        }}>
          <div>
            <h2 style={{ 
              color: 'var(--text-primary)', 
              fontSize: '1.5rem', 
              fontWeight: '600',
              margin: 0,
              marginBottom: '0.5rem',
              lineHeight: '1.3'
            }}>
              Settings
            </h2>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.875rem',
              margin: 0,
              lineHeight: '1.4'
            }}>
              Customize your DataSnap experience
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Settings Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          
          {/* Appearance Section */}
          <div style={{
            padding: 'var(--space-lg)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <h3 style={{
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontWeight: '600',
              margin: '0 0 var(--space-sm) 0',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)'
            }}>
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              Appearance
            </h3>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              margin: '0 0 var(--space-lg) 0',
              lineHeight: '1.4'
            }}>
              Customize the visual appearance of DataSnap
            </p>
            
            {/* Theme Selection */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)'
            }}>
              <label style={{
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: 'var(--space-sm)'
              }}>
                Color Theme
              </label>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 'var(--space-sm)'
              }}>
                {/* Light Theme Option */}
                <button
                  onClick={() => theme !== 'light' && toggleTheme()}
                  style={{
                    padding: 'var(--space-md)',
                    border: `2px solid ${theme === 'light' ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: theme === 'light' ? 'var(--accent-light)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--space-sm)'
                  }}
                >
                  <Sun size={20} style={{ color: theme === 'light' ? 'var(--accent-primary)' : 'var(--text-secondary)' }} />
                  <span style={{
                    color: theme === 'light' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    Light
                  </span>
                </button>
                
                {/* Dark Theme Option */}
                <button
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  style={{
                    padding: 'var(--space-md)',
                    border: `2px solid ${theme === 'dark' ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: theme === 'dark' ? 'var(--accent-light)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--space-sm)'
                  }}
                >
                  <Moon size={20} style={{ color: theme === 'dark' ? 'var(--accent-primary)' : 'var(--text-secondary)' }} />
                  <span style={{
                    color: theme === 'dark' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    Dark
                  </span>
                </button>
                
                {/* Auto Theme Option */}
                <button
                  style={{
                    padding: 'var(--space-md)',
                    border: `2px solid var(--border-primary)`,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    cursor: 'not-allowed',
                    opacity: 0.5,
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--space-sm)'
                  }}
                  disabled
                >
                  <Monitor size={20} style={{ color: 'var(--text-muted)' }} />
                  <span style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    Auto
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Application Preferences */}
          <div style={{
            padding: 'var(--space-lg)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <h3 style={{
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontWeight: '600',
              margin: '0 0 var(--space-sm) 0',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)'
            }}>
              <Zap size={18} />
              Application Preferences
            </h3>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              margin: '0 0 var(--space-lg) 0',
              lineHeight: '1.4'
            }}>
              Configure how DataSnap behaves
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* Notifications Setting */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-sm) 0',
                borderBottom: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <Bell size={16} style={{ color: 'var(--text-secondary)' }} />
                  <div>
                    <div style={{
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      Notifications
                    </div>
                    <div style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem'
                    }}>
                      Show desktop notifications
                    </div>
                  </div>
                </div>
                <div style={{
                  padding: '0.25rem 0.5rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem'
                }}>
                  Coming Soon
                </div>
              </div>
              
              {/* Auto-save Setting */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-sm) 0',
                borderBottom: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <Download size={16} style={{ color: 'var(--text-secondary)' }} />
                  <div>
                    <div style={{
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      Auto-save
                    </div>
                    <div style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem'
                    }}>
                      Automatically save your work
                    </div>
                  </div>
                </div>
                <div style={{
                  padding: '0.25rem 0.5rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem'
                }}>
                  Coming Soon
                </div>
              </div>
              
              {/* Privacy Setting */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-sm) 0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <Shield size={16} style={{ color: 'var(--text-secondary)' }} />
                  <div>
                    <div style={{
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      Privacy Mode
                    </div>
                    <div style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem'
                    }}>
                      Enhanced data protection
                    </div>
                  </div>
                </div>
                <div style={{
                  padding: '0.25rem 0.5rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem'
                }}>
                  Coming Soon
                </div>
              </div>
            </div>
          </div>
          
          {/* About Section */}
          <div style={{
            padding: 'var(--space-lg)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <h3 style={{
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontWeight: '600',
              margin: '0 0 var(--space-sm) 0'
            }}>
              About DataSnap
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem'
              }}>
                <span>Version</span>
                <span style={{ fontFamily: 'var(--font-family-mono)' }}>v2.0.0</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem'
              }}>
                <span>Build</span>
                <span style={{ fontFamily: 'var(--font-family-mono)' }}>Pro Edition</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem'
              }}>
                <span>Theme</span>
                <span style={{ 
                  fontFamily: 'var(--font-family-mono)',
                  color: 'var(--accent-primary)',
                  textTransform: 'capitalize'
                }}>
                  {theme}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 'var(--space-xl)',
          paddingTop: 'var(--space-lg)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: 'var(--space-md) var(--space-lg)',
              background: 'var(--accent-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-primary-hover)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent-primary)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    modalRoot
  );
}