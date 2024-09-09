// usePeer.js
import { useState, useEffect, useRef } from 'react'
import Peer from 'peerjs'

const usePeer = (initialPeerId) => {
  const [payload, setPayload] = useState()
  const [peer, setPeer] = useState(null)
  const [connections, setConnections] = useState([])
  const connectionsRef = useRef([])
  
  
  useEffect(() => {
    if (!initialPeerId) return
    
    const peerInstance = new Peer(initialPeerId)
    
    peerInstance.on('open', (id) => {
      console.log('My peer ID is: ' + id)
      setPeer(peerInstance)
    })
    
    peerInstance.on('connection', (conn) => {
      conn.on('data', (data) => {
        console.log('Received', data)
      })
      
      connectionsRef.current.push(conn)
      setConnections([...connectionsRef.current])
    })
    
    
    return () => {
      peerInstance.destroy()
    }
  }, [initialPeerId])
  
  
  const connectToPeer = (remotePeerId) => {
    if (!peer) return
    
    const conn = peer.connect(remotePeerId)
    
    conn.on('open', () => {
      conn.send('Connected to ' + peer.id)
    })
    
    conn.on('data', (data) => {
      console.log('Received from ' + remotePeerId + ':', data)
      setPayload(data)
    })
    
    connectionsRef.current.push(conn)
    setConnections([...connectionsRef.current])
  }
  
  
  const sendMessage = (message) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send(message)
      }
    })
  }
  
  
  return {
    connections,
    connectToPeer,
    payload,
    peerId: peer ? peer.id : null,
    sendMessage,
  }
}


export default usePeer