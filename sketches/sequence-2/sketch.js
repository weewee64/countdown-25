import { createEngine } from "../_shared/engine.js"
import { Spring } from "../_shared/spring.js"

const { renderer, input, math, run, finish, } = createEngine()
const { ctx, canvas } = renderer

canvas.style.cursor = "pointer";

  class ClassRect {
  constructor(x, y, size, ctx) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.ctx = ctx;
  }


  // draw with controllable opacity (0..1)
  drawWhite(alpha = 1) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(this.x, this.y, this.size, this.size);
    this.ctx.restore();
  }

  // draw black with alpha (for fade-out)
  drawBlack(alpha = 1) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    
    
    // fill shade depends on rotateCount: 0 -> black, higher -> lighter grey
    const rc = this.rotateCount || 0;
    const grey = Math.min(255, rc * 10); // 0,80,160,240...
    this.ctx.fillStyle = `rgb(${grey},${grey},${grey})`;
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = `rgb(${grey},${grey},${grey})`;
    // choose rotation origin (supports 'center' and 'bottomRight')
    let offsetX = this.size / 2;
    let offsetY = this.size / 2;
    if (this.rotationOrigin === 'bottomRight') {
      offsetX = this.size;
      offsetY = this.size;
    }
    const centerx = this.x + offsetX;
    const centery = this.y + offsetY;
    this.ctx.translate(centerx, centery);
    const angle = this.angle || 0;
    this.ctx.rotate(angle);
    this.ctx.fillRect(-offsetX, -offsetY, this.size, this.size);
    this.ctx.strokeRect(-offsetX, -offsetY, this.size, this.size);
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
        // initialize base position and fallen flag for originals
        const r = rects[rects.length - 1];
        r.baseX = r.x;
        r.baseY = r.y;
        r.fallen = false;
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


selectRect([[0,13],[19,20], [26,27], [33,34], [35, 50], [56, 57], [63, 64], [70, 83] ]);         


// selected/others will be recomputed each frame in update

ClassRect.prototype.clone = function() {
  const clone = new ClassRect(this.x, this.y, this.size, this.ctx);
  clone.baseX = this.x;
  clone.baseY = this.y;
  clone.fallen = false;
  // rotation state for this clone (optional)
  clone.angle = 0;
  clone.angleTarget = 0;
  clone.angleSpeed = 0.5; // radians per second max change
  clone.isRotating = false;
  // masks rotate around bottom-right by default
  clone.rotationOrigin = 'bottomRight';
  // count how many rotation steps this mask has taken
  clone.rotateCount = 0;
  return clone;
};

let selected = [];
let notDraw = [];
let mask = []

// click counter to scale how many masks are affected per click
let clickCount = 0;

// small canvas punch rotation (spring)
let punchAngle = 0;
let punchVel = 0;
const punchSpring = 40; // stiffness
const punchDamp = 8; // damping

// rotating-mask selection: after a short delay one mask will tilt/rotate
let rotatingMaskIndex = -1;
const rotationDelay = 1.8; // seconds until one mask starts to rotate
const rotationAngle = -8 * (Math.PI / 180); // radians (~8 degrees)
let rotationTimeoutId = null;
let rotationScheduled = false;

// falling physics
const gravity = 2000; // px/s^2
//map is used to track falling rects
const falling = new Map(); 
// map to track falling for original selected rects
const fallingSelected = new Map();

// click to make a random mask rect fall
canvas.addEventListener('click', () => {
  // if a rotation was scheduled but hasn't started yet, cancel it
  if (rotationScheduled && rotationTimeoutId) {
    clearTimeout(rotationTimeoutId);
    rotationTimeoutId = null;
    rotationScheduled = false;
    rotatingMaskIndex = -1;
    console.log('rotation canceled by click before start');
    // continue to also trigger falling behavior below
  }
  // pick up to N random available masks and advance each one's rotation step
  clickCount += 1;
  const available = [];
  for (let i = 0; i < mask.length; i++) {
    // only consider mask entries that are not currently falling and haven't already fallen
    if (!falling.has(i) && !mask[i].fallen) available.push(i);
  }
  if (available.length === 0) {
    // no mask available -> start falling for all original selected rects
    selected.forEach((entry, selectIndex) => {
      const { rect } = entry;
      if (!fallingSelected.has(selectIndex) && !rect.fallen) {
        fallingSelected.set(selectIndex, { vy: 0 });
      }
        
    });
    setTimeout(() => {
      console.log('no masks left — finishing now');
      finish();
    }, 2000);
    return;
  }
  // decide how many masks to affect this click: 1 + floor(clickCount / 3)
  const maxActive = 1 + Math.floor(clickCount / 3);
  const take = Math.min(maxActive, available.length);
  // shuffle available and take first `take` indices
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  const chosen = available.slice(0, take);
  chosen.forEach(index => {
    const m = mask[index];
    if (typeof m.rotateCount !== 'number') m.rotateCount = 0;
    m.rotateCount += 1;
    m.rotationOrigin = 'bottomRight';
    m.angleTarget = rotationAngle * m.rotateCount;
    m.isRotating = true;
    console.log('mask', index, 'rotation step', m.rotateCount, 'angleTarget=', m.angleTarget.toFixed(3));
    if (m.rotateCount >= 3) {
      falling.set(index, { vy: 0 });
      console.log('mask', index, 'completed 3 rotations -> start falling');
    }
  });

  // apply a small punch impulse to the canvas rotation on every click
  const impulse = 0.06; // radians
  punchVel += (Math.random() < 0.5 ? -1 : 1) * impulse;



  if (available.length === 1) {
    console.log('all mask rects are now down');
    // start falling for all original selected rects on next click
    // (the case where available becomes 0 is handled by the code below - keep this log)
  }
  
  
});

  rects.forEach((rect, i) => {
    if (RectChange.has(i)) selected.push({ rect, i });
    else notDraw.push({ rect, i });
    mask = selected.map(({ rect }) => rect.clone());
   // console.log(mask.length, mask[0]);
  });

// schedule rotation using setTimeout; clicking before timeout will cancel it
if (mask.length) {
  rotationScheduled = true;
  rotationTimeoutId = setTimeout(() => {
    // use fixed target index (assumed valid)
    const targetIndex = 15;
 
    const m = mask[targetIndex];
    // behave like the click-driven rotation: increment rotateCount,
    // update angleTarget based on rotateCount, and start falling when >=3
    if (m && !falling.has(targetIndex) && !m.fallen) {
      if (typeof m.rotateCount !== 'number') m.rotateCount = 0;
      m.rotateCount += 1;
      // rotate around bottom-right for this scheduled mask
      m.rotationOrigin = 'bottomRight';
      m.angleTarget = rotationAngle * m.rotateCount;
      m.isRotating = true;
    } else {
      console.log('scheduled rotation skipped for index', index, '- missing or already falling');
    }
    rotationScheduled = false;
    rotationTimeoutId = null;
  }, rotationDelay * 1000);
}

//setTimeout(() => functiontest(), 2000);


function update(dt) {


  canvas.style.background = "black";

  // --- Canvas "punch" rotation (damped spring) ---
  // Use a simple spring: angular acceleration = -k * angle - c * angularVelocity
  // Integrate acceleration -> velocity -> angle (semi-implicit integration for stability)
  const punchAcceleration = -punchSpring * punchAngle - punchDamp * punchVel;
  punchVel += punchAcceleration * dt; // update angular velocity
  punchAngle += punchVel * dt;       // update angle

  // Apply the canvas-level rotation around the canvas center.
  // Save here and restore after all scene drawing to keep transform local.
  ctx.save();
  const canvasCenterX = canvas.width / 2;
  const canvasCenterY = canvas.height / 2;
  ctx.translate(canvasCenterX, canvasCenterY);
  ctx.rotate(punchAngle);
  ctx.translate(-canvasCenterX, -canvasCenterY);


  // draw selected originals and animate their falling when scheduled
  selected.forEach(({ rect }, selectedIndex) => {
    const fall = fallingSelected.get(selectedIndex);
    if (fall) {
      fall.vy += gravity * dt;
      rect.y += fall.vy * dt;
      if (rect.y - rect.size > canvas.height) {
        rect.fallen = true;
        fallingSelected.delete(selectedIndex);
      }
    } else {
      if (!rect.fallen) rect.y = rect.baseY;
    }
    rect.drawWhite();
  });

  // rotation timer: after a short delay pick one available mask to tilt
  // (rotation scheduled via setTimeout; canceled on click if needed)

// update falling mask rects (simple gravity)
mask.forEach((rect, index) => {
  const fall = falling.get(index);
  if (fall) {
    fall.vy += gravity * dt;
    rect.y += fall.vy * dt;
    // when off-screen, mark as fallen (so it won't snap back) and stop updating velocity
    if (rect.y - rect.size > canvas.height) {
      rect.fallen = true;
      falling.delete(index);
    }
  } else {
    // keep at base position when not falling and not already fallen
    if (!rect.fallen) rect.y = rect.baseY;
  }
  // animate rotation toward target if this clone was selected to rotate
  if (rect.isRotating && !rect.fallen) {
    const diff = rect.angleTarget - rect.angle;
    const maxDelta = rect.angleSpeed * dt;
    rect.angle += Math.max(-maxDelta, Math.min(maxDelta, diff));
  }
  if (rect.fallen) rect.isRotating = false;
  rect.drawBlack();
});
  
  // restore canvas transform from punch
  ctx.restore();

}

run(update)