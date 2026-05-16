FROM debian:bookworm-slim

# Install dependencies
# - curl/unzip: for downloading/extracting
# - libssl-dev: required by some Rocrail modules
# - libc6, libgcc1, libstdc++6: standard libs
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    libssl-dev \
    libwxbase3.2-1 \
    libusb-1.0-0 \
    libsm6 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set up workspace
WORKDIR /workspace

# TODO: choose correct binary depending on cpu architecture (x86, arm, ...)
# Download and install Rocrail
# We use the latest Ubuntu x86_64 snapshot which is compatible with Debian Bookworm
RUN curl -L -o /tmp/rocrail.zip https://wiki.rocrail.net/rocrail-snapshot/Debian/Rocrail-ubuntu24-i64.zip && \
    unzip /tmp/rocrail.zip -d /opt/rocrail && \
    chmod +x /opt/rocrail/bin/rocrail && \
    rm /tmp/rocrail.zip

# Create a symlink for the rocrail binary
RUN ln -s /opt/rocrail/bin/rocrail /usr/local/bin/rocrail

# Expose ports:
# 8051: Rocview client
# 8088: Web server
EXPOSE 8051 8088

# Run Rocrail in console mode, using the /workspace directory
CMD ln -sf /opt/rocrail/web /workspace/web && \
    rocrail -nodevcheck -w /workspace -l /opt/rocrail/bin -img /opt/rocrail/svg
