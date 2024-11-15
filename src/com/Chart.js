import {useEffect, useState} from 'react'
import K from '../constants'
import MultiChart from './MultiRechart'


export default function Chart() {
  const [heart, setHeart] = useState([])
  const [hearts, setHearts] = useState([])
  const [speed, setSpeed] = useState([])
  const [speeds, setSpeeds] = useState([])


  const downloadData = () => {
    // trigger download of JSON heart-data
    const data = JSON.stringify({hearts, speeds}, null, 2)
    const blob = new Blob([data], {type: 'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'heart-data.json'
    a.click()
  }
  
  
  const handleHeartRate = e => {
    const newVal = +e.detail
    if (newVal) setHeart(newVal)
  }
  
  const handleGeoLocation = e => {
    const newVal = +e.detail
    if (newVal) setSpeed(newVal)
  }
  
  
  useEffect(() => {
    window.addEventListener(K.Event.HeartRate, handleHeartRate)
    window.addEventListener(K.Event.GeoLocation, handleGeoLocation)
    
    
    return () => {
      window.removeEventListener(K.Event.HeartRate, handleHeartRate)
      window.removeEventListener(K.Event.GeoLocation, handleGeoLocation)
    }
  }, [])
  
  
  useEffect(() => {
    if (!heart) return
    
    const newHeartData = [
      ...hearts,
      {
        x: new Date(),
        y: heart,
      }
    ]
    
    setHearts(newHeartData)
  }, [heart])
  
  
  useEffect(() => {
    if (!speed) return
    
    const newSpeedData = [
      ...speeds,
      {
        x: new Date(),
        y: speed,
      }
    ]
    
    setSpeeds(newSpeedData)
  }, [speed])
  
  
  return <div className='chart container'>
    {/* <pre>
      {JSON.stringify(heart, null, 2)}
      {JSON.stringify(speed, null, 2)}
    </pre> */}
    <MultiChart
      heartData={hearts}
      speedData={speeds}
    />
    
    <button onClick={downloadData}>Download Data</button>
  </div>
}
