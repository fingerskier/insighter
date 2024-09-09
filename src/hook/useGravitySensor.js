import {useEffect, useState} from 'react'


export default function useGravitySensor() {
  const [data, setData] = useState({})
  
  
  useEffect(() => {
    try {
      let sensor = new window.GravitySensor()
      
      sensor.addEventListener('reading', () => {
        setData({
          x: sensor.x,
          y: sensor.y,
          z: sensor.z,
        })
      })
      
      sensor.addEventListener('error', (event) => {
        if (event.error.name === 'NotReadableError') {
          setData({...data, error: 'Sensor is not available.'})
        }
      })
      
      sensor.start()
    } catch (error) {
      if (error.name === "SecurityError") {
        setData({...data, error: "Sensor construction was blocked by a permissions policy."})
      } else if (error.name === "ReferenceError") {
        setData({...data, error: "Sensor is not supported by the User Agent."})
      } else {
        throw error;
      }
    }
  }, [])
  
  
  return data
}