import React from 'react';
import { RotateCcw, Trophy, Award } from 'lucide-react';
import { GameStats } from '../game/types';

interface GameOverModalProps {
  stats: GameStats;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ stats, onRestart }) => {
  const isNewRecord = stats.score > 0 && stats.score >= stats.highScore;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-neutral-950/75 backdrop-blur-sm pointer-events-auto select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Header */}
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-red-400 mb-1">
          Impact Detected
        </span>
        <h2 className="font-display text-4xl md:text-5xl font-black text-white tracking-wide">
          RUN OVER
        </h2>

        {isNewRecord && (
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>NEW PERSONAL RECORD!</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-3 my-6">
          <div className="flex flex-col p-3 rounded-2xl bg-neutral-800/50 border border-neutral-700/40">
            <span className="text-[11px] font-semibold uppercase text-neutral-400">
              Final Score
            </span>
            <span className="font-display text-2xl font-bold text-white tabular-nums mt-1">
              {stats.score.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-2xl bg-neutral-800/50 border border-neutral-700/40">
            <span className="text-[11px] font-semibold uppercase text-neutral-400">
              Distance
            </span>
            <span className="font-display text-2xl font-bold text-cyan-400 tabular-nums mt-1">
              {stats.distance} <span className="text-xs font-medium text-cyan-500">m</span>
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-2xl bg-neutral-800/50 border border-neutral-700/40">
            <span className="text-[11px] font-semibold uppercase text-neutral-400">
              Energy Sparks
            </span>
            <span className="font-display text-2xl font-bold text-amber-400 tabular-nums mt-1">
              {stats.coins}
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-2xl bg-neutral-800/50 border border-neutral-700/40">
            <span className="text-[11px] font-semibold uppercase text-neutral-400">
              All-Time Best
            </span>
            <span className="font-display text-2xl font-bold text-neutral-300 tabular-nums mt-1 flex items-center justify-center gap-1">
              <Award className="w-4 h-4 text-neutral-400" />
              {stats.highScore.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Primary CTA */}
        <button
          onClick={onRestart}
          className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-neutral-950 font-display font-extrabold text-lg tracking-wider uppercase rounded-2xl shadow-[0_0_24px_rgba(6,182,212,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Sprint Again</span>
        </button>

        <span className="text-xs text-neutral-400 mt-3 font-medium">
          Press <kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 rounded font-mono text-[11px]">SPACE</kbd> or tap to restart
        </span>
      </div>
    </div>
  );
};
