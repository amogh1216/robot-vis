import React from 'react';
import { RobotState } from '../types';
import { pixelsToMeters, pixelVelocityToMps } from '../unitConversion';

interface CanvasLegendProps {
  actualRobot: RobotState;
  estimatedRobot: RobotState;
}

const CanvasLegend: React.FC<CanvasLegendProps> = ({ actualRobot, estimatedRobot }) => {
  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toFixed(decimals);
  };

  const formatAngle = (radians: number): string => {
    const degrees = (radians * 180 / Math.PI) % 360;
    return formatNumber(degrees, 1);
  };

  return (
    <div 
      className="bg-white border border-gray-200 p-3 rounded shadow-lg text-xs font-mono pointer-events-none"
      style={{ 
        gridColumn: 1, 
        gridRow: 1, 
        zIndex: 1,
        justifySelf: 'end',
        alignSelf: 'start',
        margin: 10,
        minWidth: 150
      }}
    >
      <div className="space-y-2">
        {/* True Pose */}
        <div>
          <div className="font-semibold text-blue-600 mb-1">Ground Truth</div>
          <div className="text-blue-600">
            ({formatNumber(pixelsToMeters(actualRobot.position.x))}, {formatNumber(pixelsToMeters(actualRobot.position.y))}, {formatAngle(actualRobot.orientation)}°)
          </div>
          <div className="grid text-blue-600">
            <div>{formatNumber(pixelVelocityToMps(actualRobot.velocity))} m/s {formatNumber(actualRobot.angularVelocity)} rad/s</div>
          </div>
        </div>

        {/* Estimated Pose */}
        <div>
          <div className="font-semibold text-gray-600 mb-1">Odometry Estimate</div>
          <div className="text-gray-600">
            ({formatNumber(pixelsToMeters(estimatedRobot.position.x))}, {formatNumber(pixelsToMeters(estimatedRobot.position.y))}, {formatAngle(estimatedRobot.orientation)}°)
          </div>
          <div className="grid text-gray-600">
            <div>{formatNumber(pixelVelocityToMps(estimatedRobot.velocity))} m/s {formatNumber(estimatedRobot.angularVelocity)} rad/s</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasLegend;