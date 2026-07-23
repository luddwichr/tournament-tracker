# https://hub.docker.com/layers/library/debian/trixie-slim/
FROM docker.io/library/debian:trixie-slim@sha256:020c0d20b9880058cbe785a9db107156c3c75c2ac944a6aa7ab59f2add76a7bd

# https://nodejs.org/en/about/previous-releases
ARG NODE_VERSION=24.18.0
# https://github.com/npm/cli/releases
# Installed over the Node-bundled npm, because Node no longer bumps npm majors within a release line.
# Keep in sync with engines.npm in package.json, which Renovate groups together under "npm".
ARG NPM_VERSION=12.0.1
# https://github.com/astral-sh/uv/releases
ARG UV_VERSION=0.11.29
# https://www.python.org/downloads/
ARG PYTHON_VERSION=3.14.6
# https://playwright.dev/docs/release-notes
# Keep in sync with @playwright/test in package.json.
ARG PLAYWRIGHT_VERSION=1.61.1
# https://www.npmjs.com/package/@playwright/cli?activeTab=versions
# Versioned independently of @playwright/test and playwright.
# Do NOT assume it tracks PLAYWRIGHT_VERSION.
ARG PLAYWRIGHT_CLI_VERSION=0.1.17
# https://github.com/opengrep/opengrep/releases
# Keep in sync with OPENGREP_VERSION in .github/workflows/ci.yml.
ARG OPENGREP_VERSION=1.25.0
# https://github.com/gitleaks/gitleaks/releases
# Keep in sync with GITLEAKS_VERSION in .github/workflows/ci.yml.
ARG GITLEAKS_VERSION=8.30.1
# https://github.com/zizmorcore/zizmor/releases
# Keep in sync with ZIZMOR_VERSION in .github/workflows/ci.yml.
ARG ZIZMOR_VERSION=1.28.0
# https://github.com/aquasecurity/trivy/releases
# Keep in sync with TRIVY_VERSION in .github/workflows/ci.yml.
ARG TRIVY_VERSION=0.72.0
ARG COMMAND_HISTORY_FOLDER=/commandhistory
ARG WORKSPACE_FOLDER=/workspace
ARG USERNAME=developer
ARG USER_UID=1000
ARG USER_GID=1000
ARG TZ=UTC

# Set environment variables
# TZ: Set system-wide timezone
# DEVCONTAINER: signal to processes that running in a dev container setup - may be used for conditional execution
ENV TZ="$TZ" \
    EDITOR=nano \
    VISUAL=nano \
    DEVCONTAINER=true \
    HISTFILE=${COMMAND_HISTORY_FOLDER}/.bash_history \
    CLAUDE_CONFIG_DIR=/home/${USERNAME}/.claude \
    NPM_CONFIG_PREFIX=/home/${USERNAME}/.npm-global \
    PATH="/home/${USERNAME}/.local/bin:/home/${USERNAME}/.npm-global/bin:$PATH"

# install additional system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    # common utilities
    ca-certificates git curl jq nano unzip zip xz-utils htop procps gh \
    # ssh client so git can push via the host's ssh-agent (VS Code forwards
    # SSH_AUTH_SOCK into the container automatically; no keys live in here)
    openssh-client \
    # Rootless podman-in-podman.
    # It lets tooling inside this itself-rootless container build, run and scan container images locally.
    # One example is `trivy image` against a locally built image. This setup follows the working reference at
    # github.com/andrena/software-excellence-day-2026-sandboxing (demos/3), which
    # itself derives from containers/image_build's Podman Containerfile.
    # uidmap provides newuidmap/newgidmap for nested user namespaces
    # fuse-overlayfs is the rootless storage driver (needs /dev/fuse, passed in via runArgs in devcontainer.json)
    # passt/slirp4netns provide rootless networking
    # libcap2-bin provides setcap for the capability fix further down.
    podman crun uidmap fuse-overlayfs slirp4netns passt libcap2-bin catatonit \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# `podman build` defaults to an isolation mode that needs privileges this nested
# container does not have; chroot isolation works without them.
ENV BUILDAH_ISOLATION=chroot

# Podman engine and storage configuration; each file documents its own settings.
COPY containers.conf storage.conf /etc/containers/

# Pin GitHub's published ed25519 host key (https://api.github.com/meta) so the
# first push doesn't hit an interactive host-key prompt
RUN printf '%s\n' 'github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl' >> /etc/ssh/ssh_known_hosts

# Install Node.js - core dependency for this typescript based project
RUN curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz \
    | tar -xJ -C /usr/local --strip-components=1

# Create user, directories, files and set ownership
RUN groupadd --gid ${USER_GID} ${USERNAME} \
    && useradd --uid ${USER_UID} --gid ${USER_GID} --create-home --shell /bin/bash ${USERNAME} \
    && mkdir -p ${WORKSPACE_FOLDER} ${COMMAND_HISTORY_FOLDER} ${CLAUDE_CONFIG_DIR} /home/${USERNAME}/.config/gh \
    && touch ${COMMAND_HISTORY_FOLDER}/.bash_history \
    && chown -R ${USERNAME}:${USERNAME} ${WORKSPACE_FOLDER} ${COMMAND_HISTORY_FOLDER} ${CLAUDE_CONFIG_DIR} /home/${USERNAME}/.config

# Size the nested subordinate id ranges to fit INSIDE this container's own user
# namespace, so rootless podman-in-podman can map them. useradd defaults to
# 100000-165535, but a rootless devcontainer only gets the host user's 65536
# subordinate ids mapped in (here: container uids 0-65536), so podman's
# `newuidmap ... 1 100000 65536` call fails with "Operation not permitted". The
# two ranges below skip uid 1000 (${USERNAME} itself), which podman maps
# separately onto the nested container's root, so the ranges must not overlap.
# Widen only if the host grants more than the default 65536 subids (check
# `cat /proc/self/uid_map` inside the container).
#
# newuidmap/newgidmap are setuid-root on Debian, and setuid does not work inside
# a rootless container, so grant them the equivalent file capabilities instead
# and drop the setuid bit.
# Otherwise every podman command fails with "newuidmap: write to uid_map failed: Operation not permitted".
RUN printf '%s\n' "${USERNAME}:1:999" "${USERNAME}:1001:64535" > /etc/subuid \
    && cp /etc/subuid /etc/subgid \
    && setcap cap_setuid=ep /usr/bin/newuidmap && chmod 755 /usr/bin/newuidmap \
    && setcap cap_setgid=ep /usr/bin/newgidmap && chmod 755 /usr/bin/newgidmap \
    && mkdir -p /home/${USERNAME}/.local/share/containers \
    && chown -R ${USERNAME}:${USERNAME} /home/${USERNAME}/.local

# Install Playwright system dependencies (requires root); clean up the apt lists
# left behind by its internal apt-get update and root's npm cache from npx
# (never reused, since all later npm activity runs as ${USERNAME})
RUN npx --yes playwright@${PLAYWRIGHT_VERSION} install-deps \
    && rm -rf /var/lib/apt/lists/* /root/.npm

USER ${USERNAME}

# Install pinned npm into NPM_CONFIG_PREFIX, which precedes /usr/local/bin on PATH and thus shadows the Node-bundled npm
RUN npm install -g npm@${NPM_VERSION}

# Pre-install Playwright browsers
RUN npx playwright@${PLAYWRIGHT_VERSION} install

# Install playwright cli and the browser matching its vendored playwright-core
# (versioned independently of the project's playwright, so it needs its own
# browser build; they coexist in ~/.cache/ms-playwright keyed by revision)
RUN npm install -g @playwright/cli@${PLAYWRIGHT_CLI_VERSION} \
    && playwright-cli install-browser chromium

# Install uv (Python package manager) - useful for coding agents that use Python code for temporary scripting tasks
RUN curl -LsSf https://astral.sh/uv/${UV_VERSION}/install.sh | sh \
    && uv python install ${PYTHON_VERSION} --default

# Install opengrep - used for static code analysis
# The upstream install.sh is avoided on purpose: it lists releases via the unauthenticated
# GitHub API (rate-limited); downloading the pinned release directly avoids that.
RUN curl -fsSL --retry 3 --retry-all-errors -o /tmp/opengrep \
        https://github.com/opengrep/opengrep/releases/download/v${OPENGREP_VERSION}/opengrep_manylinux_x86 \
    && install -Dm755 /tmp/opengrep ~/.local/bin/opengrep \
    && rm /tmp/opengrep \
    && opengrep --version

# Install gitleaks - scans git history for committed credentials
RUN curl -fsSL --retry 3 --retry-all-errors \
        https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz \
    | tar -xz -C ~/.local/bin gitleaks \
    && gitleaks version

# Install zizmor - static analysis for GitHub Actions workflows (installed via uv above)
RUN uv tool install zizmor==${ZIZMOR_VERSION} \
    && zizmor --version

# Install trivy - SBOM generation, permissive-license policy and dependency /
# Dockerfile vulnerability scanning (the tarball contains a single static binary)
RUN curl -fsSL --retry 3 --retry-all-errors \
        "https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz" \
    | tar -xz -C ~/.local/bin trivy \
    && trivy --version

# Install claude (version not pinned since it auto-updates itself and update is released more or less daily)
RUN curl -fsSL https://claude.ai/install.sh | bash \
    && claude plugin marketplace add anthropics/claude-plugins-official

WORKDIR ${WORKSPACE_FOLDER}