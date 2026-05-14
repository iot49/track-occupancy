import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { R49Archive, type ManifestData, type Marker } from '@occupancy/r49';
import { NodeClassifier } from '@occupancy/classifier/node';
import { BaseClassifier, type ClassifierConfig } from '@occupancy/classifier';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LabelResult {
  id: string;
  type: string;
  labels: string[]; // multi-label classification results
  x: number;
  y: number;
}

export interface DetectorState {
  archive: R49Archive;
  manifest: ManifestData;
  /** Flat list of {id, type, x, y} for all labels across all images */
  labels: Array<{ id: string; type: string; x: number; y: number }>;
  classifier: NodeClassifier;
  dpt: number;
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Loads an .r49 archive, an ONNX model, and its config, returning a ready DetectorState.
 */
export async function loadR49(r49Path: string, modelPath: string, configPath: string): Promise<DetectorState> {
  const data = await readFile(r49Path);
  const archive = await R49Archive.load(data);
  const manifest = archive.getManifest();

  // Collect all labelled detection points from all images
  const labels: DetectorState['labels'] = [];
  for (const img of manifest.images) {
    if (!img.labels) continue;
    for (const [id, marker] of Object.entries(img.labels as Record<string, Marker>)) {
      labels.push({ id, type: marker.type, x: marker.x, y: marker.y });
    }
  }

  // Load Model Configuration
  console.log(`[detector] Loading classifier config from ${configPath}`);
  const configData = await readFile(configPath, 'utf-8');
  const classifierConfig = JSON.parse(configData) as ClassifierConfig;

  // Load ONNX model
  const classifier = new NodeClassifier(classifierConfig);
  await classifier.load(modelPath);

  const dpt = BaseClassifier.calculateDpt(manifest);

  return { archive, manifest, labels, classifier, dpt };
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Classifies each detection point in the provided image buffer.
 */
export async function runDetection(state: DetectorState, imageBuffer: Buffer): Promise<LabelResult[]> {
  const sharpImage = sharp(imageBuffer);

  const results: LabelResult[] = [];
  for (const pt of state.labels) {
    const labels = await state.classifier.classify(sharpImage, { x: pt.x, y: pt.y }, state.dpt);
    results.push({ id: pt.id, type: pt.type, labels, x: pt.x, y: pt.y });
  }
  return results;
}

