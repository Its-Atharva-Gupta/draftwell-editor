# Building Draftwell from Source

This guide covers building Draftwell on every supported platform, including cross-compilation for different architectures.

---

## Table of Contents

- [Prerequisites](#prerequisites)
  - [Linux](#linux)
  - [macOS](#macos)
  - [Windows](#windows)
  - [All Platforms](#all-platforms)
- [Quick Build](#quick-build)
- [Target-Specific Builds](#target-specific-builds)
  - [Linux x86_64 (.deb, .rpm, .AppImage)](#linux-x86_64-deb-rpm-appimage)
  - [Linux aarch64 (ARM64)](#linux-aarch64-arm64)
  - [macOS Apple Silicon (.dmg)](#macos-apple-silicon-dmg)
  - [macOS Intel (.dmg)](#macos-intel-dmg)
  - [macOS Universal Binary (.dmg)](#macos-universal-binary-dmg)
  - [Windows x86_64 (.msi)](#windows-x86_64-msi)
  - [Windows aarch64 (ARM64) (.msi)](#windows-aarch64-arm64-msi)
- [Flatpak Build](#flatpak-build)
- [Docker Build Environment](#docker-build-environment)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Linux

```bash
# Debian / Ubuntu / Pop!_OS / Linux Mint
sudo apt update
sudo apt install \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev

# For RPM builds
sudo apt install rpm

# For AppImage builds
sudo apt install libfuse2

# For ARM64 cross-compilation (see below)
sudo apt install gcc-aarch64-linux-gnu g++-aarch64-linux-gnu

# Rust target (do this after installing Rust via rustup)
rustup target add aarch64-unknown-linux-gnu
```

#### Fedora / RHEL

```bash
sudo dnf install \
  webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libxdo-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  libsoup3-devel \
  javascriptcoregtk4.1-devel

# For RPM builds (already installed)
# For ARM64 cross-compilation
sudo dnf install gcc-aarch64-linux-gnu binutils-aarch64-linux-gnu
```

#### Arch Linux

```bash
sudo pacman -S \
  webkit2gtk-4.1 \
  base-devel \
  curl \
  wget \
  file \
  libxdo \
  openssl \
  libappindicator-gtk3 \
  librsvg \
  libsoup3 \
  javascriptcoregtk

# For ARM64 cross-compilation
sudo pacman -S aarch64-linux-gnu-gcc
```

### macOS

```bash
# Xcode Command Line Tools
xcode-select --install

# Rust targets
rustup target add aarch64-apple-darwin
rustup target add x86_64-apple-darwin
```

### Windows

1. Install [Visual Studio 2022 Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with:
   - "Desktop development with C++" workload
   - Windows 11 SDK
   - MSVC v143 build tools

2. Install [Rust for Windows](https://rustup.rs) and add targets:

```powershell
rustup target add x86_64-pc-windows-msvc
rustup target add aarch64-pc-windows-msvc
```

3. WebView2 is already included on Windows 10 (version 1803+) and Windows 11. No additional install needed.

### All Platforms

```bash
# Node.js 18+ and npm
# Download from https://nodejs.org or use nvm: https://github.com/nvm-sh/nvm

# Rust (via rustup)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Required tools
cargo install cargo-audit    # optional: for security auditing
```

---

## Quick Build

Once prerequisites are installed, building is the same on all platforms:

```bash
git clone https://github.com/Its-Atharva-Gupta/draftwell-editor.git
cd draftwell-editor
npm install
npm run tauri:build
```

The output bundles will be in `src-tauri/target/release/bundle/`.

---

## Target-Specific Builds

### Linux x86_64 (.deb, .rpm, .AppImage)

```bash
# Build all bundle types
npm run tauri:build -- --bundles deb,rpm,appimage

# Or build just one type
npm run tauri:build -- --bundles deb
npm run tauri:build -- --bundles rpm
npm run tauri:build -- --bundles appimage

# Output locations:
# src-tauri/target/release/bundle/deb/draftwell_*.deb
# src-tauri/target/release/bundle/rpm/draftwell-*.rpm
# src-tauri/target/release/bundle/appimage/draftwell_*.AppImage
```

### Linux aarch64 (ARM64)

Cross-compile from an x86_64 machine:

```bash
# Install cross-compilation tools
sudo apt install gcc-aarch64-linux-gnu g++-aarch64-linux-gnu pkg-config-aarch64-linux-gnu
rustup target add aarch64-unknown-linux-gnu

# Create .cargo/config.toml for cross-compilation
mkdir -p .cargo
cat > .cargo/config.toml << 'EOF'
[target.aarch64-unknown-linux-gnu]
linker = "aarch64-linux-gnu-gcc"
EOF

# Install ARM64 system libraries (you'll need a sysroot)
# The easiest approach is to use the Docker build environment (see below)
# or build natively on an ARM64 machine (Raspberry Pi 4/5, AWS Graviton, etc.)
```

**Recommended approach:** Use the Docker build environment (see below) for ARM64 cross-compilation.

### macOS Apple Silicon (.dmg)

Build natively on an Apple Silicon Mac:

```bash
# Build for native architecture (aarch64)
npm run tauri:build

# Or explicitly
npm run tauri:build -- --target aarch64-apple-darwin
```

### macOS Intel (.dmg)

```bash
# On an Intel Mac (native)
npm run tauri:build

# On Apple Silicon, cross-compile for Intel:
npm run tauri:build -- --target x86_64-apple-darwin
```

### macOS Universal Binary (.dmg)

Install both Rust targets and let Tauri produce a real universal application and DMG:

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run tauri:build -- --target universal-apple-darwin --bundles dmg
```

### Windows x86_64 (.msi)

```powershell
# On a Windows x64 machine
npm run tauri:build
```

### Windows aarch64 (ARM64)

Cross-compile from an x64 Windows machine:

```powershell
rustup target add aarch64-pc-windows-msvc
npm run tauri:build -- --target aarch64-pc-windows-msvc
```

---

## Flatpak Build

Draftwell can be distributed as a Flatpak, which bundles its dependencies (including WebKitGTK) through the GNOME runtime.

### Prerequisites

```bash
# Install Flatpak and Flatpak-builder
sudo apt install flatpak flatpak-builder

# Add Flathub and the GNOME SDK
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install --user flathub org.gnome.Platform//50 org.gnome.Sdk//50
```

### Build

```bash
# From the project root
npm ci
npm run tauri:build -- --no-bundle --ci

flatpak-builder \
  --user \
  --force-clean \
  --repo=flatpak-repo \
  flatpak-build-dir \
  flatpak/com.draftwell.editor.yml

flatpak build-bundle \
  flatpak-repo \
  draftwell.flatpak \
  com.draftwell.editor \
  --runtime-repo=https://flathub.org/repo/flathub.flatpakrepo

# Install the bundle for local testing
flatpak install --user ./draftwell.flatpak

# Run
flatpak run com.draftwell.editor
```

The resulting bundle contains Draftwell itself. Flatpak installs the referenced GNOME runtime from Flathub when needed.

---

## Docker Build Environment

For reproducible builds and cross-compilation, use the included Docker setup:

### Multi-Arch Build

```bash
# Build for all Linux architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --output type=local,dest=./out \
  -f Dockerfile \
  .
```

### Dockerfile

Create a `Dockerfile` in the project root:

```dockerfile
FROM ubuntu:24.04 AS base

RUN apt-get update && apt-get install -y \
  curl \
  build-essential \
  libwebkit2gtk-4.1-dev \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev \
  file \
  && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app
COPY . .

RUN npm install
RUN npm run tauri:build

CMD ["cp", "-r", "src-tauri/target/release/bundle", "/out"]
```

---

## Verification

After building, verify the application:

```bash
# Run tests
npm test
cargo test --manifest-path src-tauri/Cargo.toml

# Verify the binary
./src-tauri/target/release/draftwell --version

# Lint
cargo clippy --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check

# Security audit
npm audit
cargo audit --manifest-path src-tauri/Cargo.toml
```

---

## Troubleshooting

### `WebKitGTK not found` on Linux

```bash
# Make sure you installed the correct version
sudo apt install libwebkit2gtk-4.1-dev
# Note: it's 4.1, not 4.0
```

### `linker not found` during cross-compilation

Ensure you have the cross-compilation toolchain installed and configured in `.cargo/config.toml`.

### `JavaScriptCore not found` on Linux

```bash
sudo apt install libjavascriptcoregtk-4.1-dev
```

### Build fails with `GLib` or `GObject` errors

Ensure `libsoup-3.0-dev` and `libjavascriptcoregtk-4.1-dev` are installed.

### `Unable to find WebView2` on Windows

Windows 10 (1803+) and Windows 11 include WebView2 by default. If you're on an older build, download the [Evergreen WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

### `npm run tauri:build` hangs or is slow

The first build downloads and compiles Rust dependencies. This is normal. Subsequent builds will be much faster thanks to incremental compilation and the Cargo registry cache.

---

## CI/CD Reference

Draftwell uses GitHub Actions for automated builds. See [.github/workflows/build.yml](.github/workflows/build.yml) for the full pipeline configuration. Linting and tests run for pushes and pull requests; platform packages, checksums, and GitHub Releases are produced only for `v*` tags.
