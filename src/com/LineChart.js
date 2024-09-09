import React, {useEffect, useRef, useState} from 'react'
import {
  Chart,
  registerables,
} from 'chart.js'
import 'chartjs-adapter-date-fns'


Chart.register(...registerables)


export default function({
  backgroundColor='red',
  borderColor='darkred',
  data0,
  data1,
  title='value',
}) {
  const chart = useRef()
  
  const labels = [...Array(100).keys()]
  
  const config = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: title,
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          data: data0,
          fill: true,
          pointStyle: 'cross',
        }
      ]
    },
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          display: false,
          time: {
            tootilFormat: 'DD T',
          },
          type: 'time',
        },
        y: {
          display: true,
          min: 0,
          max: 3,
        }
      }
    },
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
      main.data.datasets[0].data = data0
      main.update()
    }
  }, [data0])
  
  
  return (<>
    <canvas
      className="heart rate chart"
      ref={chart}
    ></canvas>
  </>)
}