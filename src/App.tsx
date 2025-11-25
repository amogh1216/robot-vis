import React, { useState, useEffect, useCallback } from 'react';
import RobotCanvas from './components/RobotCanvas';
import ControlPanel from './components/ControlPanel';
import StatusDisplay from './components/StatusDisplay';

import { 
  RobotConstants, 
  MovementCommand, 
  SimulationState
} from './types';
import { 
  updateRobotPosition, 
  applyMovementCommand, 
  constrainToBounds, 
  calculateTurningRadius,
  updateOdometryEstimate
} from './robotUtils';

const ANIMATION_INTERVAL = 16; // ~60 FPS
const DELTA_TIME = ANIMATION_INTERVAL / 1000; // Convert to seconds

const App: React.FC = () => {
  // Initial simulation state
  const [simulation, setSimulation] = useState<SimulationState>({
    robot: {
      position: { x: 200, y: 200 },
      orientation: 0,
      velocity: 0,
      angularVelocity: 0,
      leftWheel: { velocity: 0, rotation: 0 },
      rightWheel: { velocity: 0, rotation: 0 }
    },
    estimatedRobot: {
      position: { x: 200, y: 200 },
      orientation: 0,
      velocity: 0,
      angularVelocity: 0,
      leftWheel: { velocity: 0, rotation: 0 },
      rightWheel: { velocity: 0, rotation: 0 }
    },
    constants: {
      maxSpeed: 50,
      maxAcceleration: 100,
      wheelbase: 30,
      wheelRadius: 5, // 5 pixels radius for wheels
      size: 30,
      slippageAmount: 0.1 // 10% slippage factor
    },
    grid: {
      width: 800,
      height: 650,
      cellSize: 40
    },
    isRunning: false
  });

  const [currentCommand, setCurrentCommand] = useState<MovementCommand | null>(null);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!simulation.isRunning) return;
      
      const key = event.key.toLowerCase();
      
      // Determine movement command based on pressed keys
      if (key === 'arrowup' || key === 'w') {
        setCurrentCommand({ type: 'forward' });
      } else if (key === 'arrowdown' || key === 's') {
        setCurrentCommand({ type: 'backward' });
      } else if (key === 'arrowleft' || key === 'a') {
        setCurrentCommand({ type: 'turnLeft' });
      } else if (key === 'arrowright' || key === 'd') {
        setCurrentCommand({ type: 'turnRight' });
      } else if (key === ' ') {
        event.preventDefault(); // Prevent page scroll
        setCurrentCommand({ type: 'stop' });
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      // Stop movement when key is released
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        setCurrentCommand({ type: 'stop' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [simulation.isRunning]);

  // Update robot size when wheelbase changes
  useEffect(() => {
    setSimulation(prev => ({
      ...prev,
      constants: {
        ...prev.constants,
        size: prev.constants.wheelbase
      }
    }));
  }, [simulation.constants.wheelbase]);

  // Animation loop
  useEffect(() => {
    if (!simulation.isRunning) return;

    const intervalId = setInterval(() => {
      setSimulation(prev => {
        let newRobotState = { ...prev.robot };

        // Apply current movement command if any
        if (currentCommand) {
          newRobotState = applyMovementCommand(
            newRobotState,
            prev.constants,
            currentCommand,
            DELTA_TIME
          );
        }

        // Update position based on current velocity
        newRobotState = updateRobotPosition(newRobotState, prev.constants, DELTA_TIME);

        // Constrain to grid boundaries
        newRobotState.position = constrainToBounds(
          newRobotState.position,
          prev.constants.size,
          prev.grid.width,
          prev.grid.height
        );

        // Update odometry estimate based on wheel encoder readings
        const newEstimatedState = updateOdometryEstimate(
          prev.estimatedRobot,
          newRobotState,
          prev.constants,
          DELTA_TIME
        );

        return {
          ...prev,
          robot: newRobotState,
          estimatedRobot: newEstimatedState
        };
      });
    }, ANIMATION_INTERVAL);

    return () => clearInterval(intervalId);
  }, [simulation.isRunning, currentCommand]);

  const handleConstantsChange = useCallback((constants: RobotConstants) => {
    setSimulation(prev => ({
      ...prev,
      constants
    }));
  }, []);

  const handleMovementCommand = useCallback((command: MovementCommand) => {
    setCurrentCommand(command);
  }, []);

  const handleToggleSimulation = useCallback(() => {
    setSimulation(prev => ({
      ...prev,
      isRunning: !prev.isRunning
    }));
    // Stop current command when stopping simulation
    if (simulation.isRunning) {
      setCurrentCommand(null);
    }
  }, [simulation.isRunning]);

  const turningRadius = calculateTurningRadius(
    simulation.constants.wheelbase,
    simulation.robot.velocity
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">`
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Differential Drive Robot Simulation Engine
          </h1>
          <p className="text-gray-600">
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Canvas - takes up 2/3 of the space */}
          <div className="xl:col-span-2">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <div
                className="relative mx-auto"
                style={{ width: simulation.grid.width, height: simulation.grid.height }}
              >
                <RobotCanvas
                  robot={simulation.robot}
                  estimatedRobot={simulation.estimatedRobot}
                  grid={simulation.grid}
                  robotSize={simulation.constants.size}
                  className="border border-gray-300 rounded block"
                  showLegend={true}
                />
              </div>
            </div>
          </div>

          {/* Control panel and status - always visible */}
          <div className="xl:col-span-1 space-y-4">
            <ControlPanel
              constants={simulation.constants}
              onConstantsChange={handleConstantsChange}
              onMovementCommand={handleMovementCommand}
              isRunning={simulation.isRunning}
              onToggleSimulation={handleToggleSimulation}
              turningRadius={turningRadius}
            />

            <StatusDisplay
              actualRobot={simulation.robot}
              estimatedRobot={simulation.estimatedRobot}
            />
          </div>
        </div>

        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;