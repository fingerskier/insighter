import { useEffect, useState } from 'react'
import K from '../constants'
import useLocalStorage from '../hook/useLocalStorage'
import useTimer from '../hook/useTimer'
import {clamp} from '../lib/helpers'
import useBeep from '../hook/useBeep'


const BPMtoMs = bpm=>Math.round(60000 / bpm)


export default function ManualCadence() {
  const {
    beep,
    volume,
    setVolume,
    frequency,
    setFrequency,
  } = useBeep()
  
  const [BPM, setBPM] = useLocalStorage('manual-cadence-bpm', 100)
  
  const [heartRate, setHeartRate] = useState(0)
  
  const [ , setDuration] = useTimer(dT=>{
    beep()
    navigator.vibrate([66, 100])
  })
  
  
  const handleHeartRate = e => {
    setHeartRate(+e.detail)
  }
  
  
  useEffect(() => {
    window.addEventListener(K.Event.HeartRate, handleHeartRate)
    
    return () => window.removeEventListener(K.Event.HeartRate, handleHeartRate)
  }, [])
  
  
  useEffect(() => {
    setDuration(BPMtoMs(+BPM))
  }, [BPM])
  
  
  useEffect(() => {
    setFrequency(1.5*heartRate)
  }, [heartRate])
  
  
  function BPMButton({value}) {
    return <button onClick={E=>setBPM(BPM + +value)}>
      {value}
    </button>
  }
  
  
  return <div>
    {BPM} BPM
    
    <br />
    
    <input
      max={300}
      min={30}
      onChange={E=>setBPM(+E.target.value)}
      type="range"
      value={BPM}
    />
    
    <br />
    
    <BPMButton value={-5} />
    <BPMButton value={-1} />
    <BPMButton value={+1} />
    <BPMButton value={+5} />
    
    <br />
    
    Volume:
    <br />
    <input type="range"
      min={0}
      max={10}
      step={0.1}
      value={volume}
      onChange={e=>setVolume(+e.target.value)}
    />
  </div>
}