'use client';

const RULES = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Number', test: (p: string) => /\d/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
const STRENGTH_TEXT = ['', 'text-red-500', 'text-orange-400', 'text-yellow-500', 'text-green-500'];

export default function PasswordStrengthMeter({ password, dark }: { password: string; dark?: boolean }) {
  if (!password) return null;

  const passed = RULES.filter(r => r.test(password)).length;
  const label = STRENGTH_LABELS[passed];
  const barColor = STRENGTH_COLORS[passed];
  const textColor = STRENGTH_TEXT[passed];

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {RULES.map((_, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i < passed ? barColor : (dark ? 'bg-slate-700' : 'bg-gray-200')}`} />
        ))}
      </div>
      {/* Label + rules */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {label && <span className={`text-xs font-medium ${textColor}`}>{label}</span>}
        {RULES.map((rule, i) => (
          <span key={i} className={`text-xs ${rule.test(password) ? 'text-green-500' : (dark ? 'text-slate-500' : 'text-gray-400')}`}>
            {rule.test(password) ? '✓' : '·'} {rule.label}
          </span>
        ))}
      </div>
    </div>
  );
}
