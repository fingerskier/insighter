import React, {useEffect, useRef, useState} from 'react'
import {
  Chart,
  registerables,
} from 'chart.js'
import 'chartjs-adapter-date-fns'

Chart.register(...registerables)


export default function MultiChart({
  heartData,
  speedData,
}) {
  const chart = useRef()
  
  const config = {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Speed',
          backgroundColor: '#0FF7',
          borderColor: 'cyan',
          data: speedData,
          yAxisID: 'y2',
          fill: true,
          pointStyle: 'cross',
        },
        {
          label: 'Heart Rate',
          backgroundColor: '#F005',
          borderColor: 'red',
          data: heartData,
          yAxisID: 'y1',
          fill: true,
          pointStyle: 'cross',
        },
      ]
    },
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'minute',
            tooltipFormat: 'MMM dd, h:mm:ss a',
          },
          title: {
            display: true,
            text: 'Time'
          },
        },
        y1: {
          type: 'linear',
          position: 'left',
          display: true,
          min: 0,
          max: 180,
          title: {
            display: true,
            text: 'Heart Rate (bpm)',
          },
        },
        y2: {
          type: 'linear',
          position: 'right',
          display: true,
          min: 0,
          max: 5,
          title: {
            display: true,
            text: 'Speed (m/s)',
          },
          grid: {
            drawOnChartArea: false,
          },
        }
      }
    }
  }
  
  const [context, setContext] = useState()
  const [main, setMain] = useState()
  const [options, setOptions] = useState(config)
  
  
  useEffect(() => {
    if (chart) {
      const ctx = chart.current.getContext('2d')
      
      setContext(ctx)
    }
  }, [chart])
  
  
  useEffect(() => {
    if (context && options) {
      const thisn = new Chart(context, options)
      
      setMain(thisn)
    }
  }, [context, options])
  
  
  useEffect(() => {
    if (chart && main) {
      main.data.datasets[1].data = heartData
      main.update()
    }
  }, [chart, heartData, main])
  
  
  useEffect(() => {
    console.log('speedData', speedData)
    if (chart && main) {
      main.data.datasets[0].data = speedData
      main.update()
    }
  }, [chart, speedData, main])
  
  
  return (<>
    <canvas
      className="bout chart"
      ref={chart}
    ></canvas>
  </>)
}