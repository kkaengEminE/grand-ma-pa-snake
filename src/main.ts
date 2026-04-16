import { Game } from './Game';

try {
  const container = document.getElementById('game-container')!;
  new Game(container);
} catch (e: any) {
  // Show error visibly on screen for debugging
  const err = document.createElement('div');
  err.style.cssText =
    'position:fixed;top:0;left:0;width:100%;padding:20px;background:red;color:white;font-size:16px;z-index:9999;white-space:pre-wrap;';
  err.textContent = `Game failed to start:\n${e?.message}\n${e?.stack}`;
  document.body.appendChild(err);
  console.error(e);
}
