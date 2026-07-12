# Stage 1: Build Draftwell
FROM ubuntu:24.04 AS builder

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
  curl \
  build-essential \
  pkg-config \
  libwebkit2gtk-4.1-dev \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev \
  file \
  rpm \
  libfuse2 \
  && rm -rf /var/lib/apt/lists/*

# Install Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

# Copy only dependency manifests first (for Docker layer caching)
COPY package.json package-lock.json ./
COPY src-tauri/Cargo.toml src-tauri/Cargo.toml
COPY src-tauri/build.rs src-tauri/build.rs
COPY src-tauri/tauri.conf.json src-tauri/tauri.conf.json
COPY src-tauri/icons/ src-tauri/icons/

# Install npm dependencies
RUN npm ci

# Copy the rest of the source
COPY . .

# Build frontend
RUN npm run build

# Build Tauri application
RUN npm run tauri:build -- --bundles deb,rpm,appimage

# ──────────────────────────────────────────────────────────────
# Stage 2: Export artifacts
FROM scratch AS export
COPY --from=builder /app/src-tauri/target/release/bundle/ /bundle/

# ──────────────────────────────────────────────────────────────
# Stage 3: Development image (includes tools for interactive use)
FROM ubuntu:24.04 AS dev
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
  curl \
  build-essential \
  pkg-config \
  libwebkit2gtk-4.1-dev \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev \
  file \
  git \
  vim \
  && rm -rf /var/lib/apt/lists/*

# Install Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

CMD ["/bin/bash"]
