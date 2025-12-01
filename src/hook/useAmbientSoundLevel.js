import {useEffect, useState} from 'react'

export default function useAmbientSoundLevel() {
  const [data, setData] = useState()

  useEffect(() => {
    let audioContext
    let analyser
    let dataArray
    let rafId
    let mediaStream

    const updateLevel = () => {
      if (!analyser || !dataArray) return

      analyser.getByteTimeDomainData(dataArray)

      let sumSquares = 0

      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128
        sumSquares += normalized * normalized
      }

      const rms = Math.sqrt(sumSquares / dataArray.length)
      const decibels = 20 * Math.log10(rms || 1e-8)

      setData({ level: Math.max(Math.round(decibels * 10) / 10, -80) })

      rafId = requestAnimationFrame(updateLevel)
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setData({ error: 'Microphone input is not supported by this browser.' })
      return
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      mediaStream = stream
      audioContext = new window.AudioContext()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      dataArray = new Uint8Array(analyser.fftSize)

      updateLevel()
    }).catch(error => {
      setData({ error: error?.message || 'Unable to access microphone.' })
    })

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
      if (audioContext?.state !== 'closed') {
        audioContext?.close()
      }
    }
  }, [])


  return data
}
