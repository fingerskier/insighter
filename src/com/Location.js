import {useEffect, useState} from 'react'
import K from '../constants'
import useGeolocation from '../hook/useGeoLocation'
import useLocalStorage from '../hook/useLocalStorage'
import {roundTo} from '../lib/helpers'


const geoDistance = (P1, P2)=>{
  const R = 6371e3
  const φ1 = P1.latitude * Math.PI/180
  const φ2 = P2.latitude * Math.PI/180
  const Δφ = (P2.latitude-P1.latitude) * Math.PI/180
  const Δλ = (P2.longitude-P1.longitude) * Math.PI/180
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  
  return R * c
}


export default function Location() {
  const geo = useGeolocation()
  
  const [prevCoord, setPrevCoord] = useLocalStorage('coord', [])
  
  const [speed, setSpeed] = useState(-7)
  
  
  useEffect(() => {
    if (geo) {
      let newDistance, newSpeed
      
      if (prevCoord) {
        newDistance = geoDistance(prevCoord, geo)
      }
      
      if (geo.speed) {
        newSpeed = geo.speed
      } else if (prevCoord) {
        newSpeed = newDistance / (
          geo.timestamp - prevCoord.timestamp
        )
      }
      
      // newSpeed = Math.random()
      
      if (newSpeed) {
        setSpeed( roundTo(newSpeed,1) )
      }
      
      const event = new CustomEvent(K.Event.GeoLocation, { detail: newSpeed })
      window.dispatchEvent(event)
      
      setPrevCoord(geo)
    }
  }, [geo])
  
  
  return <div className='location container'>
    {/* <pre> {JSON.stringify(geo, null, 2)} </pre> */}
    
    <h1>Speed {speed} {speed? 'm/s': null}</h1>
    
    <h2>Heading {roundTo(geo?.heading) || -7}</h2>
    <h2>Altitude {roundTo(geo?.altitude,1) || -7}</h2>
    
    <h3>
      Lat {roundTo(geo?.latitude, 4) || -7}
      <br />
      Lng {roundTo(geo?.longitude, 4) || -7}
    </h3>
    
    {/* <LineChart
      backgroundColor='cyan'
      borderColor='darkcyan'
      data={data}
      title="speed" 
    /> */}
  </div>
}