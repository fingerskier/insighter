import {useEffect, useState} from 'react'

export default function useThermometer() {
  const [data, setData] = useState()

  useEffect(() => {
    try {
      if (!window.AmbientTemperatureSensor) {
        setData({ error: 'AmbientTemperatureSensor is not supported by your browser or device.' })
        return
      }

      const sensor = new window.AmbientTemperatureSensor()

      sensor.addEventListener('reading', () => {
        setData({ temperature: sensor.temperature })
      })

      sensor.addEventListener('error', event => {
        setData({ error: event.error?.message || 'Unable to read temperature.' })
      })

      sensor.start()

      return () => sensor.stop()
    } catch (error) {
      setData({ error: error?.message || 'Unable to start temperature sensor.' })
    }
  }, [])


  return data
}
