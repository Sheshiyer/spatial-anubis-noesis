/**
 * Breathfield Flow Field Shader
 * P2-S3-02: GLSL splat displacement shader driven by breath rate and LQD
 * - Inhale: splats move to center
 * - Exhale: splats disperse
 */

import * as THREE from 'three';

/** Breathfield shader uniforms */
export interface BreathfieldUniforms {
  uTime: { value: number };
  uBreathPhase: { value: number }; // 0=exhale, 1=inhale
  uBreathRate: { value: number }; // breaths per minute
  uLQD: { value: number }; // Local Qualitative Domain 0-1
  uCenter: { value: THREE.Vector3 };
  uFlowStrength: { value: number };
  uTurbulence: { value: number };
  uDispersalRadius: { value: number };
}

/** Create default breathfield uniforms */
export function createBreathfieldUniforms(): BreathfieldUniforms {
  return {
    uTime: { value: 0 },
    uBreathPhase: { value: 0.5 },
    uBreathRate: { value: 10 }, // 10 breaths per minute default
    uLQD: { value: 0.5 },
    uCenter: { value: new THREE.Vector3(0, 0, 0) },
    uFlowStrength: { value: 1.0 },
    uTurbulence: { value: 0.5 },
    uDispersalRadius: { value: 5.0 },
  };
}

/**
 * Breathfield vertex shader
 * Displaces vertices based on breath phase and LQD
 */
export const breathfieldVertexShader = `
  uniform float uTime;
  uniform float uBreathPhase;
  uniform float uBreathRate;
  uniform float uLQD;
  uniform vec3 uCenter;
  uniform float uFlowStrength;
  uniform float uTurbulence;
  uniform float uDispersalRadius;

  varying vec2 vUv;
  varying float vDisplacement;
  varying float vBreathInfluence;

  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vUv = uv;

    // Calculate distance from center
    vec3 toCenter = uCenter - position;
    float dist = length(toCenter);
    vec3 dir = normalize(toCenter);

    // Normalize breath phase: 0=exhale, 1=inhale
    float breath = uBreathPhase;

    // Inhale: pull toward center
    // Exhale: push away from center
    float inhaleStrength = smoothstep(0.0, 1.0, breath);
    float exhaleStrength = smoothstep(1.0, 0.0, breath);

    // Direction based on breath phase
    vec3 flowDir = mix(-dir, dir, inhaleStrength);

    // Turbulence based on LQD (lower LQD = more turbulence)
    float turbulence = (1.0 - uLQD) * uTurbulence;
    float noiseScale = 2.0 + uBreathRate * 0.1;
    vec3 noisePos = position * noiseScale + uTime * 0.5;
    float noiseVal = snoise(noisePos);
    vec3 turbulenceOffset = vec3(
      snoise(noisePos + vec3(100.0, 0.0, 0.0)),
      snoise(noisePos + vec3(0.0, 100.0, 0.0)),
      snoise(noisePos + vec3(0.0, 0.0, 100.0))
    ) * turbulence;

    // Calculate displacement
    // Inhale: vertices move inward (toward center)
    // Exhale: vertices move outward (away from center)
    float amplitude = uFlowStrength * (1.0 + (1.0 - uLQD) * 0.5);
    float radialDisplacement = mix(
      -inhaleStrength * amplitude, // Inhale: inward
      exhaleStrength * amplitude * uDispersalRadius, // Exhale: outward
      step(0.5, breath)
    );

    // Apply displacement
    vec3 displaced = position + flowDir * abs(radialDisplacement) + turbulenceOffset * 0.3;

    // Store varying values for fragment shader
    vDisplacement = length(displaced - position);
    vBreathInfluence = inhaleStrength;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

/**
 * Breathfield fragment shader
 * Color and transparency based on breath state
 */
export const breathfieldFragmentShader = `
  uniform float uTime;
  uniform float uBreathPhase;
  uniform float uLQD;

  varying vec2 vUv;
  varying float vDisplacement;
  varying float vBreathInfluence;

  void main() {
    // Base colors
    vec3 inhaleColor = vec3(0.722, 0.525, 0.043); // Aged Gold (#B8860B)
    vec3 exhaleColor = vec3(0.961, 0.941, 0.910); // Bone (#F5F0E8)
    vec3 turbulenceColor = vec3(0.776, 0.365, 0.231); // Terracotta (#C65D3B)

    // Mix colors based on breath phase
    vec3 baseColor = mix(exhaleColor, inhaleColor, vBreathInfluence);

    // Add turbulence color for low LQD
    float turbulenceMix = (1.0 - uLQD) * 0.4;
    baseColor = mix(baseColor, turbulenceColor, turbulenceMix);

    // Alpha based on displacement (more displaced = more transparent)
    float alpha = 1.0 - vDisplacement * 0.3;
    alpha = clamp(alpha, 0.3, 1.0);

    // Edge fade
    float edgeFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
    edgeFade *= smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);

    gl_FragColor = vec4(baseColor, alpha * edgeFade);
  }
`;

/** Breathfield shader material */
export function createBreathfieldMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: breathfieldVertexShader,
    fragmentShader: breathfieldFragmentShader,
    uniforms: createBreathfieldUniforms(),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/** Update breathfield uniforms from PIP data */
export function updateBreathfieldFromPIP(
  uniforms: BreathfieldUniforms,
  breathPhase: number,
  lqd: number,
  breathRateBPM: number
): void {
  uniforms.uBreathPhase.value = breathPhase;
  uniforms.uLQD.value = lqd / 100; // Normalize 0-100 to 0-1
  uniforms.uBreathRate.value = breathRateBPM;
}

/** Update breathfield time */
export function updateBreathfieldTime(uniforms: BreathfieldUniforms, deltaTime: number): void {
  uniforms.uTime.value += deltaTime;
}
