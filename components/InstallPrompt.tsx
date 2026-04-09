/**
 * PWA Install Prompt — shows a dismissible banner when the browser
 * offers to install the app. Also registers the service worker.
 */
'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register service worker for offline caching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Capture the install prompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-purple-500/40 rounded-xl shadow-lg p-4 z-50 animate-slide-in">
      <div className="flex items-start gap-3">
        <Download className="w-5 h-5 text-indigo-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Install Ledgr</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Add to your home screen for quick access</p>
          <button onClick={handleInstall} className="mt-2 px-4 py-1.5 bg-indigo-600 dark:bg-purple-500 text-white text-sm rounded-lg hover:bg-indigo-700 dark:hover:bg-purple-600 transition-colors">
            Install
          </button>
        </div>
        <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
