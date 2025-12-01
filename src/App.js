import AutoCadence from './com/AutoCadence'
import AmbientSoundLevel from './com/AmbientSoundLevel'
import Chart from './com/Chart'
import HeartRateMonitor from './com/HeartRateMonitor'
import Location from './com/Location'
import LightLevel from './com/LightLevel'
import Settings from './com/Settings'
import Thermometer from './com/Thermometer'
import Wiggle from './com/Wiggle'

import './App.css'


export default function App() {
  return <>
    <Location />
    
    <HeartRateMonitor />

    <LightLevel />

    <AmbientSoundLevel />

    <Thermometer />

    <Chart />
    
    <Wiggle />
    
    <Settings />
  </>
}