import React from "react";
import { X, Sparkles, Palette, Check } from "lucide-react";
import { useTheme, COLOR_GRADING_OPTIONS, ColorGrading } from "@/context/ThemeContext";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface DisplayPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DisplayPreferencesModal: React.FC<DisplayPreferencesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { styleTheme, colorGrading, setStyleTheme, setColorGrading } = useTheme();

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in-up"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full border border-slate-200/80 shadow-2xl flex flex-col max-h-[85vh] relative overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-light flex items-center justify-center text-primary font-bold">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Display Preferences</h2>
              <p className="text-xs text-slate-500">Customize theme aesthetics & color grading</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content with smooth internal scrolling */}
        <div className="space-y-6 p-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {/* 1. Style Theme Switch (Modern vs Sketch) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
              UI Aesthetic Style
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Modern Option */}
              <button
                type="button"
                onClick={() => setStyleTheme("modern")}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  styleTheme === "modern"
                    ? "border-primary bg-primary-light/40 ring-2 ring-primary-ring shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-slate-900">Modern</span>
                  {styleTheme === "modern" && (
                    <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Clean lines, smooth shadows, Inter typography
                </p>
              </button>

              {/* Sketch Option */}
              <button
                type="button"
                onClick={() => setStyleTheme("sketch")}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  styleTheme === "sketch"
                    ? "border-stone-900 bg-amber-50/60 ring-2 ring-stone-900 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-slate-900 font-sketch">Hand-Drawn</span>
                  {styleTheme === "sketch" && (
                    <span className="w-4 h-4 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-hand">
                  Paper grid, organic borders, handwriting font
                </p>
              </button>
            </div>
          </div>

          {/* 2. Color Grading Palette */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>Color Grading</span>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </label>
            <div className="space-y-2">
              {COLOR_GRADING_OPTIONS.map((opt) => {
                const isSelected = colorGrading === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setColorGrading(opt.id as ColorGrading)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary-light/40 ring-1 ring-primary-ring shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: opt.dotColor }}
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{opt.name}</div>
                        <div className="text-[11px] text-slate-500">{opt.description}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
