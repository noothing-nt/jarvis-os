# ══════════════════════════════════════════════════════════════
#  JARVIS OS — Backend Dockerfile
#  Multi-stage build: keeps final image lean and secure.
# ══════════════════════════════════════════════════════════════

# ── Stage 1: Builder ──────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies first (Docker cache layer)
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: Runtime ──────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Security: don't run as root
RUN useradd --create-home --shell /bin/bash jarvis
WORKDIR /home/jarvis/app

# Copy installed packages from builder stage
COPY --from=builder /install /usr/local

# Copy application source
COPY --chown=jarvis:jarvis . .

# Switch to non-root user
USER jarvis

# Expose FastAPI port
EXPOSE 8000

# Health check — Docker will monitor this
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/ping || exit 1

# Start server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]