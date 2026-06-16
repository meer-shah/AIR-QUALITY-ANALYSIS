/**
 * Nav — sticky top bar. AirSight wordmark in violet, sentence-case route links,
 * active link gets a brand/600 underline. Mobile: hamburger -> drawer.
 */
import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';

interface RouteLink {
  to: string;
  label: string;
}

const LINKS: RouteLink[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/live', label: 'Now' },
  { to: '/map', label: 'Map' },
  { to: '/trends', label: 'Trends' },
  { to: '/stations', label: 'Stations' },
  { to: '/explore', label: 'Explore' },
  { to: '/estimate', label: 'Estimate' },
  { to: '/methodology', label: 'Methods' },
];

const Wordmark: React.FC = () => (
  <span className="text-h4 font-bold tracking-[-0.015em]">
    <span className="text-brand-600">Air</span>
    <span className="text-ink-900">Sight</span>
  </span>
);

function linkClasses(isActive: boolean): string {
  return cn(
    'text-body-md font-medium transition-colors duration-xs pb-1 border-b-2',
    isActive
      ? 'text-ink-900 border-brand-600'
      : 'text-ink-700 border-transparent hover:text-ink-900',
  );
}

export const Nav: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [stuck, setStuck] = React.useState(false);

  React.useEffect(() => {
    const on = () => setStuck(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-md ease-out bg-paper',
        stuck ? 'border-b border-line shadow-xs' : 'border-b border-line-soft',
      )}
    >
      <div className="mx-auto max-w-container px-4 md:px-6 h-[64px] flex items-center justify-between gap-8">
        <NavLink to="/" className="flex items-center" aria-label="AirSight home">
          <Wordmark />
        </NavLink>

        <nav aria-label="Primary" className="hidden lg:flex items-center gap-7">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => linkClasses(isActive)}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center h-11 w-11 -mr-2 text-ink-900"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <span className="text-h4">{open ? '✕' : '☰'}</span>
        </button>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="lg:hidden border-t border-line bg-paper px-4 py-4 flex flex-col gap-1"
        >
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'py-3 px-2 text-body-lg font-medium border-l-2',
                  isActive ? 'text-ink-900 border-brand-600 bg-surface' : 'text-ink-700 border-transparent',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
};
