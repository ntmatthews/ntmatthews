const COLORS = ['#111827', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
const SIZES = [3, 6, 10, 16, 24];

const canvas = document.querySelector('#whiteboard');
const context = canvas.getContext('2d');
const status = document.querySelector('#status');
const undoButton = document.querySelector('#undo');
const brushInput = document.querySelector('#brush-size');
const brushLabel = document.querySelector('#brush-label');

let currentTool = 'pen';
let currentColor = COLORS[0];
let currentSize = Number(brushInput.value);
let drawing = false;
let lastPoint = null;
let history = [];

function setStatus(message) {
  status.textContent = message;
}

function saveSnapshot() {
  history = [...history.slice(-19), canvas.toDataURL('image/png')];
  undoButton.disabled = history.length <= 1;
}

function paintBackground() {
  const { width, height } = canvas.getBoundingClientRect();
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
}

function resizeCanvas() {
  const snapshot = history.at(-1) || null;
  const { width, height } = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;

  canvas.width = width * scale;
  canvas.height = height * scale;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  paintBackground();

  if (snapshot) {
    const image = new Image();
    image.addEventListener('load', () => context.drawImage(image, 0, 0, width, height));
    image.src = snapshot;
  } else {
    saveSnapshot();
  }
}

function getPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const pointer = event.touches?.[0] ?? event;
  return {
    x: pointer.clientX - rect.left,
    y: pointer.clientY - rect.top,
  };
}

function startDrawing(event) {
  if (currentTool === 'select') return;
  event.preventDefault();
  drawing = true;
  lastPoint = getPoint(event);
  setStatus(currentTool === 'eraser' ? 'Erasing strokes' : 'Drawing a fresh idea');
}

function draw(event) {
  if (!drawing || currentTool === 'select') return;
  event.preventDefault();

  const nextPoint = getPoint(event);
  context.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
  context.strokeStyle = currentColor;
  context.lineWidth = currentTool === 'eraser' ? currentSize * 2 : currentSize;
  context.beginPath();
  context.moveTo(lastPoint.x, lastPoint.y);
  context.lineTo(nextPoint.x, nextPoint.y);
  context.stroke();
  lastPoint = nextPoint;
}

function stopDrawing() {
  if (!drawing) return;
  drawing = false;
  lastPoint = null;
  context.globalCompositeOperation = 'source-over';
  saveSnapshot();
  setStatus('Saved to undo history');
}

function clearBoard() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintBackground();
  saveSnapshot();
  setStatus('Board cleared');
}

function undo() {
  if (history.length <= 1) return;
  history = history.slice(0, -1);
  undoButton.disabled = history.length <= 1;

  const image = new Image();
  image.addEventListener('load', () => {
    const { width, height } = canvas.getBoundingClientRect();
    context.clearRect(0, 0, width, height);
    paintBackground();
    context.drawImage(image, 0, 0, width, height);
  });
  image.src = history.at(-1);
  setStatus('Undid the last stroke');
}

function downloadBoard() {
  const link = document.createElement('a');
  link.download = 'whiteboard-sketch.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  setStatus('Downloaded whiteboard PNG');
}

function buildControls() {
  document.querySelectorAll('[data-tool]').forEach((button) => {
    button.addEventListener('click', () => {
      currentTool = button.dataset.tool;
      document.querySelectorAll('[data-tool]').forEach((toolButton) => toolButton.classList.toggle('active', toolButton === button));
      setStatus(`Using ${currentTool} tool`);
    });
  });

  const swatches = document.querySelector('#swatches');
  COLORS.forEach((color) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.backgroundColor = color;
    button.setAttribute('aria-label', `Use ${color}`);
    button.classList.toggle('selected', color === currentColor);
    button.addEventListener('click', () => {
      currentColor = color;
      swatches.querySelectorAll('button').forEach((swatch) => swatch.classList.toggle('selected', swatch === button));
    });
    swatches.append(button);
  });

  const sizes = document.querySelector('#sizes');
  SIZES.forEach((size) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = size;
    button.addEventListener('click', () => {
      currentSize = size;
      brushInput.value = size;
      brushLabel.textContent = `Brush size: ${size}px`;
    });
    sizes.append(button);
  });

  brushInput.addEventListener('input', (event) => {
    currentSize = Number(event.target.value);
    brushLabel.textContent = `Brush size: ${currentSize}px`;
  });

  document.querySelector('#undo').addEventListener('click', undo);
  document.querySelector('#clear').addEventListener('click', clearBoard);
  document.querySelector('#download').addEventListener('click', downloadBoard);
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseleave', stopDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('touchcancel', stopDrawing);
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchstart', startDrawing, { passive: false });
window.addEventListener('resize', resizeCanvas);

buildControls();
resizeCanvas();
