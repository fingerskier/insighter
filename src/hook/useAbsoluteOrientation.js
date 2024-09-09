import {useEffect, useState} from 'react'


export default function useOrientation() {
  const [data, setData] = useState()
  
  
  useEffect(() => {
    try {
      if (!window.AbsoluteOrientationSensor) return setData({error: 'AbsoluteOrientationSensor is not supported by your browser.'})
      
      let sensor = new window.AbsoluteOrientationSensor()
      
      sensor.addEventListener('reading', () => {
        setData({
          x: sensor.quaternion[0],
          y: sensor.quaternion[1],
          z: sensor.quaternion[2],
          w: sensor.quaternion[3],
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