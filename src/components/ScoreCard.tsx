import React from 'react';
import { motion } from 'framer-motion';

interface ScoreCardProps {
  score: number;
  title: string;
  description: string;
}

export const ScoreCard = ({ score, title, description }: ScoreCardProps) => {
  const circumference = 2 * Math.PI * 40; // radius = 40

  return (
    <div className="score-card">
      <div className="flex items-center gap-6">
        <div className="relative">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200"
            />
            <motion.circle
              cx="64"
              cy="64"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-primary progress-ring"
              initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
              animate={{
                strokeDashoffset: circumference - (score / 100) * circumference,
              }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold">{score}%</span>
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  );
};