import React from 'react';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { GameStats, GameState } from '../game/types';

interface GameHUDProps {
  stats: GameStats;
  gameState: GameState;
  isMuted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  gameState,
  isMuted,
  onToggleMute,
  onTogglePause,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 p-4 md:p-6 pointer-events-none z-10 flex items-center justify-between select-none">
      {/* Zone 1: Brand & Score */}
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
          Score
        </span>
        <span className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight tabular-nums drop-shadow-md">
          {stats.score.toLocaleString()}
        </span>
        {stats.highScore > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
            <span>BEST</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-neutral-300 font-medium">
              {stats.highScore.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Zone 2: Distance & Energy Orbs */}
      <div className="pointer-events-auto flex items-center gap-3 bg-neutral-900/70 backdrop-blur-md border border-neutral-700/50 rounded-xl px-4 py-2 shadow-lg">
        <div className="flex items-baseline gap-1 text-cyan-400">
          <span className="font-display text-xl font-bold tabular-nums">
            {stats.distance}
          </span>
          <span className="text-xs font-semibold uppercase text-cyan-400/80">m</span>
        </div>

        <div className="w-px h-4 bg-neutral-700" />

        <div className="flex items-center gap-1.5 text-amber-400">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
          <span className="font-display text-xl font-bold tabular-nums">
            {stats.coins}
          </span>
        </div>

        <div className="w-px h-4 bg-neutral-700" />

        <div className="flex items-baseline gap-1 text-neutral-300 text-xs font-mono">
          <span className="tabular-nums font-bold">{stats.speed}</span>
          <span className="text-[10px] text-neutral-400">km/h</span>
        </div>
      </div>

      {/* Zone 3: Audio & Pause Controls */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute game audio' : 'Mute game audio'}
          className="w-10 h-10 rounded-xl bg-neutral-900/70 backdrop-blur-md border border-neutral-700/50 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors shadow-lg active:scale-95"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {gameState === 'RUNNING' && (
          <button
            onClick={onTogglePause}
            aria-label="Pause run"
            className="w-10 h-10 rounded-xl bg-neutral-900/70 backdrop-blur-md border border-neutral-700/50 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors shadow-lg active:scale-95"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}

        {gameState === 'PAUSED' && (
          <button
            onClick={onTogglePause}
            aria-label="Resume run"
            className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center hover:bg-cyan-500 transition-colors shadow-lg active:scale-95"
          >
            <Play className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
