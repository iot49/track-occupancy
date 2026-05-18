# 🌐 Web UI & WebThrottle Servers (Nginx)

This directory contains the Nginx configuration to serve the pre-built single-page web applications (SPAs) that form the frontend of the model railroad system.

## 🌟 Main Functions
Two identical lightweight Nginx Alpine containers are deployed:
1. **`nginx-ui`**: Serves the main **Web UI** (built with Lit and TypeScript, located in `ui/dist`), which handles railroad configuration, classifier configuration, and overall layout monitoring.
2. **`nginx-throttle`**: Serves the **WebThrottle** (located in `webthrottle/dist`), a mobile-responsive browser throttle for driving locomotives and triggering turnouts directly.

---

## 📡 Ingress & Subdomains

Traefik terminate HTTPS and routes connections based on subdomains to these containers:

- **Web UI Ingress**: `https://ui.rails49.org`
  - Routes to container `nginx-ui:80`
  - Secured with Local IP IP-whitelisting middleware.
- **WebThrottle Ingress**: `https://throttle.rails49.org`
  - Routes to container `nginx-throttle:80`
  - Secured with Local IP IP-whitelisting middleware.

---

## 🛠️ Usage & Build Instructions

Because these containers serve static pre-built production files, the assets must be compiled locally before deployment or during the CI pipeline.

To build both interfaces in the repository root:
```bash
# Install dependencies
pnpm install

# Compile both Web UI and WebThrottle apps
pnpm run build
```

This populates:
- `ui/dist` (mounted to `nginx-ui`)
- `webthrottle/dist` (mounted to `nginx-throttle`)

---

## ⚙️ Configuration
Both containers share the same basic configuration located in [default.conf](default.conf), which is mounted read-only into `/etc/nginx/conf.d/default.conf`.
Key attributes:
- Exposes port `80` internally.
- Serves static files from `/usr/share/nginx/html`.
- Includes fallback rules to redirect all undefined paths to `index.html` (supporting SPA HTML5 client-side routing).
