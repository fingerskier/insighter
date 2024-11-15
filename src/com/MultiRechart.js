import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

export default function MultiChart({ heartData, speedData }) {
  // Merge the data arrays to create a single array of objects
  const mergedData = React.useMemo(() => {
    if (!heartData?.length && !speedData?.length) return []
    
    const allData = []
    const maxLength = Math.max(heartData?.length || 0, speedData?.length || 0)
    
    for (let i = 0; i < maxLength; i++) {
      const heartPoint = heartData?.[i] || {}
      const speedPoint = speedData?.[i] || {}
      
      allData.push({
        time: heartPoint.x || speedPoint.x,
        heartRate: heartPoint.y,
        speed: speedPoint.y
      })
    }
    
    return allData
  }, [heartData, speedData])

  // Format time for tooltip and x-axis
  const formatTime = (time) => {
    if (!time) return ''
    const date = new Date(time)
    return date.toLocaleTimeString()
  }

  // Custom tooltip to show both metrics
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null

    return (
      <div className="bg-white border border-gray-200 p-2 rounded shadow">
        <p className="text-sm font-medium">{formatTime(label)}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-sm"
            style={{ color: entry.color }}
          >
            {entry.name}: {entry.value?.toFixed(2)} {entry.name === 'Heart Rate' ? 'bpm' : 'm/s'}
          </p>
        ))}
      </div>
    )
  }
  
  
  return (
    <div className="chart container">
      <ResponsiveContainer width="100%" aspect={1.5}>
        <LineChart
          data={mergedData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            label={{ value: 'Time', position: 'bottom' }}
          />
          
          {/* Heart Rate Y-Axis (left) */}
          <YAxis
            yAxisId="heartRate"
            domain={[0, 180]}
            label={{
              value: 'Heart Rate (bpm)',
              angle: -90,
              position: 'insideLeft'
            }}
          />
          
          {/* Speed Y-Axis (right) */}
          <YAxis
            yAxisId="speed"
            orientation="right"
            domain={[0, 5]}
            label={{
              value: 'Speed (m/s)',
              angle: 90,
              position: 'insideRight'
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          <Line
            yAxisId="heartRate"
            type="monotone"
            dataKey="heartRate"
            name="Heart Rate"
            stroke="#ff0000"
            dot={false}
            strokeWidth={2}
            fillOpacity={0.3}
          />
          
          <Line
            yAxisId="speed"
            type="monotone"
            dataKey="speed"
            name="Speed"
            stroke="#00ffff"
            dot={false}
            strokeWidth={2}
            fillOpacity={0.3}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}