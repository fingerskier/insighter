import useAmbientSoundLevel from '../hook/useAmbientSoundLevel'

export default function AmbientSoundLevel() {
  const data = useAmbientSoundLevel()

  return <div className='sound container'>
    <h2>Ambient Sound</h2>

    {data?.error? <p>{data.error}</p>
    : data?.level !== undefined? <>
      <h1>{data.level} dB</h1>
      <p>Using microphone input</p>
    </>
    : <p>Waiting for microphone level...</p>}
  </div>
}
