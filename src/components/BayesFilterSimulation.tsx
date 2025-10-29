import React from 'react';
import { BayesFilterState, SensorReading, BeliefState } from '../types';
import { formatProbability } from '../bayesFilterUtils';

interface BayesFilterSimulationProps {
  filterState: BayesFilterState;
  onNextTimeStep: () => void;
}

const BeliefBarGraph: React.FC<{ belief: BeliefState }> = ({ belief }) => {
  const openPercentage = belief.doorOpen * 100;
  const closedPercentage = belief.doorClosed * 100;

  // Use more decimal places for high confidence beliefs
  const formatPercentage = (percentage: number) => {
    if (percentage > 99) {
      return percentage.toFixed(5) + '%';
    }
    return percentage.toFixed(1) + '%';
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-gray-700 mb-2">Current Belief</div>
      <div className="space-y-2">
        {/* Door Open Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>P(door = open)</span>
            <span className="font-medium">{formatPercentage(openPercentage)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-green-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${openPercentage}%` }}
            ></div>
          </div>
        </div>
        
        {/* Door Closed Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>P(door = closed)</span>
            <span className="font-medium">{formatPercentage(closedPercentage)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-red-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${closedPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BayesFilterSimulation: React.FC<BayesFilterSimulationProps> = ({
  filterState,
  onNextTimeStep
}) => {
  const { currentTimeStep, currentBelief, sensorReadings, actualDoorState, isRunning } = filterState;
  const currentReading = sensorReadings[sensorReadings.length - 1];

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">Bayes Filter Simulation</h3>
        <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
          Time Step: t = {currentTimeStep}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Current State */}
        <div className="space-y-4">
          {/* Robot and Door Visualization - Compact */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <span className="text-sm text-gray-600">Robot</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg ${actualDoorState.isOpen ? 'text-green-600' : 'text-gray-600'}`}>
                🚪
              </span>
              <span className="text-sm font-medium">
                {actualDoorState.isOpen ? 'OPEN' : 'CLOSED'}
              </span>
              <span className="text-xs text-gray-500">(actual)</span>
            </div>
          </div>

          {/* Current Sensor Reading */}
          {currentReading && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="text-sm font-semibold text-gray-800 mb-1">Latest Sensor Reading</div>
              <div className="text-sm">
                Sensor detects: <span className={`font-bold ${currentReading.value ? 'text-green-600' : 'text-red-600'}`}>
                  {currentReading.value ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
            </div>
          )}

          {/* Belief Bar Graph */}
          <BeliefBarGraph belief={currentBelief} />

          {/* Next Step Button */}
          {isRunning && (
            <button
              onClick={onNextTimeStep}
              className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium"
            >
              Next Time Step →
            </button>
          )}
        </div>

        {/* Right Column - History */}
        <div className="space-y-4">
          {/* Sensor Reading History */}
          {sensorReadings.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-gray-700">Sensor History</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {sensorReadings.map((reading, index) => (
                  <div
                    key={index}
                    className={`flex justify-between px-2 py-1 rounded text-xs ${
                      reading.value
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <span>t={index}</span>
                    <span className="font-medium">{reading.value ? 'OPEN' : 'CLOSED'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BayesFilterSimulation;