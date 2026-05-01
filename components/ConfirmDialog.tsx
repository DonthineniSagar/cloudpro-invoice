'use client';

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  dark?: boolean;
  variant?: 'danger' | 'default';
}

export default function ConfirmDialog({
  open, title, description,
  confirmLabel = 'Confirm',
  onConfirm, onCancel,
  dark, variant = 'danger',
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className={`relative w-full max-w-md rounded-xl p-6 shadow-xl ${dark ? 'bg-gray-900 border border-purple-500/30' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h3>
        <p className={`text-sm mb-6 ${dark ? 'text-slate-400' : 'text-gray-600'}`}>
          {description}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className={`px-4 py-2 text-sm rounded-lg ${dark ? 'text-slate-300 hover:bg-gray-800' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg font-medium ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
