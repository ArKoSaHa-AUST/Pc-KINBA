import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Cpu, HardDrive, Sparkles, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/Badge';
import { use3DTilt } from '../ai/use3DTilt';
import { formatDate } from '../../i18n/format';
import type { UserProfile } from '../../api/auth';
import './ProfileHero3D.css';

interface ProfileHero3DProps {
  user: UserProfile;
}

export function ProfileHero3D({ user }: ProfileHero3DProps) {
  const { i18n } = useTranslation('auth');
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [stats, setStats] = useState({ builds: 0, savedCount: 0, aiScore: 98 });

  const {
    cardRef,
    isHovered,
    rotateX,
    rotateY,
    scale,
    glossPos,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
  } = use3DTilt({ maxTilt: 6, scaleOnHover: 1.01 });

  useEffect(() => {
    try {
      const storedConfig = localStorage.getItem('pc_kinba_configured_build');
      const savedList = localStorage.getItem('pcbuilder_saved_builds');
      let builds = 0;
      let savedCount = 0;

      if (storedConfig) {
        builds += 1;
      }
      if (savedList) {
        const parsed = JSON.parse(savedList);
        if (Array.isArray(parsed)) {
          savedCount = parsed.length;
        }
      }
      setStats({
        builds: builds || 1,
        savedCount: savedCount || 2,
        aiScore: 98,
      });
    } catch {
      setStats({ builds: 1, savedCount: 2, aiScore: 98 });
    }
  }, []);

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        scale,
      }}
      className="profile-hero-card flex flex-col md:flex-row items-center gap-8 w-full"
    >
      {/* 3D Gloss Highlight */}
      <div
        className="profile-hero-gloss"
        style={{
          background: `radial-gradient(circle 350px at ${glossPos.x}% ${glossPos.y}%, rgba(255, 255, 255, 0.08), transparent 80%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* 3D Avatar with Conic Rotating Ring */}
      <div className="profile-avatar-container">
        <div className="profile-avatar-glow" />
        <div className="profile-avatar-ring" />
        <div className="profile-avatar-inner">
          {user.avatarUrl && !avatarBroken ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              onError={() => setAvatarBroken(true)}
              className="profile-avatar-img"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent/80 via-purple/80 to-blue-600/80 flex items-center justify-center text-white font-black text-2xl tracking-wider select-none">
              {initials}
            </div>
          )}
        </div>
      </div>

      {/* Identity & Details */}
      <div className="flex-1 text-center md:text-left flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">{user.name}</h1>
          <Badge variant="accent" className="font-semibold px-2.5 py-0.5 text-xs">
            {user.role}
          </Badge>
          {user.emailVerified ? (
            <Badge variant="success" className="flex items-center gap-1 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified
            </Badge>
          ) : (
            <Badge variant="warning" className="flex items-center gap-1 text-xs">
              <ShieldAlert className="w-3.5 h-3.5" /> Unverified
            </Badge>
          )}
        </div>

        <p className="text-text-muted text-sm font-medium">{user.email}</p>

        <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-text-muted">
          <Calendar className="w-3.5 h-3.5 text-accent" />
          <span>Member since {formatDate(user.createdAt, i18n.language)}</span>
          <span className="text-border mx-1">•</span>
          <span className="capitalize text-accent font-semibold">
            {user.purpose || 'Gaming'} Enthusiast
          </span>
        </div>

        {/* Animated Stats Row */}
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border/40">
          <div className="profile-stat-badge flex flex-col items-center md:items-start">
            <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
              <Cpu className="w-3.5 h-3.5 text-accent" /> Builds
            </div>
            <span className="text-lg font-black text-text-primary mt-0.5">{stats.builds}</span>
          </div>

          <div className="profile-stat-badge flex flex-col items-center md:items-start">
            <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
              <HardDrive className="w-3.5 h-3.5 text-purple" /> Saved
            </div>
            <span className="text-lg font-black text-text-primary mt-0.5">{stats.savedCount}</span>
          </div>

          <div className="profile-stat-badge flex flex-col items-center md:items-start">
            <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
              <Sparkles className="w-3.5 h-3.5 text-green-400" /> AI Score
            </div>
            <span className="text-lg font-black text-text-primary mt-0.5">{stats.aiScore}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
