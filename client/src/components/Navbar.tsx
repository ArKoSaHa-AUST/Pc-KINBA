import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LogIn, Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeSwitcher from './ThemeSwitcher';
import LanguageSwitcher from './LanguageSwitcher';
import UserMenu from './UserMenu';
import { useAuth } from '../auth/useAuth';

const NAV_ITEMS = [
  { key: 'home', path: '/' },
  { key: 'pcBuilder', path: '/pc-builder' },
  { key: 'components', path: '/components' },
  { key: 'compare', path: '/compare' },
  { key: 'aiAssistant', path: '/ai-assistant' },
] as const;

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation('nav');
  const { status, user } = useAuth();
  const isAuthenticated = status === 'authenticated' && user !== null;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 h-[80px] flex items-center transition-all duration-300 ${
          scrolled
            ? 'bg-bg-primary/70 backdrop-blur-2xl border-b border-border shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
            : 'bg-transparent border-b border-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="container max-w-[1440px] mx-auto px-6 md:px-8 w-full flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group z-50">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center transform group-hover:rotate-12 transition-transform shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <span className="font-black text-white text-sm">PC</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-text-primary group-hover:text-accent transition-colors">
              {t('common:brand', { defaultValue: 'KINBA' })}
            </span>
          </Link>

          {/* Desktop Links (Centered) */}
          <div className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2 space-x-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                to={item.path}
                className="px-4 py-2 rounded-full text-sm font-medium text-text-muted hover:text-text-primary hover:bg-border transition-all"
              >
                {t(item.key)}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => navigate('/search')}
              className="p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-border transition-colors"
              aria-label={t('search')}
            >
              <Search className="w-5 h-5" />
            </button>
            <ThemeSwitcher />
            <LanguageSwitcher />
            <div className="h-6 w-px bg-border mx-2"></div>
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" /> {t('signIn')}
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="button-primary text-sm py-2 px-5"
                >
                  {t('signUp')}
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="lg:hidden flex items-center gap-1 z-50">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <button
              className="p-2 text-text-muted hover:text-text-primary"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? t('common:close') : t('common:search')}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(24px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="fixed inset-0 z-40 bg-bg-primary/90 flex items-center justify-center lg:hidden"
          >
            <div className="flex flex-col items-center gap-8">
              {NAV_ITEMS.map((item, idx) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Link
                    to={item.path}
                    className="text-2xl font-semibold text-text-muted hover:text-text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t(item.key)}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-4 mt-8"
              >
                <button
                  className="button-secondary"
                  onClick={() => {
                    navigate('/search');
                    setMobileMenuOpen(false);
                  }}
                >
                  <Search className="w-5 h-5" /> {t('search')}
                </button>
                {isAuthenticated ? (
                  <button
                    className="button-primary"
                    onClick={() => {
                      navigate('/profile');
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t('auth:menu.profile')}
                  </button>
                ) : (
                  <button
                    className="button-primary"
                    onClick={() => {
                      navigate('/login');
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t('signIn')}
                  </button>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
