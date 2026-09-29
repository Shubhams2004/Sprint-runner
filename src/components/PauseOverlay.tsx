import React from 'react';
import { Play } from 'lucide-react';

interface PauseOverlayProps {
  onResume: () => void;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({ onResume }) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm pointer-events-auto select-none">
      <div className="w-full max-w-xs bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        <h3 className="font-display text-3xl font-black text-white tracking-wide mb-4">
          PAUSED
        </h3>
        <button
          onClick={onResume}
          className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-display font-extrabold text-base tracking-wider uppercase rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <Play className="w-5 h-5 fill-neutral-950" />
          <span>Resume Sprint</span>
        </button>
        <span className="text-xs text-neutral-400 mt-3 font-medium">
          Press <kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 rounded font-mono text-[11px]">ESC</kbd> or <kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 rounded font-mono text-[11px]">P</kbd> to resume
        </span>
      </div>
    </div>
  );
};
