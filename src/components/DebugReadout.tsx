import React from 'react';
import { CollisionDebugInfo } from '../game/types';

interface DebugReadoutProps {
  info: CollisionDebugInfo | null;
}

export const DebugReadout: React.FC<DebugReadoutProps> = ({ info }) => {
  if (!info) return null;

  const laneLabel = (lane: number) => {
    if (lane === -1) return '-1 (LEFT)';
    if (lane === 0) return '0 (CENTER)';
    if (lane === 1) return '1 (RIGHT)';
    return `${lane}`;
  };

  return (
    <div className="absolute bottom-6 left-6 z-20 pointer-events-none select-none font-mono text-xs">
      <div className="bg-neutral-950/85 border border-cyan-500/50 rounded-xl p-4 text-neutral-200 shadow-2xl backdrop-blur-md min-w-[220px]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
          <span className="font-bold text-cyan-400 tracking-wider uppercase text-[11px]">
            Collision Debug Mode
          </span>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        </div>

        {/* Player section */}
        <div className="mb-3 space-y-0.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
            Player:
          </span>
          <div className="text-cyan-300">X: {info.playerX.toFixed(2)}</div>
          <div className="text-cyan-300">Z: {info.playerZ.toFixed(2)}</div>
          <div className="text-cyan-300">Lane: {laneLabel(info.playerLane)}</div>
        </div>

        {/* Nearest Hurdle section */}
        <div className="mb-3 space-y-0.5 border-t border-neutral-800/80 pt-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
            Nearest hurdle:
          </span>
          {info.nearestHurdle ? (
            <>
              <div className="text-amber-300">X: {info.nearestHurdle.x.toFixed(2)}</div>
              <div className="text-amber-300">Z: {info.nearestHurdle.z.toFixed(2)}</div>
              <div className="text-amber-300">
                Lane: {laneLabel(info.nearestHurdle.lane)}
              </div>
              <div className="text-amber-300 font-bold">
                Distance: {info.nearestHurdle.distance.toFixed(2)}m
              </div>
            </>
          ) : (
            <div className="text-neutral-500 italic">None ahead in range</div>
          )}
        </div>

        {/* Impact section */}
        <div className="border-t border-neutral-800/80 pt-2 flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
            Impact:
          </span>
          <span
            className={`font-black text-xs px-2 py-0.5 rounded ${
              info.hasImpact
                ? 'bg-red-500 text-white animate-bounce'
                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
            }`}
          >
            {info.hasImpact ? 'YES' : 'NO'}
          </span>
        </div>
      </div>
    </div>
  );
};
