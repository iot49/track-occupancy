# 🎛️ DCC-EX Bridge Service

This service bridges the physical **DCC-EX Command Station** (connected over USB serial `/dev/ttyUSB0`) with the Docker network, exposing both a raw TCP socket and an MQTT interface.

## 🌟 Main Functions
- **Command-Aware Multiplexing**: Acts as a safe multiplexer. It buffers data from multiple clients independently and guarantees that only complete, valid `<...>` DCC-EX packets are sent to the serial port. This prevents interleaved or corrupted commands when multiple throttles/controllers send instructions simultaneously.
- **MQTT Gateway**: Translates incoming MQTT messages into DCC serial commands, and broadcasts serial replies back to specific MQTT status topics.
- **TCP Socket Hosting**: Emulates a native DCC-EX network shield, allowing clients like Rocrail, JMRI, or WebThrottle to connect directly.

---

## 📡 Ingress & Ports

- **TCP Ingress**: Port `2560`
  - Internal Docker DNS: `dcc-ex-bridge:2560`
  - External Access: Routed via Traefik to `dcc-ex.rails49.org:2560` (secured with local IP whitelist rules).

---

## 🛠️ Usage & Integration

### 1. Connecting TCP Clients (Rocrail, JMRI)
Point your client to the bridge's hostname and port:
- **Host**: `dcc-ex.rails49.org` (or `dcc-ex-bridge` if inside the Docker network)
- **Port**: `2560`

### 2. MQTT Topic Reference

#### Send Commands
Publish raw DCC-EX packets to:
```text
rails49/dcc-ex/cmd
```
*Example payloads:*
- `<s` -> System status query
- `<p1>` -> Power on
- `<p0>` -> Power off
- `<t 10 40 1>` -> Drive locomotive address `10` at speed `40` forward.

#### Receive Feedback
Subscribe to:
```text
rails49/dcc-ex/status/#
```
*Key status subtopics:*
- `rails49/dcc-ex/status/raw` -> Raw serial output stream from the DCC-EX controller.
- `rails49/dcc-ex/status/<OPCODE>` -> Filtered outputs grouped by command type.

---

## ⚙️ Configuration (Environment Variables)

Configured inside `docker-compose.yml`:
- `MQTT_HOST`: Hostname of the MQTT broker (default: `mqtt`).
- `SERIAL_PORT`: Host serial device bound to the container (default: `/dev/ttyUSB0`).
