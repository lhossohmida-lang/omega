export function playLoudAlarm() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Play 5 very loud, piercing beeps
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(1000, ctx.currentTime + (i * 0.3));
      
      gain.gain.setValueAtTime(0, ctx.currentTime + (i * 0.3));
      gain.gain.linearRampToValueAtTime(2, ctx.currentTime + (i * 0.3) + 0.02); // gain 2 for extra loud
      gain.gain.setValueAtTime(2, ctx.currentTime + (i * 0.3) + 0.2);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + (i * 0.3) + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + (i * 0.3));
      osc.stop(ctx.currentTime + (i * 0.3) + 0.25);
    }
  } catch (e) {
    console.error("Audio API error", e);
  }
}
