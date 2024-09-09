import React, { useEffect, useState } from 'react'
import K from '../constants'
import useLocalStorage from '../hook/useLocalStorage'
import useMageneHRM from '../hook/useMageneHRM'

import heartIcon from '../img/heart.png'

const dataLimit = 100


export default function BLEComponent() {
  const [lowThreshold] = useLocalStorage(K.Key.HeartLow, 50)
  const [highThreshold] = useLocalStorage(K.Key.HeartHigh, 180)
  
  const { connect, disconnect, connected, heartRate, batteryLevel } = useMageneHRM()
  
  const [classes, setClasses] = useState('')
  const [data, setData] = useState([])
  const [textMod, setTextMod] = useState('')
  
  
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
      // vibrate quickly
      navigator.vibrate([66, 100, 66])
    } else if (heartRate < lowThreshold) {
      setTextMod('low')
      // vibrate slowly
      navigator.vibrate([666, 100, 666])
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
        
        <button onClick={disconnect}>Disconnect hRM</button>
      </>
    :
      <button onClick={connect}>Connect HRM</button>
    }
    
    <input
      min={lowThreshold}
      max={highThreshold}
      type="range"
      defaultValue={heartRate}
    />
    
    {connected && <h3>Battery {batteryLevel}%</h3>}
  </div>
}