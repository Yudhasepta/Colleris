/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        surfaceHover: 'var(--surface-hover)',
        border: 'var(--border)',
        text: 'var(--text)',
        textMuted: 'var(--text-muted)',
        textFaint: 'var(--text-faint)',

        // Primary hue — yellow in the default preset (blue/cyan/pink/
        // lavender/mint in custom presets). Used for buttons, active nav,
        // progress, highlights, focus states.
        accent: 'var(--accent)',
        accentSoft: 'var(--accent-soft)',
        accentDim: 'var(--accent-dim)',
        accentBorder: 'var(--accent-border)',
        onAccent: 'var(--on-accent)',
        scrim: 'var(--scrim)',

        // Information hue — cyan.
        cyan: 'var(--cyan)',
        cyanSoft: 'var(--cyan-soft)',
        cyanDim: 'var(--cyan-dim)',

        // Personality/collaboration hue — pink.
        pink: 'var(--pink)',
        pinkSoft: 'var(--pink-soft)',
        pinkDim: 'var(--pink-dim)',

        // AI/special hue — purple.
        purple: 'var(--purple)',
        purpleSoft: 'var(--purple-soft)',
        purpleDim: 'var(--purple-dim)',

        // Success hue — mint.
        mint: 'var(--mint)',
        mintSoft: 'var(--mint-soft)',
        mintDim: 'var(--mint-dim)',

        // Warning/attention hue — amber.
        warn: 'var(--warn)',
        warnSoft: 'var(--warn-soft)',
        warnDim: 'var(--warn-dim)',
        warnBorder: 'var(--warn-border)',

        // Destructive hue — coral. Delete actions, errors only.
        danger: 'var(--danger)',
        dangerSoft: 'var(--danger-soft)',
        dangerDim: 'var(--danger-dim)',
        onDanger: 'var(--on-danger)',

        // Status colors reuse the semantic palette.
        statusWait: 'var(--status-wait)',
        statusProgress: 'var(--status-progress)',
        statusUrgent: 'var(--status-urgent)',
        statusCompleted: 'var(--status-completed)',
        // Info/collaborating status — mapped to the preset's cyan hue.
        statusInfo: 'var(--status-info)',
        onStatusInfo: 'var(--on-status-info)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)' },
      boxShadow: { panel: 'var(--card-shadow, 0 8px 24px rgba(0,0,0,.28))' },
      spacing: { section: 'var(--spacing-section)', component: 'var(--spacing-component)' },
    },
  },
  plugins: [],
}
