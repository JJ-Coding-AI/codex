const gameEl = document.getElementById('game');
const infoEl = document.getElementById('info');
const humanAiBtn = document.getElementById('human-ai');
const aiAiBtn = document.getElementById('ai-ai');
const resetBtn = document.getElementById('reset');

const SIZE = 8;
let board = [];
let current = 1; // 1: black, 2: white
let mode = 'human';

function initBoard() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  const mid = SIZE / 2;
  board[mid - 1][mid - 1] = 2;
  board[mid][mid] = 2;
  board[mid - 1][mid] = 1;
  board[mid][mid - 1] = 1;
}

function createBoard() {
  gameEl.innerHTML = '';
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', handleClick);
      gameEl.appendChild(cell);
    }
  }
}

function render() {
  document.querySelectorAll('.cell').forEach(cell => {
    const r = cell.dataset.row;
    const c = cell.dataset.col;
    cell.innerHTML = '';
    const val = board[r][c];
    if (val) {
      const disc = document.createElement('div');
      disc.className = 'disc ' + (val === 1 ? 'black' : 'white');
      cell.appendChild(disc);
    }
  });
  infoEl.textContent = (current === 1 ? '黒' : '白') + 'の番です';
}

function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function getFlips(r, c, player) {
  if (board[r][c] !== 0) return [];
  const dirs = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1],  [1, 0], [1, 1]
  ];
  let flips = [];
  for (const [dr, dc] of dirs) {
    let nr = r + dr, nc = c + dc;
    let line = [];
    while (inBounds(nr, nc) && board[nr][nc] === 3 - player) {
      line.push([nr, nc]);
      nr += dr; nc += dc;
    }
    if (line.length && inBounds(nr, nc) && board[nr][nc] === player) {
      flips = flips.concat(line);
    }
  }
  return flips;
}

function handleClick(e) {
  if (mode === 'ai-ai' || (mode === 'human-ai' && current === 2)) return;
  const r = parseInt(e.currentTarget.dataset.row);
  const c = parseInt(e.currentTarget.dataset.col);
  const flips = getFlips(r, c, current);
  if (flips.length) {
    board[r][c] = current;
    for (const [fr, fc] of flips) {
      board[fr][fc] = current;
    }
    current = 3 - current;
    nextTurn();
  }
}

function hasValidMove(player) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (getFlips(r, c, player).length) return true;
    }
  }
  return false;
}

function endGame() {
  let black = 0, white = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 1) black++;
      if (board[r][c] === 2) white++;
    }
  }
  if (black > white) {
    infoEl.textContent = `黒の勝ち！ (${black} - ${white})`;
  } else if (white > black) {
    infoEl.textContent = `白の勝ち！ (${white} - ${black})`;
  } else {
    infoEl.textContent = `引き分け (${black} - ${white})`;
  }
  document.querySelectorAll(".cell").forEach(cell => cell.removeEventListener("click", handleClick));
}

function cloneBoard(src) {
  return src.map(row => row.slice());
}

function getFlipsBoard(b, r, c, player) {
  if (b[r][c] !== 0) return [];
  const dirs = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1],  [1, 0], [1, 1]
  ];
  let flips = [];
  for (const [dr, dc] of dirs) {
    let nr = r + dr, nc = c + dc;
    let line = [];
    while (inBounds(nr, nc) && b[nr][nc] === 3 - player) {
      line.push([nr, nc]);
      nr += dr; nc += dc;
    }
    if (line.length && inBounds(nr, nc) && b[nr][nc] === player) {
      flips = flips.concat(line);
    }
  }
  return flips;
}

function validMoves(b, player) {
  const moves = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const flips = getFlipsBoard(b, r, c, player);
      if (flips.length) moves.push({ r, c, flips });
    }
  }
  return moves;
}

const weights = [
  [120, -20, 20, 5, 5, 20, -20, 120],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [120, -20, 20, 5, 5, 20, -20, 120]
];

function evaluate(b, player) {
  let score = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[r][c] === player) score += weights[r][c];
      else if (b[r][c] === 3 - player) score -= weights[r][c];
    }
  }
  return score;
}

function minimax(b, depth, player, maximizing, orig) {
  if (depth === 0) return evaluate(b, orig);
  const moves = validMoves(b, player);
  if (!moves.length) {
    if (!validMoves(b, 3 - player).length) return evaluate(b, orig);
    return minimax(b, depth - 1, 3 - player, !maximizing, orig);
  }
  let best = maximizing ? -Infinity : Infinity;
  for (const m of moves) {
    const nb = cloneBoard(b);
    nb[m.r][m.c] = player;
    for (const [fr, fc] of m.flips) nb[fr][fc] = player;
    const val = minimax(nb, depth - 1, 3 - player, !maximizing, orig);
    if (maximizing) {
      if (val > best) best = val;
    } else {
      if (val < best) best = val;
    }
  }
  return best;
}

function bestMove(player) {
  const moves = validMoves(board, player);
  if (!moves.length) return null;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const nb = cloneBoard(board);
    nb[m.r][m.c] = player;
    for (const [fr, fc] of m.flips) nb[fr][fc] = player;
    const score = minimax(nb, 3, 3 - player, false, player);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

function aiMove(player) {
  const moves = validMoves(board, player);
  if (!moves.length) return false;
  let move;
  if (Math.random() < 0.1) {
    move = moves[Math.floor(Math.random() * moves.length)];
  } else {
    move = bestMove(player);
  }
  board[move.r][move.c] = player;
  for (const [fr, fc] of move.flips) board[fr][fc] = player;
  return true;
}

function nextTurn() {
  if (!hasValidMove(current)) {
    current = 3 - current;
    if (!hasValidMove(current)) {
      endGame();
      return;
    }
    alert('打てる場所がないため、パスします');
  }
  render();
  if (mode === 'ai-ai' || (mode === 'human-ai' && current === 2)) {
    setTimeout(aiTurn, 300);
  }
}

function aiTurn() {
  if (aiMove(current)) {
    current = 3 - current;
  }
  nextTurn();
}

function startHumanVsAI() {
  mode = 'human-ai';
  resetGame();
}

function startAIVsAI() {
  mode = 'ai-ai';
  resetGame();
  setTimeout(aiTurn, 300);
}

function resetGame() {
  document.querySelectorAll('.cell').forEach(cell => cell.addEventListener('click', handleClick));
  current = 1;
  initBoard();
  render();
  if (mode === 'human-ai' && current === 2) {
    setTimeout(aiTurn, 300);
  }
}

humanAiBtn.addEventListener('click', startHumanVsAI);
aiAiBtn.addEventListener('click', startAIVsAI);
resetBtn.addEventListener('click', resetGame);

initBoard();
createBoard();
render();
