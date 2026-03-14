/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Статусы смен
        status: {
          planned: '#9ca3af',
          in_progress: '#2563eb',
          attended: '#16a34a',
          late: '#f59e0b',
          needs_review: '#dc2626',
        },
      },
    },
  },
  plugins: [],
}
