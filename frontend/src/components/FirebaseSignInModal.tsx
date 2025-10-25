import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { config } from '../config';

interface FirebaseSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup';

export function FirebaseSignInModal({ isOpen, onClose }: FirebaseSignInModalProps) {
  const { signIn, signInWithGoogle, signInWithGitHub, createAccount, loading, error } = useUser();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setLocalError('Please fill in all required fields.');
      return;
    }

    if (mode === 'signup') {
      if (!displayName.trim()) {
        setLocalError('Please enter a display name.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters long.');
        return;
      }
    }

    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await createAccount(email.trim(), password, displayName.trim());
      }
      
      // Reset form and close modal on success
      resetForm();
      onClose();
    } catch (err) {
      // Error handling is done in the UserContext
      console.error('Authentication error:', err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLocalError('');
      await signInWithGoogle();
      resetForm();
      onClose();
    } catch (err) {
      console.error('Google sign-in error:', err);
    }
  };

  const handleGitHubSignIn = async () => {
    try {
      setLocalError('');
      await signInWithGitHub();
      resetForm();
      onClose();
    } catch (err) {
      console.error('GitHub sign-in error:', err);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setLocalError('');
    setMode('signin');
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setLocalError('');
  };

  if (!isOpen) return null;

  const displayError = localError || error;

  return (
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
        background: 'var(--bg-secondary, #141414)',
        borderRadius: '12px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '450px',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative',
        border: '1px solid var(--border-primary, #2a2a2a)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
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
              color: 'var(--text-primary, #ffffff)', 
              fontSize: '1.5rem', 
              fontWeight: '600',
              margin: 0,
              marginBottom: '0.5rem',
              lineHeight: '1.3'
            }}>
              {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p style={{ 
              color: 'var(--text-secondary, #b4b4b4)', 
              fontSize: '0.875rem',
              margin: 0,
              lineHeight: '1.4'
            }}>
              {mode === 'signin' 
                ? 'Sign in to share your data stories with the community'
                : 'Join DataSnap to publish and share your insights'
              }
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #b4b4b4)',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Display */}
        {displayError && (
          <div style={{
            background: 'var(--error-bg, rgba(239, 68, 68, 0.1))',
            border: '1px solid var(--error, #ef4444)',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1.5rem',
            color: 'var(--error, #ef4444)',
            fontSize: '0.875rem'
          }}>
            {displayError}
          </div>
        )}

        {/* Social Sign-In Buttons */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--bg-elevated, #212121)',
              border: '1px solid var(--border-primary, #2a2a2a)',
              borderRadius: '8px',
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--bg-tertiary, #2a2a2a)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated, #212121)';
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>🔍</span>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={handleGitHubSignIn}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--bg-elevated, #212121)',
              border: '1px solid var(--border-primary, #2a2a2a)',
              borderRadius: '8px',
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--bg-tertiary, #2a2a2a)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated, #212121)';
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>⚡</span>
            Continue with GitHub
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            margin: '1.5rem 0',
            color: 'var(--text-secondary, #b4b4b4)',
            fontSize: '0.875rem'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-primary, #2a2a2a)' }} />
            <span>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-primary, #2a2a2a)' }} />
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit}>
          {/* Display Name (for signup only) */}
          {mode === 'signup' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                <UserPlus size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you'll appear to others"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-primary, #2a2a2a)',
                  borderRadius: '8px',
                  background: 'var(--bg-elevated, #212121)',
                  color: 'var(--text-primary, #ffffff)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
              />
            </div>
          )}

          {/* Email Input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              <Mail size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-primary, #2a2a2a)',
                borderRadius: '8px',
                background: 'var(--bg-elevated, #212121)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.875rem',
                outline: 'none',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
              autoFocus={mode === 'signin'}
            />
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: mode === 'signup' ? '1.5rem' : '2rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              <Lock size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Create a password (6+ characters)' : 'Enter your password'}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  paddingRight: '3rem',
                  border: '1px solid var(--border-primary, #2a2a2a)',
                  borderRadius: '8px',
                  background: 'var(--bg-elevated, #212121)',
                  color: 'var(--text-primary, #ffffff)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary, #b4b4b4)',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (for signup only) */}
          {mode === 'signup' && (
            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                <Lock size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    paddingRight: '3rem',
                    border: '1px solid var(--border-primary, #2a2a2a)',
                    borderRadius: '8px',
                    background: 'var(--bg-elevated, #212121)',
                    color: 'var(--text-primary, #ffffff)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    opacity: loading ? 0.7 : 1,
                    transition: 'all 0.2s ease'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary, #b4b4b4)',
                    cursor: 'pointer',
                    padding: '0.25rem'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: loading ? 'var(--bg-tertiary, #2a2a2a)' : 'var(--accent-primary, #3b82f6)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s ease',
              marginBottom: '1.5rem'
            }}
          >
            {loading 
              ? 'Please wait...' 
              : mode === 'signin' 
                ? 'Sign In' 
                : 'Create Account'
            }
          </button>

          {/* Mode Toggle */}
          <div style={{
            textAlign: 'center',
            color: 'var(--text-secondary, #b4b4b4)',
            fontSize: '0.875rem'
          }}>
            {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={toggleMode}
              disabled={loading}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-primary, #3b82f6)',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
                opacity: loading ? 0.7 : 1
              }}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}