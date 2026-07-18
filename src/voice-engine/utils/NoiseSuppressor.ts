import { LoggingManager } from "./LoggingManager";

export class NoiseSuppressor {
  private fftSize = 512;
  private hopSize = 256;
  
  // Overlap-add buffers
  private overlapBuffer = new Float32Array(512); // Input ring/delay line
  private outputDelayLine = new Float32Array(512); // Output overlap-add line
  private window = new Float32Array(512);
  
  // Noise magnitude spectrum profile
  private noiseProfile = new Float32Array(257); // 512/2 + 1 bins
  private isCalibrated = false;
  private isCalibrating = false;
  private calibrationFrameCount = 0;
  private maxCalibrationFrames = 60; // ~60 * 16ms = ~1.0 second of background noise
  private accumulatedNoiseSpectra: Float32Array[] = [];
  
  // Filtering params
  private overSubtractionFactor = 2.5; // WebRTC-style over-subtraction factor
  private spectralFloor = 0.05; // To avoid musical-noise artifacts
  private noiseFloorDB = -60.0; // Measured noise floor in decibels

  // Callbacks for dynamic UI tracking
  public onCalibrationStart?: () => void;
  public onCalibrationComplete?: (status: { noiseFloorDB: number }) => void;
  
  // Pre-allocated reusable Float32Arrays to avoid GC pauses in the audio process loop
  private frameRe = new Float32Array(512);
  private frameIm = new Float32Array(512);
  private cleanRe = new Float32Array(512);
  private cleanIm = new Float32Array(512);
  private magnitude = new Float32Array(257);

  // Bit reversal table for faster FFT performance
  private bitReversalTable = new Int32Array(512);

  constructor() {
    // Generate Hann window
    for (let i = 0; i < this.fftSize; i++) {
      this.window[i] = 0.5 * (1.0 - Math.cos((2 * Math.PI * i) / (this.fftSize - 1)));
    }
    // Generate bit reversal table
    this.initBitReversalTable();
    
    // Automatically trigger a quick default calibration on startup so the system works immediately
    this.resetDefaultNoiseProfile();
  }

  private initBitReversalTable() {
    const n = this.fftSize;
    for (let i = 0; i < n; i++) {
      let rev = 0;
      let temp = i;
      for (let j = 0; j < 9; j++) { // 2^9 = 512
        rev = (rev << 1) | (temp & 1);
        temp >>= 1;
      }
      this.bitReversalTable[i] = rev;
    }
  }

  private resetDefaultNoiseProfile() {
    // Fallback safe white/pink noise-like profile of very low level (-50dB)
    const defaultFloor = 0.003; 
    for (let i = 0; i < this.noiseProfile.length; i++) {
      this.noiseProfile[i] = defaultFloor * (1.0 - (i / this.noiseProfile.length) * 0.5); // Pink-ish decay
    }
    this.noiseFloorDB = -50.4;
    this.isCalibrated = true;
  }

  public startCalibration() {
    this.isCalibrating = true;
    this.calibrationFrameCount = 0;
    this.accumulatedNoiseSpectra = [];
    LoggingManager.info("NoiseSuppressor", "Starting background noise profile calibration... Please remain silent.");
    if (this.onCalibrationStart) {
      this.onCalibrationStart();
    }
  }

  public getCalibrationStatus() {
    return {
      isCalibrating: this.isCalibrating,
      isCalibrated: this.isCalibrated,
      noiseFloorDB: Math.round(this.noiseFloorDB * 10) / 10,
    };
  }

  /**
   * Cooley-Tukey Radix-2 FFT (In-place)
   */
  private fft(re: Float32Array, im: Float32Array) {
    const n = this.fftSize;
    
    // Bit-reversal swap using pre-computed table
    for (let i = 0; i < n; i++) {
      const j = this.bitReversalTable[i];
      if (i < j) {
        const tempRe = re[i];
        re[i] = re[j];
        re[j] = tempRe;
        const tempIm = im[i];
        im[i] = im[j];
        im[j] = tempIm;
      }
    }

    // Decimation in time
    for (let len = 2; len <= n; len <<= 1) {
      const angle = (-2 * Math.PI) / len;
      const wlenRe = Math.cos(angle);
      const wlenIm = Math.sin(angle);
      
      for (let i = 0; i < n; i += len) {
        let wRe = 1.0;
        let wIm = 0.0;
        const halfLen = len >> 1;
        
        for (let j = 0; j < halfLen; j++) {
          const uIdx = i + j;
          const vIdx = uIdx + halfLen;
          
          const uRe = re[uIdx];
          const uIm = im[uIdx];
          
          const vRe = re[vIdx] * wRe - im[vIdx] * wIm;
          const vIm = re[vIdx] * wIm + im[vIdx] * wRe;
          
          re[uIdx] = uRe + vRe;
          im[uIdx] = uIm + vIm;
          
          re[vIdx] = uRe - vRe;
          im[vIdx] = uIm - vIm;
          
          const nextWRe = wRe * wlenRe - wIm * wlenIm;
          wIm = wRe * wlenIm + wIm * wlenRe;
          wRe = nextWRe;
        }
      }
    }
  }

  /**
   * Cooley-Tukey IFFT (In-place)
   */
  private ifft(re: Float32Array, im: Float32Array) {
    // Invert imaginary parts
    for (let i = 0; i < this.fftSize; i++) {
      im[i] = -im[i];
    }
    
    // Run forward FFT
    this.fft(re, im);
    
    // Invert imaginary parts again and scale by 1/N
    const scale = 1.0 / this.fftSize;
    for (let i = 0; i < this.fftSize; i++) {
      re[i] *= scale;
      im[i] = -im[i] * scale;
    }
  }

  /**
   * Processes an incoming chunk of PCM audio (typically 4096 samples)
   * Returns a clean, noise-suppressed Float32Array of the exact same size.
   */
  public process(input: Float32Array): Float32Array {
    const output = new Float32Array(input.length);
    let outputIdx = 0;

    // We process the incoming buffer sample-by-sample using an overlap-add framework.
    for (let i = 0; i < input.length; i++) {
      // 1. Push sample to the ring/delay buffer
      // Shift left
      for (let k = 0; k < this.fftSize - 1; k++) {
        this.overlapBuffer[k] = this.overlapBuffer[k + 1];
      }
      this.overlapBuffer[this.fftSize - 1] = input[i];

      // 2. We process a frame every hopSize (256 samples)
      if ((i + 1) % this.hopSize === 0) {
        this.processFrame();
      }

      // 3. Pop clean sample from output overlap-add buffer
      output[outputIdx++] = this.outputDelayLine[0];

      // Shift output delay line left and pad with 0
      for (let k = 0; k < this.fftSize - 1; k++) {
        this.outputDelayLine[k] = this.outputDelayLine[k + 1];
      }
      this.outputDelayLine[this.fftSize - 1] = 0.0;
    }

    return output;
  }

  private processFrame() {
    // Extract current frame and apply Hanning window
    for (let i = 0; i < this.fftSize; i++) {
      this.frameRe[i] = this.overlapBuffer[i] * this.window[i];
      this.frameIm[i] = 0.0;
    }

    // Forward FFT
    this.fft(this.frameRe, this.frameIm);

    // Compute magnitude spectrum for the first N/2 + 1 bins (symmetrical)
    for (let i = 0; i <= this.fftSize / 2; i++) {
      this.magnitude[i] = Math.sqrt(this.frameRe[i] * this.frameRe[i] + this.frameIm[i] * this.frameIm[i]);
    }

    // Handle Calibration Mode
    if (this.isCalibrating) {
      const spectrumCopy = new Float32Array(this.magnitude.length);
      spectrumCopy.set(this.magnitude);
      this.accumulatedNoiseSpectra.push(spectrumCopy);
      this.calibrationFrameCount++;

      if (this.calibrationFrameCount >= this.maxCalibrationFrames) {
        this.finalizeCalibration();
      }
    }

    // Apply WebRTC-style Spectral Subtraction / Noise Reduction
    for (let i = 0; i <= this.fftSize / 2; i++) {
      const sigMag = this.magnitude[i];
      const noiseMag = this.noiseProfile[i];
      
      // Calculate signal attenuation
      // Spectral Subtraction formula: S_clean = max(beta * S, S - alpha * N)
      let cleanMag = sigMag - this.overSubtractionFactor * noiseMag;
      const floorMag = this.spectralFloor * sigMag;
      if (cleanMag < floorMag) {
        cleanMag = floorMag;
      }

      // High-pass filter check: attenuate sub-120Hz bins (index < 4 in 16kHz sample rate with 512 FFT)
      // Bin frequency = index * (16000 / 512) = index * 31.25Hz
      // Bin 0 = 0Hz, Bin 1 = 31.25Hz, Bin 2 = 62.5Hz, Bin 3 = 93.75Hz, Bin 4 = 125Hz
      if (i < 4) {
        cleanMag *= 0.1; // 20dB suppression of sub-bass rumble
      }

      // Compute subtraction gain
      const gain = sigMag > 0 ? cleanMag / sigMag : 0.0;

      // Reconstruct clean complex spectrum
      this.cleanRe[i] = this.frameRe[i] * gain;
      this.cleanIm[i] = this.frameIm[i] * gain;

      // Symmetrical part of spectrum for real-valued FFT reconstruction
      if (i > 0 && i < this.fftSize / 2) {
        const mirrorIdx = this.fftSize - i;
        this.cleanRe[mirrorIdx] = this.cleanRe[i];
        this.cleanIm[mirrorIdx] = -this.cleanIm[i];
      }
    }

    // Ensure Nyquist bin is clean
    this.cleanRe[this.fftSize / 2] = this.frameRe[this.fftSize / 2] * (this.magnitude[this.fftSize / 2] > 0 ? (this.magnitude[this.fftSize / 2] - this.overSubtractionFactor * this.noiseProfile[this.fftSize / 2]) / this.magnitude[this.fftSize / 2] : 0.0);
    this.cleanIm[this.fftSize / 2] = 0.0;

    // Run Inverse FFT
    this.ifft(this.cleanRe, this.cleanIm);

    // Re-apply analysis window to synthesized frame and overlap-add to the output delay line
    for (let i = 0; i < this.fftSize; i++) {
      this.outputDelayLine[i] += this.cleanRe[i] * this.window[i];
    }
  }

  private finalizeCalibration() {
    this.isCalibrating = false;
    this.isCalibrated = true;

    // Reset noise profile buffer
    this.noiseProfile.fill(0.0);

    // Compute average magnitude of each frequency bin across all calibration frames
    const frameCount = this.accumulatedNoiseSpectra.length;
    if (frameCount > 0) {
      for (let bin = 0; bin < this.noiseProfile.length; bin++) {
        let sum = 0.0;
        for (let f = 0; f < frameCount; f++) {
          sum += this.accumulatedNoiseSpectra[f][bin];
        }
        this.noiseProfile[bin] = sum / frameCount;
      }
    }

    // Compute the overall noise floor in decibels (RMS of the averaged profile)
    let sumSquares = 0.0;
    for (let bin = 0; bin < this.noiseProfile.length; bin++) {
      sumSquares += this.noiseProfile[bin] * this.noiseProfile[bin];
    }
    const rms = Math.sqrt(sumSquares / this.noiseProfile.length);
    this.noiseFloorDB = 20 * Math.log10(Math.max(rms, 1e-6));

    LoggingManager.success(
      "NoiseSuppressor",
      `Ambient background noise calibration complete! Noise floor measured at ${Math.round(this.noiseFloorDB * 10) / 10}dB. Spectral filter profile updated.`
    );

    if (this.onCalibrationComplete) {
      this.onCalibrationComplete({ noiseFloorDB: this.noiseFloorDB });
    }
  }
}
