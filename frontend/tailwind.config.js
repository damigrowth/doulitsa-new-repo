/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        // '2xs': '300px', // breaks container class
        xs: '475px',
        // '2xl': '1400px',
        // '3xl': '1600px',
        // '4xl': '1700px',
      },
      maxWidth: {
        '3xl': '1600px',
        '4xl': '1700px',
      },
      fontFamily: {
        sans: [
          'var(--font-open-sans)',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        '3sm': ['0.813rem', { lineHeight: '1.25rem' }], // 13px
        '2sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px
        sm: ['0.938rem', { lineHeight: '1.25rem' }], // 15px instead of default 14px
        xl2: ['1.406rem', { lineHeight: '1.75rem' }], // 22.5px
      },
      spacing: {
        'tag-y': '0.2rem', // 3.2px
        'tag-x': '0.6rem', // 9.6px
        1: '1px', // 1px for mb-1
        4.5: '1.125rem', // 18px
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'bubble-left': '16px 16px 16px 4px',
        'bubble-right': '16px 16px 4px 16px',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          dark: 'hsl(var(--primary-dark))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        third: 'hsl(var(--third))',
        fourth: 'hsl(var(--fourth))',
        fifth: 'hsl(var(--fifth))',
        sixth: 'hsl(var(--sixth))',
        orangy: {
          DEFAULT: 'hsl(var(--orangy))',
          foreground: 'hsl(var(--orangy-foreground))',
        },
        yellowish: 'hsl(var(--yellowish))',
        silver: 'hsl(var(--silver))',
        bluey: 'hsl(var(--bluey))',
        'yellow-light': 'hsl(var(--yellow-light))',
        'yellow-bright': 'hsl(var(--yellow-bright))',
        'gray-medium': 'hsl(var(--gray-medium))',
        'green-light': 'hsl(var(--green-light))',
        'purple-dark': 'hsl(var(--purple-dark))',
        dark: 'hsl(var(--dark))',
        subtle: 'hsl(var(--subtle))',
        body: 'hsl(var(--body))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        pale: {
          DEFAULT: 'hsl(var(--pale))',
          foreground: 'hsl(var(--pale-foreground))',
        },
        green: {
          50: 'hsl(var(--green-50))',
          100: 'hsl(var(--green-100))',
          200: 'hsl(var(--green-200))',
          300: 'hsl(var(--green-300))',
          400: 'hsl(var(--green-400))',
          500: 'hsl(var(--green-500))',
          600: 'hsl(var(--green-600))',
          700: 'hsl(var(--green-700))',
          800: 'hsl(var(--green-800))',
          900: 'hsl(var(--green-900))',
        },
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'slide-in-down': {
          '0%': {
            transform: 'translate3d(0, -100%, 0)',
            visibility: 'visible',
          },
          '100%': {
            transform: 'translate3d(0, 0, 0)',
          },
        },
        'slide-in': {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
        'bounce-left': {
          '0%, 100%': {
            transform: 'translateX(0px)',
          },
          '50%': {
            transform: 'translateX(-20px)',
          },
        },
        'bounce-right': {
          '0%, 100%': {
            transform: 'translateX(0px)',
          },
          '50%': {
            transform: 'translateX(20px)',
          },
        },
        'bounce-x': {
          '0%, 100%': {
            transform: 'translateX(0px)',
          },
          '50%': {
            transform: 'translateX(-25px)',
          },
        },
        'bounce-y': {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-25px)',
          },
        },
        'bounce-y-reverse': {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(25px)',
          },
        },
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'fade-cycle': {
          '0%, 100%': {
            opacity: '0',
          },
          '2%, 30%': {
            opacity: '1',
          },
          '33%': {
            opacity: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'slide-in-down': 'slide-in-down 0.4s ease-in-out',
        'slide-in': 'slide-in 0.4s ease-in-out',
        'bounce-left': 'bounce-left 6s ease-in-out infinite',
        'bounce-right': 'bounce-right 6s ease-in-out infinite',
        'bounce-x': 'bounce-x 6s ease-in-out infinite',
        'bounce-y': 'bounce-y 6s ease-in-out infinite',
        'bounce-y-reverse': 'bounce-y-reverse 6s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'fade-cycle': 'fade-cycle 9s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/container-queries'),
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* Hide scrollbar for IE, Edge and Firefox */
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          /* Hide scrollbar for Chrome, Safari and Opera */
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      });
    },
  ],
};
