# Rocrail Server in Docker

This directory contains the files to run a Rocrail server in a Docker container.

## Setup Instructions

### 1. Build and Start

**Important!** Setup a router rebind protection exception if your router needs it (e.g. FritzBox).

The Rocrail service is integrated into the main `docker-compose.yml`. The Dockerfile is configured to automatically download the latest Rocrail snapshot during the build process.

```bash
./deploy.sh
```

### 2. Connect with Rocview
From your desktop computer (macOS/Windows/Linux), run the **Rocview** client and connect to the server:

- **Host**: `rocrail.rails49.org` (or the IP of your Mini PC)
- **Port**: `8051`

The Rocrail server monitor is available at [https://rocrail.rails49.org/](https://rocrail.rails49.org/) (no `:8088!).

### 4. Configure DCC-EX Controller
In Rocview:
1. Go to **File > Rocrail Properties**.
2. Select the **Controller** tab.
3. Add a new controller of type `dccpp`.
4. In the properties of the `dccpp` controller:
   - **Hostname**: `dcc-ex-bridge` (This refers to the container name in the Docker network)
   - **Port**: `2560`
5. Click OK and **restart the Rocrail server** (via Docker).

## Layout Workspace
The layout workspace (where `plan.xml` and `rocrail.ini` are stored) is mounted from the host at:
`./control/rocview-server/workspace`

Any changes you make in Rocview and save will be persisted in this directory.
