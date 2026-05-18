# 📡 MQTT Broker (NanoMQ)

This directory contains the configuration for the **NanoMQ** broker, which serves as the central messaging backbone for the entire model railroad automation suite.

## 🌟 Main Functions
- **Pub/Sub Broker**: Routes real-time status and command payloads between all services (DCC-EX Bridge, Track Occupancy, Rocrail, Web UI, and WebThrottles).
- **Multi-Protocol Support**: Handles native MQTT TCP connections as well as WebSockets natively, enabling both edge services and browser-based applications to connect.

---

## 📡 Ingress & Ports

Traefik terminates TLS using wildcard certificates and exposes the broker in three ways:

1. **MQTTS (Secure TCP)**: `mqtt.rails49.org:8883`
   - Encrypted TCP connection for external native clients.
   - Loadbalanced internally to standard port `1883`.
2. **Secure WebSockets (WSS)**: `wss://mqtt.rails49.org` (port `443`)
   - Encrypted WebSocket connection for browser-based apps (e.g. WebThrottle).
   - Loadbalanced internally to port `9001`.
3. **Internal LAN / Docker Network**: `mqtt:1883` (or `localhost:1883` on host LAN)
   - Unencrypted plain TCP for fast service-to-service communication.

---

## 🛠️ Usage & CLI Examples

Use `mosquitto` clients to subscribe or publish to the broker from your desktop or the server.

### Monitor All Network Messages
```bash
mosquitto_sub -h mqtt.rails49.org -p 8883 -t "#" -v --cafile /etc/ssl/cert.pem
```

### Subscribe to DCC-EX Bridge Status
```bash
mosquitto_sub -h mqtt.rails49.org -p 8883 -t "rails49/dcc-ex/#" -v --cafile /etc/ssl/cert.pem
```

### Send a Command to Turn on Track Power
```bash
mosquitto_pub -h mqtt.rails49.org -p 8883 -t "rails49/dcc-ex/cmd" -m "<p1>" --cafile /etc/ssl/cert.pem
```

### Throw Turnout address `10`
```bash
mosquitto_pub -h mqtt.rails49.org -p 8883 -t "rails49/dcc-ex/cmd" -m "<a 10 1>" --cafile /etc/ssl/cert.pem
```

### RocRail Sensor
Set sensor state to on/off (false/true):
```bash
mosquitto_pub -h mqtt.rails49.org -p 8883 -t rocrail/service/client -m '<fb id="fb1" state="true"/>'
```

---

## ⚙️ Configuration
The configuration is stored in [nanomq.conf](nanomq.conf). It is mounted read-only into the NanoMQ container at `/etc/nanomq.conf`.
Key attributes:
- WebSocket listener enabled on port `9001`.
- Native TCP listener enabled on port `1883`.
