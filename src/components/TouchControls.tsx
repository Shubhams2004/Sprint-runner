import React from 'react';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { GameInputAction } from '../game/input/InputManager';

interface TouchControlsProps {
  onAction: (action: GameInputAction) => void;
  visible: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ onAction, visible }) => {
  if (!visible) return null;

  return (
    <div className="md:hidden absolute bottom-4 left-0 right-0 px-4 flex items-center justify-between pointer-events-none z-10 select-none">
      {/* Lateral Lane Switch Buttons */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onTouchStart={(e) => {
            e.stopPropagation();
            onAction('LEFT');
          }}
          onClick={(e) => {
            e.stopPropagation();
            onAction('LEFT');
          }}
          aria-label="Move lane left"
          className="w-12 h-12 rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-neutral-700/60 flex items-center justify-center text-white active:bg-cyan-500 active:text-neutral-950 active:scale-95 transition-all shadow-md"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onTouchStart={(e) => {
            e.stopPropagation();
            onAction('RIGHT');
          }}
          onClick={(e) => {
            e.stopPropagation();
            onAction('RIGHT');
          }}
          aria-label="Move lane right"
          className="w-12 h-12 rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-neutral-700/60 flex items-center justify-center text-white active:bg-cyan-500 active:text-neutral-950 active:scale-95 transition-all shadow-md"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Jump & Slide Maneuver Buttons */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onTouchStart={(e) => {
            e.stopPropagation();
            onAction('SLIDE');
          }}
          onClick={(e) => {
            e.stopPropagation();
            onAction('SLIDE');
          }}
          aria-label="Slide maneuver"
          className="w-12 h-12 rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-neutral-700/60 flex items-center justify-center text-pink-400 active:bg-pink-500 active:text-neutral-950 active:scale-95 transition-all shadow-md"
        >
          <ArrowDown className="w-5 h-5" />
        </button>

        <button
          onTouchStart={(e) => {
            e.stopPropagation();
            onAction('JUMP');
          }}
          onClick={(e) => {
            e.stopPropagation();
            onAction('JUMP');
          }}
          aria-label="Jump maneuver"
          className="w-12 h-12 rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-neutral-700/60 flex items-center justify-center text-amber-400 active:bg-amber-500 active:text-neutral-950 active:scale-95 transition-all shadow-md"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
