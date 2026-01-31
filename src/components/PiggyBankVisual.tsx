import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface PiggyBankVisualProps {
  currentAmount: number;
  capacity: number;
}

export const PiggyBankVisual: React.FC<PiggyBankVisualProps> = ({ currentAmount, capacity }) => {
  const percentage = Math.min(100, Math.max(0, (currentAmount / capacity) * 100));
  const controls = useAnimation();

  useEffect(() => {
    if (percentage >= 100) {
      controls.start({
        scale: [1, 1.1, 1],
        rotate: [0, -5, 5, -5, 5, 0],
        transition: { duration: 0.5 }
      });
    }
  }, [percentage, controls]);

  return (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
      <motion.div 
        animate={controls}
        className="relative w-full h-full drop-shadow-2xl filter"
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <clipPath id="piggyClip">
              <path d="M160.8,84.6c-2.3-3.6-6.1-5.9-10.2-6.5c-0.6-5.8-3.3-11.2-7.8-15.1c-6.8-6-16.5-6.8-24.1-3.6
                c-6-10.8-17.5-17.6-29.9-17.6c-13.3,0-25.3,7.9-30.9,20c-5.9-0.9-11.9,0.8-16.5,4.7c-5.6,4.8-7.9,12.3-6.1,19.4
                c-7.9,2.8-13.4,10.2-13.4,18.8c0,1.3,0.1,2.6,0.4,3.8c-2.9,3.5-4.4,8-4.1,12.6c0.5,7.7,6.2,14.1,13.8,15.6
                c1.8,11.9,11.2,21.5,23.1,23.5c1.6,4.6,5.9,7.9,11,7.9c4.1,0,7.7-2.1,9.8-5.3c7.5,1.5,15.3,1.5,22.8,0
                c2.1,3.2,5.7,5.3,9.8,5.3c5.1,0,9.4-3.3,11-7.9c12.3-2.1,21.8-12,23.5-24.3c3.4-1.2,6.3-3.5,8.1-6.6
                C163.5,103.4,163.7,92.5,160.8,84.6z" />
            </clipPath>
            
            <linearGradient id="liquidGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FFD93D" />
              <stop offset="100%" stopColor="#FF6B35" />
            </linearGradient>
          </defs>

          {/* Background Layer (Empty Piggy) */}
          <path
            d="M160.8,84.6c-2.3-3.6-6.1-5.9-10.2-6.5c-0.6-5.8-3.3-11.2-7.8-15.1c-6.8-6-16.5-6.8-24.1-3.6
              c-6-10.8-17.5-17.6-29.9-17.6c-13.3,0-25.3,7.9-30.9,20c-5.9-0.9-11.9,0.8-16.5,4.7c-5.6,4.8-7.9,12.3-6.1,19.4
              c-7.9,2.8-13.4,10.2-13.4,18.8c0,1.3,0.1,2.6,0.4,3.8c-2.9,3.5-4.4,8-4.1,12.6c0.5,7.7,6.2,14.1,13.8,15.6
              c1.8,11.9,11.2,21.5,23.1,23.5c1.6,4.6,5.9,7.9,11,7.9c4.1,0,7.7-2.1,9.8-5.3c7.5,1.5,15.3,1.5,22.8,0
              c2.1,3.2,5.7,5.3,9.8,5.3c5.1,0,9.4-3.3,11-7.9c12.3-2.1,21.8-12,23.5-24.3c3.4-1.2,6.3-3.5,8.1-6.6
              C163.5,103.4,163.7,92.5,160.8,84.6z"
            fill="#F3F4F6"
            stroke="#E5E7EB"
            strokeWidth="2"
          />

          {/* Liquid Layer (Clipped) */}
          <g clipPath="url(#piggyClip)">
            <motion.rect
              x="0"
              y="0"
              width="200"
              height="200"
              fill="url(#liquidGradient)"
              initial={{ y: 200 }}
              animate={{ y: 200 - (percentage * 2) }}
              transition={{ type: "spring", damping: 20, stiffness: 50 }}
            />
            {/* Bubbles / Texture could go here */}
          </g>

          {/* Outline Layer (On top) */}
          <path
            d="M160.8,84.6c-2.3-3.6-6.1-5.9-10.2-6.5c-0.6-5.8-3.3-11.2-7.8-15.1c-6.8-6-16.5-6.8-24.1-3.6
              c-6-10.8-17.5-17.6-29.9-17.6c-13.3,0-25.3,7.9-30.9,20c-5.9-0.9-11.9,0.8-16.5,4.7c-5.6,4.8-7.9,12.3-6.1,19.4
              c-7.9,2.8-13.4,10.2-13.4,18.8c0,1.3,0.1,2.6,0.4,3.8c-2.9,3.5-4.4,8-4.1,12.6c0.5,7.7,6.2,14.1,13.8,15.6
              c1.8,11.9,11.2,21.5,23.1,23.5c1.6,4.6,5.9,7.9,11,7.9c4.1,0,7.7-2.1,9.8-5.3c7.5,1.5,15.3,1.5,22.8,0
              c2.1,3.2,5.7,5.3,9.8,5.3c5.1,0,9.4-3.3,11-7.9c12.3-2.1,21.8-12,23.5-24.3c3.4-1.2,6.3-3.5,8.1-6.6
              C163.5,103.4,163.7,92.5,160.8,84.6z"
            fill="none"
            stroke="#FF6B35"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Eye */}
          <circle cx="125" cy="70" r="3" fill="#1F2937" />
          
          {/* Ear detail */}
          <path d="M130,50 Q135,40 145,45" fill="none" stroke="#FF6B35" strokeWidth="3" strokeLinecap="round" />

          {/* Coin Slot */}
          <rect x="90" y="45" width="20" height="4" rx="2" fill="#1F2937" opacity="0.2" />

        </svg>
      </motion.div>
      
      {/* Percentage Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.span 
          key={Math.round(percentage)}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-4xl font-rounded font-bold text-white drop-shadow-md"
        >
          {Math.round(percentage)}%
        </motion.span>
      </div>
    </div>
  );
};
