import {useEffect, useState} from 'react'


export default function useMagnetometer() {
  const [data, setData] = useState({})
  
  
  useEffect(() => {
    try {
      if (!window.Magnetometer) return setData({...data, error: 'Magnetometer not supported'})
      
      let sensor = new window.Magnetometer()
      
      sensor.addEventListener('reading', () => {
        setData({
          x: sensor.x,
          y: sensor.y,
          z: sensor.z,
        })
      })
      
      sensor.addEventListener('error', (event) => {
        console.error(event?.error)
      })
      
      sensor.start()
    } catch (error) {
      if (error.name === "SecurityError") {
        console.error("Sensor construction was blocked by a permissions policy.");
      } else if (error.name === "ReferenceError") {
        console.error("Sensor is not supported by the User Agent.");
      } else {
        console.error(error)
      }
    }
  }, [])
  
  return data
}
