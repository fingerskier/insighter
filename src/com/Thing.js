import {useState} from 'react'

export default function Thing({children, title}) {
  const [show, setShow] = useState(false)
  
  
  return <div>
    <button onClick={E=>setShow(!show)}>
      {show? 'Hide': 'Show'} {title}
    </button>
    
    {show && children}
  </div>
}
