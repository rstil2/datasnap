import React, { useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail, validateFullName } from '../utils/validation';
import './Profile.css';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
  });
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = {
      fullName: validateFullName(formData.fullName),
      email: validateEmail(formData.email),
    };

    const hasErrors = Object.values(newErrors).some((error) => error !== null);
    if (hasErrors) {
      setErrors(
        Object.fromEntries(
          Object.entries(newErrors).map(([key, value]) => [
            key,
            value || undefined,
          ])
        )
      );
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Implement profile update
      console.log('Profile updated:', formData);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  return (
    <DashboardLayout>
      <div className="profile-container">
        <div className="profile-header">
          <h1>Profile Settings</h1>
          <p>Update your personal information</p>
        </div>

        <div className="profile-card">
          <form onSubmit={handleSubmit} className="profile-form">
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              error={errors.fullName}
            />
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />

            <div className="form-actions">
              <Button type="submit" isLoading={isLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>

        <div className="profile-card">
          <h2>Account Security</h2>
          <div className="security-section">
            <Button variant="outlined">Change Password</Button>
            <Button variant="outlined">Enable Two-Factor Authentication</Button>
          </div>
        </div>

        <div className="profile-card danger-zone">
          <h2>Danger Zone</h2>
          <div className="danger-actions">
            <Button variant="secondary">Delete Account</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};