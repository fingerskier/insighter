import {useEffect, useState} from 'react'


export default function useAmbience() {
  const [data, setData] = useState()

  useEffect(() => {
    try {
      if (!window.AmbientLightSensor) return setData({error: 'AmbientLightSensor is not supported by your browser.'})
      
      let sensor = new window.AmbientLightSensor()
      
      sensor.addEventListener('reading', () => {
        setData({
          illuminance: sensor.illuminance,
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