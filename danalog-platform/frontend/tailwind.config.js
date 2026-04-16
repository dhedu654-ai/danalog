/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#2563eb', // Blue
                    dark: '#1e40af',
                },
                secondary: '#64748b', // Slate
                success: '#22c55e',
                danger: '#ef4444',
                warning: '#f59e0b',
            }
        },
    },
    plugins: [],
}
