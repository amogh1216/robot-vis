import React from 'react';
import { SensorProbabilities, BeliefState } from '../types';

interface BayesFilterSetupProps {
  actualDoorOpen: boolean;
  onActualDoorChange: (isOpen: boolean) => void;
  sensorProbabilities: SensorProbabilities;
  onSensorProbabilitiesChange: (probs: SensorProbabilities) => void;
  initialBelief: BeliefState;
  onInitialBeliefChange: (belief: BeliefState) => void;
  onStartSimulation: () => void;
  isSimulationRunning: boolean;
  onReset?: () => void;
}

const BayesFilterSetup: React.FC<BayesFilterSetupProps> = ({
  actualDoorOpen,
  onActualDoorChange,
  sensorProbabilities,
  onSensorProbabilitiesChange,
  initialBelief,
  onInitialBeliefChange,
  onStartSimulation,
  isSimulationRunning,
  onReset
}) => {
  const handleSensorProbChange = (field: keyof SensorProbabilities, value: number) => {
    onSensorProbabilitiesChange({
      ...sensorProbabilities,
      [field]: value / 100 // Convert percentage to probability
    });
  };

  const handleInitialBeliefChange = (doorOpenProb: number) => {
    const prob = doorOpenProb / 100; // Convert percentage to probability
    onInitialBeliefChange({
      doorOpen: prob,
      doorClosed: 1 - prob
    });
  };

  const inputStyle = "w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm";
  const labelStyle = "text-sm font-medium text-gray-700";

  return (
    <div className="bg-white p-4 rounded-lg shadow-md max-w-md">
      <h3 className="text-lg font-bold mb-4 text-gray-800">Bayes Filter Setup</h3>
      
      {/* Actual Door State */}
      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={actualDoorOpen}
            onChange={(e) => onActualDoorChange(e.target.checked)}
            disabled={isSimulationRunning}
            className="w-4 h-4"
          />
          <span className={labelStyle}>Door starts open</span>
        </label>
        <div className="text-xs text-gray-500 mt-1">
          {actualDoorOpen ? 'Door is actually open' : 'Door is actually closed'}
        </div>
      </div>

      {/* Sensor Probabilities */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-2 text-gray-700">Sensor Probabilities</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">P(sensor=true | door=open):</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={(sensorProbabilities.truePositive * 100).toFixed(0)}
                onChange={(e) => handleSensorProbChange('truePositive', parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="5"
                className={inputStyle}
                disabled={isSimulationRunning}
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">P(sensor=false | door=closed):</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={(sensorProbabilities.trueNegative * 100).toFixed(0)}
                onChange={(e) => handleSensorProbChange('trueNegative', parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="5"
                className={inputStyle}
                disabled={isSimulationRunning}
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Initial Belief */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Initial P(door=open):</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={(initialBelief.doorOpen * 100).toFixed(0)}
              onChange={(e) => handleInitialBeliefChange(parseFloat(e.target.value) || 0)}
              min="0"
              max="100"
              step="5"
              className={inputStyle}
              disabled={isSimulationRunning}
            />
            <span className="text-xs text-gray-500">%</span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onStartSimulation}
          disabled={isSimulationRunning}
          className={`flex-1 px-4 py-2 rounded font-medium text-sm ${
            isSimulationRunning
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isSimulationRunning ? 'Running...' : 'Start Simulation'}
        </button>
        
        {isSimulationRunning && onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium text-sm"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
};

export default BayesFilterSetup;