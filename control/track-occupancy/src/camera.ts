import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const SHM_PATH = '/dev/shm/latest.jpg';
const CAMERA_DEVICE = process.env.CAMERA_DEVICE || '/dev/video0';
const CAMERA_RESOLUTION = process.env.CAMERA_RESOLUTION || '1920x1080';
const CAMERA_FPS = process.env.CAMERA_FPS || '1';

/**
 * Service to manage a persistent camera stream using FFmpeg.
 * Keeps the camera open to maintain focus and exposure.
 */
export class CameraService {
  private _ffmpeg: ChildProcess | null = null;
  private _running = false;

  constructor() {}

  async start() {
    if (this._running) return;
    this._running = true;
    this._spawnFfmpeg();
    console.log(`[camera] Service started for ${CAMERA_DEVICE} at ${CAMERA_RESOLUTION}`);

    // Wait a few seconds for the camera to initialize, then set stable defaults
    setTimeout(() => {
      console.log(`[camera] Setting hardware controls for stability...`);
      // Focus: 0=manual, 1=auto
      CameraService.setControl('focus_auto', 0);
      CameraService.setControl('focus_absolute', 15); // Adjust for your layout
      // Exposure: 1=manual, 3=auto
      CameraService.setControl('exposure_auto', 3); 
      // Brightness, Contrast etc
      CameraService.setControl('brightness', 128);
      CameraService.setControl('contrast', 128);
    }, 5000);
  }

  stop() {
    this._running = false;
    if (this._ffmpeg) {
      this._ffmpeg.kill();
      this._ffmpeg = null;
    }
  }

  private _spawnFfmpeg() {
    if (!this._running) return;

    // FFmpeg command to capture MJPEG from V4L2 and update a single file in SHM
    // -update 1: overwrite the output file atomically
    // -q:v 2: high quality (2-31, lower is better)
    this._ffmpeg = spawn('ffmpeg', [
      '-f', 'v4l2',
      '-input_format', 'mjpeg',
      '-video_size', CAMERA_RESOLUTION,
      '-i', CAMERA_DEVICE,
      '-q:v', '2',
      '-f', 'image2',
      '-update', '1',
      SHM_PATH,
      '-y' // Overwrite output files
    ], { stdio: 'ignore' });
    
    this._ffmpeg.on('error', (err) => {
      console.error(`[camera] FFmpeg spawn error: ${err.message}`);
    });

    this._ffmpeg.on('exit', (code) => {
      if (this._running) {
        console.warn(`[camera] FFmpeg exited with code ${code}. Restarting in 2s...`);
        setTimeout(() => this._spawnFfmpeg(), 2000);
      }
    });
  }

  /**
   * Returns the latest frame as a Buffer.
   * Reads from Shared Memory (/dev/shm).
   */
  async getLatestFrame(): Promise<Buffer | null> {
    try {
      return await fs.readFile(SHM_PATH);
    } catch (err) {
      // Might happen if ffmpeg hasn't written the first frame yet
      return null;
    }
  }

  /**
   * Sets hardware camera controls using v4l2-ctl.
   */
  static setControl(name: string, value: number) {
    try {
      spawn('v4l2-ctl', ['-d', CAMERA_DEVICE, '--set-ctrl', `${name}=${value}`]);
    } catch (err) {
      console.error(`[camera] Failed to set control ${name}:`, err);
    }
  }
}
