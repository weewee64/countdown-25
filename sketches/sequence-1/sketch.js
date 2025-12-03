import { createEngine } from "../_shared/engine.js"
import { Spring } from "../_shared/spring.js"

const { renderer, input, math, run, finish, } = createEngine()
const { ctx, canvas } = renderer

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


  class ClassRect {
  constructor(x, y, size, ctx) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.ctx = ctx;
  }
  draw() {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(this.x, this.y, this.size, this.size)
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
  drawBlack(alpha = 1) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
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
});

canvas.addEventListener('pointercancel', () => { isPointerDown = false; });

// update drag distance continuously while pointer is down
canvas.addEventListener('pointermove', (e) => {
  if (!isPointerDown) return;
  const br = canvas.getBoundingClientRect();
  const mx = (e.clientX - br.left) * (canvas.width / br.width);
  const my = (e.clientY - br.top) * (canvas.height / br.height);
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

  // draw non-selected rects, respect fade-outs
  notDraw.forEach(({ rect, i }) => {
    rect.drawBlack();
  });
}

run(update)