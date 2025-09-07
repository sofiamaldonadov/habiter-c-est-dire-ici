// Topographic map with mouse-controlled scrolling
// p5.js sketch

let gridSize = 4;       // bigger = smoother lines
let cols, rows;
let levels = 12;        // number of contour levels
let noiseScale = 0.006; // zoom level of the noise

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(2);
  cols = floor(width / gridSize) + 1;
  rows = floor(height / gridSize) + 1;
}

function draw() {
  background("#25212A");

  // Shift the noise field depending on mouse position
  let xShift = map(mouseX, 0, width, -200, 200);
  let yShift = map(mouseY, 0, height, -200, 200);

  stroke(248, 245, 240, 80); // off-white with low opacity
  noFill();

  // Draw contour lines
  for (let i = 1; i <= levels; i++) {
    let iso = i / (levels + 1);
    strokeWeight(i % 4 === 0 ? 1.6 : 1.0); // thicker every 3rd line
    drawIsoline(iso, xShift, yShift);
  }
}

function drawIsoline(iso, xShift, yShift) {
  for (let x = 0; x < cols - 1; x++) {
    for (let y = 0; y < rows - 1; y++) {
      // Sample noise at four corners of the cell
      let nx = (x * gridSize + xShift) * noiseScale;
      let ny = (y * gridSize + yShift) * noiseScale;

      let a = noise(nx, ny);
      let b = noise(nx + gridSize * noiseScale, ny);
      let c = noise(nx + gridSize * noiseScale, ny + gridSize * noiseScale);
      let d = noise(nx, ny + gridSize * noiseScale);

      // Marching squares index
      let idx = 0;
      if (a > iso) idx |= 1;
      if (b > iso) idx |= 2;
      if (c > iso) idx |= 4;
      if (d > iso) idx |= 8;
      if (idx === 0 || idx === 15) continue;

      let x0 = x * gridSize, y0 = y * gridSize;
      let x1 = (x + 1) * gridSize, y1 = (y + 1) * gridSize;

      let pA = createVector(lerp(x0, x1, t(a, b, iso)), y0);
      let pB = createVector(x1, lerp(y0, y1, t(b, c, iso)));
      let pC = createVector(lerp(x0, x1, t(d, c, iso)), y1);
      let pD = createVector(x0, lerp(y0, y1, t(a, d, iso)));

      switch (idx) {
        case 1: case 14: line(pD.x, pD.y, pA.x, pA.y); break;
        case 2: case 13: line(pA.x, pA.y, pB.x, pB.y); break;
        case 4: case 11: line(pB.x, pB.y, pC.x, pC.y); break;
        case 8: case 7:  line(pC.x, pC.y, pD.x, pD.y); break;
        case 3: case 12: line(pD.x, pD.y, pB.x, pB.y); break;
        case 6: case 9:  line(pA.x, pA.y, pC.x, pC.y); break;
        case 5: case 10:
          let center = (a+b+c+d)/4;
          if ((idx === 5 && center > iso) || (idx === 10 && center <= iso)) {
            line(pA.x, pA.y, pB.x, pB.y);
            line(pC.x, pC.y, pD.x, pD.y);
          } else {
            line(pD.x, pD.y, pA.x, pA.y);
            line(pB.x, pB.y, pC.x, pC.y);
          }
          break;
      }
    }
  }
}

// Interpolation helper
function t(v1, v2, iso) {
  let denom = (v2 - v1);
  if (abs(denom) < 1e-6) return 0.5;
  return constrain((iso - v1) / denom, 0, 1);
}