import { useEffect } from 'react'
import K from '../constants'
import useLocalStorage from '../hook/useLocalStorage'
import useMetronome from '../hook/useMetronome'


export default function ManualCadence() {
  const {
    start, stop,
    isPlaying,
    bpm, setBPM,
    volume, setVolume,
    frequency, setFrequency,
    setRhythm,
  } = useMetronome(100); // Start at 100 BPM
  
  const [savedBPM, setSavedBPM] = useLocalStorage('manual-cadence-bpm', 100)
  
  
  useEffect(() => {
    // Keep local storage in sync with current BPM
    setSavedBPM(bpm)
  }, [bpm])
  
  
  useEffect(() => {
    const handleHeartRate = e => {
      setFrequency(4 * e.detail)
    }
    
    window.addEventListener(K.Event.HeartRate, handleHeartRate)
    return () => window.removeEventListener(K.Event.HeartRate, handleHeartRate)
  }, [])
  
  
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
  
  
  function BPMButton({ value }) {
    return (
      <button onClick={() => setBPM(bpm + Number(value))}>
        {value}
      </button>
    )
  }
  
  
  return (
    <div>
      <div>
        {Math.round(bpm)} BPM
        <button onClick={() => isPlaying ? stop() : start()}>
          {isPlaying ? 'Stop' : 'Start'}
        </button>
      </div>
      
      <input
        max={300}
        min={30}
        onChange={e => setBPM(Number(e.target.value))}
        type="range"
        value={bpm}
      />
      
      <div>
        <BPMButton value={-5} />
        <BPMButton value={-1} />
        <BPMButton value={+1} />
        <BPMButton value={+5} />
      </div>
      
      <div>
        Volume:
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={volume}
          onChange={e => setVolume(Number(e.target.value))}
        />
      </div>
    </div>
  )
}