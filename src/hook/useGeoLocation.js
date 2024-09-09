import { useState, useEffect } from 'react'


const useGeolocation = () => {
  const [data, setData] = useState()
  
  
  useEffect(() => {
    try {
      if (!navigator.geolocation) return setData({
        error: 'Geolocation is not supported by your browser',
        speed: -7,
      })
      
      const onSuccess = (position) => {
        const pos = position
        
        const result = {
          timestamp: new Date(pos.timestamp),
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy<200? pos.coords.accuracy: 0,
          altitude: pos.coords.altitude || 0,
          altitudeAccuracy: pos.coords.altitudeAccuracy || 0,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        }
        
        setData(result)
      }
      
      const onError = (error) => {
        setData({...data, error: error.message})
      }
      
      navigator.geolocation.getCurrentPosition(onSuccess, onError)
      
      const watcher = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 5000,
        },
      )
      
      return ()=>{
        navigator.geolocation.clearWatch(watcher)
      }
    } catch (error) {
      if (error.name === 'SecurityError') {
        setData({...data, error: "Sensor construction was blocked by a permissions policy."})
      } else if (error.name === "ReferenceError") {
        setData({...data, error: "Sensor is not supported by the User Agent."})
      } else {
        console.error(error)
      }
    }
  }, [])
  
  
  return data
}


export default useGeolocation