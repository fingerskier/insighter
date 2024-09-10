import {useEffect, useState} from 'react'
import useCadence from '../hook/useCadence'
import K from '../constants'


function beep() {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  
  oscillator.type = 'sine'; // Beep tone type
  oscillator.frequency.setValueAtTime(440, context.currentTime); // Beep frequency (A4)
  oscillator.start();
  
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1)
  oscillator.stop(context.currentTime + 0.1)
}


function startBeeping(ticksPerMinute) {
  const interval = (60 / ticksPerMinute) * 1000
  
  return setInterval(beep, interval)
}


export default function Cadence() {
  const {
    cadence,
    setRate,
    target,
    setTarget,
  } = useCadence()
  
  const [active, setActive] = useState(false)
  
  let T
  
  
  const handleHeartRate = e => {
    const newVal = +e.detail
    if (newVal) setRate(newVal)
  }
  
  
  useEffect(() => {
    window.addEventListener(K.Event.HeartRate, handleHeartRate)
    
    return () => {
      window.removeEventListener(K.Event.HeartRate, handleHeartRate)
    }
  }, [])
  
  
  useEffect(() => {
    clearInterval(T)
    
    if (active) T = startBeeping(cadence)
    
    return () => {
      clearInterval(T)
    }
  }, [active, cadence])
  
  
  return <div>
    <button onClick={E=>setActive(!active)}>
      {active ? 'Stop' : 'Start'}
    </button>
    <br />
    Target Heart-Rate
    <br />
    <input
      max={180}
      min={50}
      type="range"
      value={target}
      onChange={e => setTarget(e.target.value)} 
    />
    <br />
    {target}
    <br />
    <h1>{Math.round(cadence)}</h1>
  </div>
}