import { useEffect, useState } from 'react'
import K from '../constants'
import useLocalStorage from '../hook/useLocalStorage'
import useTimer from '../hook/useTimer'
import {clamp} from '../lib/helpers'
import useBeep from '../hook/useBeep'

const defaultCadence = 1000

const msToBPM = (ms)=>Math.round(60000 / ms)



export default function Cadence({
  maximum = 180,
  minimum = 50,
  value,
}) {
  const {
    beep,
    volume,
    setVolume,
    frequency,
    setFrequency,
  } = useBeep()
  
  const [target, setTarget] = useLocalStorage(K.Key.HeartTarget, value)
  const [cadence, setCadence] = useLocalStorage(K.Key.HeartCadence, defaultCadence)
  const [duration, setDuration] = useTimer((elapsed) => {
    beep()
  }, cadence)
  
  let prevTime
  
  
  useEffect(() => {
    if (!(target && value)) return
    
    const now = +Date.now()
    const dT = now - prevTime
    
    const diff = (target - value)
    const newCadence = clamp(cadence - diff, 50, 3000)
    
    setCadence(newCadence)
    
    prevTime = now
  }, [target, value])
  
  
  useEffect(() => {
    if (!cadence) return
    
    setDuration(cadence)
  }, [cadence])
  
  
  return (
    <div>
      Target:
      <input
        max={maximum}
        min={minimum}
        type="range"
        value={target}
        onChange={(e) => setTarget(parseFloat(e.target.value))}
      />
      {target}
      
      <div>
        <button onClick={E=>setCadence(cadence+100)}>{msToBPM(duration+100)}</button>
        <button onClick={E=>setCadence(defaultCadence)}>Reset {msToBPM(defaultCadence)}</button>
        <button onClick={E=>setCadence(cadence-100)}>{msToBPM(duration-100)}</button>
      </div>
      
      <div>
        Volume: <input
          type="range"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          min={0}
          max={10}
        /> {volume}
      </div>
        
      <div>
        Frequency: <input type="range" value={frequency} onChange={(e) => setFrequency(parseFloat(e.target.value))} />
      </div>
    </div>
  )
}