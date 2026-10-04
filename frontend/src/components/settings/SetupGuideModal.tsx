import { X, ExternalLink, ShieldAlert, KeyRound } from 'lucide-react';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: 'trading212' | 'eodhd';
}

export function SetupGuideModal({ isOpen, onClose, provider }: SetupGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${provider === 'trading212' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {provider === 'trading212' ? 'Trading 212 API Key Setup' : 'EODHD API Token Setup'}
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Step-by-step instructions to connect your account
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
          {provider === 'trading212' ? (
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
          ) : (
            <div className="space-y-6">
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="font-semibold text-slate-800 text-sm">Why EODHD?</h4>
                <p className="text-slate-600 text-sm mt-1">
                  EODHD provides the rich stock metadata (Sectors, Industries) and the upcoming Dividend Calendar data that Trading 212 does not provide.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 text-base">How to get your API token:</h3>
                
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">1</div>
                    <p className="text-sm text-slate-600 pt-1">
                      Go to <a href="https://eodhd.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-medium inline-flex items-center gap-1">EODHD.com <ExternalLink className="w-3 h-3" /></a> and create an account.
                    </p>
                  </div>
                  
                  <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">2</div>
                    <div className="pt-1">
                      <p className="text-sm text-slate-600">
                        Navigate to your <strong>Dashboard</strong> or <strong>Settings</strong> page.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">3</div>
                    <div className="pt-1">
                      <p className="text-sm text-slate-600">
                        Copy the <strong>API Token</strong> displayed on your dashboard and paste it into DivYield.
                      </p>
                      <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg">
                        Note: EODHD has a free tier which provides basic stock information. To get upcoming dividend calendar features, an EODHD subscription that includes the "Fundamentals Data" is required.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            Got it, thanks!
          </button>
        </div>

      </div>
    </div>
  );
}
