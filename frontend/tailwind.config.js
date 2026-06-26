/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Plus Jakarta Sans', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#fff1f1',
                    100: '#ffe1e1',
                    200: '#ffc9c9',
                    300: '#ffb4b4', // The pink color from palette
                    400: '#ff8a8a',
                    500: '#de6b6b', // The rose color from palette
                    600: '#c54f4f',
                    700: '#a83a3a',
                    800: '#8b3131',
                    900: '#742d2d',
                },
                accent: {
                    50: '#fffcf2', // The light cream from palette
                    100: '#fff3d0', // The yellow cream from palette
                },
                surface: {
                    50: '#fffcf2',
                    100: '#fff8e1',
                    200: '#fff3d0',
                    300: '#ffecb3',
                    800: '#4a4a4a', // Dark text color
                    900: '#2d2d2d', // Darker text color
                    950: '#1a1a1a',
                },
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.6s ease forwards',
                'shimmer': 'shimmer 1.5s infinite',
                'pulse-glow': 'pulseGlow 2.4s infinite',
                'float': 'float 6s ease-in-out infinite',
                'float-slow': 'float 9s ease-in-out infinite',
                'blob': 'blob 14s ease-in-out infinite',
                'marquee': 'marquee 30s linear infinite',
                'scale-in-center': 'scaleInCenter 0.2s ease forwards',
            },
            keyframes: {
                fadeInUp: {
                    from: { opacity: '0', transform: 'translateY(24px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(222, 107, 107, 0.4)' },
                    '50%': { boxShadow: '0 0 0 14px rgba(222, 107, 107, 0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-12px)' },
                },
                blob: {
                    '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
                    '33%': { transform: 'translate(30px, -40px) scale(1.1)' },
                    '66%': { transform: 'translate(-20px, 20px) scale(0.95)' },
                },
                marquee: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                scaleInCenter: {
                    from: { opacity: '0', transform: 'scale(0.95)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
            },
        },
    },
    plugins: [],
}
