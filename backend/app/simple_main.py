"""
Simplified FastAPI server for world generation without database dependencies.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import trimesh
import numpy as np
from pathlib import Path
import struct
import random

app = FastAPI(
    title="Spatial Anubis API",
    version="2.0.0-simple",
    description="Simplified world generation API",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3002", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure storage directories exist
STORAGE_PATH = Path(__file__).parent.parent / "storage"
ASSETS_PATH = STORAGE_PATH / "assets"
FALLBACK_PATH = STORAGE_PATH / "fallback_worlds"

ASSETS_PATH.mkdir(parents=True, exist_ok=True)
FALLBACK_PATH.mkdir(parents=True, exist_ok=True)

# Mount static files for serving assets
app.mount("/assets", StaticFiles(directory=str(ASSETS_PATH)), name="assets")


@app.get("/")
async def root():
    return {"message": "Spatial Anubis API (Simplified Mode)", "version": "2.0.0-simple"}


@app.get("/health")
async def health():
    return {"status": "healthy", "mode": "simplified"}


@app.post("/api/v1/worlds/generate")
async def generate_world(planet: str = "Saturn"):
    """
    Generate a simple placeholder world.
    In production, this would call World Labs API.
    """
    world_id = f"world_{planet.lower()}_{np.random.randint(1000, 9999)}"
    
    # Generate simple placeholder mesh
    mesh = trimesh.creation.box(extents=[100, 20, 100])
    collision_path = ASSETS_PATH / f"{world_id}_collision.glb"
    mesh.export(str(collision_path))
    
    # Create mock splat data (1000 random particles)
    splat_path = ASSETS_PATH / f"{world_id}.splat"
    
    num_splats = 1000
    with open(splat_path, 'wb') as f:
        for _ in range(num_splats):
            # Position: x, y, z
            x = (random.random() - 0.5) * 40.0
            y = (random.random() - 0.5) * 10.0 + 5.0
            z = (random.random() - 0.5) * 40.0
            
            # Scale: sx, sy, sz
            sx = random.random() * 0.5 + 0.1
            sy = random.random() * 0.5 + 0.1
            sz = random.random() * 0.5 + 0.1
            
            # Color: r, g, b, a (uint8)
            r = int(random.random() * 255)
            g = int(random.random() * 255)
            b = int(random.random() * 255)
            a = 255
            
            # Rotation: qx, qy, qz, qw (uint8 0-255 mapping)
            rot = 128
            
            # Write 32 bytes per splat
            # 3f (pos), 3f (scale), 4B (color), 4B (rot)
            f.write(struct.pack('<ffffffBBBBBBBB', 
                                x, y, z, 
                                sx, sy, sz, 
                                r, g, b, a, 
                                rot, rot, rot, rot))
    
    return {
        "id": world_id,
        "status": "complete",
        "planet": planet,
        "assets": {
            "splatUrl": f"/assets/{world_id}.splat",
            "collisionMeshUrl": f"/assets/{world_id}_collision.glb",
        },
        "metadata": {
            "bounds": {
                "min": {"x": -50, "y": -10, "z": -50},
                "max": {"x": 50, "y": 20, "z": 50},
                "center": {"x": 0, "y": 5, "z": 0},
                "radius": 50,
            }
        }
    }


@app.get("/api/v1/worlds")
async def list_worlds():
    """List available worlds."""
    worlds = []
    for splat_file in ASSETS_PATH.glob("*.splat"):
        world_id = splat_file.stem
        worlds.append({
            "id": world_id,
            "splatUrl": f"/assets/{world_id}.splat",
            "collisionMeshUrl": f"/assets/{world_id}_collision.glb",
        })
    return {"worlds": worlds}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
