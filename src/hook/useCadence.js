import {useEffect, useState} from 'react'
import PIDController from '../lib/PID'

const interval = 1234


export default function useCadence() {
  const [rate, setRate] = useState(100)
  const [target, setTarget] = useState(100)
  const [cadence, setCadence] = useState(100)
  
  let pid, T
  
  
  useEffect(() => {
    clearInterval(T)
    pid = new PIDController(0.5, 0.1, 0.05, target)
    
    T = setInterval(() => {
      if (rate) {
        const adjustment = pid.update(rate, interval/1000)
        setCadence(cadence+adjustment)
      }
    }, interval)
    
    return () => clearInterval(T)
  }, [target])
  
  
  return {
    cadence,
    rate,
    setRate,
    target,
    setTarget,
  }
}