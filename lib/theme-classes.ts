export function tc(theme: string) {
  const dark = theme === 'dark';
  return {
    card: dark ? 'bg-black rounded-xl border-2 border-purple-500/40 p-8' : 'bg-white rounded-xl shadow-sm border border-gray-200 p-8',
    heading: dark ? 'text-2xl font-bold text-white mb-6' : 'text-2xl font-bold text-gray-900 mb-6',
    label: dark ? 'block text-sm font-medium text-slate-400 mb-2' : 'block text-sm font-medium text-gray-700 mb-2',
    input: dark ? 'w-full px-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 text-white placeholder-slate-500 focus:outline-none' : 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900',
    text: dark ? 'text-slate-300' : 'text-gray-700',
    textMuted: dark ? 'text-slate-400' : 'text-gray-600',
    link: dark ? 'inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6' : 'inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6',
    btnPrimary: dark ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50' : 'bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50',
    btnSecondary: dark ? 'px-6 py-3 border-2 border-purple-500/40 rounded-lg hover:border-purple-500 text-slate-300 text-center' : 'px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-center',
    sectionTitle: dark ? 'text-lg font-semibold text-white' : 'text-lg font-semibold text-gray-900',
  };
}
