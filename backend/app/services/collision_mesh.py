"""
Collision mesh extraction and simplification from .glb files.
Extracts terrain geometry and simplifies to low-poly collision mesh.
"""
import logging
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import trimesh

logger = logging.getLogger(__name__)


def extract_collision_mesh(
    glb_path: Path,
    output_path: Path,
    max_triangles: int = 5000,
) -> Tuple[bool, Optional[str]]:
    """
    Extract collision mesh from a .glb file.
    
    Args:
        glb_path: Path to input .glb file
        output_path: Path to output collision mesh .glb
        max_triangles: Maximum number of triangles in output
    
    Returns:
        Tuple of (success, error_message)
    """
    try:
        # Load the mesh
        scene = trimesh.load(glb_path, force="scene")
        
        # Extract all geometry
        meshes = []
        for name, geom in scene.geometry.items():
            if isinstance(geom, trimesh.Trimesh):
                meshes.append(geom)
        
        if not meshes:
            return False, "No mesh geometry found in .glb"
        
        # Concatenate all meshes
        if len(meshes) == 1:
            combined = meshes[0]
        else:
            combined = trimesh.util.concatenate(meshes)
        
        # Simplify if needed
        if len(combined.faces) > max_triangles:
            combined = simplify_mesh(combined, max_triangles)
        
        # Export collision mesh
        output_path.parent.mkdir(parents=True, exist_ok=True)
        combined.export(output_path, file_type="glb")
        
        logger.info(
            f"Collision mesh extracted: {glb_path} -> {output_path} "
            f"({len(combined.faces)} triangles)"
        )
        
        return True, None
        
    except Exception as e:
        logger.error(f"Failed to extract collision mesh: {e}")
        return False, str(e)


def simplify_mesh(mesh: trimesh.Trimesh, target_faces: int) -> trimesh.Trimesh:
    """
    Simplify a mesh to target face count.
    
    Uses quadratic decimation if available, falls back to other methods.
    """
    current_faces = len(mesh.faces)
    
    if current_faces <= target_faces:
        return mesh
    
    # Calculate reduction ratio
    ratio = target_faces / current_faces
    
    try:
        # Try Open3D for better simplification if available
        import open3d as o3d
        
        # Convert to Open3D mesh
        o3d_mesh = o3d.geometry.TriangleMesh()
        o3d_mesh.vertices = o3d.utility.Vector3dVector(mesh.vertices)
        o3d_mesh.triangles = o3d.utility.Vector3iVector(mesh.faces)
        o3d_mesh.vertex_normals = o3d.utility.Vector3dVector(mesh.vertex_normals)
        
        # Simplify
        simplified = o3d_mesh.simplify_quadric_decimation(target_faces)
        
        # Convert back to trimesh
        result = trimesh.Trimesh(
            vertices=np.asarray(simplified.vertices),
            faces=np.asarray(simplified.triangles),
        )
        
        return result
        
    except ImportError:
        # Fallback: Use trimesh's built-in simplification
        # Note: This is less sophisticated but doesn't require Open3D
        logger.warning("Open3D not available, using trimesh fallback simplification")
        
        # Use vertex clustering for fast simplification
        # Calculate voxel size based on target ratio
        bounds = mesh.bounds
        size = np.max(bounds[1] - bounds[0])
        voxel_size = size * np.cbrt(ratio) * 0.5
        
        simplified = mesh.simplify_vertex_clustering(
            voxel_size,
           _aggregation="mean"
        )
        
        return simplified


def get_mesh_bounds(glb_path: Path) -> Optional[dict]:
    """
    Get bounding box information from a .glb file.
    
    Returns:
        Dict with min, max, and size bounds
    """
    try:
        scene = trimesh.load(glb_path, force="scene")
        
        # Get bounds from all geometry
        all_vertices = []
        for name, geom in scene.geometry.items():
            if isinstance(geom, trimesh.Trimesh):
                all_vertices.extend(geom.vertices)
        
        if not all_vertices:
            return None
        
        vertices = np.array(all_vertices)
        min_bounds = vertices.min(axis=0).tolist()
        max_bounds = vertices.max(axis=0).tolist()
        size = (vertices.max(axis=0) - vertices.min(axis=0)).tolist()
        
        return {
            "min": {"x": min_bounds[0], "y": min_bounds[1], "z": min_bounds[2]},
            "max": {"x": max_bounds[0], "y": max_bounds[1], "z": max_bounds[2]},
            "size": {"x": size[0], "y": size[1], "z": size[2]},
        }
        
    except Exception as e:
        logger.error(f"Failed to get mesh bounds: {e}")
        return None


def validate_collision_mesh(
    collision_path: Path,
    original_path: Path,
    max_triangles: int = 5000,
) -> Tuple[bool, dict]:
    """
    Validate that collision mesh meets requirements.
    
    Returns:
        Tuple of (is_valid, details_dict)
    """
    details = {
        "triangle_count": 0,
        "bounds_match": False,
        "max_triangles": max_triangles,
    }
    
    try:
        # Load collision mesh
        collision_scene = trimesh.load(collision_path, force="scene")
        collision_meshes = [
            geom for geom in collision_scene.geometry.values()
            if isinstance(geom, trimesh.Trimesh)
        ]
        
        if collision_meshes:
            if len(collision_meshes) == 1:
                collision = collision_meshes[0]
            else:
                collision = trimesh.util.concatenate(collision_meshes)
            
            details["triangle_count"] = len(collision.faces)
        
        # Check bounds match
        orig_bounds = get_mesh_bounds(original_path)
        coll_bounds = get_mesh_bounds(collision_path)
        
        if orig_bounds and coll_bounds:
            # Allow 5% tolerance for bounds
            tolerance = 0.05
            orig_size = np.array([orig_bounds["size"][k] for k in ["x", "y", "z"]])
            coll_size = np.array([coll_bounds["size"][k] for k in ["x", "y", "z"]])
            
            size_diff = np.abs(orig_size - coll_size) / orig_size
            details["bounds_match"] = np.all(size_diff < tolerance)
            details["size_difference_percent"] = (size_diff * 100).tolist()
        
        is_valid = (
            details["triangle_count"] <= max_triangles and
            details["bounds_match"]
        )
        
        return is_valid, details
        
    except Exception as e:
        details["error"] = str(e)
        return False, details
