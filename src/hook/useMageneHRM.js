import { useEffect, useState } from 'react'
import K from '../constants'


const defaultFilters = { services: ['heart_rate', 'battery_service'] }

let device, server


export default function useMageneHRM() {
  const [connected, setConnected] = useState(false)
  const [heartRate, setHeartRate] = useState()
  const [batteryLevel, setBatteryLevel] = useState()
  
  const connect = async () => {
    try {
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [0x180D, 0x180F],
        // filters: [defaultFilters],
      })
      
      server = await device.gatt.connect()
      
      device.addEventListener('gattserverdisconnected', () => {
        setConnected(false)
      })
      
      const HRM = await server.getPrimaryService(0x180D)
      const HRMCharacteristic = await HRM.getCharacteristic(0x2A37)
      HRMCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value
        setHeartRate(value.getUint8(1))
      })
      await HRMCharacteristic.startNotifications()
      
      const battery = await server.getPrimaryService(0x180F)
      const batteryCharacteristic = await battery.getCharacteristic(0x2A19)
      
      const batteryValue = await batteryCharacteristic.readValue()
      setBatteryLevel(batteryValue.getUint8(0))
      
      batteryCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value
        setBatteryLevel(value.getUint8(0))
      })
      await batteryCharacteristic.startNotifications()
      
      setConnected(true)
    } catch (error) {
      console.error('Connection failed', error)
    }
  }
  
  const disconnect = async () => {
    if (device && device.gatt.connected) {
      await device.gatt.disconnect()
      setConnected(false)
    }
  }
  
  
  useEffect(() => {
    if (+heartRate) {
      // dispatch a custom event
      const event = new CustomEvent(K.Event.HeartRate, { detail: +heartRate })
      window.dispatchEvent(event)
    }
  }, [heartRate])
  
  
  useEffect(() => {
    if (+batteryLevel) {
      // dispatch a custom event
      const event = new CustomEvent(K.Event.BatteryLevel, { detail: +batteryLevel })
      window.dispatchEvent(event)
    }
  }, [batteryLevel])
  
  
  return {
    connect,
    connected,
    disconnect,
    heartRate,
    batteryLevel,
  }
}