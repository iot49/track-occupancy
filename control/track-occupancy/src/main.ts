import { connect, type MqttClient } from 'mqtt';
import { R49Archive } from '@occupancy/r49';
import { loadR49, runDetection } from './detector.ts';
import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { CameraService } from './camera.ts';

const execAsync = promisify(exec);

// ---------------------------------------------------------------------------
// Configuration (from environment variables with sensible defaults)
// ---------------------------------------------------------------------------
const MQTT_HOST   = process.env.MQTT_HOST   ?? 'mqtt';
const MQTT_PORT   = parseInt(process.env.MQTT_PORT ?? '1883', 10);
const MQTT_PREFIX = process.env.MQTT_PREFIX ?? 'rails49';
const R49_PATH    = process.env.R49_PATH    ?? '/data/layout.r49';
const MODEL_PATH  = process.env.MODEL_PATH  ?? '/models/model.ort';
const CONFIG_PATH = process.env.CONFIG_PATH ?? '/models/config.json';
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS ?? '1000', 10);
const PORT        = parseInt(process.env.PORT ?? '3000', 10);

const STATUS_TOPIC = `${MQTT_PREFIX}/occupancy/status`;
const ERROR_TOPIC  = `${MQTT_PREFIX}/occupancy/error`;

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
async function main() {
  console.log(`[detector] Starting track-occupancy detector`);
  console.log(`[detector]   MQTT: mqtt://${MQTT_HOST}:${MQTT_PORT}`);
  console.log(`[detector]   R49:    ${R49_PATH}`);
  console.log(`[detector]   Model:  ${MODEL_PATH}`);
  console.log(`[detector]   Config: ${CONFIG_PATH}`);

  const client: MqttClient = connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
    clientId: `detector-${process.pid}`,
    clean: true,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => console.log('[detector] MQTT connected'));
  client.on('error', (err) => console.error('[detector] MQTT error:', err));

  // ---------------------------------------------------------------------------
  // Camera Service
  // ---------------------------------------------------------------------------
  const camera = new CameraService();
  await camera.start();

  // ---------------------------------------------------------------------------
  // REST API for snapshots
  // ---------------------------------------------------------------------------
  const app = express();
  
  app.get('/api/snapshot', async (req, res) => {
    try {
      const frame = await camera.getLatestFrame();
      if (frame) {
        res.set('Content-Type', 'image/jpeg');
        res.send(frame);
      } else {
        res.status(503).send('Camera starting up (no frame yet)');
      }
    } catch (err) {
      console.error('[detector] Snapshot error:', err);
      res.status(500).send(`Snapshot error: ${String(err)}`);
    }
  });

  // GET /api/r49 - Download current layout
  app.get('/api/r49', async (req, res) => {
    if (fs.existsSync(R49_PATH)) {
      res.download(R49_PATH, 'layout.r49');
    } else {
      console.log(`[detector] No layout file at ${R49_PATH}. Generating minimal dummy archive.`);
      try {
        const archive = new R49Archive();
        archive.setManifest({
          version: 3,
          layout: { name: 'New Layout', scale: 'N' },
          camera: { resolution: { width: 1920, height: 1080 } },
          images: []
        });
        const data = await archive.export();
        res.set('Content-Type', 'application/octet-stream');
        res.set('Content-Disposition', 'attachment; filename="layout.r49"');
        res.send(Buffer.from(data as Uint8Array));
      } catch (err) {
        console.error('[detector] Error generating default layout:', err);
        res.status(500).send(`Error generating default layout: ${err}`);
      }
    }
  });

  // POST /api/r49 - Upload new layout and reload
  app.post('/api/r49', express.raw({ type: '*/*', limit: '10mb' }), async (req, res) => {
    try {
      console.log(`[detector] Received new layout file (${req.body.length} bytes)`);
      fs.writeFileSync(R49_PATH, req.body);
      
      // Hot reload the detector
      await reloadDetector();
      
      res.send({ status: 'ok', labels: detector?.labels.length ?? 0 });
    } catch (err) {
      console.error('[detector] Upload error:', err);
      res.status(500).send(`Upload error: ${String(err)}`);
    }
  });

  // GET /api/test-cnn - Batch test the classifier on the dataset
  app.get('/api/test-cnn', async (req, res) => {
    if (!detector) {
      res.status(503).send('Detector not loaded');
      return;
    }

    // Wait for current live classification to finish if any
    let waitAttempts = 0;
    while (running && waitAttempts < 50) { // Max 5 seconds
      await new Promise(r => setTimeout(r, 100));
      waitAttempts++;
    }

    if (running) {
      res.status(503).send('Detector busy (live classification or another test in progress)');
      return;
    }

    const csvPath = '/dataset/data/data.csv';
    if (!fs.existsSync(csvPath)) {
      res.status(404).send(`Dataset CSV not found at ${csvPath}`);
      return;
    }

    running = true; // Lock the detector and suspend live classification
    console.log(`[detector] Starting CNN batch test (live classification suspended)...`);
    try {
      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim() !== '');
      const dataLines = lines.slice(1); // skip header

      let total = 0;
      const misclassified: Array<{ id: string; expected: string; predicted: string }> = [];
      let totalTime = 0;
      const startTime = performance.now();

      // Process in batches to speed up testing while managing CPU load
      const BATCH_SIZE = 8;
      for (let i = 0; i < dataLines.length; i += BATCH_SIZE) {
        const batch = dataLines.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (line) => {
          const parts = line.split(',');
          if (parts.length < 2) return;

          const id = parts[0];
          const groundTruthRaw = parts[1].replace(/"/g, '').trim();
          const expected = groundTruthRaw.split(' ').sort();

          const imgPath = `/dataset/data/${id}.jpg`;
          if (!fs.existsSync(imgPath)) return;

          const imgBuffer = fs.readFileSync(imgPath);
          
          const start = performance.now();
          // Test samples in /dataset/data are 144x144.
          // Since the model expects 96x96 at DPT 20, we pass DPT 30 to get a 144x144 crop.
          const predicted = await detector!.classifier.classify(imgBuffer, { x: 72, y: 72 }, 30);
          const end = performance.now();

          total++;
          totalTime += (end - start);

          // Multi-label verification: Exact Match
          const predictedSorted = [...predicted].sort();
          const isMatch = predictedSorted.length === expected.length && 
                          predictedSorted.every((val, index) => val === expected[index]);

          if (!isMatch) {
            misclassified.push({ 
              id, 
              expected: expected.join(' '), 
              predicted: predictedSorted.join(' ') 
            });
          }
        }));
      }

      const totalDuration = performance.now() - startTime;

      console.log(`[detector] Batch test complete: ${total} samples, ${misclassified.length} misclassified.`);
      res.send({
        total_samples: total,
        misclassified_count: misclassified.length,
        accuracy: total > 0 ? ((total - misclassified.length) / total).toFixed(4) : 0,
        avg_inference_ms: total > 0 ? (totalDuration / total).toFixed(2) : 0, // Effective throughput
        total_duration_ms: totalDuration.toFixed(2),
        misclassified: misclassified
      });
    } catch (err) {
      console.error('[detector] Test-CNN error:', err);
      res.status(500).send(`Test-CNN error: ${String(err)}`);
    } finally {
      running = false; // Resume live classification
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[detector] REST API listening on port ${PORT}`);
  });

  // ---------------------------------------------------------------------------
  // Detector state and reload logic
  // ---------------------------------------------------------------------------
  let detector: Awaited<ReturnType<typeof loadR49>> | null = null;

  async function reloadDetector() {
    try {
      if (!fs.existsSync(R49_PATH)) {
        console.log(`[detector] No layout file at ${R49_PATH}, waiting for upload...`);
        detector = null;
        return;
      }
      
      console.log(`[detector] Loading layout from ${R49_PATH}...`);
      const newDetector = await loadR49(R49_PATH, MODEL_PATH, CONFIG_PATH);
      
      // Cleanup old session if it exists
      if (detector) {
        detector.classifier.release();
      }
      
      detector = newDetector;
      console.log(`[detector] Layout loaded: ${detector.labels.length} detection points`);
    } catch (err) {
      console.error(`[detector] Failed to load layout: ${err}`);
      detector = null;
    }
  }
  // Initial load
  await reloadDetector();

  // Detection loop
  let running = false;
  const interval = setInterval(async () => {
    if (running) return;   // skip if previous iteration is still in progress
    running = true;
    try {
      if (!detector) return; // wait for layout
      const frame = await camera.getLatestFrame();
      if (!frame) return;    // wait for first camera frame

      const results = await runDetection(detector!, frame);
      client.publish(STATUS_TOPIC, JSON.stringify({ results, ts: Date.now() }), { qos: 0, retain: true });
    } catch (err) {
      console.error('[detector] Detection error:', err);
      client.publish(ERROR_TOPIC, JSON.stringify({ error: String(err), ts: Date.now() }));
    } finally {
      running = false;
    }
  }, INTERVAL_MS);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[detector] SIGTERM received, shutting down');
    clearInterval(interval);
    camera.stop();
    client.end();
    detector?.classifier.release();
  });
}

main().catch((err) => {
  console.error('[detector] Fatal:', err);
  process.exit(1);
});
