import {useEffect, useState} from 'react'
import {clamp} from '../lib/helpers'
import PIDController from '../lib/PID'

const interval = 1000


export default function useCadence(
  minimum=50,
  maximum=200,
) {
  const [rate, setRate] = useState(100)
  const [target, setTarget] = useState(100)
  const [cadence, setCadence] = useState(100)
  
  let pid, T


  const reset = () => {
    setCadence(100)
  }
  
  
  useEffect(() => {
    if (!target) return
    
    clearInterval(T)
    pid = new PIDController(0.5, 0.1, 0.05, target)
    
    T = setInterval(() => {
      if (rate) {
        const adjustment = pid.update(rate, interval/1000)
        
        const newCadence = clamp(cadence + adjustment, minimum, maximum)
        
        setCadence(val=>newCadence)
      }
    }, interval)
    
    return () => clearInterval(T)
  }, [rate, target])
  
  
  return {
    cadence,
    rate,
    reset,
    setRate,
    target,
    setTarget,
  }
}