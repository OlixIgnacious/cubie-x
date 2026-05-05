/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Game } from './game/main';
import { auth, loginAnonymously, loginWithGoogle, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Trophy, User as UserIcon, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    // Auth Initialization
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        loginAnonymously();
      }
    });

    // Game Initialization
    if (canvasRef.current && !gameRef.current) {
      const game = new Game(canvasRef.current);
      gameRef.current = game;
      game.start();

      const handleResize = () => {
        if (canvasRef.current) {
          canvasRef.current.width = window.innerWidth;
          canvasRef.current.height = window.innerHeight;
          game.resize(window.innerWidth, window.innerHeight);
        }
      };

      window.addEventListener('resize', handleResize);
      handleResize();

      // Check for Game Over state to show UI
      const timer = setInterval(() => {
          if (gameRef.current && gameRef.current.score.state.isGameOver !== isGameOver) {
              setIsGameOver(gameRef.current.score.state.isGameOver);
          }
      }, 50);

      // Focus the canvas on mount
      setTimeout(() => {
        canvasRef.current?.focus();
      }, 100);

      return () => {
          unsubscribe();
          window.removeEventListener('resize', handleResize);
          clearInterval(timer);
      };
    }
  }, []);

  const handleClaimName = async () => {
    const u = await loginWithGoogle();
    if (u) {
      await setDoc(doc(db, 'users', u.uid), {
        userId: u.uid,
        username: u.displayName || 'CubieRunner',
        isAnonymous: false
      });
    }
  };

  const fetchLeaderboard = async () => {
    if (gameRef.current) {
      const lb = await gameRef.current.score.getLeaderboard();
      setLeaderboard(lb);
      setShowLeaderboard(true);
    }
  };

  return (
    <div id="game-container" className="relative w-full h-screen overflow-hidden bg-[#050505] text-white font-mono select-none">
      <canvas 
        id="vectorun-canvas"
        ref={canvasRef} 
        tabIndex={0}
        onClick={() => canvasRef.current?.focus()}
        className="w-full h-full block cursor-crosshair outline-none"
      />

      {/* UI Controls */}
      <div id="game-ui" className="absolute top-4 right-4 flex flex-col items-end gap-3 z-10">
        <AnimatePresence>
          {user?.isAnonymous && (
            <motion.button 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              id="claim-name-btn"
              onClick={handleClaimName}
              className="group flex items-center gap-2 text-[10px] tracking-widest border border-white/20 px-3 py-1.5 hover:bg-white hover:text-black transition-all duration-300"
            >
              <UserIcon size={12} />
              CLAIM NAME
            </motion.button>
          )}
        </AnimatePresence>

        <button 
          id="leaderboard-toggle-btn"
          onClick={fetchLeaderboard}
          className="group flex items-center gap-2 text-[10px] tracking-widest border border-white/20 px-3 py-1.5 hover:bg-white hover:text-black transition-all duration-300"
        >
          <Trophy size={12} />
          LEADERBOARD
        </button>

        {!user?.isAnonymous && (
          <div id="user-display" className="text-[10px] tracking-widest opacity-40 uppercase">
            ID: {user?.displayName || user?.uid.slice(0, 8)}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div id="instructions" className="absolute bottom-4 left-4 text-[10px] tracking-wider opacity-30 uppercase pointer-events-none">
        WASD/ARROWS TO RUN & JUMP • S/DOWN TO SLIDE • R TO RESET
      </div>

      {/* Global Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            id="leaderboard-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md border border-white/20 p-10 bg-black relative shadow-[0_0_100px_rgba(255,255,255,0.05)]"
            >
              <button 
                id="close-leaderboard-btn"
                onClick={() => setShowLeaderboard(false)} 
                className="absolute top-6 right-6 p-2 hover:bg-white hover:text-black transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>

              <div className="mb-10 text-center">
                <h2 className="text-3xl font-black tracking-tighter uppercase mb-1">HALL OF FAME</h2>
                <div className="h-0.5 w-12 bg-white mx-auto" />
              </div>

              <div id="leaderboard-list" className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 scrollbar-hide">
                {leaderboard.length > 0 ? leaderboard.map((s, i) => (
                  <div key={i} className="flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <span className="text-xs opacity-30 tabular-nums">{(i + 1).toString().padStart(2, '0')}</span>
                      <span className="text-sm font-bold tracking-tight group-hover:pl-2 transition-all duration-300 uppercase">{s.username}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black">{s.totalScore.toLocaleString()}</div>
                      <div className="text-[8px] opacity-20">{s.distance}M Traversals</div>
                    </div>
                  </div>
                )) : (
                    <div className="text-center opacity-30 py-10 italic text-xs">NO RECORDS YET</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Screen */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            id="gameover-overlay"
            className="fixed inset-0 flex flex-col items-center justify-center bg-black/60 z-40 text-center px-4"
          >
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-7xl font-black tracking-tighter mb-2 italic"
            >
              SYSTEM ERROR
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xs tracking-[0.4em] uppercase opacity-40 mb-12"
            >
              TERMINATION SIGNAL DETECTED
            </motion.p>
            
            <div className="flex flex-col gap-6 w-full max-w-xs">
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  id="restart-game-btn"
                  onClick={() => gameRef.current?.score.onRestart?.()}
                  className="w-full bg-white text-black py-4 font-black tracking-widest hover:invert transition-all duration-500 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  REBOOT CORE
                </motion.button>
                
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  id="final-leaderboard-btn"
                  onClick={fetchLeaderboard}
                  className="w-full border border-white/20 py-4 font-black tracking-widest hover:bg-white/10 transition-all duration-500"
                >
                  VIEW STATUS
                </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
