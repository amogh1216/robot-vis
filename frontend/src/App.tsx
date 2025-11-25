import React, { useState, useEffect, useCallback } from 'react';
import RobotCanvas from './components/RobotCanvas';
import ControlPanel from './components/ControlPanel';
import StatusDisplay from './components/StatusDisplay';
import { useSimulationWebSocket } from './hooks/useSimulationWebSocket';

import { 
  RobotConstants, 
  MovementCommand, 
  RobotState,
  GridConfig
} from './types';
import { 
  calculateTurningRadius
} from './robotUtils';

const App: React.FC = () => {
  // WebSocket connection to backend
  const {
    isConnected,
    isRunning,
    groundTruth,
    odometry,
    error,
    sendWheelCommand,
    sendConstants,
    startSimulation,
    stopSimulation,
    resetSimulation,
  } = useSimulationWebSocket();

  // Grid configuration
  const [grid] = useState<GridConfig>({
    width: 800,
    height: 650,
    cellSize: 40
  });

  // Robot constants (frontend units - pixels)
  const [constants, setConstants] = useState<RobotConstants>({
    maxSpeed: 200, // pixels/s (2 m/s * 100)
    maxAcceleration: 100, // pixels/s² (1 m/s² * 100)
    wheelbase: 30, // pixels (0.3m * 100)
    wheelRadius: 5, // pixels (0.05m * 100)
    size: 30,
    slippageAmount: 0.1
  });

  // Default robot state for when not connected
  const defaultRobotState: RobotState = {
    position: { x: 400, y: 325 },
    orientation: 0,
    velocity: 0,
    angularVelocity: 0,
    leftWheel: { velocity: 0, rotation: 0 },
    rightWheel: { velocity: 0, rotation: 0 }
  };

  // Handle keyboard input for wheel control
  useEffect(() => {
    if (!isRunning) return;

    const wheelSpeed = 10; // rad/s for keyboard control

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      if (key === 'arrowup' || key === 'w') {
        // Forward: both wheels same speed
        sendWheelCommand(wheelSpeed, wheelSpeed);
      } else if (key === 'arrowdown' || key === 's') {
        // Backward: both wheels negative
        sendWheelCommand(-wheelSpeed, -wheelSpeed);
      } else if (key === 'arrowleft' || key === 'a') {
        // Turn left: right wheel faster
        sendWheelCommand(-wheelSpeed * 0.5, wheelSpeed * 0.5);
      } else if (key === 'arrowright' || key === 'd') {
        // Turn right: left wheel faster
        sendWheelCommand(wheelSpeed * 0.5, -wheelSpeed * 0.5);
      } else if (key === ' ') {
        event.preventDefault();
        sendWheelCommand(0, 0);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        sendWheelCommand(0, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRunning, sendWheelCommand]);

  // Update robot size when wheelbase changes
  useEffect(() => {
    setConstants(prev => ({
      ...prev,
      size: prev.wheelbase
    }));
  }, [constants.wheelbase]);

  // Send constants to backend when they change
  useEffect(() => {
    if (isConnected) {
      sendConstants(constants);
    }
  }, [constants, isConnected, sendConstants]);

  const handleConstantsChange = useCallback((newConstants: RobotConstants) => {
    setConstants(newConstants);
  }, []);

  const handleMovementCommand = useCallback((command: MovementCommand) => {
    const wheelSpeed = 10; // rad/s
    
    switch (command.type) {
      case 'forward':
        sendWheelCommand(wheelSpeed, wheelSpeed);
        break;
      case 'backward':
        sendWheelCommand(-wheelSpeed, -wheelSpeed);
        break;
      case 'turnLeft':
        sendWheelCommand(-wheelSpeed * 0.5, wheelSpeed * 0.5);
        break;
      case 'turnRight':
        sendWheelCommand(wheelSpeed * 0.5, -wheelSpeed * 0.5);
        break;
      case 'stop':
        sendWheelCommand(0, 0);
        break;
      case 'wheelControl':
        if (command.leftWheelVelocity !== undefined && command.rightWheelVelocity !== undefined) {
          sendWheelCommand(command.leftWheelVelocity, command.rightWheelVelocity);
        }
        break;
    }
  }, [sendWheelCommand]);

  const handleToggleSimulation = useCallback(() => {
    if (isRunning) {
      stopSimulation();
    } else {
      startSimulation();
    }
  }, [isRunning, startSimulation, stopSimulation]);

  const handleReset = useCallback(() => {
    resetSimulation();
  }, [resetSimulation]);

  // Use backend state or default
  const robot = groundTruth || defaultRobotState;
  const estimatedRobot = odometry || defaultRobotState;

  const turningRadius = calculateTurningRadius(
    constants.wheelbase,
    robot.velocity
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Differential Drive Robot Simulation Engine
          </h1>
          <p className="text-gray-600">
            {isConnected ? (
              <span className="text-green-600">● Connected to backend</span>
            ) : (
              <span className="text-red-600">● Disconnected - Start the Go backend on port 3001</span>
            )}
            {error && <span className="ml-2 text-red-500">({error})</span>}
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Canvas - takes up 2/3 of the space */}
          <div className="xl:col-span-2">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <div
                className="relative mx-auto"
                style={{ width: grid.width, height: grid.height }}
              >
                <RobotCanvas
                  robot={robot}
                  estimatedRobot={estimatedRobot}
                  grid={grid}
                  robotSize={constants.size}
                  className="border border-gray-300 rounded block"
                  showLegend={true}
                />
              </div>
            </div>
          </div>

          {/* Control panel and status - always visible */}
          <div className="xl:col-span-1 space-y-4">
            <ControlPanel
              constants={constants}
              onConstantsChange={handleConstantsChange}
              onMovementCommand={handleMovementCommand}
              isRunning={isRunning}
              onToggleSimulation={handleToggleSimulation}
              turningRadius={turningRadius}
            />

            <StatusDisplay
              actualRobot={robot}
              estimatedRobot={estimatedRobot}
            />

            {/* Reset button */}
            <button
              onClick={handleReset}
              className="w-full py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Reset Simulation
            </button>
          </div>
        </div>

        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>
            Use arrow keys or WASD to control the robot. Press Space to stop.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;