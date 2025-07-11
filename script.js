const boardElement = document.getElementById('board');
const logElement = document.getElementById('log');
let board = [];
let currentPlayer = 'B';
let mode = 'hvh';
let aiThinking = false;

function initBoard() {
  board = Array.from({length: 8}, () => Array(8).fill(null));
  board[3][3] = 'W';
  board[3][4] = 'B';
  board[4][3] = 'B';
  board[4][4] = 'W';
}

function renderBoard() {
  boardElement.innerHTML = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.addEventListener('click', handleCellClick);
      if (board[y][x]) {
        const piece = document.createElement('div');
        piece.className = 'piece ' + (board[y][x] === 'B' ? 'black' : 'white');
        cell.appendChild(piece);
      }
      boardElement.appendChild(cell);
    }
  }
}

function log(msg) {
  const p = document.createElement('div');
  p.textContent = msg;
  logElement.appendChild(p);
  logElement.scrollTop = logElement.scrollHeight;
}

function validMoves(boardState, player) {
  const moves = [];
  const opponent = player === 'B' ? 'W' : 'B';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (boardState[y][x]) continue;
      if (capturesGeneric(boardState, x, y, player, opponent).length) {
        moves.push({x, y});
      }
    }
  }
  return moves;
}

function captures(x, y, player, opponent) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  const captured = [];
  for (const [dx,dy] of dirs) {
    let nx = x + dx, ny = y + dy;
    const line = [];
    while (nx>=0 && nx<8 && ny>=0 && ny<8 && board[ny][nx]===opponent) {
      line.push([nx,ny]);
      nx += dx; ny += dy;
    }
    if (line.length && nx>=0 && nx<8 && ny>=0 && ny<8 && board[ny][nx]===player) {
      captured.push(...line);
    }
  }
  return captured;
}

function applyMove(x, y, player) {
  const opponent = player === 'B' ? 'W' : 'B';
  const caps = captures(x, y, player, opponent);
  if (!caps.length) return false;
  board[y][x] = player;
  renderBoard();
  const newPiece = boardElement.querySelector(`.cell[data-x="${x}"][data-y="${y}"] .piece`);
  if (newPiece) newPiece.classList.add('flip');
  caps.forEach(([cx,cy],i) => {
    setTimeout(() => {
      board[cy][cx] = player;
      renderBoard();
      const p = boardElement.querySelector(`.cell[data-x="${cx}"][data-y="${cy}"] .piece`);
      if (p) p.classList.add('flip');
    }, (i+1)*100);
  });
  return true;
}

function handleCellClick(e) {
  if (mode === 'ai-ai' || aiThinking) return;
  const x = parseInt(e.currentTarget.dataset.x);
  const y = parseInt(e.currentTarget.dataset.y);
  if (applyMove(x, y, currentPlayer)) {
    renderBoard();
    nextTurn();
  }
}

function nextTurn() {
  currentPlayer = currentPlayer === 'B' ? 'W' : 'B';
  if ((mode === 'hvai' && currentPlayer === 'W') || mode === 'ai-ai') {
    aiMove();
  }
}

function aiMove() {
  aiThinking = true;
  const depth = 4;
  const move = bestMove(board, currentPlayer, depth);
  if (move) {
    log((mode==='ai-ai'? (currentPlayer==='B'?'黒':'白'): 'AI')+`: ${move.log}`);
    applyMove(move.x, move.y, currentPlayer);
    setTimeout(()=>{ renderBoard(); currentPlayer = currentPlayer === 'B' ? 'W' : 'B'; aiThinking=false; if(mode==='ai-ai'||(mode==='hvai'&&currentPlayer==='W')) aiMove(); }, move.delay);
  } else {
    log((currentPlayer==='B'?'黒':'白')+' はパス');
    currentPlayer = currentPlayer === 'B' ? 'W' : 'B';
    aiThinking=false;
    if(mode==='ai-ai'||(mode==='hvai'&&currentPlayer==='W')) aiMove();
  }
}

function bestMove(boardState, player, depth) {
  const moves = validMoves(boardState, player);
  if (!moves.length) return null;
  let bestScore = -Infinity;
  let best;
  for (const m of moves) {
    const newBoard = boardState.map(r=>r.slice());
    applyMoveSim(newBoard, m.x, m.y, player);
    const score = minimax(newBoard, flip(player), depth-1, -Infinity, Infinity, false);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
    m.log = `(${m.x+1},${m.y+1}) 評価値: ${score}`;
  }
  best.delay = 100 * captures(best.x,best.y,player,flip(player)).length;
  best.log = `(${best.x+1},${best.y+1}) 評価値: ${bestScore}`;
  return best;
}

function minimax(boardState, player, depth, alpha, beta, maximizing) {
  if (depth===0) return evaluate(boardState, player);
  const moves = validMoves(boardState, player);
  if (!moves.length) return evaluate(boardState, player);
  if (maximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      const newBoard = boardState.map(r=>r.slice());
      applyMoveSim(newBoard, m.x, m.y, player);
      const eval = minimax(newBoard, flip(player), depth-1, alpha, beta, false);
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const m of moves) {
      const newBoard = boardState.map(r=>r.slice());
      applyMoveSim(newBoard, m.x, m.y, player);
      const eval = minimax(newBoard, flip(player), depth-1, alpha, beta, true);
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function applyMoveSim(boardState, x, y, player) {
  const opponent = player === 'B' ? 'W' : 'B';
  const caps = capturesGeneric(boardState, x, y, player, opponent);
  if (!caps.length) return false;
  boardState[y][x] = player;
  for (const [cx,cy] of caps) {
    boardState[cy][cx] = player;
  }
  return true;
}
function capturesGeneric(boardState, x, y, player, opponent) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  const captured = [];
  for (const [dx,dy] of dirs) {
    let nx = x + dx, ny = y + dy;
    const line = [];
    while (nx>=0 && nx<8 && ny>=0 && ny<8 && boardState[ny][nx]===opponent) {
      line.push([nx,ny]);
      nx += dx; ny += dy;
    }
    if (line.length && nx>=0 && nx<8 && ny>=0 && ny<8 && boardState[ny][nx]===player) {
      captured.push(...line);
    }
  }
  return captured;
}

function evaluate(boardState, player) {
  const opponent = player === 'B' ? 'W' : 'B';
  let myCount=0, oppCount=0;
  for (let y=0;y<8;y++) for(let x=0;x<8;x++) {
    if (boardState[y][x]===player) myCount++; else if (boardState[y][x]===opponent) oppCount++;
  }
  return myCount - oppCount;
}

function flip(p){ return p==='B'?'W':'B'; }

document.getElementById('human-vs-human').onclick = () => { mode='hvh'; start(); };
document.getElementById('human-vs-ai').onclick = () => { mode='hvai'; start(); };
document.getElementById('ai-vs-ai').onclick = () => { mode='ai-ai'; start(); };
document.getElementById('reset').onclick = start;

function start() {
  aiThinking = false;
  currentPlayer = 'B';
  initBoard();
  renderBoard();
  logElement.innerHTML='';
  if (mode==='ai-ai') aiMove();
}

start();
