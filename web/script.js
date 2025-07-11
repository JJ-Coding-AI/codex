const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

let board = [];
let currentPlayer = BLACK;
let mode = 'human'; // 'human', 'ai', 'aiai'
let aiThinking = false;

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

function initBoard() {
  board = Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
  board[3][3] = WHITE;
  board[3][4] = BLACK;
  board[4][3] = BLACK;
  board[4][4] = WHITE;
  currentPlayer = BLACK;
  aiThinking = false;
  renderBoard();
  clearLog();
}

function renderBoard() {
  const boardDiv = document.getElementById('board');
  boardDiv.innerHTML = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const square = document.createElement('div');
      square.className = 'square';
      square.dataset.x = x;
      square.dataset.y = y;
      if (board[y][x] !== EMPTY) {
        const disc = document.createElement('div');
        disc.className = 'disc ' + (board[y][x] === BLACK ? 'black' : 'white');
        square.appendChild(disc);
      }
      square.addEventListener('click', onSquareClick);
      boardDiv.appendChild(square);
    }
  }
}

function onSquareClick(e) {
  if (aiThinking) return;
  if (mode === 'aiai') return;
  const x = parseInt(e.currentTarget.dataset.x);
  const y = parseInt(e.currentTarget.dataset.y);
  const moves = getValidMoves(board, currentPlayer);
  const move = moves.find(m => m.x === x && m.y === y);
  if (move) {
    makeMove(move, currentPlayer);
  }
}

function getValidMoves(bd, color) {
  const moves = [];
  const directions = [
    [1,0], [-1,0], [0,1], [0,-1],
    [1,1], [1,-1], [-1,1], [-1,-1]
  ];
  for (let y=0; y<8; y++) {
    for (let x=0; x<8; x++) {
      if (bd[y][x] !== EMPTY) continue;
      const flips = [];
      for (const [dx,dy] of directions) {
        let nx=x+dx, ny=y+dy, pieces=[];
        while(nx>=0&&nx<8&&ny>=0&&ny<8 && bd[ny][nx]===3-color) {
          pieces.push([nx,ny]);
          nx+=dx; ny+=dy;
        }
        if (pieces.length && nx>=0&&nx<8&&ny>=0&&ny<8 && bd[ny][nx]===color) {
          flips.push(...pieces);
        }
      }
      if (flips.length) moves.push({x,y,flips});
    }
  }
  return moves;
}

function makeMove(move, color) {
  board[move.y][move.x] = color;
  animateFlips(move.flips, color, () => {
    for (const [fx,fy] of move.flips) {
      board[fy][fx] = color;
    }
    currentPlayer = 3 - color;
    renderBoard();
    nextTurn();
  });
}

function animateFlips(flips, color, callback) {
  let index = 0;
  function flipNext() {
    if (index >= flips.length) { callback(); return; }
    const [fx, fy] = flips[index];
    const square = document.querySelector(`.square[data-x="${fx}"][data-y="${fy}"]`);
    const disc = square.firstChild;
    if (disc) {
      disc.style.transform = 'rotateY(90deg)';
      setTimeout(() => {
        disc.className = 'disc ' + (color === BLACK ? 'black' : 'white');
        disc.style.transform = 'rotateY(0deg)';
        index++;
        setTimeout(flipNext, 50);
      }, 150);
    } else {
      index++;
      setTimeout(flipNext, 50);
    }
  }
  flipNext();
}

function nextTurn() {
  const moves = getValidMoves(board, currentPlayer);
  if (!moves.length) {
    currentPlayer = 3 - currentPlayer;
    if (!getValidMoves(board, currentPlayer).length) {
      endGame();
      return;
    }
  }
  if ((mode === 'ai' && currentPlayer === WHITE) || mode === 'aiai') {
    aiMove();
  }
}

function endGame() {
  const black = board.flat().filter(v => v===BLACK).length;
  const white = board.flat().filter(v => v===WHITE).length;
  appendLog(`ゲーム終了 黒:${black} 白:${white}`);
}

function appendLog(text, color) {
  const log = document.getElementById('log');
  const div = document.createElement('div');
  if(color) div.style.color = color;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function clearLog() {
  document.getElementById('log').innerHTML = '';
}

function aiMove() {
  aiThinking = true;
  setTimeout(() => {
    const {move, log} = bestMove(board, currentPlayer, 4);
    appendLog((currentPlayer===BLACK?'黒':'白')+'AI:'+log.join(' | '), currentPlayer===BLACK?'black':'green');
    makeMove(move, currentPlayer);
    aiThinking = false;
  }, 100);
}

function bestMove(bd, color, depth) {
  const moves = getValidMoves(bd, color);
  let bestScore = -Infinity;
  let best = moves[0];
  const logs = [];
  for (const m of moves) {
    const newBoard = applyMove(cloneBoard(bd), m, color);
    const score = minimax(newBoard, 3 - color, depth-1, -Infinity, Infinity);
    logs.push(`(${m.x+1},${m.y+1})=${score.toFixed(2)}`);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return {move: best, log: logs};
}

function minimax(bd, color, depth, alpha, beta) {
  if (depth === 0) return evaluate(bd, color);
  const moves = getValidMoves(bd, color);
  if (!moves.length) return evaluate(bd, color);
  if (color === WHITE) {
    let max = -Infinity;
    for (const m of moves) {
      const nb = applyMove(cloneBoard(bd), m, color);
      const val = minimax(nb, BLACK, depth-1, alpha, beta);
      max = Math.max(max, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return max;
  } else {
    let min = Infinity;
    for (const m of moves) {
      const nb = applyMove(cloneBoard(bd), m, color);
      const val = minimax(nb, WHITE, depth-1, alpha, beta);
      min = Math.min(min, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return min;
  }
}

function evaluate(bd, color) {
  let score = 0;
  for (let y=0;y<8;y++) {
    for (let x=0;x<8;x++) {
      if (bd[y][x] === color) score += weights[y][x];
      else if (bd[y][x] === 3-color) score -= weights[y][x];
    }
  }
  return score;
}

function applyMove(bd, move, color) {
  bd[move.y][move.x] = color;
  for (const [fx,fy] of move.flips) bd[fy][fx] = color;
  return bd;
}

function cloneBoard(bd) {
  return bd.map(row => row.slice());
}

// Button handlers

document.getElementById('humanVsHuman').addEventListener('click', () => {
  mode = 'human';
  initBoard();
});

document.getElementById('aiVsHuman').addEventListener('click', () => {
  mode = 'ai';
  initBoard();
});

document.getElementById('aiVsAi').addEventListener('click', () => {
  mode = 'aiai';
  initBoard();
  nextTurn();
});

document.getElementById('reset').addEventListener('click', initBoard);

initBoard();
