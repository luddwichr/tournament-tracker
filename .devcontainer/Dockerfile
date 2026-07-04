# https://hub.docker.com/layers/library/debian/trixie-slim/
FROM docker.io/library/debian:trixie-slim@sha256:28de0877c2189802884ccd20f15ee41c203573bd87bb6b883f5f46362d24c5c2

# https://nodejs.org/en/about/previous-releases
ARG NODE_VERSION=24.18.0
# https://github.com/astral-sh/uv/releases
ARG UV_VERSION=0.11.26
# https://www.python.org/downloads/
ARG PYTHON_VERSION=3.14.6
# https://playwright.dev/docs/release-notes — keep in sync with @playwright/test in package.json
ARG PLAYWRIGHT_VERSION=1.61.1
# https://www.npmjs.com/package/@playwright/cli?activeTab=versions — versioned
# independently of @playwright/test/playwright, do NOT assume it tracks PLAYWRIGHT_VERSION
ARG PLAYWRIGHT_CLI_VERSION=0.1.15
ARG COMMAND_HISTORY_FOLDER=/commandhistory
ARG WORKSPACE_FOLDER=/workspace
ARG USERNAME=developer
ARG USER_UID=1000
ARG USER_GID=1000
ARG TZ=UTC

# Set environment variables
# TZ: Set system-wide timezone (default UTC, otherwise what's given in docker-compose.yml (taking the local timezTZ=${TZ:-Europe/Berlin}))
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
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# install Node.js
RUN curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz \
    | tar -xJ -C /usr/local --strip-components=1

# Create user, directories, files and set ownership
RUN groupadd --gid=${USER_GID} ${USERNAME} \
    && useradd --uid ${USER_UID} --gid ${USER_GID} --create-home --shell /bin/bash ${USERNAME} \
    && mkdir -p ${WORKSPACE_FOLDER} ${COMMAND_HISTORY_FOLDER} ${CLAUDE_CONFIG_DIR} \
    && touch ${COMMAND_HISTORY_FOLDER}/.bash_history \
    && chown -R ${USERNAME}:${USERNAME} ${WORKSPACE_FOLDER} ${COMMAND_HISTORY_FOLDER} ${CLAUDE_CONFIG_DIR}

# Install Playwright system dependencies (requires root)
RUN npx --yes playwright@${PLAYWRIGHT_VERSION} install-deps

USER ${USERNAME}

# Pre-install Playwright browsers
RUN npx playwright@${PLAYWRIGHT_VERSION} install

# Install playwright cli
RUN npm install -g @playwright/cli@${PLAYWRIGHT_CLI_VERSION}

# install uv (Python package manager)
RUN curl -LsSf https://astral.sh/uv/${UV_VERSION}/install.sh | sh \
  && uv python install ${PYTHON_VERSION} --default

# install claude (version not pinned since it auto-updates itself and update is released more or less daily)
RUN curl -fsSL https://claude.ai/install.sh | bash \
    && claude plugin marketplace add anthropics/claude-plugins-official

WORKDIR ${WORKSPACE_FOLDER}