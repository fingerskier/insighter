import { useState, useEffect } from 'react';

const useBLE = () => {
  const [device, setDevice] = useState(null);
  const [server, setServer] = useState(null);
  const [characteristics, setCharacteristics] = useState({});
  const [isConnected, setIsConnected] = useState(false);

  const connect = async (serviceUuid) => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [serviceUuid] }]
      })
      
      const server = await device.gatt.connect()
      setDevice(device)
      setServer(server)
      setIsConnected(true)
      
      device.ongattserverdisconnected = onDisconnected;
      
      const service = await server.getPrimaryService(serviceUuid);
      const characteristicMap = {};
      const characteristics = await service.getCharacteristics();
      
      characteristics.forEach(characteristic => {
        characteristicMap[characteristic.uuid] = characteristic;
      });

      setCharacteristics(characteristicMap);
    } catch (error) {
      console.error('Connection failed', error);
      disconnect();
    }
  };

  const disconnect = async () => {
    if (device) {
      device.gatt.disconnect();
      onDisconnected();
    }
  };

  const onDisconnected = () => {
    setDevice(null);
    setServer(null);
    setCharacteristics({});
    setIsConnected(false);
  };

  const readCharacteristic = async (uuid) => {
    try {
      const characteristic = characteristics[uuid];
      if (!characteristic) throw new Error('Characteristic not found');
      
      const value = await characteristic.readValue();
      return value; // Return DataView
    } catch (error) {
      console.error('Read failed', error);
    }
  };

  const writeCharacteristic = async (uuid, value) => {
    try {
      const characteristic = characteristics[uuid];
      if (!characteristic) throw new Error('Characteristic not found');
      
      await characteristic.writeValue(value);
    } catch (error) {
      console.error('Write failed', error);
    }
  };

  const startNotifications = async (uuid, onNotification) => {
    try {
      const characteristic = characteristics[uuid];
      if (!characteristic) throw new Error('Characteristic not found');
      
      characteristic.addEventListener('characteristicvaluechanged', onNotification);
      await characteristic.startNotifications();
    } catch (error) {
      console.error('Failed to start notifications', error);
    }
  };

  const stopNotifications = async (uuid) => {
    try {
      const characteristic = characteristics[uuid];
      if (!characteristic) throw new Error('Characteristic not found');
      
      await characteristic.stopNotifications();
      characteristic.removeEventListener('characteristicvaluechanged');
    } catch (error) {
      console.error('Failed to stop notifications', error);
    }
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connect,
    disconnect,
    readCharacteristic,
    writeCharacteristic,
    startNotifications,
    stopNotifications,
    isConnected
  };
};

export default useBLE;
