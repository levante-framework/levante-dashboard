// Web Worker for audio processing
self.onmessage = async (e) => {
  const { arrayBuffer } = e.data;
  
  try {
    // Decode audio data
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Send the processed buffer back to the main thread
    self.postMessage(audioBuffer);
  } catch (error) {
    console.error('Error processing audio in worker:', error);
    self.postMessage(null);
  }
}; 