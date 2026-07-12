
// Basic software NoiseFilter if needed, but hardware does most of it.
export class NoiseFilter {
  // Pass-through for now, as getUserMedia handles noiseSuppression
  process(data: Float32Array): Float32Array {
    return data;
  }
}
