import Cadence from './com/Cadence'
import Chart from './com/Chart'
import HeartRateMonitor from './com/HeartRateMonitor'
import Location from './com/Location'
import Settings from './com/Settings'
import Wiggle from './com/Wiggle'

import './App.css'


export default function App() {
  return <>
    <Location />
    
    <HeartRateMonitor />
    
    <Chart />
    
    <Wiggle />
    
    <Settings />
  </>
}