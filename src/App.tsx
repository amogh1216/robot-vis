import React, { useState, useEffect, useCallback } from 'react';
import RobotCanvas from './components/RobotCanvas';
import ControlPanel from './components/ControlPanel';
import StatusDisplay from './components/StatusDisplay';
import BayesFilterSetup from './components/BayesFilterSetup';
import BayesFilterSimulation from './components/BayesFilterSimulation';
import { 
  RobotConstants, 
  MovementCommand, 
  SimulationState,
  BayesFilterState,
  SensorProbabilities,
  BeliefState
} from './types';
import { 
  updateRobotPosition, 
  applyMovementCommand, 
  constrainToBounds, 
  calculateTurningRadius 
} from './robotUtils';
import {
  generateSensorReading,
  updateBelief,
  initializeBelief
} from './bayesFilterUtils';

const ANIMATION_INTERVAL = 16; // ~60 FPS
const DELTA_TIME = ANIMATION_INTERVAL / 1000; // Convert to seconds

const App: React.FC = () => {
  // Initial simulation state
  const [simulation, setSimulation] = useState<SimulationState>({
    robot: {
      position: { x: 200, y: 200 },
      orientation: 0,
      velocity: 0,
      angularVelocity: 0
    },
    estimatedRobot: {
      position: { x: 200, y: 200 },
      orientation: 0,
      velocity: 0,
      angularVelocity: 0
    },
    constants: {
      maxSpeed: 50,
      maxAcceleration: 100,
      wheelbase: 30,
      size: 30
    },
    grid: {
      width: 800,
      height: 600,
      cellSize: 40
    },
    isRunning: false
  });

  const [currentCommand, setCurrentCommand] = useState<MovementCommand | null>(null);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  // Bayes Filter State
  const [bayesFilter, setBayesFilter] = useState<BayesFilterState>({
    actualDoorState: { isOpen: true },
    sensorProbabilities: { truePositive: 0.8, trueNegative: 0.8 },
    currentBelief: initializeBelief(0.5),
    sensorReadings: [],
    currentTimeStep: 0,
    isRunning: false
  });
  
  // Separate initial belief that doesn't change during simulation
  const [initialBeliefValue, setInitialBeliefValue] = useState<BeliefState>(initializeBelief(0.5));

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!simulation.isRunning) return;
      
      const key = event.key.toLowerCase();
      setPressedKeys(prev => new Set(prev).add(key));
      
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
      setPressedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
      
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

        // For now, estimated robot is the same as actual (we'll add noise/estimation later)
        const newEstimatedState = { ...newRobotState };

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

  // Bayes Filter Handlers
  const handleActualDoorChange = useCallback((isOpen: boolean) => {
    setBayesFilter(prev => ({
      ...prev,
      actualDoorState: { isOpen }
    }));
  }, []);

  const handleSensorProbabilitiesChange = useCallback((probs: SensorProbabilities) => {
    setBayesFilter(prev => ({
      ...prev,
      sensorProbabilities: probs
    }));
  }, []);

  const handleInitialBeliefChange = useCallback((belief: BeliefState) => {
    setInitialBeliefValue(belief);
    // Also update current belief if simulation hasn't started
    if (!bayesFilter.isRunning) {
      setBayesFilter(prev => ({
        ...prev,
        currentBelief: belief
      }));
    }
  }, [bayesFilter.isRunning]);

  const handleStartBayesFilter = useCallback(() => {
    setBayesFilter(prev => ({
      ...prev,
      isRunning: true,
      currentTimeStep: 0,
      sensorReadings: [],
      currentBelief: initialBeliefValue // Start with the initial belief
    }));
  }, [initialBeliefValue]);

  const handleNextTimeStep = useCallback(() => {
    setBayesFilter(prev => {
      // Generate new sensor reading
      const newReading = generateSensorReading(
        prev.actualDoorState.isOpen,
        prev.sensorProbabilities
      );

      // Update belief using Bayes' theorem
      const newBelief = updateBelief(
        prev.currentBelief,
        newReading,
        prev.sensorProbabilities
      );

      // Add sensor reading to history
      const newSensorReading = {
        value: newReading,
        timestamp: prev.currentTimeStep
      };

      return {
        ...prev,
        currentBelief: newBelief,
        sensorReadings: [...prev.sensorReadings, newSensorReading],
        currentTimeStep: prev.currentTimeStep + 1
      };
    });
  }, []);

  const handleResetBayesFilter = useCallback(() => {
    setBayesFilter(prev => ({
      ...prev,
      isRunning: false,
      currentTimeStep: 0,
      sensorReadings: [],
      currentBelief: initialBeliefValue // Reset to initial belief
    }));
  }, [initialBeliefValue]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">`
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Robot Visualization & Simulation
          </h1>
          <p className="text-gray-600">
            Educational tool for understanding differential drive robot kinematics and control
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Canvas - takes up 2/3 of the space */}
          <div className="xl:col-span-2">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Robot Simulation</h2>
              <div className="flex justify-center">
                <RobotCanvas
                  robot={simulation.robot}
                  estimatedRobot={simulation.estimatedRobot}
                  grid={simulation.grid}
                  robotSize={simulation.constants.size}
                  className="border border-gray-300 rounded"
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

        {/* Bayes Filter Section */}
        <div className="py-3">
          <header className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Part 2: Recursive State Estimation - Bayes Filter
            </h2>
            <p className="text-gray-600">
              Demonstrate belief updates using Bayes' theorem with a door sensor example
            </p>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Setup Panel - Narrower */}
            <div className="xl:col-span-1">
              <BayesFilterSetup
                actualDoorOpen={bayesFilter.actualDoorState.isOpen}
                onActualDoorChange={handleActualDoorChange}
                sensorProbabilities={bayesFilter.sensorProbabilities}
                onSensorProbabilitiesChange={handleSensorProbabilitiesChange}
                initialBelief={initialBeliefValue}
                onInitialBeliefChange={handleInitialBeliefChange}
                onStartSimulation={handleStartBayesFilter}
                isSimulationRunning={bayesFilter.isRunning}
                onReset={handleResetBayesFilter}
              />
            </div>

            {/* Simulation Display - Wider */}
            <div className="xl:col-span-3">
              {bayesFilter.isRunning && (
                <BayesFilterSimulation
                  filterState={bayesFilter}
                  onNextTimeStep={handleNextTimeStep}
                />
              )}
            </div>
          </div>
        </div>

        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>
            Robot simulation: Use keyboard controls to move the differential drive robot.
          </p>
          <p>
            Bayes filter: Configure parameters and step through to see belief updates in real-time.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;