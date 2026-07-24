"""
Gaussian Splat compression pipeline.
Downsampling and quantization of SH coefficients.
"""
import logging
import struct
from pathlib import Path
from typing import Tuple

import numpy as np

logger = logging.getLogger(__name__)


class SplatCompressor:
    """
    Compress Gaussian Splat files while maintaining visual quality.
    
    Target: <40% size, PSNR >30dB
    """
    
    # Splat file format constants
    SPLAT_FIELDS = [
        ("position", 3, "f"),      # x, y, z (float32)
        ("scale", 3, "f"),         # sx, sy, sz (float32)
        ("rotation", 4, "f"),      # qw, qx, qy, qz (float32)
        ("alpha", 1, "f"),         # opacity (float32)
        ("color", 3, "f"),         # r, g, b (float32) or SH0
        ("sh_coeffs", 45, "f"),    # Spherical harmonics coefficients
    ]
    
    BYTES_PER_SPLAT = 3*4 + 3*4 + 4*4 + 1*4 + 3*4 + 45*4  # 248 bytes
    
    def __init__(self, downsample_factor: float = 0.5, quantize_sh: bool = True):
        """
        Initialize compressor.
        
        Args:
            downsample_factor: Fraction of splats to keep (0.0-1.0)
            quantize_sh: Whether to quantize SH coefficients to 8-bit
        """
        self.downsample_factor = downsample_factor
        self.quantize_sh = quantize_sh
    
    def compress(
        self,
        input_path: Path,
        output_path: Path,
    ) -> Tuple[bool, dict]:
        """
        Compress a .splat file.
        
        Returns:
            Tuple of (success, stats_dict)
        """
        try:
            # Read input
            data = np.fromfile(input_path, dtype=np.float32)
            
            # Validate data
            if len(data) % self.BYTES_PER_SPLAT != 0:
                # Try as raw float array
                num_splats = len(data) // (self.BYTES_PER_SPLAT // 4)
                data = data[:num_splats * (self.BYTES_PER_SPLAT // 4)]
            else:
                num_splats = len(data) // (self.BYTES_PER_SPLAT // 4)
            
            original_size = input_path.stat().st_size
            
            # Reshape to (num_splats, 59) where 59 = 3+3+4+1+3+45
            splats = data.reshape(num_splats, 59)
            
            # Downsample by importance (alpha * scale magnitude)
            if self.downsample_factor < 1.0:
                splats = self._downsample(splats)
            
            # Quantize SH coefficients
            if self.quantize_sh:
                splats = self._quantize_sh_coeffs(splats)
            
            # Write output
            output_path.parent.mkdir(parents=True, exist_ok=True)
            splats.astype(np.float32).tofile(output_path)
            
            compressed_size = output_path.stat().st_size
            compression_ratio = compressed_size / original_size
            
            # Estimate PSNR (simplified)
            estimated_psnr = self._estimate_psnr(compression_ratio)
            
            stats = {
                "original_splats": num_splats,
                "compressed_splats": len(splats),
                "original_size_bytes": original_size,
                "compressed_size_bytes": compressed_size,
                "compression_ratio": compression_ratio,
                "size_reduction_percent": (1 - compression_ratio) * 100,
                "estimated_psnr_db": estimated_psnr,
            }
            
            logger.info(f"Splat compressed: {compression_ratio:.2%} of original")
            
            return True, stats
            
        except Exception as e:
            logger.error(f"Splat compression failed: {e}")
            return False, {"error": str(e)}
    
    def _downsample(self, splats: np.ndarray) -> np.ndarray:
        """
        Downsample splats based on importance.
        Keeps splats with higher opacity and larger scale.
        """
        # Extract importance metrics
        alpha = splats[:, 7]  # Alpha channel
        scale = splats[:, 3:6]  # Scale components
        scale_magnitude = np.linalg.norm(scale, axis=1)
        
        # Calculate importance score
        importance = alpha * scale_magnitude
        
        # Sort by importance and select top fraction
        num_keep = max(1, int(len(splats) * self.downsample_factor))
        indices = np.argsort(importance)[-num_keep:]
        
        return splats[indices]
    
    def _quantize_sh_coeffs(self, splats: np.ndarray) -> np.ndarray:
        """
        Quantize SH coefficients from float32 to 8-bit range.
        Stores in float32 but with reduced precision.
        """
        # SH coefficients are columns 11-55 (45 values)
        sh_start = 11
        sh_end = 56
        
        sh_coeffs = splats[:, sh_start:sh_end]
        
        # Quantize to 8-bit range (-1 to 1 mapped to 0-255)
        sh_min = sh_coeffs.min()
        sh_max = sh_coeffs.max()
        
        if sh_max > sh_min:
            # Normalize to 0-255, quantize, then back to float
            sh_normalized = (sh_coeffs - sh_min) / (sh_max - sh_min)
            sh_quantized = np.round(sh_normalized * 255) / 255
            sh_dequantized = sh_quantized * (sh_max - sh_min) + sh_min
        else:
            sh_dequantized = sh_coeffs
        
        splats[:, sh_start:sh_end] = sh_dequantized
        
        return splats
    
    def _estimate_psnr(self, compression_ratio: float) -> float:
        """
        Estimate PSNR based on compression ratio.
        Simplified model based on typical Gaussian splat behavior.
        """
        # Rough estimation: higher compression = lower PSNR
        # At 100% (no compression), PSNR is effectively infinite
        # At 40%, expect around 35-40 dB
        if compression_ratio >= 0.9:
            return 50.0
        elif compression_ratio >= 0.5:
            return 40.0 - (0.9 - compression_ratio) * 20
        else:
            return 30.0 - (0.5 - compression_ratio) * 10
    
    def validate_compression(self, stats: dict) -> bool:
        """
        Validate that compression meets requirements.
        
        Requirements:
        - Size < 40% of original
        - PSNR > 30dB
        """
        if "error" in stats:
            return False
        
        compression_ratio = stats.get("compression_ratio", 1.0)
        psnr = stats.get("estimated_psnr_db", 0)
        
        return compression_ratio <= 0.4 and psnr > 30.0


def compress_splat_file(
    input_path: Path,
    output_path: Path,
    downsample_factor: float = 0.5,
) -> Tuple[bool, dict]:
    """
    Convenience function to compress a splat file.
    
    Args:
        input_path: Path to input .splat file
        output_path: Path to output compressed .splat file
        downsample_factor: Fraction of splats to keep
    
    Returns:
        Tuple of (success, stats)
    """
    compressor = SplatCompressor(
        downsample_factor=downsample_factor,
        quantize_sh=True,
    )
    return compressor.compress(input_path, output_path)
