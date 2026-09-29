/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/core/GameEngine';
import { GameState, GameStats } from './game/types';
import { soundEffects } from './game/audio/SoundEffects';
import { GameHUD } from './components/GameHUD';
import { StartScreen } from './components/StartScreen';
import { GameOverModal } from './components/GameOverModal';
import { PauseOverlay } from './components/PauseOverlay';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('START');
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    distance: 0,
    coins: 0,
    speed: 0,
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEffects.isMuted());

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const engine = new GameEngine();
    engineRef.current = engine;

    engine.init(canvasRef.current, containerRef.current, {
      onStateChange: (newState) => {
        setGameState(newState);
      },
      onStatsUpdate: (updatedStats) => {
        setStats(updatedStats);
      },
      onCrash: () => {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([40, 60, 80]);
          } catch {
            // Safe fallback
          }
        }
      },
      onCoinCollect: () => {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(15);
          } catch {
            // Safe fallback
          }
        }
      },
    });

    // Resize observer for responsive full-viewport rendering
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          engine.handleResize(width, height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current?.startRun();
  }, []);

  const handleRestart = useCallback(() => {
    engineRef.current?.restart();
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = soundEffects.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  return (
    <main
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-body select-none"
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Floating HUD */}
      <GameHUD
        stats={stats}
        gameState={gameState}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onTogglePause={handleTogglePause}
      />

      {/* Start Overlay */}
      {gameState === 'START' && (
        <StartScreen onStart={handleStart} highScore={stats.highScore} />
      )}

      {/* Game Over Modal */}
      {gameState === 'GAME_OVER' && (
        <GameOverModal stats={stats} onRestart={handleRestart} />
      )}

      {/* Pause Overlay */}
      {gameState === 'PAUSED' && (
        <PauseOverlay onResume={handleTogglePause} />
      )}
    </main>
  );
}
