import { createEngine } from "../_shared/engine.js"
import { Spring } from "../_shared/spring.js"

const { renderer, input, math, run, finish, } = createEngine()
const { ctx, canvas } = renderer
run(update)

/*
const spring = new Spring({
  position: 0,
  frequency: 2.5,
  halfLife: 0.05
})


function update(dt) {

  if (input.isPressed()) {
    spring.target = 0
  }
  else {
    spring.target = 1
  }

  spring.step(dt)

  const x = canvas.width / 2;
  const y = canvas.height / 2;
  const scale = Math.max(spring.position, 0)

  ctx.fillStyle = "black"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = "white"
  ctx.textBaseline = "middle"
  ctx.font = `${canvas.height}px Helvetica Neue, Helvetica , bold`
  ctx.textAlign = "center"
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.fillText("3", 0, 0)
*/

  class ClassRect {
  constructor(x, y, size, ctx) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.ctx = ctx;
  }
  draw(s = 1) {
    this.ctx.save();
    this.ctx.globalAlpha = 0;
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;
    this.ctx.translate(cx, cy);
    this.ctx.scale(s, s);
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size)
    this.ctx.restore();
  }

  // draw with controllable opacity (0..1)
  drawWhite(alpha = 1, s = 1) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;
    this.ctx.translate(cx, cy);
    this.ctx.scale(s, s);
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    this.ctx.restore();
  }

  // draw black with alpha (for fade-out)
  drawBlack(s = 1) {
    this.ctx.save();
    this.ctx.globalAlpha = 0;
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;
    this.ctx.translate(cx, cy);
    this.ctx.scale(s, s);
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
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


let RectChange = new Set()
let Revealed = new Set() // <- new: selected rects that have been revealed by hover

// scale animation state (used to animate all rects to a larger size)
let currentScale = 1;
let targetScale = 1;
let scaling = false;
const SCALE_TARGET = 1.5;
const SCALE_SMOOTH = 6; // larger = faster
// global alpha multiplier for white rects (set to 0 to hide all whites)
let globalAlpha = 1;

// pointer tracking for hover detection
let mouseX = -1;
let mouseY = -1;
let hoveredSelected = false; // true when mouse is over any selected rect
let hoveredSelectedRect = null; // reference to the rect under pointer if any
// require the pointer to be held down to reveal
let isPointerDown = false;
// whether the user has moved the mouse over any rect (used to disable automatic first reveal)
let mouseMovedOverAnyRect = false;

// named pointer handlers so we can remove them when fade-out begins
function handlePointerMove(e) {
  const br = canvas.getBoundingClientRect();
  mouseX = (e.clientX - br.left) * (canvas.width / br.width);
  mouseY = (e.clientY - br.top) * (canvas.height / br.height);
  // if pointer moved over any *selected* rect, mark flag so we won't auto-activate the first rect
  for (const entry of selected) {
    const rect = entry.rect;
    if (mouseX >= rect.x && mouseX <= rect.x + rect.size && mouseY >= rect.y && mouseY <= rect.y + rect.size) {
      mouseMovedOverAnyRect = true;
      break;
    }
  }
}

function handlePointerDown(e) {
  isPointerDown = true;
  const br = canvas.getBoundingClientRect();
  mouseX = (e.clientX - br.left) * (canvas.width / br.width);
  mouseY = (e.clientY - br.top) * (canvas.height / br.height);
  for (const entry of selected) {
    if (entry.rect.contains(mouseX, mouseY)) {
      Revealed.add(entry.i);
      hoveredSelectedRect = entry.rect;
      hoveredSelected = true;
      break;
    }
  }
}

function handlePointerUp() { isPointerDown = false; }
function handlePointerCancel() { isPointerDown = false; }
function handlePointerOut() { isPointerDown = false; }

canvas.addEventListener('mousemove', handlePointerMove);
canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointerup', handlePointerUp);
canvas.addEventListener('pointercancel', handlePointerCancel);
canvas.addEventListener('pointerout', handlePointerOut);

/*
function disableInteractions() {
  // remove pointer listeners and prevent further clicks
  try {
    canvas.removeEventListener('mousemove', handlePointerMove);
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointercancel', handlePointerCancel);
    canvas.removeEventListener('pointerout', handlePointerOut);
  } catch (err) {
    // ignore removal errors
  }
  // clear pointer state and reset cursor
  isPointerDown = false;
  mouseX = -1;
  mouseY = -1;
  canvas.style.cursor = 'default';
}
*/



/*
function setRandomRectRed() {
  while (RectChange.size < 10) {
    RectChange.add(Math.floor(Math.random() * rects.length));
  }
  console.log(Array.from(RectChange));
}
//setRandomRectRed();
console.log(rects);
*/

function addRange(start, end) {
  // inclusive range, supports start === end
  for (let n = start; n <= end; n++) RectChange.add(n);
}

function setRectRed(ranges) {
  for (const r of ranges) {
    const [a, b] = r;
    addRange(Math.min(a, b), Math.max(a, b));
  }
  //console.log(Array.from(RectChange));
}


setRectRed([[0,13],[19,20], [26,27], [33,34], [35, 48], [54, 55], [61, 62], [68, 69], [70, 83]]);         

/*
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
}); */

const HoverRadius = 100;

// fade controls (seconds to full opacity)
const FadeSpeed = 1.0; 
const FadeIns = new Map(); // index -> progress (0..1)

// selected/others will be recomputed each frame in update

let selected = [];
let others = [];
  rects.forEach((rect, i) => {
    if (RectChange.has(i)) selected.push({ rect, i });
    else others.push({ rect, i });
  });

setTimeout(() => startVisible(), 2000);

const startVisible = () => {
  // pick the first selected index from RectChange (safe even if selected not built yet)
  const first = Array.from(RectChange)[0];
  if (first === undefined) return;
  // begin fade-in for that index
  // do not auto-activate first rect if the user has already moved the mouse over any rect
  if (mouseMovedOverAnyRect) {
    console.log('startVisible skipped because mouse moved over a rect');
    return;
  }
  

  FadeIns.set(first, 0);
  console.log("start fade in index", first);
}

function allSelectedRevealed() {
  if (RectChange.size === 0) return false;
  for (const idx of RectChange) {
    if (!Revealed.has(idx)) return false;
  }
  return true;
}



let allRevealedTriggered = false;
function onAllRevealed() {
  // start scaling all rects toward the target
  targetScale = SCALE_TARGET;
  scaling = true;
}

function update(dt) {
  

  canvas.style.background = "black";

  // recompute selected/others each frame


  // pointer hover reveal (persistent) — require pointer to be down while passing over
  // but DO NOT reveal anymore once fade-out has started (prevents re-appearing before finish)
  hoveredSelected = false;
  hoveredSelectedRect = null;
  if (isPointerDown && mouseX >= 0 && mouseY >= 0) {
    for (const entry of selected) {
      if (entry.rect.contains(mouseX, mouseY)) {
        hoveredSelected = true;
        hoveredSelectedRect = entry.rect;
        Revealed.add(entry.i);
        break;
      }
    }
  }

  // advance ongoing fade-ins (only those in FadeIns)
  if (FadeIns.size > 0) {
    for (const [i, prog] of Array.from(FadeIns.entries())) {
      const next = Math.min(1, prog + dt / FadeSpeed);
      if (next >= 1) {
        FadeIns.delete(i);
        Revealed.add(i);
      } else {
        FadeIns.set(i, next);
      }
    }
  }

  

  // draw selected: combine fade-in, revealed, proximity-based alpha and fade-outs
  selected.forEach(({ rect, i }) => {
    let alpha = 0;
    if (FadeIns.has(i)) {
      alpha = FadeIns.get(i);
    } else if (Revealed.has(i)) {
      alpha = 1;
    } else if (mouseX >= 0 && mouseY >= 0) {
      const cx = rect.x + rect.size / 2;
      const cy = rect.y + rect.size / 2;
      const d = Math.hypot(mouseX - cx, mouseY - cy);
      alpha = Math.max(0, 1 - d / HoverRadius);
    }

 

    if (alpha > 0) rect.drawWhite(alpha * globalAlpha, currentScale);
  });

  // draw non-selected rects (respect global scale)
  others.forEach(({ rect, i }) => {
    rect.draw(currentScale);
  });

  if (!allRevealedTriggered && allSelectedRevealed()) {
    allRevealedTriggered = true;
    onAllRevealed();
  }

  // advance global scale toward target when scaling is active
  if (scaling) {
    const a = 1 - Math.exp(-SCALE_SMOOTH * dt);
    currentScale += (targetScale - currentScale) * a;
    if (Math.abs(currentScale - targetScale) < 0.001) {
      currentScale = targetScale;
      scaling = false;
      if (currentScale >= targetScale) {
        setTimeout(() => {
          globalAlpha = 0;
        }, 500);
        setTimeout(() => {finish();}, 1000);
        
      }
    }
  }

}

/*
class Circle {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 14;
    ctx.stroke();
  }
}

*/
 

  
/*
  if (scale <= 0) {
    finish()
  }
*/

