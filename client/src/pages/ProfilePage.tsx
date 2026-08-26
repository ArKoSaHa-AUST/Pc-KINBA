import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../auth/useAuth';
import { useToast } from '../components/ui';
import { ProfileHero3D } from '../components/profile/ProfileHero3D';
import { ProfileInfoCard } from '../components/profile/ProfileInfoCard';
import { BuildHistoryTimeline } from '../components/profile/BuildHistoryTimeline';
import { NotificationPanel } from '../components/profile/NotificationPanel';
import { SecurityDangerZone } from '../components/profile/SecurityDangerZone';
import type { NotificationPreferences } from '../api/auth';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, status, updateProfile, forgotPassword, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Parallax ambient orb scroll listener
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const orb1 = document.querySelector('.profile-orb-1') as HTMLElement | null;
      const orb2 = document.querySelector('.profile-orb-2') as HTMLElement | null;
      const orb3 = document.querySelector('.profile-orb-3') as HTMLElement | null;

      if (orb1) orb1.style.transform = `translateY(${scrollY * 0.15}px)`;
      if (orb2) orb2.style.transform = `translateY(${scrollY * -0.1}px)`;
      if (orb3) orb3.style.transform = `translateY(${scrollY * 0.08}px)`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 4.1 Page Load Flow
  if (status === 'loading') {
    return (
      <div className="profile-page-root flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-text-muted text-sm font-medium animate-pulse">
            Loading your PC Kinba profile...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // 4.2 Profile Update Flow
  const handleSaveProfile = async (payload: {
    name: string;
    avatarUrl: string | null;
    purpose: string;
  }) => {
    setSaving(true);
    try {
      await updateProfile({
        name: payload.name,
        avatarUrl: payload.avatarUrl,
        purpose: payload.purpose,
      });
      toast({
        message: 'Profile updated successfully!',
        variant: 'success',
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update profile. Please try again.';
      toast({
        message: msg,
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  // Notification Preferences Update Flow
  const handleNotificationChange = async (newPrefs: NotificationPreferences) => {
    try {
      await updateProfile({
        notificationPreferences: newPrefs,
      });
      toast({
        message: 'Notification preferences updated.',
        variant: 'success',
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update notification preferences.';
      toast({
        message: msg,
        variant: 'danger',
      });
    }
  };

  // 4.3 Password Reset Flow
  const handleResetPassword = async () => {
    setResetting(true);
    try {
      await forgotPassword(user.email);
      toast({
        message: `Password reset link sent to ${user.email}`,
        variant: 'success',
        duration: 6000,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to send password reset email.';
      toast({
        message: msg,
        variant: 'danger',
      });
    } finally {
      setResetting(false);
    }
  };

  // 4.4 Logout Flow
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast({
        message: 'Signed out successfully.',
        variant: 'info',
      });
      navigate('/');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error signing out.';
      toast({
        message: msg,
        variant: 'danger',
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    },
  };

  return (
    <div className="profile-page-root">
      {/* Background Parallax Orbs */}
      <div className="profile-ambient-orb profile-orb-1" />
      <div className="profile-ambient-orb profile-orb-2" />
      <div className="profile-ambient-orb profile-orb-3" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="profile-content-container"
      >
        {/* Section 1: Profile Hero 3D */}
        <motion.div variants={sectionVariants} className="profile-scroll-section">
          <ProfileHero3D user={user} />
        </motion.div>

        {/* Section 2: Personal Information Card */}
        <motion.div variants={sectionVariants} className="profile-scroll-section">
          <ProfileInfoCard
            user={user}
            onSave={handleSaveProfile}
            saving={saving}
          />
        </motion.div>

        {/* Section 3: Build History Timeline */}
        <motion.div variants={sectionVariants} className="profile-scroll-section">
          <BuildHistoryTimeline />
        </motion.div>

        {/* Section 4: Notification Preferences */}
        <motion.div variants={sectionVariants} className="profile-scroll-section">
          <NotificationPanel
            preferences={
              user.notificationPreferences || {
                emailPriceDrops: true,
                emailNewsletter: false,
                emailProductUpdates: true,
                pushEnabled: false,
              }
            }
            onChange={handleNotificationChange}
          />
        </motion.div>

        {/* Section 5: Security & Danger Zone */}
        <motion.div variants={sectionVariants} className="profile-scroll-section">
          <SecurityDangerZone
            email={user.email}
            onResetPassword={handleResetPassword}
            onLogout={handleLogout}
            resetting={resetting}
            loggingOut={loggingOut}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
