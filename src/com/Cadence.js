import { useEffect, useState } from 'react'
import K from '../constants'
import useLocalStorage from '../hook/useLocalStorage'
import useTimer from '../hook/useTimer'
import {clamp} from '../lib/helpers'


const audioContext = new (window.AudioContext || window.webkitAudioContext)()


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

const msToBPM = (ms)=>Math.round(60000 / ms)


export default function Cadence({
  maximum = 180,
  minimum = 50,
  value,
}) {
  const [target, setTarget] = useLocalStorage(K.Key.HeartTarget, value)
  const [cadence, setCadence] = useState(1000)
  const [duration, setDuration] = useTimer((elapsed) => {
    beep(audioContext)
  }, cadence)
  
  
  useEffect(() => {
    if (!(target && value)) return
    
    const diff = (target - value) / 5
    const newCadence = cadence - diff
    
    setCadence(newCadence)
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
      <br />
      Cadence: {msToBPM(duration)}
    </div>
  )
}