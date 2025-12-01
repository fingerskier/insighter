import useAmbientLightSensor from '../hook/useAmbientLightSensor'

export default function LightLevel() {
  const data = useAmbientLightSensor()

  return <div className='light container'>
    <h2>Light Level</h2>

    {data?.error? <p>{data.error}</p>
    : data?.illuminance? <>
      <h1>{Math.round(data.illuminance)}</h1>
      <p>lux</p>
    </>
    : <p>Waiting for light sensor data...</p>}
  </div>
}
