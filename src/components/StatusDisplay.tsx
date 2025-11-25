import React from 'react';
import { RobotState } from '../types';

interface StatusDisplayProps {
  actualRobot: RobotState;
  estimatedRobot: RobotState;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ actualRobot, estimatedRobot }) => {
  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
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
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Wheel State</h3>
      
      {/* Grid Header */}
      <div className="grid grid-cols-3 gap-2 mb-2 pb-2 border-b border-gray-200">
        <div className="text-xs font-semibold text-gray-500 uppercase">Parameter</div>
        <div className="text-xs font-semibold text-blue-500 uppercase text-center">Actual</div>
        <div className="text-xs font-semibold text-gray-500 uppercase text-center">Estimated</div>
      </div>
      
      {/* Status Grid */}
      <div className="grid grid-cols-3 gap-2 items-center">
        <StatusRow
          label="Left Wheel Vel"
          actual={`${formatNumber(actualRobot.leftWheel.velocity, 2)} rad/s`}
          estimated={`${formatNumber(estimatedRobot.leftWheel.velocity, 2)} rad/s`}
        />
        
        <StatusRow
          label="Right Wheel Vel"
          actual={`${formatNumber(actualRobot.rightWheel.velocity, 2)} rad/s`}
          estimated={`${formatNumber(estimatedRobot.rightWheel.velocity, 2)} rad/s`}
        />
        
        <StatusRow
          label="Left Wheel Rot"
          actual={`${formatNumber(actualRobot.leftWheel.rotation, 1)} rad`}
          estimated={`${formatNumber(estimatedRobot.leftWheel.rotation, 1)} rad`}
        />
        
        <StatusRow
          label="Right Wheel Rot"
          actual={`${formatNumber(actualRobot.rightWheel.rotation, 1)} rad`}
          estimated={`${formatNumber(estimatedRobot.rightWheel.rotation, 1)} rad`}
        />
      </div>
    </div>
  );
};

export default StatusDisplay;