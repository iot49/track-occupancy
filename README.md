# 🚂 Modelrailroad Track Occupancy Detection

[![Status: Active](https://img.shields.io/badge/Status-Active-brightgreen.svg)]()
[![Stack: Fastai + Lit](https://img.shields.io/badge/Stack-Fastai%20%2B%20Lit-blue.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]()

A computer vision suite for model railroaders to detect track occupancy using deep neural networks.

---

## 🌟 Overview

This project provides a camera-based solution for track occupancy detection based on overhead cameras and CNN-based image classification to identify trains and rolling stock with high precision.

### Key Features
- **High Reliability**: Accurate train detection even in challenging environments.
- **Server Based Architecture**: Individual features are deployed as microservices in Docker containers on an edge server.
- **Single Page Web UI**: A responsive, Lit-based single-page application for monitoring and configuration.
- **Domain and DNS managed by Cloudflare**: Fully secure local HTTPS subdomains (e.g. `rails49.org`) without external port forwarding.

---

## 🛠 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Deep Learning** | [Fastai](https://docs.fast.ai/), [PyTorch](https://pytorch.org/), [ONNX Runtime](https://onnxruntime.ai/) |
| **Frontend** | [Lit](https://lit.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Backend** | [Node.js](https://nodejs.org/), [Docker](https://www.docker.com/), [MQTT](https://mqtt.org/) |
| **Tooling** | [uv](https://github.com/astral-sh/uv), [pnpm](https://pnpm.io/), [Rsync](https://rsync.samba.org/) |

---

## 🏗 System Architecture

The entire system is managed via Docker Compose on an edge server. The architecture consists of 

* Edge server (a computer capable of running a docker stack)
* A usb camera connected to the track-occupany detector
* [DCC-EX Command Station](https://dcc-ex.com/index.html#gsc.tab=0) connected to the ddc-ex-bridge service on server via USB.
* All external ingress (except port 8051 to the rocrail-server) pass through a traefik proxy. See the [Docker Control Stack Documentation](control/README.md) for detailed configurations of DNS, proxy, SSL, and network administration.

### Service Architecture & Mappings

```mermaid
flowchart TD
    %% Service Interfaces above
    subgraph Interfaces ["Service Interfaces"]
        UI_IF["HTTPS: ui.rails49.org"]
        THROTTLE_IF["HTTPS: throttle.rails49.org"]
        ROCRAIL_IF["HTTPS: rocrail.rails49.org"]
        MQTT_IF["WSS: mqtt.rails49.org"]
        OCC_IF["MQTT Event Bus"]
        BRIDGE_IF["TCP Port 2560"]
        ROCVIEW["RocView or RocControl"]
    end

    %% Services nested inside the Edge Server
    subgraph Server ["Edge Server (Docker Stack)"]
        UI["Web UI"]
        THROTTLE["WebThrottle"]
        ROCRAIL["RocRail Server"]
        MQTT["MQTT Broker"]
        OCCUPANCY["Track Occupancy"]
        BRIDGE["DCC-EX Bridge"]
    end

    %% Model Railroad Hardware
    subgraph Hardware ["Model Railroad Hardware"]
        CAM["Overhead Camera"]
        DCC["DCC-EX Controller"]
    end

    %% Interface mapping to Services
    UI_IF -->|TCP/443| UI
    THROTTLE_IF -->|TCP/443| THROTTLE
    ROCRAIL_IF -->|TCP/443| ROCRAIL
    MQTT_IF -->|TCP/443 & TCP/8883| MQTT
    OCC_IF -->|MQTT TCP 1883| OCCUPANCY
    BRIDGE_IF -->|TCP/2560| BRIDGE

    %% Core interactions & Hardware mapping
    CAM -->|USB Live Video| OCCUPANCY
    OCCUPANCY -->|MQTT TCP 1883 Pub| MQTT
    UI -->|HTTP TCP 3000 API| OCCUPANCY
    THROTTLE <-->|WSS TCP 443 MQTT| MQTT
    ROCRAIL <-->|MQTT TCP 1883 Pub/Sub| MQTT
    BRIDGE <-->|MQTT TCP 1883 Pub/Sub| MQTT
    BRIDGE <-->|USB Serial| DCC
    ROCVIEW <-->|TCP 8051| ROCRAIL
```

---

## 📂 Project Structure & Features

The project is structured into modular components, each with its own comprehensive documentation:

### Getting Started & Installation

*   **[New Edge Server Installation Guide (doc/INSTALL.md)](doc/INSTALL.md)**: Full step-by-step instructions to configure Cloudflare Wildcard DNS, set up environment variables, and deploy the stack onto a fresh edge server.
*   **[Project Tooling and Environment (doc/TOOLING.md)](doc/TOOLING.md)**: Details our Python-TypeScript hybrid development environment, workspace configurations, and key architectural choices (like single-language parsing and environment isolation).

### Core Services & Applications

*   **[Web UI (ui/)](ui/README.md)**: A responsive Lit-based single-page application for model railway monitoring and camera alignment.
*   **[WebThrottle (webthrottle/)](webthrottle/README.md)**: A browser-based virtual DCC throttle optimized for mobile/tablet screens.
*   **[Docker Control Stack (control/)](control/README.md)**: Handles edge server administration, DNS setup, security, Traefik reverse proxy, and NanoMQ MQTT broker.
    *   **[Track Occupancy Detector (control/track-occupancy/)](control/track-occupancy/README.md)**: TS backend that acquires camera feeds, performs ONNX classifier inference, and publishes occupancy states via MQTT. Includes the REST API specification.
    *   **[DCC-EX Bridge (control/dcc-ex-bridge/)](control/dcc-ex-bridge/README.md)**: MQTT/USB gateway that multiplexes commands safely to the DCC-EX Command Station.
    *   **[Rocrail Server (control/rocview-server/)](control/rocview-server/README.md)**: Persistently mounted Rocrail control workspace with automatic nightly Git backups and integration specs.

### Machine Learning Pipeline

*   **[CNN Classifier (cnn/)](cnn/README.md)**: Python environment for training, validating, and exporting the ResNet-18 model to ONNX/ORT format.
*   **[Dataset Preparation (dataset/)](dataset/README.md)**: Tools to extract training image crops from `.r49` railroad layout archives and split datasets deterministically.

### Shared TypeScript Libraries

*   **`lib/`**: Unified helper and schemas packages.
    *   **[`@occupancy/r49` (lib/r49/)](lib/r49/README.md)**: Zod schemas and archive management for `.r49` layout archives.
    *   **[`@occupancy/uid` (lib/uid/)](lib/uid/README.md)**: Snowflake-based alphanumeric unique identifier generator.

---

## 🚀 High-Level Development Workflow

1.  **Model Training**: Prepare the dataset in `dataset/` and train the CNN classifier in `cnn/` to output an optimized `.ort` model. Refer to the [CNN Training Guide](cnn/README.md) and [Dataset Prep Guide](dataset/README.md) for details.
2.  **Frontend Development**: Test and build the Lit components in `ui/` or `webthrottle/`. Refer to the [UI Dev Guide](ui/README.md) and [WebThrottle Dev Guide](webthrottle/README.md).
3.  **Deployment**: Deploy the Docker stack to the server using the workspace deployment script:
    ```bash
    ./deploy.sh
    ```
    *Refer to the [Control Deployment Steps](control/README.md#quickstart) and the [New Edge Server Installation Guide](doc/INSTALL.md) for environment and custom domain configurations. For developer workspace tooling setup, refer to the [Project Tooling Guide](doc/TOOLING.md).*

---

## 📄 License

This project is licensed under the [MIT License](https://opensource.org/license/mit).
