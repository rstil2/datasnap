import React from 'react';

interface Logo3DProps {
  size?: number;
}

export const Logo3D: React.FC<Logo3DProps> = ({ size = 20 }) => {
  const cubeSize = size;
  const halfSize = cubeSize / 2;

  return (
    <div 
      style={{
        width: cubeSize,
        height: cubeSize,
        position: 'relative',
        transform: 'rotateX(-20deg) rotateY(35deg)',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Front face */}
      <div
        style={{
          position: 'absolute',
          width: cubeSize,
          height: cubeSize,
          background: '#ffffff',
          transform: `translateZ(${halfSize}px)`,
          border: '1px solid rgba(0, 0, 0, 0.1)',
        }}
      />
      
      {/* Right face */}
      <div
        style={{
          position: 'absolute',
          width: cubeSize,
          height: cubeSize,
          background: '#e8e8e8',
          transform: `rotateY(90deg) translateZ(${halfSize}px)`,
          border: '1px solid rgba(0, 0, 0, 0.1)',
        }}
      />
      
      {/* Top face */}
      <div
        style={{
          position: 'absolute',
          width: cubeSize,
          height: cubeSize,
          background: '#f5f5f5',
          transform: `rotateX(90deg) translateZ(${halfSize}px)`,
          border: '1px solid rgba(0, 0, 0, 0.1)',
        }}
      />
    </div>
  );
};