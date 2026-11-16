/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      colors: {
        'truss-bg': 'var(--truss-bg)',
        'truss-surface': 'var(--truss-surface)',
        'truss-purple': 'var(--truss-purple)',
        'truss-purple-hover': 'var(--truss-purple-hover)',
        'truss-text': 'var(--truss-text)',
        'truss-muted': 'var(--truss-muted)',
        'truss-border': 'var(--truss-border)',
        status: {
          success: '#10B981', // Emerald 500
          warning: '#F59E0B', // Amber 500
          danger: '#F43F5E',  // Rose 500
          info: '#38BDF8'     // Sky 400
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)'
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)'
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)'
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)'
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)'
        },
        destructive: {
          DEFAULT: 'var(--destructive)'
        },
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)'
        },
        chart: {
          '1': 'var(--chart-1)',
          '2': 'var(--chart-2)',
          '3': 'var(--chart-3)',
          '4': 'var(--chart-4)',
          '5': 'var(--chart-5)'
        }
      },
      borderRadius: {
        '2xl': '1rem',      // 16px — Modals & Executive Cards
        xl: '0.75rem',      // 12px — Buttons, Inputs & Dropdowns
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      boxShadow: {
        'truss-glow': '0 0 24px -4px rgba(124, 58, 237, 0.45), 0 8px 20px -6px rgba(0, 0, 0, 0.65)',
        'truss-card': '0 1px 2px rgba(0, 0, 0, 0.4), 0 16px 36px -16px rgba(0, 0, 0, 0.7)',
        'truss-modal': '0 24px 64px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)'
      }
    }
  },
  plugins: []
};
