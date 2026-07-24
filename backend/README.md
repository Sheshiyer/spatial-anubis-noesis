# Spatial Anubis Backend

FastAPI backend for the Spatial Anubis 3D OASIS platform.

## Features

- **World Generation Pipeline**: Async world generation via World Labs API
- **9 Planetary Dasha Biomes**: Complete template system for all Vedic planets
- **Collision Mesh Extraction**: Automatic .glb to collision mesh processing
- **Splat Compression**: Gaussian splat optimization (<40% size, PSNR >30dB)
- **JWT Authentication**: Secure token-based auth with refresh
- **Rate Limiting**: 1 world generation per user per hour
- **PostgreSQL + SQLAlchemy**: Full ORM with Alembic migrations
- **Health & Readiness**: Kubernetes-compatible probes
- **Structured Logging**: JSON logging with request tracking

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Setup Database

```bash
# Create database
createdb spatial_anubis

# Run migrations
alembic upgrade head
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Run Server

```bash
uvicorn app.main:app --reload --port 8000
```

### 5. Access API

- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## API Endpoints

### Health
- `GET /health` - Liveness probe
- `GET /ready` - Readiness probe (DB + API connectivity)

### Authentication
- `POST /api/v1/auth/login` - Get JWT tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout

### Worlds
- `POST /api/v1/worlds/generate` - Generate new world (202 Accepted)
- `GET /api/v1/worlds/{job_id}` - Get generation status
- `GET /api/v1/worlds/` - List worlds
- `GET /api/v1/worlds/biome/{planet}` - Get biome info
- `GET /api/v1/worlds/rate-limit/status` - Check rate limit

### Admin
- `GET /api/admin/usage` - Usage statistics
- `GET /api/admin/usage/all` - All users usage
- `GET /api/admin/health/detailed` - Detailed health

## Database Schema

### Tables
- **sessions** - User sessions
- **worlds** - Generated worlds with assets and metadata
- **readings** - Divination readings
- **artifacts** - Discovered ritual objects
- **api_usage** - API call tracking for cost estimation
- **rate_limits** - Rate limiting tracking

## World Generation Pipeline

1. **Submit Request** → `POST /api/v1/worlds/generate`
2. **Queue Job** → Returns `job_id` immediately (202 Accepted)
3. **Process** → Async generation via World Labs API
4. **Poll Status** → `GET /api/v1/worlds/{job_id}`
5. **Asset Processing** → Collision mesh + splat compression
6. **Complete** → Returns asset URLs

### Fallback on Failure
- Retry 3 times with simplified prompts
- Fall back to pre-cached world for Dasha

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test
pytest tests/test_worlds.py -v
```

## Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Upgrade
alembic upgrade head

# Downgrade
alembic downgrade -1
```

## Project Structure

```
backend/
├── app/
│   ├── api/v1/          # API route handlers
│   ├── core/            # Config, security
│   ├── db/              # Database setup
│   ├── middleware/      # Request logging
│   ├── models/          # SQLAlchemy models
│   ├── schemas/         # Pydantic schemas
│   └── services/        # Business logic
├── alembic/             # Database migrations
├── storage/             # Asset storage
├── tests/               # Test suite
└── requirements.txt
```
