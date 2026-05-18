# 🚂 WebThrottle — Browser-Based DCC Locomotive Controller

A Lit-based single-page application that provides a simplistic DCC throttle in the browser, enabling wireless locomotive control through the existing Rails49 MQTT infrastructure.

**NOTE**: Programs such as RocRail or RocControl provide more functionality.

## Overview

WebThrottle replaces the need for a dedicated hardware throttle by turning any browser (phone, tablet, laptop) into a fully functional DCC controller. It communicates with the DCC-EX command station through the [DCC-EX Bridge](../control/dcc-ex-bridge/), using MQTT over Secure WebSockets — the same messaging backbone that powers the rest of the Rails49 stack.

### Key Features

| Feature | Description |
| :--- | :--- |
| **Speed Control** | Smooth slider (0–126) with real-time feedback |
| **Direction Toggle** | Forward / Reverse with visual indicator |
| **Headlight Toggle** | Function 0 (headlight) on/off |
| **Stop** | Sets speed to 0 (coast to stop) |
| **Emergency Break** | Sends speed `-1` for immediate halt |
| **Address Selection** | Set the DCC cab address for the target locomotive |

---

## Architecture

```
┌──────────────┐    WSS (443)    ┌────────────┐    MQTT    ┌──────────────┐    Serial    ┌──────────┐
│  Browser     │ ◄─────────────► │  NanoMQ    │ ◄────────► │  DCC-EX      │ ◄──────────► │  Command │
│  WebThrottle │                 │  Broker    │            │  Bridge      │              │  Station │
└──────────────┘                 └────────────┘            └──────────────┘              └──────────┘
```

### Data Flow

1. **Browser → Command Station**: The throttle publishes DCC-EX commands (e.g. `<t 10 50 1>`) to MQTT topic `rails49/dcc-ex/cmd` via Secure WebSockets (`wss://mqtt.rails49.org`).
2. **Command Station → Browser**: The bridge publishes responses to `rails49/dcc-ex/status`. The throttle subscribes to this topic for real-time state feedback.

### Connection Details

| Parameter | Value |
| :--- | :--- |
| **Broker** | `wss://mqtt.rails49.org` (port 443, TLS via Traefik) |
| **Command Topic** | `rails49/dcc-ex/cmd` |
| **Status Topic** | `rails49/dcc-ex/status` |
| **MQTT Prefix** | `rails49` (configurable) |

---

## DCC-EX Command Reference

All commands use the DCC-EX native protocol (`<...>` framing). The bridge validates and forwards only well-formed packets.

### Speed & Direction

```
<t cab speed dir>
```

| Parameter | Range | Description |
| :--- | :--- | :--- |
| `cab` | 1–10293 | DCC address of the locomotive |
| `speed` | 0–126, or `-1` | Speed step (`0` = stop, `-1` = emergency stop) |
| `dir` | `1` / `0` | `1` = forward, `0` = reverse |

**Examples:**
```
<t 10 50 1>     ← Loco 10, speed 50, forward
<t 10 0 1>      ← Loco 10, coast stop
<t 10 -1 1>     ← Loco 10, emergency stop
```

### Functions (Headlight, Horn, etc.)

```
<F cab func state>
```

| Parameter | Range | Description |
| :--- | :--- | :--- |
| `cab` | 1–10293 | DCC address |
| `func` | 0–68 | Function number (`0` = headlight) |
| `state` | `1` / `0` | `1` = on, `0` = off |

**Examples:**
```
<F 10 0 1>      ← Loco 10, headlight ON
<F 10 0 0>      ← Loco 10, headlight OFF
```

### System Status

```
<s>              ← Request command station status
```

---

## Technology Stack

| Layer | Choice | Notes |
| :--- | :--- | :--- |
| **Components** | [Lit](https://lit.dev/) | Same framework as [`../ui`](../ui) |
| **Language** | TypeScript | Workspace-wide standard |
| **Bundler** | [Vite](https://vitejs.dev/) | Dev server with HMR |
| **MQTT Client** | [mqtt.js](https://github.com/mqttjs/MQTT.js) | WebSocket transport for browser |
| **Package Manager** | pnpm | Workspace member at `webthrottle` |

---

## UI Design

The interface should be optimised for single-hand operation on a mobile device, inspired by physical DCC throttle layouts:

- **Large speed slider** — vertical or radial, dominating the screen
- **Direction button** — prominent toggle (FWD / REV)
- **Headlight button** — on/off with visual glow state
- **Stop / E-Stop** — large, clearly differentiated buttons (e.g. amber vs red)
- **Address input** — compact, top-of-screen, with presets/history
- **Connection indicator** — MQTT status (connected / disconnected / error)
- **Dark theme** — consistent with the main UI at `ui.rails49.org`

---

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Development

```bash
cd webthrottle
pnpm dev          # HTTPS on port 5174
pnpm dev:http     # HTTP (no self-signed cert warning)
```

### Run tests

```bash
pnpm test
```

### Build for production

```bash
pnpm build
```

### Deployment

Serve via nginx as a separate subdomain (`throttle.rails49.org`).

---

## Project Structure

```
webthrottle/
├── index.html              Entry point
├── src/
│   ├── index.css           Design tokens & global reset
│   ├── wt-app.ts           Root app shell (composes all components)
│   ├── wt-speed-slider.ts  Vertical touch slider
│   ├── wt-status.ts        Connection status indicator
│   ├── mqtt-service.ts     MQTT client wrapper
│   └── dcc-commands.ts     Pure command builder helpers
├── tests/
│   └── dcc-commands.test.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```
