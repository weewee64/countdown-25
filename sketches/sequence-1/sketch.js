import { createEngine } from "../_shared/engine.js"
import { Spring } from "../_shared/spring.js"
import { VerletPhysics } from "../_shared/verletPhysics.js"
import { DragManager } from "./dragManagerModif.js"

const { renderer, input, math, run, finish, } = createEngine()
const { ctx, canvas } = renderer

const physics = new VerletPhysics()
physics.gravityY = 3000

const dragManager = new DragManager()

// physics bounds
physics.bounds = { left: 0, right: canvas.width, top: 0, bottom: canvas.height }

// global mouse state for DragManager
let mouseX = 0;
let mouseY = 0;
let mouseIsDown = false;
// pointer velocity tracking for fling on release
let prevMouseX = 0;
let prevMouseY = 0;
let prevMouseTime = 0;
let pointerVx = 0;
let pointerVy = 0;
// snapping configuration (pixels)
const SNAP_DIST = 30;
// delay (seconds) after creation before an item can be locked/snapped
const SNAP_LOCK_DELAY = 1;
// horizontal flick speed (px/s) applied randomly left/right when bodies are created
const FLICK_SPEED = 220;
// delay (seconds) after creation before an item can be grabbed
const GRAB_LOCK_DELAY = 0.5;
let allPlacedTriggered = false;

// global fade-out when puzzle completed
let fadeAll = false;
let overallAlpha = 1;
const FADE_ALL_DURATION = 1.2; // seconds

let alphaLvl = 0;
// delay before fade-in starts (seconds)
let fadeDelay = 50;
// timer accumulating time since start
let fadeTimer = 0;
// pointer drag measurement
let isPointerDown = false;
let pointerStartX = 0;
let pointerStartY = 0;
let lastDragDistance = 0; // last measured distance (px)
// if the user adjusts alpha via drag, disable the automatic initial fade
let userTouchedAlpha = false;
// lock alpha when it reaches full opacity
let alphaLocked = false;
// alpha value at the start of the current drag (used to accumulate)
let dragStartAlpha = 0;
// once alpha reaches 1, pick a random subset of selected rects
let selectedSubset = [];
let subsetCreated = false;
// target slots derived from the selected subset; any body can occupy any free slot
let slots = [];

function pickRandomSubsetFromSelected(count) {
  const out = [];
  const total = selected.length;
  if (total === 0) return out;
  // build array of indices and shuffle
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const take = Math.min(count, indices.length);
  for (let k = 0; k < take; k++) {
    out.push(selected[indices[k]]);
  }
  return out;
}


  class ClassRect {
  constructor(x, y, size, ctx) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.ctx = ctx;
  }
  draw() {
    this.ctx.save();
    this.ctx.globalAlpha = overallAlpha;
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(this.x, this.y, this.size, this.size)
    this.ctx.restore();
  }

  // draw with controllable opacity (0..1)
  drawWhite() {
    this.ctx.save();
    this.ctx.globalAlpha = alphaLvl;
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(this.x, this.y, this.size, this.size);
    this.ctx.restore();
  }

  // draw black with alpha (for fade-out)
  drawBlack() {
    this.ctx.save();
    this.ctx.globalAlpha = 0;
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(this.x, this.y, this.size, this.size);
    this.ctx.restore();
  }

  // helper to test point inside this rect
  contains(px, py) {
    return px >= this.x && px <= this.x + this.size && py >= this.y && py <= this.y + this.size;
  }
}

let rects = [] ;  

const cols = 7;
const rows = 12;
const cell = 80;

// taille totale de la grille
const gridW = cols * cell;
const gridH = rows * cell;

// centrer la grille
const startX = canvas.width / 2 - gridW / 2;
const startY = canvas.height / 2 - gridH / 2;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const rectX = startX + j * cell;
        const rectY = startY + i * cell;
        rects.push(new ClassRect(rectX, rectY, 62, ctx, ));
      }
    }




canvas.addEventListener('pointerdown', (e) => {
  const br = canvas.getBoundingClientRect();
  const mx = (e.clientX - br.left) * (canvas.width / br.width);
  const my = (e.clientY - br.top) * (canvas.height / br.height);



  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (mx >= r.x && mx <= r.x + r.size && my >= r.y && my <= r.y + r.size) {
      console.log('clicked rect index:', i, 'rect:', r);
      break; // remove if you want multiple hits
    }
  }

    // record start position for drag distance
  isPointerDown = true;
  pointerStartX = mx;
  pointerStartY = my;
    // capture alpha at drag start so multiple small drags accumulate
    dragStartAlpha = alphaLvl;
    userTouchedAlpha = true;
  // update global mouse state
  mouseX = mx; mouseY = my; mouseIsDown = true;
  // initialize pointer velocity tracking
  prevMouseX = mx; prevMouseY = my; prevMouseTime = performance.now() / 100;
  pointerVx = 0; pointerVy = 0;
}); 

canvas.addEventListener('pointerup', (e) => {
  if (!isPointerDown) return;
  const br = canvas.getBoundingClientRect();
  const mx = (e.clientX - br.left) * (canvas.width / br.width);
  const my = (e.clientY - br.top) * (canvas.height / br.height);
  const dx = mx - pointerStartX;
  const dy = my - pointerStartY;
  lastDragDistance = Math.hypot(dx, dy);
  console.log('pointer drag distance (px):', lastDragDistance.toFixed(2));
  isPointerDown = false;
  // update global mouse state
  mouseX = mx; mouseY = my; mouseIsDown = false;
});

canvas.addEventListener('pointercancel', () => { isPointerDown = false; });

// update drag distance continuously while pointer is down
canvas.addEventListener('pointermove', (e) => {
  if (!isPointerDown) return;
  const br = canvas.getBoundingClientRect();
  const mx = (e.clientX - br.left) * (canvas.width / br.width);
  const my = (e.clientY - br.top) * (canvas.height / br.height);
  // compute pointer velocity (px/s)
  const now = performance.now() / 100;
  const dT = Math.max(1e-4, now - prevMouseTime);
  const vx = (mx - prevMouseX) / dT;
  const vy = (my - prevMouseY) / dT;
  // simple smoothing to avoid spikes
  const smooth = 0.6;
  pointerVx = pointerVx * smooth + vx * (1 - smooth);
  pointerVy = pointerVy * smooth + vy * (1 - smooth);
  prevMouseX = mx; prevMouseY = my; prevMouseTime = now;
  const dx = mx - pointerStartX;
  const dy = my - pointerStartY;
  lastDragDistance = Math.hypot(dx, dy);
  // map drag distance to alpha immediately and mark user interaction
  if (!alphaLocked) {
    const scale = 1000; // pixels -> controls how much drag maps to full alpha
    const mapped = Math.max(0, Math.min(1, lastDragDistance / scale));
    // cumulative behavior: add mapped fraction to the alpha at drag start
    const candidate = dragStartAlpha + mapped;
    if (candidate > alphaLvl) {
      alphaLvl = Math.min(1, candidate);
      if (alphaLvl >= 1) {
        alphaLvl = 1;
        alphaLocked = true;
        console.log('alpha locked at 1');
      }
    }
  }
  // update global mouse position while moving
  mouseX = mx; mouseY = my;
});

let RectChange = new Set()

function addRange(start, end) {
  // inclusive range, supports start === end
  for (let n = start; n <= end; n++) RectChange.add(n);
}

function selectRect(ranges) {
  for (const r of ranges) {
    const [a, b] = r;
    addRange(Math.min(a, b), Math.max(a, b));
  }
  //console.log(Array.from(RectChange));
}


selectRect([[5,6], [11,13],[17,20], [23,27], [29,31], [33,34], [35,37], [40,41], [47,48], [54,55], [61,62], [68,69], [75,76], [82,83],  ]);         
  

// selected/others will be recomputed each frame in update

let selected = [];
let notDraw = [];

  rects.forEach((rect, i) => {
    if (RectChange.has(i)) selected.push({ rect, i });
    else notDraw.push({ rect, i });
  });

function update(dt) {
  canvas.style.background = "black";



  // draw selected: combine fade-in, revealed, proximity-based alpha and fade-outs
  selected.forEach(({ rect}) => {
    // advance fade timer; only begin increasing alpha after the delay
    fadeTimer += dt;
    // if the user hasn't manually adjusted alpha, run the automatic fade-to-0.1
    if (!userTouchedAlpha) {
      if (fadeTimer >= fadeDelay) {
        // first ramp up to the small base alpha (0.1)
        if (alphaLvl < 0.1) {
          alphaLvl = Math.min(0.1, alphaLvl + dt * 0.01);
        }
      }
    } else {
      // user already touched alpha: we've already updated alphaLvl in pointermove
      // keep alphaLvl clamped to [0,1] and respect a final lock at 1
      alphaLvl = Math.max(0, Math.min(1, alphaLvl));
    }
    rect.drawWhite();
  });

  // once alpha hits full and we haven't created the subset yet, create it
  if (!subsetCreated && alphaLvl >= 1) {
    const pickCount = 10;
    selectedSubset = pickRandomSubsetFromSelected(pickCount);
    subsetCreated = true;
    console.log('selectedSubset created with', selectedSubset.length, 'items');
    // create physics bodies and drag objects for the subset so they can fall and be dragged
    for (const entry of selectedSubset) {
      const r = entry.rect;
      entry.immobilized = false;
      // create a physics body at the rect center
      const body = physics.createBody({
        positionX: r.x + r.size / 2,
        positionY: r.y + r.size / 2,
        drag: 1.5,
        radius: r.size / 2
      });
      // attach body to the entry so we can sync position later
      entry.body = body;
      // when this entry becomes eligible to be grabbed
      entry.canGrabAt = performance.now() / 1000 + GRAB_LOCK_DELAY;

      // apply a small random horizontal flick so pieces separate as they fall
      // Verlet velocity = position - lastPosition, so set lastPosition to produce vx
      const dtEstimate = 1 / 60;
      const flickVx = (Math.random() * 2 - 1) * FLICK_SPEED; // random between -FLICK_SPEED..FLICK_SPEED
      entry.body.lastPositionX = entry.body.positionX - flickVx * dtEstimate;
      entry.body.lastPositionY = entry.body.positionY;

      
      // create drag object so user can grab the body; keep a reference so we can disable it when snapped
      // supply an isOverlapping function that prevents grabbing until the grab-lock delay
      const dragObj = dragManager.createDragObject({
        target: body,
        isOverlapping: (mx, my) => {
          // not grabbable yet
          if (performance.now() / 1000 < (entry.canGrabAt || 0)) return false;
          const dx = body.positionX - mx;
          const dy = body.positionY - my;
          return Math.hypot(dx, dy) < (body.radius || 30);
        },
        onStartDrag: (t) => {
          // don't allow dragging if we've already immobilized this entry
          if (entry.immobilized) return;
          // freeze physics integration while user drags to avoid jitter
          t.isFixed = true;
          // reset lastPosition so verlet velocity doesn't introduce a big impulse
          t.lastPositionX = t.positionX;
          t.lastPositionY = t.positionY;
        },
        onStopDrag: (t) => {
          // if this entry has been immobilized (snapped into a slot), keep it fixed
          if (entry.immobilized) {
            t.isFixed = true;
            t.lastPositionX = t.positionX;
            t.lastPositionY = t.positionY;
            return;
          }
          // otherwise release body back to physics and give it a fling velocity based on pointer
          t.isFixed = false;
          // estimate a small dt (seconds) to convert pointer velocity (px/s) into lastPosition offset
          const dtEstimate = 1 / 60;
          // set lastPosition so Verlet will compute velocity = position - lastPosition
          t.lastPositionX = t.positionX - pointerVx * dtEstimate;
          t.lastPositionY = t.positionY - pointerVy * dtEstimate;
        }
      });
      entry.dragObj = dragObj;
    }
    // build slots from the original grid positions so any body may snap into any free slot
    const now = performance.now() / 1000;
    slots = selectedSubset.map(e => ({
      x: e.rect.x,
      y: e.rect.y,
      size: e.rect.size,
      occupied: null,
      canSnapAt: now + SNAP_LOCK_DELAY
    }));
  }

  // Update drag manager and physics each frame; do this after subset creation so bodies exist
  dragManager.update(mouseX, mouseY, mouseIsDown);

  physics.update(dt);

  // sync rect positions to physics bodies for the selected subset so they render moving
  if (subsetCreated) {
    for (const entry of selectedSubset) {
      if (entry.body) {
        const b = entry.body;
        const r = entry.rect;
        r.x = b.positionX - r.size / 2;
        r.y = b.positionY - r.size / 2;
      }
    }

    // check for snapping to any free slot and immobilize when close enough
    let placedCount = 0;
    const now = performance.now() / 1000;
    for (const entry of selectedSubset) {
      if (!entry.body || entry.immobilized) {
        if (entry.immobilized) placedCount++;
        continue;
      }

      // find nearest free slot within SNAP_DIST that is eligible
      let bestSlot = null;
      let bestDist = Infinity;
      for (const slot of slots) {
        if (slot.occupied) continue;
        if (now < (slot.canSnapAt || 0)) continue;
        const slotCx = slot.x + slot.size / 2;
        const slotCy = slot.y + slot.size / 2;
        const dx = entry.body.positionX - slotCx;
        const dy = entry.body.positionY - slotCy;
        const d = Math.hypot(dx, dy);
        if (d <= SNAP_DIST && d < bestDist) {
          bestDist = d;
          bestSlot = slot;
        }
      }

      if (bestSlot) {
        // snap into chosen slot
        const slotCx = bestSlot.x + bestSlot.size / 2;
        const slotCy = bestSlot.y + bestSlot.size / 2;
        entry.body.positionX = slotCx;
        entry.body.positionY = slotCy;
        entry.body.lastPositionX = entry.body.positionX;
        entry.body.lastPositionY = entry.body.positionY;
        entry.body.isFixed = true;
        entry.immobilized = true;
        bestSlot.occupied = entry;
        // disable drag so it can't be grabbed again
        if (entry.dragObj) entry.dragObj.disabled = true;
        // snap the rect rendering to the slot
        entry.rect.x = bestSlot.x;
        entry.rect.y = bestSlot.y;
        placedCount++;
      }
    }

    // when all are placed, trigger the final action once
    if (!allPlacedTriggered && subsetCreated && selectedSubset.length > 0) {
      const immobilized = selectedSubset.filter(e => e.immobilized).length;
      if (immobilized === selectedSubset.length) {
        allPlacedTriggered = true;
        // start fading all rects
        fadeAll = true;
        alphaLvl = 1;
        const fadeMs = Math.max(100, Math.floor(FADE_ALL_DURATION * 1000));
        // call finish after the fade completes (add small buffer)
        setTimeout(() => {
          try { finish(); } catch (e) { console.warn('finish() failed', e); }
        }, fadeMs + 80);
        console.log('All selectedSubset rects placed! starting fade...');
      }
    }
  }

  // draw non-selected rects, respect fade-outs
  notDraw.forEach(({ rect, i }) => {
    rect.drawBlack();
  });
  // animate global fade when triggered
  if (fadeAll) {
    alphaLvl = Math.max(0, alphaLvl - dt / FADE_ALL_DURATION);
  }
}

run(update)