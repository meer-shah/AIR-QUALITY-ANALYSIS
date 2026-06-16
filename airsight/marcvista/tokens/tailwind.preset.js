/**
 * MarcVista Design System — Tailwind preset
 *
 * Use in your project:
 *
 *   // tailwind.config.js
 *   const brand = require('./design-system/tokens/tailwind.preset.js')
 *   module.exports = {
 *     presets: [brand],
 *     content: ['./app/**\/*.{ts,tsx,mdx}'],
 *   }
 *
 * Note: MarcVista's default border radius is `none` (sharp corners are the brand
 * signature). Reach for rounded radii only on avatars (full) and incidental UI.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        ink: {
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          900: '#000000',
        },
        paper:     '#FFFFFF',
        surface:   '#F5F5F5',
        line: {
          DEFAULT: '#E5E7EB',
          soft:    '#F3F4F6',
        },
        success: { 100: '#DCFCE7', 600: '#16A34A' },
        warn:    { 100: '#FEF3C7', 600: '#D97706' },
        danger:  { 100: '#FEE2E2', 600: '#DC2626' },
        info:    { 100: '#EDE9FE', 600: '#7C3AED' },
      },
      fontFamily: {
        sans:  ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono:  ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        serif: ['ui-serif', 'Georgia', 'Times New Roman', 'serif'],
      },
      fontSize: {
        'display-xl': ['72px', { lineHeight: '80px', letterSpacing: '-0.02em',  fontWeight: '700' }],
        'display-lg': ['56px', { lineHeight: '64px', letterSpacing: '-0.02em',  fontWeight: '700' }],
        'h1':         ['40px', { lineHeight: '48px', letterSpacing: '-0.015em', fontWeight: '700' }],
        'h2':         ['32px', { lineHeight: '40px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'h3':         ['24px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'h4':         ['20px', { lineHeight: '28px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'body-lg':    ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md':    ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm':    ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'caption':    ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'overline':   ['11px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '600' }],
        'code':       ['14px', { lineHeight: '20px', fontWeight: '400' }],
      },
      borderRadius: {
        'none': '0px',
        'xs':   '4px',
        'sm':   '6px',
        'md':   '10px',
        'lg':   '16px',
        'xl':   '24px',
        'full': '9999px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'sm': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'lg': '0 12px 32px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)',
        'xl': '0 24px 48px rgba(0, 0, 0, 0.10), 0 8px 16px rgba(0, 0, 0, 0.06)',
      },
      transitionDuration: {
        'xs': '80ms',
        'sm': '160ms',
        'md': '240ms',
        'lg': '480ms',
        'xl': '720ms',
      },
      transitionTimingFunction: {
        'out':      'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out':   'cubic-bezier(0.4, 0, 0.2, 1)',
        'standard': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      maxWidth: {
        'container':     '1200px',
        'reading':       '680px',
        'hero-subcopy':  '520px',
      },
      screens: {
        'sm':  '640px',
        'md':  '768px',
        'lg':  '1024px',
        'xl':  '1280px',
        '2xl': '1536px',
      },
    },
  },
}
