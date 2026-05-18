# 🎚️ Gateway & Reverse Proxy (Traefik v3)

This directory contains the configuration files for **Traefik**, the reverse proxy and security gateway for the entire model railroad Docker stack.

## 🌟 Main Functions
- **Subdomain Reverse Proxy**: Dynamically routes connections from wildcard subdomains (`*.rails49.org`) to their target containers.
- **TLS/SSL Wildcard Management**: Automatically obtains, terminates, and renews a single wildcard SSL/TLS certificate for `*.rails49.org` using Let's Encrypt and the **Cloudflare DNS-01** challenge.
- **Local Network Security Enforcement**: Enforces an IP whitelist middleware (`local-only`), rejecting any connection attempt that originates outside your private LAN. This allows you to use valid HTTPS/WSS subdomains without exposing your railway to the public internet.

---

## 📡 Exposed Ingress & Entrypoints

Traefik binds directly to the server host's network interfaces on the following ports:

| Port | Entrypoint | Protocol | Subdomain Pattern | Target Service |
| :--- | :--- | :--- | :--- | :--- |
| `80` | `web` | HTTP | *(Any)* | Auto-redirects to `HTTPS` (443) |
| `443` | `websecure` | HTTPS / WSS | `ui.${RAILS_DOMAIN}` <br> `throttle.${RAILS_DOMAIN}` <br> `rocrail.${RAILS_DOMAIN}` | Lit Web UI (`nginx-ui:80`) <br> WebThrottle (`nginx-throttle:80`) <br> Rocrail Monitor (`rocrail:8008`) |
| `8883` | `mqtts` | TCP + TLS | `mqtt.${RAILS_DOMAIN}` | NanoMQ Broker (`mqtt:1883`) |
| `2560` | `dcc` | Raw TCP | `dcc-ex.${RAILS_DOMAIN}` | DCC-EX Bridge (`dcc-ex-bridge:2560`) |

Additionally, the Traefik Admin Dashboard is exposed securely at:
👉 **`https://traefik.${RAILS_DOMAIN}`**

---

## ⚙️ Configuration Files

The gateway uses two key configuration files in this directory:

1. **[traefik.yaml](traefik.yaml) (Static Configuration)**:
   - Sets up entrypoints (ports), certificate providers (Let's Encrypt), and DNS resolvers (Cloudflare).
2. **[dynamic_conf.yaml](dynamic_conf.yaml) (Dynamic Routing)**:
   - Sets up middleware definitions.
   - Defines the `local-only` and `local-only-tcp` IP whitelist parameters (allowing access only from `192.168.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`, and local Docker bridges).

---

## 🔑 Prerequisites & Environment

Traefik requires the following keys in your `.env` file to perform the DNS challenge to authenticate ownership of your domain:
- `CF_DNS_API_TOKEN`: Your Cloudflare API token (with DNS edit permissions).
- `CF_API_EMAIL`: Your Cloudflare account email address.
