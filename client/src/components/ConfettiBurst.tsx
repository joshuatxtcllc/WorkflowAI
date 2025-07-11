import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: string;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  delay: number;
}

interface ConfettiBurstProps {
  trigger: boolean;
  onComplete?: () => void;
  originX?: number;
  originY?: number;
}

const colors = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FF7F50', // Coral (replacing gold)
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#FFA500', // Orange (replacing light yellow)
  '#BB8FCE', // Light Purple
  '#00CED1', // Dark Turquoise (replacing yellow)
];

export function ConfettiBurst({ trigger, onComplete, originX = 50, originY = 50 }: ConfettiBurstProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      // Generate confetti pieces
      const pieces: ConfettiPiece[] = [];
      const numPieces = 40;

      for (let i = 0; i < numPieces; i++) {
        pieces.push({
          id: `confetti-${i}`,
          x: originX + (Math.random() - 0.5) * 20,
          y: originY + (Math.random() - 0.5) * 20,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          scale: 0.5 + Math.random() * 0.5,
          delay: Math.random() * 0.3,
        });
      }

      setConfetti(pieces);
      setIsActive(true);

      // Clean up after animation
      const timer = setTimeout(() => {
        setIsActive(false);
        setConfetti([]);
        onComplete?.();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [trigger, originX, originY, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confetti.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute w-3 h-3 rounded-sm"
              style={{
                backgroundColor: piece.color,
                left: `${piece.x}%`,
                top: `${piece.y}%`,
              }}
              initial={{
                scale: 0,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                scale: piece.scale,
                rotate: piece.rotation + 720,
                x: (Math.random() - 0.5) * 400,
                y: Math.random() * 600 + 100,
                opacity: 0,
              }}
              transition={{
                duration: 1.5 + Math.random() * 0.5,
                delay: piece.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            />
          ))}
          
          {/* Sparkle effects */}
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute"
              style={{
                left: `${originX + (Math.random() - 0.5) * 30}%`,
                top: `${originY + (Math.random() - 0.5) * 30}%`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
                rotate: Math.random() * 360,
              }}
              transition={{
                duration: 1,
                delay: Math.random() * 0.5,
                ease: "easeOut",
              }}
            >
              <div className="w-2 h-2 relative">
                <div className="absolute inset-0 bg-orange-300 transform rotate-45 rounded-sm"></div>
                <div className="absolute inset-0 bg-orange-300 transform -rotate-45 rounded-sm"></div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}