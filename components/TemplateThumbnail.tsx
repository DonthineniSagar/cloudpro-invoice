'use client';

import type { TemplateName } from '@/lib/generate-pdf';

interface TemplateThumbnailProps {
  templateId: TemplateName;
  accentColor: string;
  selected: boolean;
  dark: boolean;
  onClick: () => void;
}

function ModernSvg({ accent, dark }: { accent: string; dark: boolean }) {
  const bg = dark ? '#1e293b' : '#ffffff';
  const textColor = dark ? '#cbd5e1' : '#6b7280';
  const lineColor = dark ? '#334155' : '#e5e7eb';
  return (
    <svg viewBox="0 0 120 160" className="w-full h-full" aria-hidden="true">
      <rect width="120" height="160" fill={bg} rx="4" />
      {/* Header */}
      <rect x="8" y="8" width="60" height="6" rx="1" fill={accent} opacity="0.9" />
      <rect x="8" y="18" width="35" height="3" rx="1" fill={textColor} opacity="0.5" />
      {/* Details */}
      <rect x="8" y="30" width="25" height="3" rx="1" fill={textColor} opacity="0.4" />
      <rect x="8" y="36" width="30" height="3" rx="1" fill={textColor} opacity="0.3" />
      {/* Table header */}
      <line x1="8" y1="50" x2="112" y2="50" stroke={accent} strokeWidth="0.8" />
      <rect x="8" y="44" width="20" height="3" rx="1" fill={textColor} opacity="0.5" />
      <rect x="85" y="44" width="27" height="3" rx="1" fill={textColor} opacity="0.5" />
      {/* Table rows */}
      {[56, 66, 76].map((rowY) => (
        <g key={rowY}>
          <rect x="8" y={rowY} width="50" height="3" rx="1" fill={textColor} opacity="0.3" />
          <rect x="90" y={rowY} width="22" height="3" rx="1" fill={textColor} opacity="0.3" />
          <line x1="8" y1={rowY + 8} x2="112" y2={rowY + 8} stroke={lineColor} strokeWidth="0.3" />
        </g>
      ))}
      {/* Total */}
      <rect x="75" y="92" width="37" height="4" rx="1" fill={accent} opacity="0.8" />
      {/* Tear-off line */}
      <line x1="8" y1="115" x2="112" y2="115" stroke={textColor} strokeWidth="0.5" strokeDasharray="3,2" />
      <text x="6" y="117" fontSize="6" fill={textColor}>✂</text>
      {/* Payment advice */}
      <rect x="8" y="122" width="40" height="4" rx="1" fill={accent} opacity="0.6" />
      <rect x="8" y="130" width="30" height="2.5" rx="1" fill={textColor} opacity="0.3" />
      <rect x="8" y="136" width="25" height="2.5" rx="1" fill={textColor} opacity="0.3" />
    </svg>
  );
}

function ClassicSvg({ accent, dark }: { accent: string; dark: boolean }) {
  const bg = dark ? '#1e293b' : '#ffffff';
  const textColor = dark ? '#cbd5e1' : '#6b7280';
  return (
    <svg viewBox="0 0 120 160" className="w-full h-full" aria-hidden="true">
      <rect width="120" height="160" fill={bg} rx="4" />
      {/* Top border */}
      <line x1="8" y1="8" x2="112" y2="8" stroke={accent} strokeWidth="2" />
      {/* Company name */}
      <rect x="8" y="14" width="45" height="5" rx="1" fill={accent} opacity="0.9" />
      <rect x="8" y="22" width="30" height="2.5" rx="1" fill={textColor} opacity="0.4" />
      {/* INVOICE title */}
      <rect x="75" y="30" width="37" height="6" rx="1" fill={accent} opacity="0.8" />
      {/* Bill To */}
      <rect x="8" y="38" width="18" height="3" rx="1" fill={accent} opacity="0.7" />
      <rect x="8" y="44" width="35" height="2.5" rx="1" fill={textColor} opacity="0.3" />
      <rect x="8" y="49" width="28" height="2.5" rx="1" fill={textColor} opacity="0.3" />
      {/* Table with borders */}
      <rect x="8" y="60" width="104" height="10" rx="1" fill={accent} opacity="0.85" />
      <rect x="12" y="63" width="20" height="3" rx="1" fill="#ffffff" opacity="0.9" />
      <rect x="88" y="63" width="20" height="3" rx="1" fill="#ffffff" opacity="0.9" />
      {[74, 86, 98].map((rowY, i) => (
        <g key={rowY}>
          <rect x="8" y={rowY} width="104" height="10" rx="0" fill={i % 2 === 0 ? (dark ? '#334155' : '#f5f5f5') : 'transparent'} />
          <rect x="12" y={rowY + 3} width="45" height="3" rx="1" fill={textColor} opacity="0.3" />
          <rect x="88" y={rowY + 3} width="20" height="3" rx="1" fill={textColor} opacity="0.3" />
          <rect x="8" y={rowY + 10} width="104" height="0.3" fill={textColor} opacity="0.15" />
        </g>
      ))}
      {/* Total */}
      <rect x="75" y="116" width="37" height="4" rx="1" fill={accent} opacity="0.8" />
      {/* Bottom border */}
      <line x1="8" y1="152" x2="112" y2="152" stroke={accent} strokeWidth="2" />
    </svg>
  );
}

function MinimalSvg({ accent, dark }: { accent: string; dark: boolean }) {
  const bg = dark ? '#1e293b' : '#ffffff';
  const textColor = dark ? '#cbd5e1' : '#6b7280';
  const lightColor = dark ? '#475569' : '#d1d5db';
  return (
    <svg viewBox="0 0 120 160" className="w-full h-full" aria-hidden="true">
      <rect width="120" height="160" fill={bg} rx="4" />
      {/* Invoice number top-right */}
      <rect x="80" y="12" width="30" height="3" rx="1" fill={textColor} opacity="0.4" />
      <rect x="85" y="18" width="25" height="2.5" rx="1" fill={textColor} opacity="0.3" />
      {/* Company info */}
      <rect x="12" y="35" width="40" height="3" rx="1" fill={textColor} opacity="0.4" />
      <rect x="12" y="41" width="30" height="2.5" rx="1" fill={textColor} opacity="0.3" />
      {/* Billed to label */}
      <rect x="12" y="54" width="22" height="2.5" rx="1" fill={accent} opacity="0.6" />
      <rect x="12" y="60" width="35" height="3" rx="1" fill={textColor} opacity="0.4" />
      <rect x="12" y="66" width="28" height="2.5" rx="1" fill={textColor} opacity="0.3" />
      {/* Minimal table — just header underline */}
      <line x1="12" y1="82" x2="108" y2="82" stroke={lightColor} strokeWidth="0.4" />
      <rect x="12" y="77" width="18" height="2.5" rx="1" fill={lightColor} opacity="0.6" />
      <rect x="88" y="77" width="20" height="2.5" rx="1" fill={lightColor} opacity="0.6" />
      {[88, 100, 112].map((rowY) => (
        <g key={rowY}>
          <rect x="12" y={rowY} width="50" height="3" rx="1" fill={textColor} opacity="0.25" />
          <rect x="88" y={rowY} width="20" height="3" rx="1" fill={textColor} opacity="0.25" />
        </g>
      ))}
      {/* Total */}
      <rect x="70" y="128" width="38" height="5" rx="1" fill={accent} opacity="0.7" />
      {/* Divider */}
      <line x1="12" y1="142" x2="108" y2="142" stroke={lightColor} strokeWidth="0.3" />
      <rect x="12" y="147" width="50" height="2" rx="1" fill={lightColor} opacity="0.4" />
    </svg>
  );
}

const SVG_MAP: Record<TemplateName, React.FC<{ accent: string; dark: boolean }>> = {
  modern: ModernSvg,
  classic: ClassicSvg,
  minimal: MinimalSvg,
};

export default function TemplateThumbnail({ templateId, accentColor, selected, dark, onClick }: TemplateThumbnailProps) {
  const SvgComponent = SVG_MAP[templateId];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        selected
          ? dark
            ? 'border-purple-500 ring-2 ring-purple-500/30 bg-purple-500/10'
            : 'border-indigo-600 ring-2 ring-indigo-600/30 bg-indigo-50'
          : dark
            ? 'border-purple-500/20 hover:border-purple-500/50'
            : 'border-gray-200 hover:border-gray-300'
      } ${dark ? 'focus:ring-purple-500' : 'focus:ring-indigo-500'}`}
      aria-pressed={selected}
      aria-label={`Select ${templateId} template`}
    >
      <div className="aspect-[3/4] p-2">
        <SvgComponent accent={accentColor} dark={dark} />
      </div>
      {selected && (
        <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${
          dark ? 'bg-purple-500' : 'bg-indigo-600'
        }`}>
          ✓
        </div>
      )}
    </button>
  );
}
