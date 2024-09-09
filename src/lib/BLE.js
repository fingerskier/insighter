/* Generic BLE access object */

export default class BLEconx {
  connected = false
  deviceName = ''
  device = {}
  filters = []
  options = {}
  server = {}
  service = {}
  serviceUUID = ''
  state = 0
  
  
  constructor(config) {
    try {
      this.options = {}
      
      if (config.deviceName || config.deviceNamePrefix) {
        this.filters = []
        this.deviceName = config.deviceName
        this.deviceNamePrefix = config.deviceNamePrefix
        this.filters.name = this.deviceName
        
        if (this.deviceName) {
          this.filters.push({name: [this.deviceName]})
        }
        
        if (this.deviceNamePrefix) {
          this.filters.push({namePrefix: [this.deviceNamePrefix]})
        }
      }


      if (!this.deviceName) {
        this.options.acceptAllDevices = true
      } else if (this.filters) {
        this.options.filters = this.filters
      }

      this.serviceUUID = config.uuid

      if (this.serviceUUID) this.options.optionalServices = [this.serviceUUID]


      if (this.serviceUUID) {
        this.filters.push({services: [this.serviceUUID]})
      }
    } catch (error) {
      console.error('connect BT', error)
    }
  }
  
  
  async connect() {
    try {
      this.device = await navigator.bluetooth.requestDevice(this.options)
      
      
      this.server = await this.device.gatt.connect()
      
      this.service = await this.server.getPrimaryService(this.serviceUUID)
      
      this.connected = true
      
      return this.service
    } catch (error) {
      console.error('connect BT', error)
    }
  }
  
  
  async characteristic(uuid) {
    try {
      const result = await this.service.getCharacteristic(uuid)
      
      return result
    } catch (error) {
      console.error(error)
      
      this.connected = false
    }
  }
}