import React, { useState } from 'react';
import { X, User, Shuffle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { userService } from '../services/userService';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const { signIn } = useUser();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const avatarOptions = userService.getAvatarOptions();

  // Set random avatar on first open
  React.useEffect(() => {
    if (isOpen && !avatar) {
      setAvatar(userService.getRandomAvatar());
    }
  }, [isOpen, avatar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      const validation = userService.validateUserData({ name: name.trim(), avatar });
      
      if (!validation.isValid) {
        setErrors(validation.errors);
        setIsSubmitting(false);
        return;
      }

      await signIn({ name: name.trim(), avatar });
      
      // Reset form and close modal
      setName('');
      setAvatar('');
      setErrors([]);
      onClose();
    } catch (error) {
      console.error('Sign in error:', error);
      setErrors(['Failed to sign in. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRandomAvatar = () => {
    setAvatar(userService.getRandomAvatar());
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setAvatar('');
      setErrors([]);
      onClose();
    }
  };

  if (!isOpen) return null;

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
        padding: '3rem',
        width: '100%',
        maxWidth: '500px',
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
              Welcome to DataSnap
            </h2>
            <p style={{ 
              color: 'var(--text-secondary, #b4b4b4)', 
              fontSize: '0.875rem',
              margin: 0,
              lineHeight: '1.4'
            }}>
              Choose your name and avatar to get started
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #b4b4b4)',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isSubmitting ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Name Input */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.75rem',
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.875rem',
              fontWeight: '600',
              lineHeight: '1.4'
            }}>
              <User size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '1rem',
                border: '1px solid var(--border-primary, #2a2a2a)',
                borderRadius: '8px',
                background: 'var(--bg-elevated, #212121)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '1rem',
                opacity: isSubmitting ? 0.7 : 1,
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              autoFocus
            />
          </div>

          {/* Avatar Selection */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '1rem' 
            }}>
              <label style={{
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.875rem',
                fontWeight: '600',
                lineHeight: '1.4'
              }}>
                Choose Your Avatar
              </label>
              <button
                type="button"
                onClick={handleRandomAvatar}
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--bg-elevated, #212121)',
                  border: '1px solid var(--border-primary, #2a2a2a)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary, #b4b4b4)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  opacity: isSubmitting ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                <Shuffle size={12} />
                Random
              </button>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
              gap: '0.5rem',
              padding: '1rem',
              background: 'var(--bg-elevated, #212121)',
              borderRadius: '8px',
              border: '1px solid var(--border-primary, #2a2a2a)',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              {avatarOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAvatar(option)}
                  disabled={isSubmitting}
                  style={{
                    width: '48px',
                    height: '48px',
                    border: avatar === option ? '2px solid var(--accent-primary, #007AFF)' : '1px solid var(--border-subtle, #1a1a1a)',
                    borderRadius: '8px',
                    background: avatar === option ? 'var(--accent-light, rgba(0, 122, 255, 0.1))' : 'var(--bg-primary, #0a0a0a)',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    opacity: isSubmitting ? 0.5 : 1
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Avatar Preview */}
          {avatar && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              background: 'var(--bg-elevated, #212121)',
              borderRadius: '8px',
              border: '1px solid var(--border-primary, #2a2a2a)',
              marginBottom: '2rem'
            }}>
              <div style={{
                fontSize: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {avatar}
              </div>
              <div>
                <p style={{
                  margin: 0,
                  color: 'var(--text-primary, #ffffff)',
                  fontWeight: '600',
                  lineHeight: '1.4'
                }}>
                  {name.trim() || 'Your Name'}
                </p>
                <p style={{
                  margin: 0,
                  color: 'var(--text-secondary, #b4b4b4)',
                  fontSize: '0.875rem',
                  lineHeight: '1.4'
                }}>
                  This is how you'll appear to others
                </p>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {errors.length > 0 && (
            <div style={{
              padding: '1rem',
              background: 'var(--error-light, rgba(255, 69, 58, 0.1))',
              border: '1px solid var(--error, #FF453A)',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              {errors.map((error, index) => (
                <p key={index} style={{
                  margin: 0,
                  color: 'var(--error-dark, #cc2c24)',
                  fontSize: '0.875rem',
                  lineHeight: '1.4',
                  marginBottom: index < errors.length - 1 ? '0.5rem' : 0
                }}>
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !avatar}
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              background: isSubmitting || !name.trim() || !avatar ? 'var(--bg-secondary, #141414)' : 'var(--accent-primary, #007AFF)',
              color: isSubmitting || !name.trim() || !avatar ? 'var(--text-secondary, #b4b4b4)' : 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isSubmitting || !name.trim() || !avatar ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
          >
            {isSubmitting ? 'Signing In...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
}