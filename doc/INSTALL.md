# 🚀 New Edge Server Deployment & Custom Domain Installation Guide

This guide explains how to deploy the model railway IoT control stack to a **fresh edge server** on a new, custom domain (e.g., `example49.com`). 

Following the parameterization updates, the entire stack—including wildcard Let's Encrypt certificates, reverse proxy routing, secure redirects, frontends, and backend APIs—is fully configured from a single master `.env` file.

---

## 📋 Prerequisites

Before starting, ensure you have:
1.  **A Local Edge Server**: A Raspberry Pi, Intel NUC, or mini PC running Debian, Ubuntu, or Raspberry Pi OS on your local network (LAN).
2.  **SSH Key Authentication**: Setup SSH access to your edge server using SSH keys (highly recommended so `deploy.sh` works seamlessly without passwords).
3.  **Docker & Docker Compose**: Installed on the edge server.
4.  **A Cloudflare Account**: Managing your custom domain (e.g., `example49.com`).
5.  **Cloudflare DNS API Token**: An API token created with `Zone:DNS:Edit` permissions for your domain's zone.

---

## 🛠️ Step 1: DNS Setup in Cloudflare

Because our model railway control stack runs on your local network (LAN) but uses a real, verified domain for SSL/TLS, we point our subdomains directly to the server's local network IP. This keeps your system **100% secure and invisible to the public internet** while providing valid HTTPS encryption.

1.  Log in to your **Cloudflare Dashboard**.
2.  Go to the **DNS Settings** for your domain (`example49.com`).
3.  Add a wildcard **A Record**:
    *   **Type**: `A`
    *   **Name**: `*` (resolves all subdomains like `ui.`, `throttle.`, `mqtt.`)
    *   **IPv4 Address**: The local network IP of your edge server (e.g., `192.168.1.50`).
        * **NOTE**: some routers require configuring "DNS Rebind Connection" for each subdomain (ui.rails49.org, mqtt.rails49.org, tec). On FritzBox this is set at Network > Advanced Network Settings > DNS Rebind Protection.
    *   **Proxy Status**: 🔴 **DNS Only** (do not proxy, as local network IPs cannot be proxied by Cloudflare's servers). I.e.\ although DNS is resolved in the cloud, the application is accessible only locally. Configure a `cloudflared` tunnel for external access - but in this case also implement an authorization strategy!

> [!TIP]
> This wildcard record ensures that any device on your home network can type `https://ui.example49.com` and have their browser resolve it straight to your local server!

---

## ⚙️ Step 2: Configure the Local Master `.env`

1.  In your local project root directory, copy the unified environment blueprint:
    ```bash
    cp .env.example .env
    ```
2.  Open the newly created `.env` file and configure the target domain:
    ```env
    # Domain configuration
    RAILS_DOMAIN=example49.com
    ```
3.  Insert your **Cloudflare API Token** credentials so Traefik can solve the Let's Encrypt DNS-01 wildcard challenge:
    ```env
    # Traefik & SSL (Cloudflare DNS-01 challenge credentials)
    CF_DNS_API_TOKEN=your-actual-cloudflare-api-token
    CF_API_EMAIL=your-cloudflare-account-email@example.com
    ```

---

## 🚀 Step 3: Configure `deploy.sh` Target

The `./deploy.sh` script automatically deploys the stack to the SSH host configured in the script.

1.  Open [deploy.sh](file:///Users/boser/iot/track-occupancy/deploy.sh) and check the configuration at the top:
    ```bash
    # Configuration
    REMOTE_HOST="rails49"
    REMOTE_DIR="~/track-occupancy"
    ```
2.  Either update `REMOTE_HOST` to your new server's IP/hostname, or (recommended) add a host alias to your local SSH configuration file (`~/.ssh/config`):
    ```ssh
    Host rails49
      HostName 192.168.1.50   # Replace with your edge server's actual LAN IP
      User ttmetro            # Replace with your edge server SSH username
      IdentityFile ~/.ssh/id_rsa
    ```

---

## 📦 Step 4: Build and Deploy

Run the deployment script from your local machine. If this is a fresh setup or you have new dependencies, run with the `BUILD=1` flag:

```bash
BUILD=1 ./deploy.sh
```

### What happens under the hood?
1.  **Frontend Compilation**: Compiles the Lit-Element Web UI (`ui/dist`) and WebThrottle (`webthrottle/dist`) locally.
2.  **Environment Syncing**: Securely copies the local master `.env` file to two remote locations:
    *   `~/track-occupancy/.env` (server root)
    *   `~/track-occupancy/control/.env` (Docker compose root)
3.  **Container Building & Restart**: Triggers Docker Compose on the remote edge server to build the Custom DCC-EX Bridge, Rocrail snapshot, and Occupancy Detector images, then launches the entire ingress routing stack.

---

## 🔑 Step 5: Access the Services

Once deployment completes, Traefik will request a wildcard certificate for `*.example49.com`. Within about 30 seconds, you can securely access all services over HTTPS on your local network:

| Ingress Host | Service | Protocol | Description |
| :--- | :--- | :--- | :--- |
| **`https://ui.example49.com`** | Web UI Dashboard | HTTPS | Main control board and detector camera monitor |
| **`https://throttle.example49.com`** | WebThrottle SPA | HTTPS | Mobile-friendly throttle UI for driving locomotives |
| **`https://rocrail.example49.com`** | Rocrail Monitor | HTTPS | Rocrail Server Monitor and statistics |
| **`https://traefik.example49.com`** | Traefik Dashboard | HTTPS | Reverse proxy and TLS certificate statuses |
| **`wss://mqtt.example49.com`** | NanoMQ Broker | WSS | Secure WebSocket connection for frontends |
| **`mqtt.example49.com:8883`** | NanoMQ Broker | MQTTS | Secure TCP connection for CLI client testing |

---

## 🔍 Troubleshooting & Diagnostics

### Verifying Wildcard DNS Resolution
Verify that your wildcard subdomains resolve to your edge server's LAN IP:
```bash
nslookup ui.example49.com
```
*(Should return your edge server's local IP, e.g., `192.168.1.50`)*

### Checking Traefik Certificate Ingress Logs
If HTTPS is not instantly active, check Traefik's logs on the edge server to monitor the Cloudflare API DNS challenge progress:
```bash
ssh rails49 "cd ~/track-occupancy/control && docker compose logs traefik"
```

### Quick MQTT TLS Connection Test
Verify the secure MQTT broker connection by publishing a test message:
```bash
mosquitto_pub -h mqtt.example49.com -p 8883 -t "rocrail/service/client" -m '<fb id="fb1" state="true"/>'
```
