import React, { useState, useEffect, useCallback, useRef } from 'react';
import backgroundImage from './beach/background.png';
import trashCanImage from './beach/cop.png';
import trashImage from './beach/coples.png';
import humanGif from './beach/insan.gif';
import backgroundSound from './beach/ses.mp3';
import trashPileImage from './beach/copyigini.png';
import negativeSound from './beach/olumsuz.mp3';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;
const PLAYER_WIDTH = 100;
const PLAYER_HEIGHT = 120;
const TRASH_CAN_WIDTH = 80;
const TRASH_CAN_HEIGHT = 120;
const TRASH_WIDTH = 20;
const TRASH_HEIGHT = 20;
const TRASH_PILE_WIDTH = 120;
const TRASH_PILE_HEIGHT = 80;
const SCROLL_SPEED = 2;
const JUMP_HEIGHT = 150;
const JUMP_DISTANCE = 200;
const JUMP_DURATION = 500;
const JUMP_COOLDOWN = 100;
const PLAYER_SPEED = 5;
const TRASH_THROW_SPEED = 10;
const TRASH_PILE_PENALTY = -100;

interface GameObject {
  x: number;
  y: number;
}

interface Player extends GameObject {
  isJumping: boolean;
  lastJumpTime: number;
  jumpStartX: number;
  jumpStartY: number;
  jumpProgress: number;
}

interface Trash extends GameObject {
  velocityX: number;
  velocityY: number;
  onGround: boolean;
  scored: boolean;
}

interface NegativeScore {
  value: number;
  x: number;
  y: number;
  opacity: number;
}

const App: React.FC = () => {
  const [player, setPlayer] = useState<Player>({ 
    x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2, 
    y: GAME_HEIGHT - PLAYER_HEIGHT - 10,
    isJumping: false,
    lastJumpTime: 0,
    jumpStartX: 0,
    jumpStartY: 0,
    jumpProgress: 0
  });
  const [trashCans, setTrashCans] = useState<GameObject[]>([]);
  const [trash, setTrash] = useState<Trash[]>([]);
  const [trashPiles, setTrashPiles] = useState<GameObject[]>([]);
  const [score, setScore] = useState(0);
  const [negativeScores, setNegativeScores] = useState<NegativeScore[]>([]);
  const [backgroundPosition, setBackgroundPosition] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const negativeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [cameraOffset, setCameraOffset] = useState(0);
  const [worldPosition, setWorldPosition] = useState(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    audioRef.current = new Audio(backgroundSound);
    audioRef.current.loop = true;
    negativeAudioRef.current = new Audio(negativeSound);
  }, []);

  useEffect(() => {
    const handleInteraction = () => {
      if (audioRef.current && isMuted) {
        audioRef.current.play().catch(error => console.log("Audio playback failed:", error));
        setIsMuted(false);
      }
    };

    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('click', handleInteraction);

    return () => {
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => console.log("Audio playback failed:", error));
      }
    }
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const generateTrashCan = useCallback(() => {
    return {
      x: worldPosition + GAME_WIDTH + Math.random() * 300,
      y: GAME_HEIGHT - TRASH_CAN_HEIGHT - 10
    };
  }, [worldPosition]);

  const generateTrashPile = useCallback(() => {
    return {
      x: worldPosition + GAME_WIDTH + Math.random() * 500,
      y: GAME_HEIGHT - TRASH_PILE_HEIGHT - 10
    };
  }, [worldPosition]);

  const jump = useCallback(() => {
    const currentTime = Date.now();
    if (!player.isJumping && currentTime - player.lastJumpTime > JUMP_COOLDOWN) {
      setPlayer(prev => ({ 
        ...prev, 
        isJumping: true, 
        lastJumpTime: currentTime,
        jumpStartX: prev.x,
        jumpStartY: prev.y,
        jumpProgress: 0
      }));
    }
  }, [player]);

  const throwTrash = useCallback(() => {
    const angle = -Math.PI / 6;
    setTrash(prev => [...prev, {
      x: player.x + PLAYER_WIDTH / 2,
      y: player.y,
      velocityX: Math.cos(angle) * TRASH_THROW_SPEED + PLAYER_SPEED,
      velocityY: Math.sin(angle) * TRASH_THROW_SPEED,
      onGround: false,
      scored: false
    }]);
  }, [player]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeysPressed(prev => new Set(prev).add(e.code));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeysPressed(prev => {
        const newSet = new Set(prev);
        newSet.delete(e.code);
        return newSet;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const gameLoop = setInterval(() => {
      setPlayer(prev => {
        let newX = prev.x;
        if (keysPressed.has('ArrowLeft')) {
          newX = Math.max(worldPosition, prev.x - PLAYER_SPEED);
        }
        if (keysPressed.has('ArrowRight')) {
          newX = prev.x + PLAYER_SPEED;
        }
        if (keysPressed.has('Space')) {
          jump();
        }
        if (keysPressed.has('ArrowUp')) {
          throwTrash();
        }
        return { ...prev, x: newX };
      });

      if (player.isJumping) {
        setPlayer(prev => {
          const newProgress = prev.jumpProgress + 1 / (JUMP_DURATION / 16);
          if (newProgress >= 1) {
            return {
              ...prev,
              isJumping: false,
              x: prev.jumpStartX + JUMP_DISTANCE,
              y: GAME_HEIGHT - PLAYER_HEIGHT - 10,
              jumpProgress: 0
            };
          }
          const x = prev.jumpStartX + JUMP_DISTANCE * newProgress;
          const y = prev.jumpStartY - Math.sin(Math.PI * newProgress) * JUMP_HEIGHT;
          return { ...prev, x, y, jumpProgress: newProgress };
        });
      }

      setWorldPosition(prev => {
        const targetPosition = player.x - GAME_WIDTH / 2 + PLAYER_WIDTH / 2;
        return prev + (targetPosition - prev) * 0.1;
      });

      setCameraOffset(worldPosition);

      setTrashCans(prev => {
        const newCans = prev
          .map(can => ({ ...can, x: can.x - SCROLL_SPEED }))
          .filter(can => can.x > worldPosition - TRASH_CAN_WIDTH);
        
        if (newCans.length < 3) {
          newCans.push(generateTrashCan());
        }
        
        return newCans;
      });

      setTrashPiles(prev => {
        const newPiles = prev
          .map(pile => ({ ...pile, x: pile.x - SCROLL_SPEED }))
          .filter(pile => pile.x > worldPosition - TRASH_PILE_WIDTH);
        
        if (newPiles.length < 2) {
          newPiles.push(generateTrashPile());
        }
        
        return newPiles;
      });

      setBackgroundPosition(prev => (prev - SCROLL_SPEED) % GAME_WIDTH);

      setTrash(prev => prev.map(t => {
        if (t.onGround) {
          return { ...t, x: t.x - SCROLL_SPEED };
        }
        const newY = t.y + t.velocityY;
        if (newY >= GAME_HEIGHT - TRASH_HEIGHT - 10) {
          return { ...t, y: GAME_HEIGHT - TRASH_HEIGHT - 10, onGround: true, velocityY: 0, velocityX: 0 };
        }
        return {
          ...t,
          x: t.x + t.velocityX - SCROLL_SPEED,
          y: newY,
          velocityY: t.velocityY + 0.5,
          velocityX: t.velocityX * 0.99
        };
      }).filter(t => t.x > worldPosition - TRASH_WIDTH));

      setNegativeScores(prev => 
        prev.map(score => ({
          ...score,
          y: score.y - 1,
          opacity: score.opacity - 0.02
        })).filter(score => score.opacity > 0)
      );

    }, 16);

    return () => clearInterval(gameLoop);
  }, [generateTrashCan, generateTrashPile, player.isJumping, jump, throwTrash, keysPressed, worldPosition]);



  useEffect(() => {
    trash.forEach((t, index) => {
      if (t.y >= GAME_HEIGHT - TRASH_HEIGHT - 20 && !t.scored && !t.onGround) {
        setScore(prevScore => prevScore - 1);
        setTrash(prev => prev.map((item, i) => i === index ? {...item, scored: true, onGround: true} : item));
      }

      trashCans.forEach(can => {
        if (
          t.x < can.x + TRASH_CAN_WIDTH &&
          t.x + TRASH_WIDTH > can.x &&
          t.y < can.y + TRASH_CAN_HEIGHT &&
          t.y + TRASH_HEIGHT > can.y &&
          !t.scored
        ) {
          setScore(prevScore => prevScore + 1);
          setTrash(prev => prev.filter((_, i) => i !== index));
        }
      });
    });

    trashPiles.forEach(pile => {
      if (
        player.x < pile.x + TRASH_PILE_WIDTH &&
        player.x + PLAYER_WIDTH > pile.x &&
        player.y + PLAYER_HEIGHT > pile.y &&
        !player.isJumping
      ) {
        setScore(prevScore => prevScore + TRASH_PILE_PENALTY);
        if (negativeAudioRef.current) {
          negativeAudioRef.current.play().catch(error => console.log("Negative audio playback failed:", error));
        }
        setNegativeScores(prev => [
          ...prev,
          { value: TRASH_PILE_PENALTY, x: player.x - worldPosition, y: player.y, opacity: 1 }
        ]);
        jump();
      }
    });
  }, [trash, trashCans, trashPiles, player, jump, worldPosition]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const gameRect = e.currentTarget.getBoundingClientRect();
    const touchY = touch.clientY - gameRect.top;

    if (touchY < GAME_HEIGHT / 3) {
      jump();
    }
  }, [jump]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const gameRect = e.currentTarget.getBoundingClientRect();
    const touchX = touch.clientX - gameRect.left;

    setKeysPressed(new Set());
    if (touchX < GAME_WIDTH / 2) {
      setKeysPressed(prev => new Set(prev).add('ArrowLeft'));
    } else {
      setKeysPressed(prev => new Set(prev).add('ArrowRight'));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    setKeysPressed(new Set());
  }, []);

  const handleTap = useCallback(() => {
    throwTrash();
  }, [throwTrash]);

  return (
    <div className="flex justify-center items-center h-screen bg-blue-200">
      <div 
        className="relative overflow-hidden" 
        style={{ 
          width: GAME_WIDTH, 
          height: GAME_HEIGHT, 
          touchAction: 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleTap}
      >
        <div
          style={{
            position: 'absolute',
            left: -(worldPosition % GAME_WIDTH),
            top: 0,
            width: GAME_WIDTH * 2,
            height: GAME_HEIGHT,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: `${GAME_WIDTH}px ${GAME_HEIGHT}px`,
            backgroundRepeat: 'repeat-x',
            zIndex: 0,
          }}
        />
        {trashCans.map((can, index) => (
          <img
            key={index}
            src={trashCanImage}
            alt="Çöp Kovası"
            className="absolute"
            style={{ 
              left: can.x - worldPosition, 
              top: can.y, 
              width: TRASH_CAN_WIDTH, 
              height: TRASH_CAN_HEIGHT,
              zIndex: 1,
            }}
          />
        ))}
        {trashPiles.map((pile, index) => (
          <img
            key={index}
            src={trashPileImage}
            alt="Çöp Yığını"
            className="absolute"
            style={{ 
              left: pile.x - worldPosition, 
              top: pile.y, 
              width: TRASH_PILE_WIDTH, 
              height: TRASH_PILE_HEIGHT,
              zIndex: 1,
            }}
          />
        ))}
        <img
          src={humanGif}
          alt="İnsan"
          className="absolute"
          style={{ 
            left: GAME_WIDTH / 2 - PLAYER_WIDTH / 2, 
            top: player.y, 
            width: PLAYER_WIDTH,
            height: PLAYER_HEIGHT,
            objectFit: 'cover',
            zIndex: 2,
          }}
        />
        {trash.map((t, index) => (
          <img
            key={index}
            src={trashImage}
            alt="Çöp"
            className={`absolute ${t.onGround ? 'opacity-50' : ''}`}
            style={{ 
              left: t.x - worldPosition, 
              top: t.y, 
              width: TRASH_WIDTH, 
              height: TRASH_HEIGHT,
              zIndex: 3,
            }}
          />
        ))}
        {negativeScores.map((score, index) => (
          <div
            key={index}
            className="absolute text-red-500 font-bold text-2xl"
            style={{
              left: score.x,
              top: score.y,
              opacity: score.opacity,
              zIndex: 4,
            }}
          >
            {score.value}
          </div>
        ))}
        <div className="absolute top-4 left-4 text-2xl font-bold text-white" style={{ zIndex: 5 }}>Puan: {score}</div>
        <button 
          className="absolute top-4 right-4 text-2xl font-bold text-white bg-blue-500 px-2 py-1 rounded"
          onClick={toggleMute}
          style={{ zIndex: 5 }}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>
    </div>
  );
};

export default App;