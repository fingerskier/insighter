import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import useAccelerometer from '../hook/useAccelerometer';
import useGravitySensor from '../hook/useGravitySensor';
import useRelativeOrientationSensor from '../hook/useRelativeOrientationSensor';
import { onSensorData } from '../lib/wiggle';
import { roundTo } from '../lib/helpers';

export default function Wiggle() {
  const accel = useAccelerometer({x:0, y:0, z:0});
  const gravity = useGravitySensor({x:0, y:0, z:0});
  const relative = useRelativeOrientationSensor({x:0, y:0, z:0, w:0});
  
  const [distance, setDistance] = useState(-7);
  const [azimuth, setAzimuth] = useState(0);
  const [elevation, setElevation] = useState(0);
  const [steps, setSteps] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [movementHistory, setMovementHistory] = useState([]);
  
  useEffect(() => {
    if (accel && gravity && relative) {
      const jog = onSensorData(accel, gravity, relative, Date.now());
      
      setDistance(jog.distance);
      setAzimuth(jog.theta);
      setElevation(jog.phi);
      
      // Update total distance
      if (jog.distance > 0.2) { // Threshold to filter out small movements
        setTotalDistance(prev => prev + jog.distance);
        
        // Step detection based on vertical acceleration
        if (Math.abs(accel.y) > 12) { // Threshold for step detection
          setSteps(prev => prev + 1);
        }
        
        // Update movement history
        setMovementHistory(prev => {
          const newHistory = [...prev, {
            time: new Date().toLocaleTimeString(),
            distance: roundTo(totalDistance),
            steps: steps,
            speed: roundTo(jog.distance)
          }];
          return newHistory.slice(-20); // Keep last 20 data points
        });
      }
    }
  }, [accel, gravity, relative]);
  

  return (
    <div>
      <div>
        <div>
          {/* Steps Card */}
          <h3 >Total Steps</h3>
          <div>{steps}</div>
        </div>

        <div>
          {/* Distance Card */}
          <h3 >Distance (m)</h3>
          <div>{roundTo(totalDistance)}</div>
        </div>

        <div>
          {/* Direction Card */}
          <h3 >Direction</h3>
          <div>
            <p>Azimuth: {roundTo(azimuth)}° {azimuth > 0 ? 'right' : 'left'}</p>
            <p>Elevation: {roundTo(elevation)}° {elevation > 0 ? 'up' : 'down'}</p>
          </div>
        </div>
      </div>
      
      <div className="chart container">
        <h3 >Movement History</h3>
        <ResponsiveContainer width="100%" aspect={1.5}>
          <LineChart data={movementHistory}>
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="distance" 
              stroke="#2563eb" 
              name="Distance"
            />
            <Line 
              type="monotone" 
              dataKey="speed" 
              stroke="#16a34a" 
              name="Speed"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <button 
        onClick={() => {
          setSteps(0);
          setTotalDistance(0);
          setMovementHistory([]);
        }}
        
      >
        Reset Tracking
      </button>
    </div>
  );
}