import { X, ExternalLink, ShieldAlert, KeyRound } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetupGuideModal({ isOpen, onClose }: SetupGuideModalProps) {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs animate-fade-in-up"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] overscroll-contain animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Trading 212 API Key Setup
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Step-by-step instructions to connect your account safely
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-6">
            
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800 text-sm">Security First: Read-Only Access</h4>
                <p className="text-amber-700 text-sm mt-1">
                  DivYield will <strong>reject</strong> any API key that has order execution enabled. 
                  You must ensure the "Orders - Execute" permission is turned <strong>OFF</strong> when generating your key.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 text-base">How to generate your key:</h3>
              
              <div className="space-y-3">
                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">1</div>
                  <p className="text-sm text-slate-600 pt-1">
                    Log in to your <a href="https://live.trading212.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium inline-flex items-center gap-1">Trading 212 Web app <ExternalLink className="w-3 h-3" /></a>.
                  </p>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">2</div>
                  <div className="pt-1">
                    <p className="text-sm text-slate-600">
                      Click on your account menu (top right) and navigate to <strong>Settings</strong> &gt; <strong>API</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">3</div>
                  <div className="pt-1 w-full">
                    <p className="text-sm text-slate-600 mb-2">
                      Click <strong>Generate API Key</strong> and select the following permissions exactly:
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-mono space-y-2">
                      <div className="flex justify-between items-center"><span className="text-slate-600">Account data</span> <span className="text-emerald-600 font-semibold">ON</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-600">History</span> <span className="text-emerald-600 font-semibold">ON</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-600">History - Dividends</span> <span className="text-emerald-600 font-semibold">ON</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-600">History - Orders</span> <span className="text-emerald-600 font-semibold">ON</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-600">History - Transactions</span> <span className="text-emerald-600 font-semibold">ON</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-600">Metadata</span> <span className="text-emerald-600 font-semibold">ON</span></div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200"><span className="text-slate-700 font-semibold">Orders - Execute</span> <span className="text-red-500 font-bold">OFF</span></div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">4</div>
                  <p className="text-sm text-slate-600 pt-1">
                    Copy the generated API Key and paste it into DivYield. It is securely encrypted and stored locally on your device.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}