import { createEngine } from "../_shared/engine.js"
import { Spring } from "../_shared/spring.js"

const { renderer, input, math, run, finish, } = createEngine()
const { ctx, canvas } = renderer

let alphaLvl = 1; // global alpha for selected rects
// scale state (applies to drawWhite)
let scale = 0;
// configuration for scale change per second
const SCALE_RATE = 0.3; // units per second
const SCALE_MIN = 0.001;
const SCALE_MAX = 0.2;


/*
const spring = new Spring({
  position: 0
}) */


  class ClassRect {
  constructor(x, y, size, ctx) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.ctx = ctx;
  }



  // draw with controllable opacity (0..1) and optional scale
  drawWhite(s = 1) {
    this.ctx.save();
    this.ctx.globalAlpha = alphaLvl;
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;
    this.ctx.translate(cx, cy);
    this.ctx.scale(s, s);
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    this.ctx.restore();
  }

  // draw black with alpha (for fade-out)
  drawNot() {
    this.ctx.save();
    this.ctx.globalAlpha = 0;
    this.ctx.fillStyle = "red";
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


       
selectRect([[0,15],[19,22], [26,29], [33,36], [40,43], [47,50], [54,57], [61,64], [68,83],  ]);   

// selected/others will be recomputed each frame in update

let selected = [];
let others = [];

  rects.forEach((rect, i) => {
    if (RectChange.has(i)) selected.push({ rect, i });
    else others.push({ rect, i });
  });

function update(dt) {
  canvas.style.background = "black";
  // advance scale based on dt (frame-rate independent)
  scale += SCALE_RATE * dt; // linear growth per second
  // clamp scale to reasonable range
  scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, scale));


  // draw selected: combine fade-in, revealed, proximity-based alpha and fade-outs
  selected.forEach(({ rect, i }) => {
    rect.drawWhite(scale);
  });

  // do not draw non-selected rects
  /*others.forEach(({ rect, i }) => {
    rect.drawNot();
  }); */
}

run(update)