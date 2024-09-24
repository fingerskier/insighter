import React from 'react'
import useLocalStorage from '../hook/useLocalStorage'
import K from '../constants'

export default function Settings() {
  const [lowThreshold, setLowThreshold] = useLocalStorage(K.Key.HeartLow, 50)
  const [highThreshold, setHighThreshold] = useLocalStorage(K.Key.HeartHigh, 180)
  
  
  return <div className='settings container'>
{/* 
    <label htmlFor="lowThresholdSetting">
      Low Heart-Rate
    </label>
    
    <input
      id="lowThresholdSetting"
      type="range"
      min="70"
      max="150"
      value={lowThreshold}
      onChange={e => setLowThreshold(e.target.value)}
    />
    
    {lowThreshold}
    
    <br />
    
    <label htmlFor="highThresholdSetting">
      High Heart-Rate
    </label>
    
    <input
      id="highThresholdSetting"
      type="range"
      min="100"
      max="180"
      value={highThreshold}
      onChange={e => setHighThreshold(e.target.value)}
    />
    
    {highThreshold} 
*/}
  </div>
}
