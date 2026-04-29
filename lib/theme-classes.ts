export function tc(theme: string) {
  const dark = theme === 'dark';
  return {
    // Cards: white/gray-200 in light; pure-black/purple-border in dark
    card: dark
      ? 'bg-black rounded-xl border-2 border-purple-500/40 hover:border-purple-500/60 p-8 transition-colors duration-200'
      : 'bg-white rounded-xl border-2 border-indigo-600 p-8 transition-colors duration-200',

    // Headings
    heading: dark ? 'text-2xl font-bold text-white mb-6' : 'text-2xl font-bold text-gray-900 mb-6',
    sectionTitle: dark ? 'text-lg font-semibold text-white' : 'text-lg font-semibold text-gray-900',

    // Labels & text
    label: dark ? 'block text-sm font-medium text-slate-400 mb-2' : 'block text-sm font-medium text-gray-700 mb-2',
    text: dark ? 'text-slate-300' : 'text-gray-700',
    textMuted: dark ? 'text-slate-400' : 'text-gray-600',
    link: dark
      ? 'inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200 mb-6'
      : 'inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 mb-6',

    // Inputs: black/purple-border in dark; white/gray-border in light
    input: dark
      ? 'w-full px-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-0 text-white placeholder-slate-500 transition-colors duration-200'
      : 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none text-gray-900 transition-colors duration-200',

    // Primary button:
    //   Light → solid indigo-600, hover indigo-700, press scale-[0.98]
    //   Dark  → purple→pink gradient, hover intensifies
    btnPrimary: dark
      ? 'inline-flex items-center justify-center gap-2 font-medium px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
      : 'inline-flex items-center justify-center gap-2 font-medium px-6 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200',

    // Secondary button:
    //   Light → white, gray border, hover gray-50 fill
    //   Dark  → transparent, purple border, hover intensifies border
    btnSecondary: dark
      ? 'inline-flex items-center justify-center gap-2 font-medium px-6 py-3 rounded-lg border-2 border-purple-500/40 text-slate-300 hover:border-purple-500/60 hover:text-white active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
      : 'inline-flex items-center justify-center gap-2 font-medium px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200',

    // Ghost button — no border, fills on hover
    btnGhost: dark
      ? 'inline-flex items-center justify-center gap-2 font-medium px-4 py-2 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
      : 'inline-flex items-center justify-center gap-2 font-medium px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200',

    // Danger / destructive button
    btnDanger: dark
      ? 'inline-flex items-center justify-center gap-2 font-medium px-6 py-3 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 hover:border-red-500/60 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
      : 'inline-flex items-center justify-center gap-2 font-medium px-6 py-3 rounded-lg bg-red-500 text-white hover:bg-red-600 active:bg-red-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200',

    // Small size modifier — append to any btn variant
    btnSm: 'px-3 py-1.5 text-sm rounded-md',

    // Icon-only button (square, no label)
    iconBtn: dark
      ? 'p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all duration-200'
      : 'p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200',
  };
}
