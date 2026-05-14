import { type Point, getGauge, type ValidScales } from '@occupancy/r49';
import type { InferenceSession, Tensor } from 'onnxruntime-common';

export interface ClassifierConfig {
  labels?: string[];
  dpt: number;
  crop_size: number;
  mean?: number[];
  std?: number[];
}

export const FALLBACK_LABELS = ['coupling', 'other', 'track', 'train'];
export const FALLBACK_CROP_SIZE = 96;
export const FALLBACK_MEAN = [0.485, 0.456, 0.406];
export const FALLBACK_STD = [0.229, 0.224, 0.225];

/**
 * Platform-agnostic base class for the Occupancy Classifier.
 * Handles configuration, scaling math, and normalization.
 */
export abstract class BaseClassifier {
  protected _session: InferenceSession | null = null;
  protected _config: ClassifierConfig;

  constructor(config: ClassifierConfig) {
    this._config = config;
  }

  /**
   * Calculates the true Dots Per Track (DPT) from a layout manifest.
   */
  static calculateDpt(manifest: any): number {
    const cal = manifest.layout?.calibration;
    if (!cal || !cal.p0 || !cal.p1 || !cal.size_mm) return 30; // Fallback
    const dx = cal.p0.x - cal.p1.x;
    const dy = cal.p0.y - cal.p1.y;
    const distPixels = Math.sqrt(dx * dx + dy * dy);
    const pixelsPerMm = distPixels / cal.size_mm;
    const gauge = getGauge((manifest.layout?.scale as ValidScales) || 'N');
    return pixelsPerMm * gauge;
  }

  /**
   * Common scaling math to determine the source crop area.
   */
  protected getScalingMath(point: Point, img_dpt: number) {
    const cropSize = this._config.crop_size || FALLBACK_CROP_SIZE;
    const scaleFactor = img_dpt / this._config.dpt;
    const srcSize = cropSize * scaleFactor;
    const sx = point.x - srcSize / 2;
    const sy = point.y - srcSize / 2;
    return { sx, sy, srcSize, cropSize };
  }

  /**
   * Shared normalization logic.
   * Converts a flattened RGB buffer [R, G, B, R, G, B, ...] into an ONNX Tensor.
   */
  protected preprocessToTensor(
    rgbData: Uint8Array | Uint8ClampedArray,
    size: number,
    createTensor: (data: Float32Array, dims: number[]) => Tensor
  ): Tensor {
    const area = size * size;
    const floatData = new Float32Array(1 * 3 * area);
    
    const mean = this._config.mean || FALLBACK_MEAN;
    const std = this._config.std || FALLBACK_STD;

    for (let i = 0; i < area; i++) {
      // Normalize to 0-1 and apply ImageNet normalization
      // Source data index depends on whether we have 3 channels (Node) or 4 channels (Browser)
      // This is handled by subclasses providing the correct buffer type.
      // For simplicity, we assume the subclass provides a packed 3-channel RGB buffer.
      floatData[i] = (rgbData[i * 3] / 255.0 - mean[0]) / std[0];            // R
      floatData[i + area] = (rgbData[i * 3 + 1] / 255.0 - mean[1]) / std[1];     // G
      floatData[i + 2 * area] = (rgbData[i * 3 + 2] / 255.0 - mean[2]) / std[2]; // B
    }

    return createTensor(floatData, [1, 3, size, size]);
  }

  /**
   * Multi-label logic for classification.
   * Returns all labels with a probability >= 0.5.
   */
  protected getLabelsFromResult(outputData: Float32Array): string[] {
    const labels = this._config.labels || FALLBACK_LABELS;
    const results: string[] = [];
    
    for (let i = 0; i < outputData.length; i++) {
      if (outputData[i] >= 0.5) {
        results.push(labels[i] || `label_${i}`);
      }
    }
    return results;
  }

  abstract load(source: any): Promise<void>;
  abstract classify(image: any, point: Point, img_dpt: number): Promise<string[]>;

  async release() {
    if (this._session) {
      await (this._session as any).release?.();
      this._session = null;
    }
  }
}
