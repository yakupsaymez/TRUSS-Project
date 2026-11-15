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
        'truss-bg': '#09090B', // Seamless Dark ana arkaplan
        'truss-surface': '#18181B', // Kart ve Modal arkaplanları
        'truss-purple': '#8B5CF6', // SS Mor (Ana marka rengi)
        'truss-purple-hover': '#7C3AED', // Buton hover
        'truss-text': '#FAFAFA', // Ana metin
        'truss-muted': '#A1A1AA', // İkincil/Pasif metin
        'truss-border': '#27272A', // İnce çerçeve ve ayırıcılar
        obsidian: {
          950: '#09090B', // Seamless Canvas / Card / Sidebar
          900: '#09090B', // Unified Primary Surface
          850: '#121215', // Subtle Elevated Input Surface
          800: '#18181B', // Hover / Active Surface
          700: 'rgba(255, 255, 255, 0.05)' // Hairline Divider
        },
        truss: {
          DEFAULT: '#7C3AED', // TRUSS Electric Violet (Primary Signature)
          light: '#A78BFA',   // SS Logotype & Glow Highlight
          vivid: '#8B5CF6',   // Interactive Hover
          deep: '#5B21B6',    // Pressed / Active State
          cyan: '#06B6D4'     // Telemetry / Secondary Accent
        },
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
