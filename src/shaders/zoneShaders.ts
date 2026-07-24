/**
 * Zone Transition Shaders
 * P2-S3-11: Shader effects for zone transitions
 */

import * as THREE from 'three';

/** Zone transition shader uniforms */
export interface ZoneTransitionUniforms {
  uTime: { value: number };
  uProgress: { value: number };
  uFromColor: { value: THREE.Color };
  uToColor: { value: THREE.Color };
  uFromFog: { value: THREE.Color };
  uToFog: { value: THREE.Color };
  uFromFogDensity: { value: number };
  uToFogDensity: { value: number };
}

/** Create zone transition uniforms */
export function createZoneTransitionUniforms(): ZoneTransitionUniforms {
  return {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uFromColor: { value: new THREE.Color(0x1a1a2e) },
    uToColor: { value: new THREE.Color(0x1a1a2e) },
    uFromFog: { value: new THREE.Color(0x1a1a2e) },
    uToFog: { value: new THREE.Color(0x1a1a2e) },
    uFromFogDensity: { value: 0.01 },
    uToFogDensity: { value: 0.01 },
  };
}

/**
 * HSL color interpolation shader
 * P2-S3-11: Color transitions using HSL interpolation (1.5s)
 */
export const hslColorTransitionFragmentShader = `
  uniform vec3 uFromColor;
  uniform vec3 uToColor;
  uniform float uProgress;

  // RGB to HSL conversion
  vec3 rgbToHsl(vec3 c) {
    float maxC = max(max(c.r, c.g), c.b);
    float minC = min(min(c.r, c.g), c.b);
    float delta = maxC - minC;
    
    float l = (maxC + minC) / 2.0;
    float s = delta == 0.0 ? 0.0 : delta / (1.0 - abs(2.0 * l - 1.0));
    float h = 0.0;
    
    if (delta != 0.0) {
      if (maxC == c.r) {
        h = mod((c.g - c.b) / delta, 6.0);
      } else if (maxC == c.g) {
        h = (c.b - c.r) / delta + 2.0;
      } else {
        h = (c.r - c.g) / delta + 4.0;
      }
      h /= 6.0;
    }
    
    return vec3(h, s, l);
  }

  // HSL to RGB conversion
  vec3 hslToRgb(vec3 c) {
    float h = c.x;
    float s = c.y;
    float l = c.z;
    
    float c1 = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c1 * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = l - c1 / 2.0;
    
    vec3 rgb;
    if (h < 1.0/6.0) rgb = vec3(c1, x, 0.0);
    else if (h < 2.0/6.0) rgb = vec3(x, c1, 0.0);
    else if (h < 3.0/6.0) rgb = vec3(0.0, c1, x);
    else if (h < 4.0/6.0) rgb = vec3(0.0, x, c1);
    else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c1);
    else rgb = vec3(c1, 0.0, x);
    
    return rgb + m;
  }

  // Shortest path HSL interpolation
  vec3 lerpHsl(vec3 from, vec3 to, float t) {
    vec3 result;
    
    // Handle hue wrapping
    float hueDiff = to.x - from.x;
    if (hueDiff > 0.5) hueDiff -= 1.0;
    if (hueDiff < -0.5) hueDiff += 1.0;
    
    result.x = from.x + hueDiff * t;
    result.y = from.y + (to.y - from.y) * t;
    result.z = from.z + (to.z - from.z) * t;
    
    return result;
  }

  varying vec2 vUv;

  void main() {
    vec3 fromHsl = rgbToHsl(uFromColor);
    vec3 toHsl = rgbToHsl(uToColor);
    
    vec3 lerpedHsl = lerpHsl(fromHsl, toHsl, uProgress);
    vec3 finalColor = hslToRgb(lerpedHsl);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Fog transition shader
 * P2-S3-11: Fog density and color ease (2s)
 */
export const fogTransitionFragmentShader = `
  uniform vec3 uFromFog;
  uniform vec3 uToFog;
  uniform float uFromFogDensity;
  uniform float uToFogDensity;
  uniform float uProgress;
  uniform float uTime;

  // Ease in-out cubic
  float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  varying vec2 vUv;

  void main() {
    float easedProgress = easeInOutCubic(uProgress);
    
    vec3 fogColor = mix(uFromFog, uToFog, easedProgress);
    float fogDensity = mix(uFromFogDensity, uToFogDensity, easedProgress);
    
    // Add subtle noise to fog
    float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
    fogDensity += noise * 0.001;
    
    gl_FragColor = vec4(fogColor, fogDensity * 10.0);
  }
`;

/** Simple vertex shader for fullscreen effects */
export const fullscreenVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Zone shader controller */
export class ZoneShaderController {
  private colorUniforms: {
    uFromColor: { value: THREE.Color };
    uToColor: { value: THREE.Color };
    uProgress: { value: number };
  };
  private fogUniforms: {
    uFromFog: { value: THREE.Color };
    uToFog: { value: THREE.Color };
    uFromFogDensity: { value: number };
    uToFogDensity: { value: number };
    uProgress: { value: number };
    uTime: { value: number };
  };

  constructor() {
    this.colorUniforms = {
      uFromColor: { value: new THREE.Color() },
      uToColor: { value: new THREE.Color() },
      uProgress: { value: 0 },
    };
    this.fogUniforms = {
      uFromFog: { value: new THREE.Color() },
      uToFog: { value: new THREE.Color() },
      uFromFogDensity: { value: 0.01 },
      uToFogDensity: { value: 0.01 },
      uProgress: { value: 0 },
      uTime: { value: 0 },
    };
  }

  /** Update color transition */
  updateColor(from: THREE.Color, to: THREE.Color, progress: number): void {
    this.colorUniforms.uFromColor.value.copy(from);
    this.colorUniforms.uToColor.value.copy(to);
    this.colorUniforms.uProgress.value = progress;
  }

  /** Update fog transition */
  updateFog(
    fromColor: THREE.Color,
    toColor: THREE.Color,
    fromDensity: number,
    toDensity: number,
    progress: number,
    deltaTime: number
  ): void {
    this.fogUniforms.uFromFog.value.copy(fromColor);
    this.fogUniforms.uToFog.value.copy(toColor);
    this.fogUniforms.uFromFogDensity.value = fromDensity;
    this.fogUniforms.uToFogDensity.value = toDensity;
    this.fogUniforms.uProgress.value = progress;
    this.fogUniforms.uTime.value += deltaTime;
  }

  /** Get color transition uniforms */
  getColorUniforms() {
    return this.colorUniforms;
  }

  /** Get fog transition uniforms */
  getFogUniforms() {
    return this.fogUniforms;
  }
}

/** Factory function */
export function createZoneShaderController(): ZoneShaderController {
  return new ZoneShaderController();
}
