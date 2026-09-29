import React from 'react';
import { ArrowLeftRight, ArrowUp, ArrowDown, Play } from 'lucide-react';

interface StartScreenProps {
  onStart: () => void;
  highScore: number;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, highScore }) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-6 md:p-10 pointer-events-auto bg-neutral-950/40 backdrop-blur-[2px]">
      {/* Top Banner / Wordmark */}
      <div className="flex flex-col items-center text-center mt-6">
        <span className="text-xs font-bold tracking-[0.25em] uppercase text-cyan-400 mb-2">
          3D High-Speed Lane Runner
        </span>
        <h1 className="font-display text-5xl md:text-7xl font-extrabold text-white tracking-wider drop-shadow-2xl">
          SPRINT RUNNER
        </h1>
        {highScore > 0 && (
          <p className="mt-2 text-sm text-neutral-400">
            Personal Best:{' '}
            <span className="font-mono font-bold text-amber-400 tabular-nums">
              {highScore.toLocaleString()} pts
            </span>
          </p>
        )}
      </div>

      {/* Center Action Button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onStart}
          className="group relative px-8 py-4 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-neutral-950 font-display font-extrabold text-xl tracking-wider uppercase rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center gap-3 cursor-pointer"
        >
          <Play className="w-6 h-6 fill-neutral-950" />
          <span>Launch Sprint</span>
        </button>
        <span className="text-xs text-neutral-400 font-medium tracking-wide">
          Tap button or press <kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 rounded font-mono text-[11px]">SPACE</kbd>
        </span>
      </div>

      {/* Bottom Controls Legend */}
      <div className="w-full max-w-lg bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-2xl p-4 md:p-5 shadow-2xl">
        <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 text-center mb-3">
          Controls & Maneuvers
        </div>
        <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
          <div className="flex flex-col items-center p-2 rounded-xl bg-neutral-800/40">
            <ArrowLeftRight className="w-5 h-5 text-cyan-400 mb-1" />
            <span className="text-xs font-semibold text-neutral-200">Switch Lane</span>
            <span className="text-[10px] text-neutral-400 mt-0.5">Swipe / A, D, ←, →</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-xl bg-neutral-800/40">
            <ArrowUp className="w-5 h-5 text-amber-400 mb-1" />
            <span className="text-xs font-semibold text-neutral-200">Jump Hurdle</span>
            <span className="text-[10px] text-neutral-400 mt-0.5">Swipe Up / W, ↑, Space</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-xl bg-neutral-800/40">
            <ArrowDown className="w-5 h-5 text-pink-400 mb-1" />
            <span className="text-xs font-semibold text-neutral-200">Slide Under</span>
            <span className="text-[10px] text-neutral-400 mt-0.5">Swipe Down / S, ↓</span>
          </div>
        </div>
      </div>
    </div>
  );
};
