/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Game } from './game/main';
import { auth, loginAnonymously, loginWithGoogle, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Trophy, User as UserIcon, RefreshCw, X, ArrowRight, Ghost } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateFunnyName } from './utils/names';
import { collection, query, where, getDocs, getDoc, serverTimestamp } from 'firebase/firestore';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [identitySet, setIdentitySet] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [username, setUsername] = useState('');
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    // Auth Initialization
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) {
        // Check if user already has a name in Firestore
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists() && userDoc.data().username) {
          setUsername(userDoc.data().username);
          setIdentitySet(true);
        } else {
          setShowOnboarding(true);
        }
      } else {
        loginAnonymously();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Game Initialization
    if (authReady && identitySet && canvasRef.current && !gameRef.current) {
      const game = new Game(canvasRef.current);
      gameRef.current = game;
      game.setUsername(username); // Inject identity
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

      // Subscribe to Game Over state changes
      game.score.onGameOver = (gameOver) => {
          setIsGameOver(gameOver);
      };

      game.score.onRestart = () => {
          game.reset();
      };

      // Focus the canvas on mount
      setTimeout(() => {
        canvasRef.current?.focus();
      }, 100);

      return () => {
          window.removeEventListener('resize', handleResize);
      };
    }
  }, [authReady, identitySet]);

  const handleClaimName = async (customName?: string) => {
    if (!user) return;
    if (cooldown > 0) return;

    setIsCheckingName(true);
    setNameError('');

    try {
      const nameToUse = customName || username;
      
      if (!nameToUse || nameToUse.length < 3) {
        setNameError('NAME TOO SHORT (MIN 3 CHARS)');
        setIsCheckingName(false);
        return;
      }

      // Conflict Check
      const q = query(collection(db, 'users'), where('username', '==', nameToUse));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty && querySnapshot.docs[0].id !== user.uid) {
        setNameError('IDENTITY ALREADY ARCHIVED IN SYSTEM');
        setIsCheckingName(false);
        setCooldown(5); // Prevent rapid probing
        return;
      }

      await setDoc(doc(db, 'users', user.uid), {
        userId: user.uid,
        username: nameToUse,
        isAnonymous: user.isAnonymous,
        updatedAt: serverTimestamp() // Use server timestamp for rules
      });

      setUsername(nameToUse);
      gameRef.current?.setUsername(nameToUse);
      setIdentitySet(true);
      setShowOnboarding(false);
      setCooldown(30); // Rule-based cooldown
    } catch (e) {
      setNameError('DATA LINK FAILURE. RETRYING...');
    } finally {
      setIsCheckingName(false);
    }
  };

  const handlePlayAsGuest = () => {
    const funnyName = generateFunnyName();
    handleClaimName(funnyName);
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
      <AnimatePresence>
        {showOnboarding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-4"
          >
            <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
               {Array.from({ length: 20 }).map((_, i) => (
                 <div key={i} className="whitespace-nowrap text-[8px] leading-none opacity-20">
                   {Array.from({ length: 50 }).map(() => "01011010 ").join("")}
                 </div>
               ))}
            </div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-lg border border-white/10 bg-black/80 backdrop-blur-xl p-12 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              
              <div className="mb-12">
                <h2 className="text-4xl font-black tracking-tighter mb-2 italic">CUBIE-X</h2>
                <p className="text-[10px] tracking-[0.3em] opacity-40 uppercase">INITIALIZING IDENTITY PROTOCOL</p>
              </div>

              <div className="space-y-8">
                <div className="relative">
                  <label className="block text-[8px] tracking-[0.4em] opacity-30 uppercase mb-3">UNIQUE_IDENTIFIER_STRING</label>
                  <input 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                    placeholder="ENTER_NAME"
                    className="w-full bg-transparent border-b border-white/20 py-4 text-2xl font-black tracking-widest focus:border-white outline-none transition-colors uppercase"
                    maxLength={20}
                  />
                  {nameError && (
                    <motion.p 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="absolute -bottom-6 left-0 text-[8px] text-red-500 tracking-widest font-bold"
                    >
                      ! {nameError}
                    </motion.p>
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => handleClaimName()}
                    disabled={isCheckingName || cooldown > 0}
                    className="w-full group bg-white text-black py-5 font-black tracking-widest hover:bg-white/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isCheckingName ? <RefreshCw size={18} className="animate-spin" /> : (cooldown > 0 ? null : <ArrowRight size={18} />)}
                    {cooldown > 0 ? `LOCKED (${cooldown}S)` : 'ESTABLISH PROTOCOL'}
                  </button>

                  <div className="flex items-center gap-4 py-2">
                    <div className="h-[1px] flex-1 bg-white/10" />
                    <span className="text-[8px] opacity-20 tracking-widest">OR</span>
                    <div className="h-[1px] flex-1 bg-white/10" />
                  </div>

                  <button 
                    onClick={handlePlayAsGuest}
                    disabled={isCheckingName || cooldown > 0}
                    className="w-full border border-white/10 py-5 font-black tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-3 group disabled:opacity-30"
                  >
                    <Ghost size={18} className="group-hover:translate-x-1 transition-transform" />
                    RUN AS ANONYMOUS_ENTITY
                  </button>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center opacity-20">
                <span className="text-[8px] tracking-widest">VER: 1.0.88</span>
                <span className="text-[8px] tracking-widest">REGION: CLOUD_RUN_88</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas 
        id="vectorun-canvas"
        ref={canvasRef} 
        tabIndex={0}
        onClick={() => canvasRef.current?.focus()}
        className="w-full h-full block cursor-crosshair outline-none"
      />

      {/* Branding Header */}
      <div className="absolute top-6 left-6 flex flex-col z-10 pointer-events-none">
        <span className="text-xl font-black tracking-tighter italic leading-none">CUBIE-X</span>
        <span className="text-[8px] tracking-[0.4em] opacity-30 uppercase">VECTOR_RUNNER_V1.0</span>
      </div>

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
              disabled={isCheckingName || cooldown > 0}
              className="group flex items-center gap-2 text-[10px] tracking-widest border border-white/20 px-3 py-1.5 hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <UserIcon size={12} />
              {cooldown > 0 ? `COOLING DOWN (${cooldown}S)` : 'CLAIM NAME'}
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
              GAME OVER
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xs tracking-[0.4em] uppercase opacity-40 mb-12"
            >
              FATAL EXCEPTION DETECTED
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
