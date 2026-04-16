import * as THREE from 'three';
import { OUTLINE_THICKNESS } from '../constants';

const toonVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const toonFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform vec3 uLightDir;

  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightDir);
    float NdotL = dot(normal, lightDir);

    // 2-step cel shading
    float shade;
    if (NdotL > 0.5) {
      shade = 1.0;
    } else if (NdotL > -0.1) {
      shade = 0.7;
    } else {
      shade = 0.45;
    }

    vec3 color = uColor * shade;

    // Slight rim light for cartoon pop
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    rim = smoothstep(0.6, 1.0, rim);
    color += vec3(0.15) * rim;

    gl_FragColor = vec4(color, uOpacity);
  }
`;

const outlineVertexShader = /* glsl */ `
  uniform float uThickness;

  void main() {
    vec3 pos = position + normal * uThickness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const outlineFragmentShader = /* glsl */ `
  void main() {
    gl_FragColor = vec4(0.12, 0.1, 0.1, 1.0);
  }
`;

export function createToonMaterial(
  color: number | THREE.Color,
  opacity: number = 1.0,
): THREE.ShaderMaterial {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  return new THREE.ShaderMaterial({
    vertexShader: toonVertexShader,
    fragmentShader: toonFragmentShader,
    uniforms: {
      uColor: { value: c },
      uOpacity: { value: opacity },
      uLightDir: { value: new THREE.Vector3(0.5, 1.0, 0.3).normalize() },
    },
    transparent: opacity < 1.0,
    side: THREE.FrontSide,
  });
}

export function createOutlineMaterial(thickness: number = OUTLINE_THICKNESS): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: outlineVertexShader,
    fragmentShader: outlineFragmentShader,
    uniforms: {
      uThickness: { value: thickness },
    },
    side: THREE.BackSide,
  });
}

export function addOutline(mesh: THREE.Mesh, thickness: number = OUTLINE_THICKNESS): THREE.Mesh {
  const outlineMesh = new THREE.Mesh(mesh.geometry.clone(), createOutlineMaterial(thickness));
  outlineMesh.renderOrder = -1;
  mesh.add(outlineMesh);
  return outlineMesh;
}

export function addOutlineToGroup(group: THREE.Group, thickness: number = OUTLINE_THICKNESS): void {
  const meshes: THREE.Mesh[] = [];
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      meshes.push(child);
    }
  });
  for (const mesh of meshes) {
    const outline = new THREE.Mesh(mesh.geometry.clone(), createOutlineMaterial(thickness));
    outline.renderOrder = -1;
    mesh.add(outline);
  }
}

export function setGroupOpacity(group: THREE.Group, opacity: number): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mat = child.material;
      if (mat instanceof THREE.ShaderMaterial && mat.uniforms['uOpacity']) {
        mat.uniforms['uOpacity'].value = opacity;
        mat.transparent = opacity < 1.0;
      }
    }
  });
}
