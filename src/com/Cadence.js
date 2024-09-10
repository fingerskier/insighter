import {useEffect, useState, useRef} from 'react'
import useCadence from '../hook/useCadence'
import K from '../constants'


function beep(context) {
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(context.destination)
  
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(440, context.currentTime)
  oscillator.start()
  
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1)
  oscillator.stop(context.currentTime + 0.1)
}


function startBeeping(cadenceRef, activeRef) {
  const context = new (window.AudioContext || window.webkitAudioContext)()
  
  function scheduleNextBeep() {
    if (!activeRef.current) return // Stop beeping if not active

    beep(context)

    // Get cadence dynamically from the ref
    const interval = 60 / cadenceRef.current * 1000
    
    setTimeout(scheduleNextBeep, interval)
  }

  scheduleNextBeep()
}


export default function Cadence() {
  const {
    active,
    setActive,
    cadence,
    reset,
    setRate,
    target,
    setTarget,
  } = useCadence()
  
  const [heart, setHeart] = useState()
  
  const cadenceRef = useRef(cadence)
  const activeRef = useRef(active)
  
  let T
  
  
  const handleHeartRate = e => {
    const newVal = +e.detail
    if (newVal) {
      setHeart(newVal)
    }
  }
  
  
  useEffect(() => {
    window.addEventListener(K.Event.HeartRate, handleHeartRate)
    
    return () => window.removeEventListener(K.Event.HeartRate, handleHeartRate)
  }, [])
  
  
  useEffect(() => {
    setRate(heart)
  }, [heart])
  
  
  useEffect(() => {
    cadenceRef.current = cadence
  }, [cadence])
  
  
  useEffect(() => {
    activeRef.current = active
    
    if (active) {
      startBeeping(cadenceRef, activeRef)
    } else {
      reset()
    }
    
    return () => clearInterval(T)
  }, [active])
  
  
  return <div className='cadence'>
    <button onClick={() => setActive(!active)}>
      {active ? 'Stop' : 'Start'}
    </button>
    <br />
    Target Heart-Rate
    <br />
    {target}
    <br />
    <input
      max={180}
      min={50}
      type="range"
      value={target}
      onChange={e => setTarget(+e.target.value)} 
    />
    <br />
    <h1>{Math.round(cadence)}</h1>
  </div>
}