'use client';

import React from 'react';

const PulsatingDot = ({
  color = '#62bd19',
  size = 15,
  ringSize = 25,
  animationDuration = 1,
  className = '',
  style = {},
}) => {
  // Calculate positions based on size
  const ringPosition = (size - ringSize) / 2;

  return (
    <div className={`pulsating-dot-container ${className}`} style={style}>
      <div
        className='pulsating-ring'
        style={{
          border: `3px solid ${color}`,
          borderRadius: '50%',
          height: `${ringSize}px`,
          width: `${ringSize}px`,
          position: 'absolute',
          left: `${ringPosition}px`,
          top: `${ringPosition}px`,
          animation: `pulsate ${animationDuration}s ease-out infinite`,
          opacity: 0,
        }}
      />
      <div
        className='pulsating-circle'
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          borderRadius: '50%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
      <style jsx>{`
        .pulsating-dot-container {
          position: relative;
          width: ${size}px;
          height: ${size}px;
        }
        @keyframes pulsate {
          0% {
            transform: scale(0.1, 0.1);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: scale(1.2, 1.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default PulsatingDot;
