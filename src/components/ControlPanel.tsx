import React from 'react';
import { RobotConstants, MovementCommand } from '../types';
import { 
  pixelVelocityToMps, 
  mpsToPixelVelocity, 
  pixelAccelerationToMps2, 
  mps2ToPixelAcceleration,
  pixelsToMeters,
  metersToPixels 
} from '../unitConversion';

interface ControlPanelProps {
  constants: RobotConstants;
  onConstantsChange: (constants: RobotConstants) => void;
  onMovementCommand: (command: MovementCommand) => void;
  isRunning: boolean;
  onToggleSimulation: () => void;
  turningRadius: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  constants,
  onConstantsChange,
  onMovementCommand,
  isRunning,
  onToggleSimulation,
  turningRadius
}) => {
  const handleConstantChange = (field: keyof RobotConstants, value: number) => {
    let convertedValue = value;
    
    // Convert from display units (meters) back to internal units (pixels)
    if (field === 'maxSpeed') {
      convertedValue = mpsToPixelVelocity(value);
    } else if (field === 'maxAcceleration') {
      convertedValue = mps2ToPixelAcceleration(value);
    } else if (field === 'wheelbase' || field === 'size') {
      convertedValue = metersToPixels(value);
    }
    
    onConstantsChange({
      ...constants,
      [field]: convertedValue
    });
  };

  const buttonStyle = "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed";
  const inputStyle = "w-20 px-2 py-1 border border-gray-300 rounded";
  const labelStyle = "text-sm font-medium text-gray-700";

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Robot Control Panel</h2>
      
      {/* Simulation Control */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-700">Simulation</h3>
          <button
            onClick={onToggleSimulation}
            className="transition-colors"
            title={isRunning ? 'Pause Simulation' : 'Start Simulation'}
          >
            {isRunning ? (
              // Pause icon
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5V19H6V5H8ZM18 5V19H16V5H18Z" fill="#dc2626"/>
              </svg>
            ) : (
              // Play icon
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5V19L19 12L8 5Z" fill="#059669"/>
              </svg>
            )}
          </button>
        </div>
        {isRunning && (
          <div className="mt-2 text-xs text-gray-500">
            Use ↑↓←→ or WASD to move, Space to stop
          </div>
        )}
      </div>

      {/* Robot Constants */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Robot Constants</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={labelStyle}>Max Speed:</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={pixelVelocityToMps(constants.maxSpeed).toFixed(1)}
                onChange={(e) => handleConstantChange('maxSpeed', parseFloat(e.target.value) || 0)}
                min="0.1"
                max="2.0"
                step="0.1"
                className={inputStyle}
              />
              <span className="text-sm text-gray-500">m/s</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className={labelStyle}>Max Acceleration:</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={pixelAccelerationToMps2(constants.maxAcceleration).toFixed(1)}
                onChange={(e) => handleConstantChange('maxAcceleration', parseFloat(e.target.value) || 0)}
                min="0.1"
                max="5.0"
                step="0.1"
                className={inputStyle}
              />
              <span className="text-sm text-gray-500">m/s²</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className={labelStyle}>Wheelbase:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                value={pixelsToMeters(constants.wheelbase)}
                onChange={(e) => handleConstantChange('wheelbase', parseFloat(e.target.value))}
                min="0.1"
                max="0.5"
                step="0.01"
                className="flex-1"
              />
              <span className="text-sm font-medium w-12">{pixelsToMeters(constants.wheelbase).toFixed(2)}m</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className={labelStyle}>Turning Radius:</label>
            <span className="text-sm font-medium text-gray-600">
              {turningRadius === Infinity ? '∞' : `${pixelsToMeters(turningRadius).toFixed(2)}m`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;