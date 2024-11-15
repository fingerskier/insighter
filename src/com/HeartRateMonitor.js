import React, { useEffect, useState } from 'react'
import AutoCadence from './AutoCadence'
import ManualCadence from './ManualCadence'
import K from '../constants'
import useLocalStorage from '../hook/useLocalStorage'
import useMageneHRM from '../hook/useMageneHRM'

import heartIcon from '../img/heart.png'

const dataLimit = 100


export default function HeartRateMonitor() {
  const [lowThreshold] = useLocalStorage(K.Key.HeartLow, 50)
  const [highThreshold] = useLocalStorage(K.Key.HeartHigh, 180)
  
  const { connect, disconnect, connected, heartRate, batteryLevel } = useMageneHRM()
  
  const [classes, setClasses] = useState('')
  const [data, setData] = useState([])
  const [textMod, setTextMod] = useState('')
  const [whichCadence, setWhichCadence] = useState(0)
  
  
  useEffect(() => {
    if (classes?.length) {
      requestAnimationFrame(()=>{
        setClasses('')
      })
    } else {
      requestAnimationFrame(()=>{
        setClasses('highlight')
      })
    }
    
    if (heartRate > highThreshold) {
      setTextMod('high')
      navigator.vibrate([66, 100, 66]) // vibrate quickly
    } else if (heartRate < lowThreshold) {
      setTextMod('low')
      navigator.vibrate([666, 100, 666]) // vibrate slowly
    } else {
      setTextMod('')
    }
    
    const newData = [...data, heartRate]
    
    if (newData.length > dataLimit) {
      newData.shift()
    }
    
    setData(newData)
  }, [heartRate])
  
  
  return <div className='heart container'>
    {connected?
      <>
        <div className={`heart rate ${classes}`}>
          <img src={heartIcon} alt="" height={64} />
          <span className={`text ${textMod}`}> {heartRate} </span>
        </div>
        
        <h3>Battery {batteryLevel}%</h3>
        
        <button onClick={disconnect}>Disconnect HRM</button>
        
        <div>
          <button
            className={whichCadence === 0? 'selected' : ''}
            onClick={E=>setWhichCadence(0)}
          >Off</button>
          
          <button
            className={whichCadence === 1? 'selected' : ''}
            onClick={E=>setWhichCadence(1)}
          >Manual</button>
          
          <button
            className={whichCadence === 2? 'selected' : ''}
            onClick={E=>setWhichCadence(2)}
          >Auto</button>
        </div>
      </>
    :
      <button onClick={connect}>Connect HRM</button>
    }
    
    {connected && (whichCadence === 2)? <>
      <AutoCadence value={heartRate} />
    </>
    : null }
    
    {connected && (whichCadence === 1)? <>
      <ManualCadence />
    </>
    : null }
  </div>
}