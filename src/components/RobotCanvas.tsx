import React, { useRef, useEffect } from 'react';
import { RobotState, GridConfig } from '../types';
import CanvasLegend from './CanvasLegend';

interface RobotCanvasProps {
  robot: RobotState;
  estimatedRobot: RobotState;
  grid: GridConfig;
  robotSize: number;
  className?: string;
  showLegend?: boolean;
}

const RobotCanvas: React.FC<RobotCanvasProps> = ({
  robot,
  estimatedRobot,
  grid,
  robotSize,
  className,
  showLegend = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx, grid);

    // Draw estimated robot (lighter/dashed)
    drawRobot(ctx, estimatedRobot, robotSize, '#999999', true);

    // Draw actual robot (solid)
    drawRobot(ctx, robot, robotSize, '#2563eb', false);

  }, [robot, estimatedRobot, grid, robotSize]);

  const drawGrid = (ctx: CanvasRenderingContext2D, gridConfig: GridConfig) => {
    const { width, height, cellSize } = gridConfig;
    
    // Draw grid lines with darker color
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let x = 0; x <= width; x += cellSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw border with strong definition
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, width - 3, height - 3);
  };

  const drawRobot = (
    ctx: CanvasRenderingContext2D,
    robotState: RobotState,
    size: number,
    color: string,
    isDashed: boolean
  ) => {
    const { position, orientation } = robotState;
    const halfSize = size / 2;

    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(orientation);

    if (isDashed) {
      ctx.setLineDash([5, 5]);
    } else {
      ctx.setLineDash([]);
    }

    // Draw robot body (square)
    ctx.fillStyle = isDashed ? color + '40' : color; // Add transparency for estimated robot
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    ctx.fillRect(-halfSize, -halfSize, size, size);
    ctx.strokeRect(-halfSize, -halfSize, size, size);

    // Draw direction indicator (larger, pointier triangle pointing forward)
    ctx.fillStyle = isDashed ? '#ffffff80' : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(halfSize * 0.7, 0); // Point extends further forward
    ctx.lineTo(-halfSize * 0.2, -halfSize * 0.6); // Wider base
    ctx.lineTo(-halfSize * 0.2, halfSize * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  return (
    <div style={{ display: 'grid' }}>
      {/* Layer 1: Canvas */}
      <div style={{ gridColumn: 1, gridRow: 1 }}>
        <canvas
          ref={canvasRef}
          width={grid.width}
          height={grid.height}
          className={className}
          style={{
            border: '1px solid #d1d5db',
            backgroundColor: '#ffffff',
            display: 'block'
          }}
        />
      </div>
      {/* Layer 2: Legend overlay */}
      {showLegend && (
        <CanvasLegend
          actualRobot={robot}
          estimatedRobot={estimatedRobot}
        />
      )}
    </div>
  );
};

export default RobotCanvas;