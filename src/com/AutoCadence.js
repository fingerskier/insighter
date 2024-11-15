import { useEffect, useRef } from 'react';
import K from '../constants';
import useLocalStorage from '../hook/useLocalStorage';
import useMetronome from '../hook/useMetronome';
import { clamp } from '../lib/helpers';

const defaultBPM = 60;

export default function AutoCadence({
  maximum = 300,
  minimum = 30,
  value,
}) {
  const {
    start, stop,
    // testBeep,
    isPlaying,
    bpm, setBPM,
    volume, setVolume,
    frequency, setFrequency,
    setRhythm,
  } = useMetronome(defaultBPM);
  
  const [target, setTarget] = useLocalStorage(K.Key.HeartTarget, value);
  const prevTimeRef = useRef(Date.now());
  
  
  useEffect(() => {
    if (!(target && value)) return;
    
    const now = Date.now();
    const timeDiff = now - prevTimeRef.current;
    
    if (timeDiff > 1000) {
      const diff = (target - value);
      const newBPM = clamp(bpm + (diff * 0.1), minimum, maximum);
      setBPM(newBPM);
      prevTimeRef.current = now;
    }
  }, [target, value, bpm, minimum, maximum]);
  
  
  useEffect(() => {
    setFrequency(4 * value || 440); // Using 4x multiplier as requested
  }, [value])
  
  
  useEffect(() => {
    setRhythm({
      emphasis: 4,
      emphasized: {
        frequency: frequency * 1.5,
        gain: 2
      },
      normal: {
        frequency: frequency,
        gain: 1.0
      }
    })
  }, [])
  
  
  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={() => isPlaying ? stop() : start()}
        >
          {isPlaying ? 'Stop' : 'Start'} 
          ({Math.round(bpm)} BPM)
        </button>
{/*         
        <button onClick={testBeep}>
          Test Sound
        </button> */}
      </div>
      
      <div style={{ marginBottom: '1rem' }}>
        <div>Target Heart Rate: {target}</div>
        <input
          max={maximum}
          min={minimum}
          type="range"
          value={target}
          onChange={(e) => setTarget(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      
      <div style={{ marginBottom: '1rem' }}>
        <div>Volume: {volume.toFixed(1)} / 10</div>
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}