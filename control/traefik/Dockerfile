FROM traefik:v3
COPY control/traefik/traefik.yaml /etc/traefik/traefik.yaml
COPY control/traefik/dynamic_conf.yaml /etc/traefik/dynamic_conf.yaml
RUN mkdir -p /letsencrypt && chmod 700 /letsencrypt
