import * as THREE from 'three';
import { CELL_SIZE, GRID_WIDTH, GRID_HEIGHT, WALL_HEIGHT, COLORS, BENCH_POSITIONS } from '../constants';
import { createToonMaterial, addOutline } from '../shaders/ToonMaterial';

export function createField(scene: THREE.Scene): void {
  // Ground plane - checkered grass
  const groundWidth = GRID_WIDTH * CELL_SIZE;
  const groundHeight = GRID_HEIGHT * CELL_SIZE;

  const canvas = document.createElement('canvas');
  canvas.width = GRID_WIDTH * 4;
  canvas.height = GRID_HEIGHT * 4;
  const ctx = canvas.getContext('2d')!;

  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let z = 0; z < GRID_HEIGHT; z++) {
      const isLight = (x + z) % 2 === 0;
      ctx.fillStyle = isLight ? '#7BC67E' : '#6AAF5E';
      ctx.fillRect(x * 4, z * 4, 4, 4);
    }
  }

  const grassTexture = new THREE.CanvasTexture(canvas);
  grassTexture.magFilter = THREE.NearestFilter;

  const groundGeo = new THREE.PlaneGeometry(groundWidth, groundHeight);
  const groundMat = new THREE.MeshBasicMaterial({ map: grassTexture });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Walls
  const wallMat = createToonMaterial(COLORS.wall);
  const wallThickness = CELL_SIZE;

  // Top wall
  const topWall = new THREE.Mesh(
    new THREE.BoxGeometry(groundWidth + wallThickness * 2, WALL_HEIGHT, wallThickness),
    wallMat,
  );
  topWall.position.set(0, WALL_HEIGHT / 2, -groundHeight / 2 - wallThickness / 2 + CELL_SIZE / 2);
  addOutline(topWall, 0.04);
  scene.add(topWall);

  // Bottom wall
  const botWall = topWall.clone();
  botWall.position.set(0, WALL_HEIGHT / 2, groundHeight / 2 + wallThickness / 2 - CELL_SIZE / 2);
  scene.add(botWall);

  // Left wall
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, WALL_HEIGHT, groundHeight + wallThickness * 2),
    wallMat,
  );
  leftWall.position.set(-groundWidth / 2 - wallThickness / 2 + CELL_SIZE / 2, WALL_HEIGHT / 2, 0);
  addOutline(leftWall, 0.04);
  scene.add(leftWall);

  // Right wall
  const rightWall = leftWall.clone();
  rightWall.position.set(groundWidth / 2 + wallThickness / 2 - CELL_SIZE / 2, WALL_HEIGHT / 2, 0);
  scene.add(rightWall);

  // Decorative flowers/tufts
  const decorGeo = new THREE.SphereGeometry(0.15, 6, 4);
  const flowerColors = [0xFFB7B2, 0xFFDDB7, 0xB5EAD7, 0xC7CEEA];

  for (let i = 0; i < 30; i++) {
    const gx = 2 + Math.floor(Math.random() * (GRID_WIDTH - 4));
    const gz = 2 + Math.floor(Math.random() * (GRID_HEIGHT - 4));

    // Skip bench positions
    if (BENCH_POSITIONS.some((b) => Math.abs(b.x - gx) < 2 && Math.abs(b.z - gz) < 2)) continue;

    const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
    const flower = new THREE.Mesh(decorGeo, createToonMaterial(color));
    const offsetX = gx * CELL_SIZE - (GRID_WIDTH * CELL_SIZE) / 2 + CELL_SIZE / 2;
    const offsetZ = gz * CELL_SIZE - (GRID_HEIGHT * CELL_SIZE) / 2 + CELL_SIZE / 2;
    flower.position.set(
      offsetX + (Math.random() - 0.5) * 0.5,
      0.1,
      offsetZ + (Math.random() - 0.5) * 0.5,
    );
    flower.scale.set(0.5 + Math.random() * 0.5, 0.3 + Math.random() * 0.3, 0.5 + Math.random() * 0.5);
    scene.add(flower);
  }
}

export function createBenchMesh(): THREE.Group {
  const group = new THREE.Group();
  const seatMat = createToonMaterial(COLORS.benchSeat);
  const legMat = createToonMaterial(COLORS.bench);

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.6), seatMat);
  seat.position.y = 0.4;
  addOutline(seat, 0.03);
  group.add(seat);

  // Backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.08), seatMat);
  back.position.set(0, 0.7, -0.26);
  addOutline(back, 0.03);
  group.add(back);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6);
  const legPositions = [
    [-0.7, 0.2, 0.2],
    [0.7, 0.2, 0.2],
    [-0.7, 0.2, -0.2],
    [0.7, 0.2, -0.2],
  ];
  for (const [lx, ly, lz] of legPositions) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, ly, lz);
    group.add(leg);
  }

  // Armrests
  const armGeo = new THREE.BoxGeometry(0.08, 0.35, 0.5);
  const leftArm = new THREE.Mesh(armGeo, legMat);
  leftArm.position.set(-0.86, 0.55, -0.03);
  group.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, legMat);
  rightArm.position.set(0.86, 0.55, -0.03);
  group.add(rightArm);

  return group;
}
