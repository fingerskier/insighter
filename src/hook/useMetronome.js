import { useEffect, useRef, useState } from 'react'

const useMetronome = (initialBPM = 100) => {
  const audioContextRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const beatCountRef = useRef(0);
  const timerIDRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBPM] = useState(initialBPM);
  const [volume, setVolume] = useState(5);
  const [frequency, setFrequency] = useState(440);
  const [rhythmPattern, setRhythmPattern] = useState({
    emphasis: 4,
    emphasized: {
      frequency: 880,
      gain: 1.5
    },
    normal: {
      frequency: 440,
      gain: 1.0
    }
  });

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    return audioContextRef.current;
  };

  const gainNodeRef = useRef(null);

  const calculateGain = (volumeValue) => {
    return Math.pow(volumeValue / 10, 2) * 2.0;
  };

  useEffect(() => {
    if (gainNodeRef.current) {
      const gain = calculateGain(volume);
      gainNodeRef.current.gain.setValueAtTime(gain, audioContextRef.current.currentTime);
    }
  }, [volume]);

  const beep = (time) => {
    try {
      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const envelopeGain = context.createGain();
      
      oscillator.connect(envelopeGain);
      envelopeGain.connect(gainNodeRef.current);
      
      const isEmphasized = beatCountRef.current % rhythmPattern.emphasis === 0;
      const beatProperties = isEmphasized ? rhythmPattern.emphasized : rhythmPattern.normal;
      
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency || beatProperties.frequency;
      
      const beatGain = beatProperties.gain;
      envelopeGain.gain.setValueAtTime(beatGain, time);
      envelopeGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
      
      oscillator.start(time);
      oscillator.stop(time + 0.1);
      
      if (navigator.vibrate) {
        navigator.vibrate(isEmphasized ? [100, 50] : [66, 33]);
      }
      
      beatCountRef.current = (beatCountRef.current + 1) % rhythmPattern.emphasis;
    } catch (err) {
      console.error('Error in beep:', err);
    }
  };

  // Use a ref to track the current BPM in the scheduler
  const currentBPMRef = useRef(bpm);
  
  // Update the ref whenever BPM changes
  useEffect(() => {
    currentBPMRef.current = bpm;
  }, [bpm]);

  const scheduler = () => {
    try {
      const currentTime = audioContextRef.current.currentTime;
      const lookAheadTime = 0.1; // Look ahead 100ms
      
      while (nextNoteTimeRef.current < currentTime + lookAheadTime) {
        beep(nextNoteTimeRef.current);
        // Use the current BPM from ref instead of the state variable
        nextNoteTimeRef.current += 60.0 / currentBPMRef.current;
      }
      
      timerIDRef.current = setTimeout(scheduler, 25);
    } catch (err) {
      console.error('Error in scheduler:', err);
    }
  };

  const start = async () => {
    if (isPlaying) return;

    try {
      const context = initAudioContext();
      
      if (context.state === 'suspended') {
        await context.resume();
      }

      // Reset beat counter
      beatCountRef.current = 0;
      
      // Initialize nextNoteTime to start immediately
      nextNoteTimeRef.current = context.currentTime;
      
      setIsPlaying(true);
      scheduler();
      
    } catch (err) {
      console.error('Error starting metronome:', err);
    }
  };

  const stop = () => {
    setIsPlaying(false);
    if (timerIDRef.current) {
      clearTimeout(timerIDRef.current);
    }
  };

  const setRhythm = (newPattern) => {
    setRhythmPattern(prevPattern => ({
      ...prevPattern,
      ...newPattern
    }));
  };

  useEffect(() => {
    return () => {
      stop();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
        gainNodeRef.current = null;
      }
    };
  }, []);

  // Add a test beep function
  const testBeep = () => {
    if (!audioContextRef.current) {
      initAudioContext();
    }
    beep(audioContextRef.current.currentTime);
  };

  return {
    start,
    stop,
    testBeep,
    isPlaying,
    bpm,
    setBPM,
    volume,
    setVolume,
    frequency,
    setFrequency,
    rhythmPattern,
    setRhythm,
  };
};

export default useMetronome;