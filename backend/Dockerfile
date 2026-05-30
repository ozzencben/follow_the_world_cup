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

# Copy dependency manifests
COPY pyproject.toml .

# Create virtualenv and compile dependencies
RUN uv venv /opt/venv && \
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
# In production, we pass env variables instead of physical .env files,
# but we bundle the .env file as a fallback for local running ease
COPY .env .env

# Create empty folder for file logging persistence
RUN mkdir -p logs

EXPOSE 8000

# Run FastAPI app with standardized Production server settings
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
