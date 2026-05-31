# ==============================================================================
# STAGE 1: Build Phase
# ==============================================================================
FROM python:3.12-slim AS builder

# Install the high-performance Astral 'uv' package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Optimize by compiling python bytecodes during pip install phases
ENV UV_COMPILE_BYTECODE=1
# Prevent uv from sending usage statistics
ENV UV_NO_CACHE=1

# Copy dependency manifests and lock file
COPY pyproject.toml uv.lock ./

# Create virtualenv and compile dependencies using cache mount
RUN --mount=type=cache,target=/root/.cache/uv \
    uv venv /opt/venv && \
    . /opt/venv/bin/activate && \
    uv pip install .

# ==============================================================================
# STAGE 2: Run Phase
# ==============================================================================
FROM python:3.12-slim AS runner

WORKDIR /app

# Copy python virtualenv environment from Builder stage
COPY --from=builder /opt/venv /opt/venv

# Activate virtualenv inside PATH
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy only code source directories and configurations
COPY app/ app/
COPY main.py .
COPY .env.example .env.example
# Create empty folder for file logging persistence
RUN mkdir -p logs

# Run FastAPI app with dynamic port binding fallback
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]
