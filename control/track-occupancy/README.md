# 🎥 Track Occupancy Detector Service

This service is a high-performance TypeScript backend (`@occupancy/detector`) responsible for overhead camera acquisition, deep learning (CNN) track classification, and occupancy status reporting.

## 🌟 Main Functions
- **Video Stream Acquisition**: Captures high-resolution video frames from a camera device (e.g. `/dev/video0`).
- **ONNX Classification**: Utilizes an ONNX Runtime model (`model.ort` trained via `fastai`/PyTorch in the `cnn/` workflow) to perform parallelized, real-time inference on predefined track geometry regions.
- **MQTT Publishing**: Continuously publishes track occupancy statuses to the MQTT topic `rails49/occupancy/status` (read by Rocrail or the Web UI).
- **Control API**: Exposes an HTTP API for snapshot serving, configuration management, and diagnostics.

---

## 📡 Ingress & Ports

- **Internal Port**: `3000`
- **External Ingress**: Routed via Traefik under the `/api` path prefix of the main UI:
  `https://ui.rails49.org/api/...` (secured with local IP whitelist rules).

---

## 🛠️ Usage & API Reference

The backend provides the following HTTP REST endpoints:

### 1. Camera Snapshot
- **Endpoint**: `GET /api/snapshot` https://ui.rails49.org/api/snapshot
- **Description**: Returns the latest raw JPEG image captured by the camera. Used by the frontend UI to display live feedback and draw track regions.

### 2. Layout Configuration (.r49)
- **Endpoint**: `GET /api/r49` / `POST /api/r49` https://ui.rails49.org/api/r49
- **Description**: Fetches or updates the current railroad layout definition, containing track point coordinates, scaling, and labels.

### 3. Classifier Diagnostics
- **Endpoint**: `GET /api/test-cnn` https://ui.rails49.org/api/test-cnn
- **Description**: Runs a diagnostic test checking classifier accuracy against preloaded benchmarks. Primarily used for training validation (`TEST-CNN.ipynb`).

### 4. Telemetry & Sensors Stats
- **Endpoint**: `GET /api/sensors` https://ui.rails49.org/api/sensors
- **Description**: Retrieves performance stats for FFmpeg image acquisition and the Node.js ONNX classifier execution.

---

## ⚙️ Configuration (Environment Variables)

Configured inside `docker-compose.yml`:
- `MQTT_HOST`: Hostname of the MQTT broker (defaults to `mqtt`).
- `MQTT_PREFIX`: Topic namespace prefix (default: `rails49`).
- `R49_PATH`: Path to the `.r49` layout definition file (default: `/data/layout.r49`).
- `MODEL_PATH`: Path to the ONNX runtime model (default: `/models/model.ort`).
- `CONFIG_PATH`: Path to the model configuration JSON (default: `/models/config.json`).
- `CAMERA_DEVICE`: System video device mapped into the container (default: `/dev/video0`).
- `INTERVAL_MS`: Polling interval for classifer runs in milliseconds (default: `1000` ms).
