import * as THREE from 'three';
import {
  CELL_SIZE, GRID_WIDTH, GRID_HEIGHT, BENCH_POSITIONS, NPC_COUNT,
  COLORS, MAX_HP, Direction,
} from './constants';
import { CharacterType, CharacterState, GridPos } from './types';
import { gridToWorld, samePos } from './world/Grid';
import { createField } from './world/Field';
import { Player } from './entities/Player';
import { NPC } from './entities/NPC';
import { Character } from './entities/Character';
import { Animal, createBasket } from './entities/Animal';
import { Bench } from './entities/Bench';
import { Paramedic } from './entities/Paramedic';
import { AnimalManager } from './systems/AnimalManager';
import { checkCollisions, checkNPCCollisions } from './systems/CollisionSystem';

type GameState = 'title' | 'playing' | 'gameover';

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private clock: THREE.Clock;

  private state: GameState = 'title';
  private player: Player | null = null;
  private npcs: NPC[] = [];
  private benches: Bench[] = [];
  private animalManager: AnimalManager;
  private paramedic: Paramedic;
  private baskets: Map<Character, THREE.Group[]> = new Map();

  // HUD elements
  private hpBar: HTMLElement;
  private hpText: HTMLElement;
  private scoreDisplay: HTMLElement;
  private animalCount: HTMLElement;
  private sweatIndicator: HTMLElement;
  private ghostIndicator: HTMLElement;
  private titleScreen: HTMLElement;
  private gameOverScreen: HTMLElement;
  private finalScore: HTMLElement;

  constructor(container: HTMLElement) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x87CEEB);
    container.insertBefore(this.renderer.domElement, container.firstChild);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87CEEB, 25, 45);

    // Camera (orthographic, fixed, viewing entire field)
    const aspect = window.innerWidth / window.innerHeight;
    const frustum = 18;
    this.camera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      0.1, 100,
    );
    this.camera.position.set(12, 20, 12);
    this.camera.lookAt(0, 0, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 3);
    this.scene.add(dirLight);

    // Clock
    this.clock = new THREE.Clock();

    // Systems
    this.animalManager = new AnimalManager(this.scene);
    this.paramedic = new Paramedic();
    this.scene.add(this.paramedic.group);

    // HUD references
    this.hpBar = document.getElementById('hp-bar')!;
    this.hpText = document.getElementById('hp-text')!;
    this.scoreDisplay = document.getElementById('score-display')!;
    this.animalCount = document.getElementById('animal-count')!;
    this.sweatIndicator = document.getElementById('sweat-indicator')!;
    this.ghostIndicator = document.getElementById('ghost-indicator')!;
    this.titleScreen = document.getElementById('title-screen')!;
    this.gameOverScreen = document.getElementById('game-over-screen')!;
    this.finalScore = document.getElementById('final-score')!;

    // Create field
    createField(this.scene);

    // Create benches
    for (const pos of BENCH_POSITIONS) {
      const bench = new Bench(pos);
      this.benches.push(bench);
      this.scene.add(bench.group);
    }

    // Setup UI events
    this.setupUI();

    // Resize handler
    window.addEventListener('resize', () => this.onResize());

    // Start loop
    this.animate();
  }

  private setupUI(): void {
    document.getElementById('select-grandpa')!.addEventListener('click', () => {
      this.startGame('grandpa');
    });
    document.getElementById('select-grandma')!.addEventListener('click', () => {
      this.startGame('grandma');
    });
    document.getElementById('restart-btn')!.addEventListener('click', () => {
      this.showTitle();
    });
  }

  private startGame(type: CharacterType): void {
    this.clearGame();

    // Player
    const playerStart: GridPos = { x: Math.floor(GRID_WIDTH / 2), z: Math.floor(GRID_HEIGHT / 2) };
    this.player = new Player(type, playerStart);
    this.scene.add(this.player.group);

    // NPCs
    const npcColors = [COLORS.npc1, COLORS.npc2, COLORS.npc3];
    const npcStarts: GridPos[] = [
      { x: 5, z: 5 },
      { x: 18, z: 5 },
      { x: 5, z: 18 },
    ];
    for (let i = 0; i < NPC_COUNT; i++) {
      const npcType: CharacterType = Math.random() > 0.5 ? 'grandpa' : 'grandma';
      const npc = new NPC(npcType, npcStarts[i], npcColors[i]);
      this.npcs.push(npc);
      this.scene.add(npc.group);
    }

    // Spawn initial animals
    this.animalManager.spawnInitial();

    // Hide title, show HUD
    this.titleScreen.style.display = 'none';
    this.gameOverScreen.classList.remove('visible');
    this.state = 'playing';
  }

  private clearGame(): void {
    // Remove old entities
    if (this.player) {
      this.scene.remove(this.player.group);
      this.removeBaskets(this.player);
    }
    for (const npc of this.npcs) {
      this.scene.remove(npc.group);
      this.removeBaskets(npc);
    }
    for (const animal of this.animalManager.animals) {
      this.scene.remove(animal.group);
    }
    this.player = null;
    this.npcs = [];
    this.animalManager = new AnimalManager(this.scene);
    this.baskets.clear();
    this.paramedic.active = false;
    this.paramedic.group.visible = false;
  }

  private showTitle(): void {
    this.clearGame();
    this.titleScreen.style.display = 'flex';
    this.gameOverScreen.classList.remove('visible');
    this.state = 'title';
  }

  private gameOver(): void {
    if (!this.player) return;
    this.state = 'gameover';

    // Drop player's animals
    const droppedAnimals = this.player.dropAnimals();
    this.scatterAnimals(droppedAnimals, this.player.gridPos);

    this.player.die();

    // Dispatch paramedic
    this.paramedic.dispatch(this.player);

    // Show game over UI after paramedic animation
    setTimeout(() => {
      this.finalScore.textContent = `Score: ${this.player?.score || 0}`;
      this.gameOverScreen.classList.add('visible');
    }, 3500);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05); // Cap delta

    if (this.state === 'playing') {
      this.updatePlaying(dt);
    }

    if (this.paramedic.active) {
      this.paramedic.update(dt);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updatePlaying(dt: number): void {
    if (!this.player) return;

    // Player input & movement
    const inputDir = this.player.updateInput();
    if (inputDir !== null && this.player.canMove()) {
      this.player.startStep(inputDir);
    }
    this.player.update(dt);

    // NPC AI & movement
    const freeAnimals = this.animalManager.getFreeAnimals();
    for (const npc of this.npcs) {
      if (npc.state === CharacterState.Dead) continue;

      const dir = npc.updateAI(dt, freeAnimals, this.benches, [this.player, ...this.npcs]);
      if (dir !== null && npc.canMove()) {
        npc.startStep(dir);
      }
      npc.update(dt);
    }

    // Update benches
    for (const bench of this.benches) {
      bench.update(dt);
    }

    // Update animals
    this.animalManager.update(dt);

    // Update trail positions
    this.updateTrails(this.player);
    for (const npc of this.npcs) {
      this.updateTrails(npc);
    }

    // Collision detection
    const allCharacters = [this.player, ...this.npcs.filter((n) => n.state !== CharacterState.Dead)];
    const collision = checkCollisions(allCharacters, freeAnimals, this.benches);

    // Handle animal collection
    for (const { character, animal } of collision.animalsCollected) {
      if (!animal.collected) {
        character.collectAnimal(animal);
        this.animalManager.removeAnimalFromField(animal);
        this.updateBaskets(character);
      }
    }

    // Handle bench interactions
    for (const { character, bench } of collision.benchInteractions) {
      if (character.state !== CharacterState.Resting) {
        bench.sitDown(character);
        if (character.isPlayer) {
          (character as Player).clearInput();
        }
      }
    }

    // Handle character death
    if (collision.characterDied) {
      if (collision.characterDied === this.player) {
        this.gameOver();
        return;
      } else {
        this.handleNPCDeath(collision.characterDied);
      }
    }

    // NPC-NPC collision
    const deadNPC = checkNPCCollisions(this.npcs.filter((n) => n.state !== CharacterState.Dead));
    if (deadNPC) {
      this.handleNPCDeath(deadNPC);
    }

    // Check player HP death
    if (this.player.hp <= 0) {
      this.gameOver();
      return;
    }

    // Check NPC HP death
    for (const npc of this.npcs) {
      if (npc.hp <= 0 && npc.state !== CharacterState.Dead) {
        this.handleNPCDeath(npc);
      }
    }

    // Camera follow player
    this.updateCamera();

    // Update HUD
    this.updateHUD();
  }

  private updateTrails(character: Character): void {
    for (let i = 0; i < character.trail.length; i++) {
      const animal = character.trail[i];
      const histIdx = i + 1; // Offset by 1 from character's position
      if (histIdx < character.pathHistory.length) {
        const targetPos = character.pathHistory[histIdx];
        animal.gridPos = { ...targetPos };
        const world = gridToWorld(targetPos.x, targetPos.z);
        // Smooth follow
        animal.group.position.x += (world.x - animal.group.position.x) * 0.15;
        animal.group.position.z += (world.z - animal.group.position.z) * 0.15;
        animal.group.visible = true;
      }
    }

    // Update basket positions
    this.updateBasketPositions(character);
  }

  private updateBaskets(character: Character): void {
    const existing = this.baskets.get(character) || [];

    // Add baskets if needed (one basket per ~3 animals)
    const needed = Math.ceil(character.trail.length / 3);
    while (existing.length < needed) {
      const basket = createBasket();
      this.scene.add(basket);
      existing.push(basket);
    }
    // Remove excess
    while (existing.length > needed) {
      const basket = existing.pop()!;
      this.scene.remove(basket);
    }

    this.baskets.set(character, existing);
  }

  private updateBasketPositions(character: Character): void {
    const basketList = this.baskets.get(character);
    if (!basketList || basketList.length === 0) return;

    for (let i = 0; i < basketList.length; i++) {
      const basket = basketList[i];
      const trailIdx = (i + 1) * 3; // Position basket every 3 trail segments
      const histIdx = Math.min(trailIdx, character.pathHistory.length - 1);
      if (histIdx >= 0 && histIdx < character.pathHistory.length) {
        const pos = character.pathHistory[histIdx];
        const world = gridToWorld(pos.x, pos.z);
        basket.position.x += (world.x - basket.position.x) * 0.12;
        basket.position.z += (world.z - basket.position.z) * 0.12;
        basket.position.y = 0;
      }
    }
  }

  private removeBaskets(character: Character): void {
    const basketList = this.baskets.get(character);
    if (basketList) {
      for (const basket of basketList) {
        this.scene.remove(basket);
      }
      this.baskets.delete(character);
    }
  }

  private handleNPCDeath(npc: Character): void {
    const dropped = npc.dropAnimals();
    this.scatterAnimals(dropped, npc.gridPos);
    npc.die();
    this.removeBaskets(npc);

    // Respawn NPC after delay
    setTimeout(() => {
      if (this.state !== 'playing') return;
      const idx = this.npcs.indexOf(npc as NPC);
      if (idx === -1) return;

      this.scene.remove(npc.group);
      const npcColors = [COLORS.npc1, COLORS.npc2, COLORS.npc3];
      const respawnPos: GridPos = {
        x: 2 + Math.floor(Math.random() * (GRID_WIDTH - 4)),
        z: 2 + Math.floor(Math.random() * (GRID_HEIGHT - 4)),
      };
      const npcType: CharacterType = Math.random() > 0.5 ? 'grandpa' : 'grandma';
      const newNPC = new NPC(npcType, respawnPos, npcColors[idx % npcColors.length]);
      this.npcs[idx] = newNPC;
      this.scene.add(newNPC.group);
    }, 5000);
  }

  private scatterAnimals(animals: Animal[], center: GridPos): void {
    for (let i = 0; i < animals.length; i++) {
      const angle = (i / animals.length) * Math.PI * 2;
      const radius = 1 + Math.floor(i / 4);
      const dropPos: GridPos = {
        x: Math.max(1, Math.min(GRID_WIDTH - 2, center.x + Math.round(Math.cos(angle) * radius))),
        z: Math.max(1, Math.min(GRID_HEIGHT - 2, center.z + Math.round(Math.sin(angle) * radius))),
      };
      this.animalManager.dropAnimal(animals[i], dropPos);
    }
  }

  private updateCamera(): void {
    // Fixed camera looking at field center - no movement
  }

  private updateHUD(): void {
    if (!this.player) return;

    const hpPct = (this.player.hp / MAX_HP) * 100;
    this.hpBar.style.width = `${hpPct}%`;

    // Color shift based on HP
    if (hpPct > 60) {
      this.hpBar.style.background = 'linear-gradient(90deg, #00b894, #55efc4)';
    } else if (hpPct > 30) {
      this.hpBar.style.background = 'linear-gradient(90deg, #fdcb6e, #ffeaa7)';
    } else {
      this.hpBar.style.background = 'linear-gradient(90deg, #ff6b6b, #ee5a24)';
    }

    this.hpText.textContent = `HP ${Math.ceil(this.player.hp)}/${MAX_HP}`;
    this.scoreDisplay.textContent = `Score: ${this.player.score}`;
    this.animalCount.textContent = `🐤 x ${this.player.trail.length}`;

    this.sweatIndicator.className = this.player.sweatActive ? 'active' : '';
    this.ghostIndicator.className = this.player.isGhost() ? 'active' : '';
  }

  private onResize(): void {
    const aspect = window.innerWidth / window.innerHeight;
    const frustum = 18;
    this.camera.left = -frustum * aspect;
    this.camera.right = frustum * aspect;
    this.camera.top = frustum;
    this.camera.bottom = -frustum;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
