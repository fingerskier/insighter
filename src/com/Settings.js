import React from 'react'
import useLocalStorage from '../hook/useLocalStorage'
import K from '../constants'

export default function Settings() {
  const [lowThreshold, setLowThreshold] = useLocalStorage(K.Key.HeartLow, 50)
  const [highThreshold, setHighThreshold] = useLocalStorage(K.Key.HeartHigh, 180)
  
  
  return <div className='settings container'>
    <label htmlFor="">
      Low Heart-Rate
      
      <input
        type="range"
        min="10"
        max="220"
        value={lowThreshold}
        onChange={e => setLowThreshold(e.target.value)}
      />
      
      {lowThreshold}
    </label>

    <br />

    <label htmlFor="">
      High Heart-Rate
      
      <input
        type="range"
        min="10"
        max="220"
        value={highThreshold}
        onChange={e => setHighThreshold(e.target.value)}
      />
    </label>
    
    {highThreshold}
  </div>
}
