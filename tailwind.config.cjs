/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#fff1f0',
                    100: '#ffdfdb',
                    200: '#ffc5be',
                    300: '#ff9d91',
                    400: '#ff6452',
                    500: '#f94b25', // Mubly Orange-Red (Day Mode Brand)
                    600: '#e53214',
                    700: '#c0250d',
                    800: '#9f2210',
                    900: '#832115',
                    950: '#480e08',
                },
                accent: {
                    500: '#00D2FF', // Cyan Neon
                    600: '#3A86FF', // Deep Blue Neon
                    400: '#A78BFA', // Purple Neon
                },
                // Deep Space "Obsidian" Palette - Richer tones
                dark: {
                    950: '#030304', // True void black
                    900: '#0a0a0f', // Base obsidian
                    800: '#13131f', // Lighter obsidian
                    700: '#1c1c2e', // Border/Stroke
                    600: '#2d2d3b', // Muted Text
                    500: '#4b4b5c',
                },
                surface: {
                    50: '#fafafa',
                    100: '#f4f4f5',
                    200: '#e4e4e7',
                }
            },
            fontFamily: {
                sans: ['"Outfit"', 'sans-serif'],
                display: ['"Plus Jakarta Sans"', 'sans-serif'],
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #f94b25 0deg, #a78bfa 180deg, #f94b25 360deg)',
                'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'float-delayed': 'float 6s ease-in-out 3s infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'shimmer': 'shimmer 2.5s linear infinite',
                'beam': 'beam 2s linear infinite',
                'spin-slow': 'spin 8s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 20px -10px rgba(249, 75, 37, 0.5)' },
                    '100%': { boxShadow: '0 0 30px 10px rgba(249, 75, 37, 0.8)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                beam: {
                    '0%': { left: '-100%' },
                    '100%': { left: '100%' },
                }
            }
        },
    },
    plugins: [],
}
