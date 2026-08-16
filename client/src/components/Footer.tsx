import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation('common');
  const productLinks = ['pcBuilder', 'aiAssistant', 'compareGpus', 'compareCpus'] as const;
  const resourceLinks = ['buildGuides', 'compatibilityDb', 'blog', 'helpCenter'] as const;

  return (
    <footer className="mt-16 bg-gradient-to-b from-bg-primary to-bg-secondary border-t border-border relative overflow-hidden">
      {/* Decorative ambient light */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-purple/10 blur-[120px] pointer-events-none"></div>

      <div className="max-w-[1440px] mx-auto px-6 py-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-6">
          <div className="lg:col-span-1 space-y-6">
            <h3 className="font-bold text-2xl tracking-tight text-text-primary group cursor-pointer flex items-center gap-2 h-8">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center transform group-hover:rotate-12 transition-transform shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                <span className="font-black text-white text-sm">PC</span>
              </div>
              <span className="group-hover:text-accent transition-colors">{t('brand')}</span>
            </h3>
            <p className="text-text-muted text-sm leading-relaxed max-w-xs">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h4 className="text-text-primary font-semibold mb-6 flex items-center h-8">{t('footer.product')}</h4>
            <ul className="space-y-4 text-sm text-text-muted">
              {productLinks.map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-accent transition-colors">
                    {t(`footer.links.${link}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-text-primary font-semibold mb-6 flex items-center h-8">{t('footer.resources')}</h4>
            <ul className="space-y-4 text-sm text-text-muted">
              {resourceLinks.map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-accent transition-colors">
                    {t(`footer.links.${link}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-text-primary font-semibold mb-6 flex items-center h-8">{t('footer.stayUpdated')}</h4>
            <p className="text-text-muted text-sm mb-4">{t('footer.newsletterPrompt')}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder={t('footer.emailPlaceholder')}
                className="bg-glass border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent flex-1 min-w-0 transition-colors"
              />
              <button className="button-primary py-3 rounded-xl shrink-0 whitespace-nowrap">
                {t('subscribe')}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text-muted">
          <p>
            &copy; {new Date().getFullYear()} PC-KINBA. {t('footer.rights')}
          </p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-text-primary transition-colors">
              GitHub
            </a>
            <a href="#" className="hover:text-text-primary transition-colors">
              Discord
            </a>
            <a href="#" className="hover:text-text-primary transition-colors">
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
