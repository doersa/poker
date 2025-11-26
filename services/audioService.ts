

// Use the Web Audio API to synthesize sounds without external assets
let audioCtx: AudioContext | null = null;
let bgmNodes: { osc: OscillatorNode, gain: GainNode }[] = [];
let isBGMPlaying = false;
let nextNoteTime = 0;
let bgmInterval: any = null;

const getContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const initAudio = () => {
  const ctx = getContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(e => console.error("Audio resume failed", e));
  }
};

// --- Sound Effects ---

const createOscillator = (type: OscillatorType, freq: number, duration: number, startTime: number, vol: number = 0.1) => {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
};

export const playDeal = () => {
  try {
    const ctx = getContext();
    const t = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.1; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);
  } catch (e) {}
};

export const playChips = () => {
  try {
    const ctx = getContext();
    const t = ctx.currentTime;
    createOscillator('sine', 2000, 0.1, t, 0.05);
    createOscillator('triangle', 2500, 0.1, t, 0.02);
  } catch (e) {}
};

export const playCheck = () => {
  try {
    const ctx = getContext();
    const t = ctx.currentTime;
    createOscillator('square', 150, 0.05, t, 0.05);
    createOscillator('square', 150, 0.05, t + 0.1, 0.04);
  } catch (e) {}
};

export const playFold = () => {
  try {
    const ctx = getContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.3);
    
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  } catch (e) {}
};

export const playWin = () => {
  try {
    const ctx = getContext();
    const t = ctx.currentTime;
    createOscillator('triangle', 523.25, 0.3, t, 0.1);     // C5
    createOscillator('triangle', 659.25, 0.3, t + 0.1, 0.1); // E5
    createOscillator('triangle', 783.99, 0.6, t + 0.2, 0.1); // G5
    createOscillator('sine', 1046.50, 0.8, t + 0.3, 0.1);   // C6
  } catch (e) {}
};

// --- Background Music (Procedural Ambient) ---

const SCALES = [
  [261.63, 293.66, 329.63, 392.00, 440.00], // C Major Pentatonic
  [261.63, 311.13, 349.23, 392.00, 415.30], // C Minor Pentatonic
  [329.63, 392.00, 440.00, 493.88, 523.25], // Em Pentatonic
];

export const stopBGM = () => {
  isBGMPlaying = false;
  if (bgmInterval) clearInterval(bgmInterval);
  bgmNodes.forEach(n => {
    try {
        n.gain.gain.linearRampToValueAtTime(0, getContext().currentTime + 1);
        n.osc.stop(getContext().currentTime + 1.1);
    } catch(e){}
  });
  bgmNodes = [];
};

export const startBGM = () => {
  if (isBGMPlaying) return;
  const ctx = getContext();
  isBGMPlaying = true;
  
  // Create a low drone
  const droneOsc = ctx.createOscillator();
  const droneGain = ctx.createGain();
  droneOsc.frequency.value = 65.41; // C2
  droneOsc.type = 'triangle';
  droneGain.gain.value = 0.02;
  droneOsc.connect(droneGain);
  droneGain.connect(ctx.destination);
  droneOsc.start();
  bgmNodes.push({ osc: droneOsc, gain: droneGain });

  // Procedural melody loop
  let scaleIndex = 0;
  
  const playRandomNote = () => {
    if (!isBGMPlaying) return;
    
    // Switch scales occasionally
    if (Math.random() > 0.8) scaleIndex = Math.floor(Math.random() * SCALES.length);
    const scale = SCALES[scaleIndex];
    
    const freq = scale[Math.floor(Math.random() * scale.length)] * (Math.random() > 0.5 ? 1 : 2);
    const dur = 1 + Math.random() * 2;
    const t = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.frequency.setValueAtTime(freq, t);
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.03, t + 0.5); // Slow attack
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur); // Long release
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + dur);
  };

  bgmInterval = setInterval(playRandomNote, 2500);
  playRandomNote();
};
