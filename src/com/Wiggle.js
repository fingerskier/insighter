import {useEffect, useState} from 'react'
import useAccelerometer from '../hook/useAccelerometer'
import useGravitySensor from '../hook/useGravitySensor'
import useRelativeOrientationSensor from '../hook/useRelativeOrientationSensor'
import {onSensorData} from '../lib/wiggle'
import {roundTo} from '../lib/helpers'


export default function Wiggle() {
  const accel = useAccelerometer({x:0, y:0, z:0})
  const gravity = useGravitySensor({x:0, y:0, z:0})
  const relative = useRelativeOrientationSensor({x:0, y:0, z:0, w:0})
  
  const [distance, setDistance] = useState(-7)
  const [azimuth, setAzimuth] = useState(0)
  const [elevation, setElevation] = useState(0)
  
  
  useEffect(() => {
    if (accel && gravity && relative) {
      const jog = onSensorData(accel, gravity, relative, Date.now())
      
      setDistance(jog.distance)
      setAzimuth(jog.theta)
      setElevation(jog.phi)
    }
  }, [accel, gravity, relative])
  
  
  return <div className='wiggle container'>
    <h1>Jog {roundTo(distance)}</h1>
    <br />
{/*     
    <pre>
      {JSON.stringify(accel, null, 2)}
      {JSON.stringify(gravity, null, 2)}
      {JSON.stringify(relative, null, 2)}
    </pre>
*/}
    <br />
    
    <h2>
      Azimuth {roundTo(azimuth)}
      {azimuth > 0 ? 'right' : 'left'}
    </h2>
    <br />
    
    <h2>
      Elevation {roundTo(elevation)}
      {elevation > 0 ? 'up' : 'down'}
    </h2>
  </div>
}
