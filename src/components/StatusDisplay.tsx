import React from 'react';
import { RobotState } from '../types';
import { pixelsToMeters, pixelVelocityToMps } from '../unitConversion';

interface StatusDisplayProps {
  actualRobot: RobotState;
  estimatedRobot: RobotState;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ actualRobot, estimatedRobot }) => {
  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
  };

  const formatAngle = (radians: number): string => {
    const degrees = (radians * 180 / Math.PI) % 360;
    return `${degrees.toFixed(1)}°`;
  };

  const StatusRow: React.FC<{ label: string; actual: string; estimated: string }> = ({
    label,
    actual,
    estimated
  }) => (
    <>
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="text-sm font-mono text-blue-600 text-center">{actual}</div>
      <div className="text-sm font-mono text-gray-600 text-center">{estimated}</div>
    </>
  );

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Robot State</h3>
      
      {/* Grid Header */}
      <div className="grid grid-cols-3 gap-2 mb-2 pb-2 border-b border-gray-200">
        <div className="text-xs font-semibold text-gray-500 uppercase">Parameter</div>
        <div className="text-xs font-semibold text-blue-500 uppercase text-center">Actual</div>
        <div className="text-xs font-semibold text-gray-500 uppercase text-center">Estimated</div>
      </div>
      
      {/* Status Grid */}
      <div className="grid grid-cols-3 gap-2 items-center">
        <StatusRow
          label="X Position"
          actual={`${formatNumber(pixelsToMeters(actualRobot.position.x), 2)}m`}
          estimated={`${formatNumber(pixelsToMeters(estimatedRobot.position.x), 2)}m`}
        />
        
        <StatusRow
          label="Y Position"
          actual={`${formatNumber(pixelsToMeters(actualRobot.position.y), 2)}m`}
          estimated={`${formatNumber(pixelsToMeters(estimatedRobot.position.y), 2)}m`}
        />
        
        <StatusRow
          label="Orientation"
          actual={formatAngle(actualRobot.orientation)}
          estimated={formatAngle(estimatedRobot.orientation)}
        />
        
        <StatusRow
          label="Velocity"
          actual={`${formatNumber(pixelVelocityToMps(actualRobot.velocity), 2)} m/s`}
          estimated={`${formatNumber(pixelVelocityToMps(estimatedRobot.velocity), 2)} m/s`}
        />
        
        <StatusRow
          label="Angular Vel"
          actual={`${formatNumber(actualRobot.angularVelocity, 2)} rad/s`}
          estimated={`${formatNumber(estimatedRobot.angularVelocity, 2)} rad/s`}
        />
      </div>
    </div>
  );
};

export default StatusDisplay;