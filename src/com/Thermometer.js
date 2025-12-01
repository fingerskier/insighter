import useThermometer from '../hook/useThermometer'

export default function Thermometer() {
  const data = useThermometer()

  return <div className='thermometer container'>
    <h2>Thermometer</h2>

    {data?.error? <p>{data.error}</p>
    : data?.temperature !== undefined? <>
      <h1>{Math.round(data.temperature * 10) / 10}°C</h1>
    </>
    : <p>Waiting for temperature sensor data...</p>}
  </div>
}
