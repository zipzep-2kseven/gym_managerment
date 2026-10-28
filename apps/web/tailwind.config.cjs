module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: { extend: { colors: { navy: 'var(--color-navy-900)', crimson: 'var(--color-crimson-700)' } } },
};
