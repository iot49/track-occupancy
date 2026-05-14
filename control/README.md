# Rails49: Train Control

Docker stack supporting autonomous operation of model railroads.

## Architecture

Rails49 uses a microservices architecture managed by Docker Compose. Traefik acts as the central gateway, providing TLS termination and subdomain-based routing.

**Security Note:** This stack is designed for **Local Network Use Only**. It does not include authentication. Traefik is configured with an IP Whitelist to reject any connections originating from outside your private local network.

### Hardware & OS (Server)

* **Mini PC**: KAMRUI JK06 Fanless Mini PC
  * Intel 11th Gen N5100, 8GB DDR4, 256GB ROM, Dual WiFi / LAN / USB 3.0 / Type C
* **Operating System**: Ubuntu
* **Access**: `ssh blocks`
  ```ssh-config
  Host blocks
      HostName blocks49.local
      User ttmetro
  ```

### DNS Setup

Add a **wildcard A record** in Cloudflare: `*.rails49.org → <server-LAN-IP>` (e.g., `192.168.1.50`).

![alt text](images/README/image-1.png)

By pointing the domain to a **Private LAN IP**, the subdomains will resolve only for devices inside your home network. External users will see a private IP they cannot reach. 

This setup allows you to use real SSL certificates (for camera/microphone features in the browser) without ever exposing your services to the internet.

Also disable DNS Rebind Protection on the Router (e.g. FritzBox):

![alt text](images/README/image.png)

---

## Services

### Traefik (Gateway)

Dynamic reverse proxy and TLS termination.

* **Routing**: Subdomain-based (`ui.rails49.org`, `mqtt.rails49.org`, …).
* **SSL**: Wildcard certificate via Cloudflare DNS-01 challenge.
* **Dashboard**: `https://traefik.rails49.org`
* **Ports**: 80 (→ 443 redirect), 443 (HTTPS/WSS), 8883 (MQTTS), 2560 (DCC-EX TCP)

Config files: [`traefik/traefik.yaml`](traefik/traefik.yaml), [`traefik/dynamic_conf.yaml`](traefik/dynamic_conf.yaml)

---

### MQTT (NanoMQ)

The primary messaging backbone.

* `mqtt.rails49.org:8883` — native MQTT over TLS (for native clients)
* `wss://mqtt.rails49.org:443` — MQTT over Secure WebSockets (for browser UI)
* `mqtt://localhost:1883` — plain MQTT on the LAN (container-to-container)

Config: [`mqtt/nanomq.conf`](mqtt/nanomq.conf)

```
mosquitto_sub -h mqtt.rails49.org -p 8883 -t "#"                -v --cafile /etc/ssl/cert.pem
mosquitto_sub -h mqtt.rails49.org -p 8883 -t "rails49/dcc-ex/#" -v --cafile /etc/ssl/cert.pem

mosquitto_pub -h mqtt.rails49.org -p 8883 -t "rails49/dcc-ex/cmd" -m "<s>" --cafile /etc/ssl/cert.pem
mosquitto_pub -h mqtt.rails49.org -p 8883 -t "rails49/dcc-ex/cmd" -m "<s>" --cafile /etc/ssl/cert.pem

mosquitto_pub -h mqtt.rails49.org -p 8883 -t "rails49/dcc-ex/cmd" -m "<t 10 0 0>" --cafile /etc/ssl/cert.pem
mosquitto_pub -h mqtt.rails49.org -p 8883 -t "rails49/dcc-ex/cmd" -m "<t 10 12 0>" --cafile /etc/ssl/cert.pem

```

---

### nginx (UI)

Serves the pre-built Lit UI from `../ui/dist` at `https://ui.rails49.org`.

`https://rails49.org` redirects to `https://ui.rails49.org`.

Build the UI first:
```bash
cd ../..
pnpm run build
```

Config: [`nginx/Dockerfile`](nginx/Dockerfile)

---

### Track Occupancy Detector

TypeScript service (`@occupancy/detector`) that:

1. Loads an `.r49` layout file (defines detection-point geometry and scale).
2. Periodically fetches a JPEG frame from an IP camera or USB camera endpoint.
3. Classifies each detection point using the ONNX model (`@occupancy/classifier/node`).
4. Publishes results to `rails49/occupancy/status` on MQTT.
5. API:
    * GET /api/snapshot: camera snapshot
    * GET/POST /api/r49: load/save r49 file used by classifier

**TODO**: update - remove unused variables, and add the ones actually used, and ones missing, e.g. DOMAIN=rails49.org

**Key environment variables** (see [`.env.example`](.env.example)):

| Variable | Default | Description |
|---|---|---|
| `MQTT_HOST` | `mqtt` | MQTT broker hostname |
| `R49_PATH` | `/data/layout.r49` | Path to the .r49 layout file |
| `MODEL_PATH` | `/data/model.ort` | Path to the ONNX model |
| `CAMERA_URL` | *(empty)* | HTTP snapshot URL of the camera |
| `INTERVAL_MS` | `1000` | Detection interval in milliseconds |

Source: [`track-occupancy/src/`](track-occupancy/src/)

---

### DCC-EX Bridge

Bridges the DCC-EX command station (USB serial `/dev/ttyUSB0`) with MQTT and a raw
TCP socket on port 2560 (for Rocrail / JMRI).

This service acts as a **Command-Aware Multiplexer**. It buffers data from each client independently and only forwards complete `<...>` packets to the serial port, ensuring that commands from multiple sources never interleave or get garbled.

* **TCP Server**: `dcc-ex.rails49.org:2560` (native DCC-EX protocol)
* **MQTT Commands**: Subscribe to `rails49/dcc-ex/cmd`
* **MQTT Status**: Published to `rails49/dcc-ex/status/<OPCODE>` and `rails49/dcc-ex/status/raw`

Config: [`dcc-ex-bridge/`](dcc-ex-bridge/)

---

## Quickstart

```bash
# 1. Copy and fill in the secrets
cp .env.example .env

# 2. Build the UI
cd ../.. && pnpm run build && cd control

# 3. Start the stack
docker compose up -d

# 4. Follow logs
docker compose logs -f
```

---

## DCC-EX Protocol Reference

A simplified subset of the [DCC-EX Command Summary](https://dcc-ex.com/reference/software/command-summary-consolidated.html).

### System Status

```text
<s>
```

Example responses:
```text
<iDCC-EX V-5.4.16 / ESP32 / EXCSB1_WITH_EX8874 G-devel-202504182148Z>
<p1 A>
<p1>
<p1 JOIN>
<@ 0 2 "Power On JOIN">
```

### Accessories / Turnouts

```text
<a addr activate>
```

* `addr`: DCC address (1–2044)
* `activate`: `1` = thrown, `0` = closed

**DP1 Turnout Motor** (set address to `10`, factory default `5`):
1. Hold button 5 s until LED blinks rapidly.
2. Send `<a 10 0>`. LED stops blinking.

### Locomotives

**Speed & Direction**:
```text
<t cab speed dir>
```
* `cab`: DCC address
* `speed`: 0–127 (or `-1` for Emergency Stop)
* `dir`: `1` = forward, `0` = reverse

**Functions**:
```text
<F cab funct state>
```
* `funct`: 0–68 (`0` = headlight)
* `state`: `1` = on, `0` = off