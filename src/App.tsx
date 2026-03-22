import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music, Trophy, Gamepad2, Volume2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Track {
  id: number;
  title: string;
  artist: string;
  url: string;
  cover: string;
}

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION: Direction = 'UP';
const GAME_SPEED = 150;

const TRACKS: Track[] = [
  {
    id: 1,
    title: "Neon Dreams",
    artist: "SynthAI",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "https://picsum.photos/seed/neon1/300/300",
  },
  {
    id: 2,
    title: "Cyber Pulse",
    artist: "ByteBeats",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "https://picsum.photos/seed/neon2/300/300",
  },
  {
    id: 3,
    title: "Digital Horizon",
    artist: "CircuitWave",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "https://picsum.photos/seed/neon3/300/300",
  },
];

export default function App() {
  // --- Music Player State ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = TRACKS[currentTrackIndex];

  // --- Snake Game State ---
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const gameLoopRef = useRef<number | null>(null);

  // --- Music Controls ---
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skipTrack = (dir: 'next' | 'prev') => {
    let nextIndex = currentTrackIndex;
    if (dir === 'next') {
      nextIndex = (currentTrackIndex + 1) % TRACKS.length;
    } else {
      nextIndex = (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
    }
    setCurrentTrackIndex(nextIndex);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = currentTrack.url;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      }
    }
  }, [currentTrackIndex]);

  // --- Sound Effects ---
  const playSound = (type: 'move' | 'eat' | 'gameOver') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'eat') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'gameOver') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.5);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (e) {
      console.log("Sound play failed:", e);
    }
  };

  // --- Snake Game Logic ---
  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isOnSnake = currentSnake.some(p => p.x === newFood.x && p.y === newFood.y);
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const moveSnake = useCallback(() => {
    if (gameOver || !gameStarted) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = { ...head };

      switch (direction) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // Check wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        handleGameOver();
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some(p => p.x === newHead.x && p.y === newHead.y)) {
        handleGameOver();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(generateFood(newSnake));
        playSound('eat');
      } else {
        newSnake.pop();
        playSound('move');
      }

      return newSnake;
    });
  }, [direction, food, gameOver, gameStarted, generateFood]);

  const handleGameOver = () => {
    setGameOver(true);
    setGameStarted(false);
    playSound('gameOver');
    if (score > highScore) setHighScore(score);
  };

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setFood(generateFood(INITIAL_SNAKE));
    playSound('move'); // Initial sound to start audio context
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': if (direction !== 'DOWN') setDirection('UP'); break;
        case 'ArrowDown': if (direction !== 'UP') setDirection('DOWN'); break;
        case 'ArrowLeft': if (direction !== 'RIGHT') setDirection('LEFT'); break;
        case 'ArrowRight': if (direction !== 'LEFT') setDirection('RIGHT'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      const interval = setInterval(moveSnake, GAME_SPEED);
      return () => clearInterval(interval);
    }
  }, [gameStarted, gameOver, moveSnake]);

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-pink/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/10 blur-[120px] rounded-full" />
      </div>

      <audio ref={audioRef} onEnded={() => skipTrack('next')} />

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Stats & Info */}
        <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
          >
            <div className="flex items-center gap-3 mb-4 text-neon-pink font-bold uppercase tracking-widest text-xs">
              <Trophy size={16} />
              <span>Leaderboard</span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-white/50 text-xs uppercase font-medium">Current Score</p>
                <p className="text-3xl font-mono font-bold text-neon-pink neon-text-pink">{score}</p>
              </div>
              <div className="h-px bg-white/10 w-full" />
              <div>
                <p className="text-white/50 text-xs uppercase font-medium">Personal Best</p>
                <p className="text-3xl font-mono font-bold text-neon-blue neon-text-blue">{highScore}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
          >
            <div className="flex items-center gap-3 mb-4 text-neon-blue font-bold uppercase tracking-widest text-xs">
              <Gamepad2 size={16} />
              <span>Controls</span>
            </div>
            <div className="space-y-2 text-sm text-white/70 font-mono">
              <div className="flex justify-between"><span>UP</span> <span className="text-neon-blue">↑</span></div>
              <div className="flex justify-between"><span>DOWN</span> <span className="text-neon-blue">↓</span></div>
              <div className="flex justify-between"><span>LEFT</span> <span className="text-neon-blue">←</span></div>
              <div className="flex justify-between"><span>RIGHT</span> <span className="text-neon-blue">→</span></div>
            </div>
          </motion.div>
        </div>

        {/* Center Column: Snake Game */}
        <div className="lg:col-span-6 flex flex-col items-center order-1 lg:order-2">
          <div className="relative group">
            {/* Game Border */}
            <div className="absolute -inset-1 bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            
            <div className="relative bg-black rounded-xl overflow-hidden border border-white/10 w-[320px] h-[320px] md:w-[400px] md:h-[400px] grid grid-cols-20 grid-rows-20">
              {/* Grid Rendering */}
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                const x = i % GRID_SIZE;
                const y = Math.floor(i / GRID_SIZE);
                const isSnake = snake.some(p => p.x === x && p.y === y);
                const isHead = snake[0].x === x && snake[0].y === y;
                const isFood = food.x === x && food.y === y;

                return (
                  <div 
                    key={i} 
                    className={`w-full h-full border-[0.5px] border-white/5 flex items-center justify-center`}
                  >
                    {isSnake && (
                      <motion.div 
                        layoutId={`snake-${x}-${y}`}
                        className={`w-[85%] h-[85%] rounded-sm ${isHead ? 'bg-neon-green shadow-[0_0_10px_#39ff14]' : 'bg-neon-green/60'}`} 
                      />
                    )}
                    {isFood && (
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="w-[70%] h-[70%] rounded-full bg-neon-pink shadow-[0_0_10px_#ff00ff]" 
                      />
                    )}
                  </div>
                );
              })}

              {/* Game Over Overlay */}
              <AnimatePresence>
                {!gameStarted && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center border border-white"
                  >
                    {gameOver ? (
                      <>
                        <h2 className="text-4xl font-bold text-neon-pink neon-text-pink mb-2">GAME OVER</h2>
                        <p className="text-white/60 mb-6 font-mono">Final Score: {score}</p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-4xl font-bold text-neon-blue neon-text-blue mb-2">NEON SNAKE</h2>
                        <p className="text-white/60 mb-6 font-mono">Ready for the pulse?</p>
                      </>
                    )}
                    <button 
                      onClick={resetGame}
                      className="group relative px-8 py-3 bg-transparent overflow-hidden rounded-full border border-neon-blue transition-all hover:scale-105 active:scale-95"
                    >
                      <div className="absolute inset-0 bg-neon-blue/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                      <span className="relative flex items-center gap-2 text-neon-blue font-bold tracking-widest uppercase text-sm">
                        {gameOver ? <RefreshCw size={18} /> : <Play size={18} />}
                        {gameOver ? 'Restart' : 'Start Game'}
                      </span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Column: Music Player */}
        <div className="lg:col-span-3 space-y-6 order-3">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
          >
            <div className="flex items-center gap-3 mb-6 text-neon-purple font-bold uppercase tracking-widest text-xs">
              <Music size={16} />
              <span>Now Playing</span>
            </div>

            <div className="relative aspect-square rounded-xl overflow-hidden mb-6 group">
              <img 
                src={currentTrack.cover} 
                alt={currentTrack.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-110' : 'scale-100'}`}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
              
              {/* Spinning Vinyl Effect */}
              {isPlaying && (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute bottom-4 right-4 w-12 h-12 rounded-full border-2 border-neon-purple/50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                >
                  <Music className="text-neon-purple" size={20} />
                </motion.div>
              )}
            </div>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-1 truncate">{currentTrack.title}</h3>
              <p className="text-white/50 text-sm font-mono">{currentTrack.artist}</p>
            </div>

            {/* Visualizer Placeholder */}
            <div className="flex items-end justify-center gap-1 h-8 mb-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    height: isPlaying ? [8, Math.random() * 24 + 8, 8] : 8 
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 0.5 + Math.random() * 0.5,
                    ease: "easeInOut"
                  }}
                  className="w-1 bg-neon-purple rounded-full opacity-60"
                />
              ))}
            </div>

            <div className="flex items-center justify-center gap-6">
              <button 
                onClick={() => skipTrack('prev')}
                className="text-white/60 hover:text-neon-blue transition-colors"
              >
                <SkipBack size={24} />
              </button>
              <button 
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-black hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              >
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
              </button>
              <button 
                onClick={() => skipTrack('next')}
                className="text-white/60 hover:text-neon-blue transition-colors"
              >
                <SkipForward size={24} />
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-4"
          >
            <Volume2 size={20} className="text-white/40" />
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="w-2/3 h-full bg-neon-blue shadow-[0_0_10px_#00f2ff]"></div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer / Status Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-neon-green animate-pulse' : 'bg-white/20'}`} />
          <span>Audio Stream: Active</span>
        </div>
        <div className="w-px h-3 bg-white/10" />
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${gameStarted ? 'bg-neon-blue animate-pulse' : 'bg-white/20'}`} />
          <span>Game Engine: {gameStarted ? 'Running' : 'Idle'}</span>
        </div>
      </div>
    </div>
  );
}
