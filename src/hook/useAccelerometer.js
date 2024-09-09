import { useEffect, useState } from 'react'

const defaults = {
  referenceFrame: 'device',
}


const useAccelerometer = () => {
  const [data, setData] = useState({
    x: 0,
    y: 0,
    z: 0,
  })
  
  
  useEffect(() => {
    try {
      let sensor = new window.Accelerometer(defaults)
      
      sensor.addEventListener('reading', () => {
        setData({
          x: sensor.x,
          y: sensor.y,
          z: sensor.z,
        })
      })
      
      sensor.addEventListener('error', (event) => {
        console.error(event.error)
      })
      
      sensor.start()
    } catch (error) {
      if (error.name === "SecurityError") {
        // See the note above about permissions policy.
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


export default useAccelerometer