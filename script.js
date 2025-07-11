const boardSize = 8;
let board;
let currentPlayer;
let mode;

const boardElem = document.getElementById('board');
const logElem = document.getElementById('log');
const modeSelect = document.getElementById('mode');
const resetButton = document.getElementById('reset');
const resultPopup = document.getElementById('result-popup');

function initBoard() {
  board = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
  board[3][3] = 2;
  board[4][4] = 2;
  board[3][4] = 1;
  board[4][3] = 1;
  currentPlayer = 1; // black starts
}

function renderBoard() {
  boardElem.innerHTML = '';
  const valid = getValidMoves(board, currentPlayer);
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', () => handleCellClick(r, c));
      if (valid.some(m => m.row === r && m.col === c)) {
        cell.classList.add('valid');
      }
      if (board[r][c] !== 0) {
        const piece = document.createElement('div');
        piece.className = 'piece ' + (board[r][c] === 1 ? 'black' : 'white');
        cell.appendChild(piece);
      }
      boardElem.appendChild(cell);
    }
  }
}

function handleCellClick(r, c) {
  if (mode === 'ai-ai') return; // spectator mode
  if (mode === 'ai-human' && currentPlayer === 1) return; // AI turn
  playMove(r, c);
}

function playMove(r, c) {
  const flips = getFlips(board, r, c, currentPlayer);
  if (board[r][c] !== 0 || flips.length === 0) return; // invalid
  board[r][c] = currentPlayer;
  renderBoard();
  animateFlips(flips, currentPlayer, () => {
    currentPlayer = 3 - currentPlayer;
    nextTurn();
  });
}

function nextTurn() {
  if (isGameOver()) {
    showResult();
    return;
  }
  renderBoard();
  if (mode === 'ai-human' && currentPlayer === 1) {
    aiTurn(1);
  } else if (mode === 'ai-ai') {
    aiTurn(currentPlayer);
  }
}

function aiTurn(player) {
  setTimeout(() => {
    const { move, logs } = computeAIMove(board, player, 3);
    appendLog((player === 1 ? '黒' : '白') + ' AI\n' + logs + '\n', player);
    if (move) {
      const flips = getFlips(board, move.row, move.col, player);
      board[move.row][move.col] = player;
      renderBoard();
      animateFlips(flips, player, () => {
        currentPlayer = 3 - currentPlayer;
        nextTurn();
      });
    } else {
      appendLog('打てる場所がありません\n', player);
      currentPlayer = 3 - currentPlayer;
      nextTurn();
    }
  }, 300);
}

function animateFlips(flips, player, callback) {
  flips.sort((a, b) => a.order - b.order);
  flips.forEach((f, i) => {
    const cell = boardElem.children[f.row * boardSize + f.col];
    const piece = cell.querySelector('.piece');
    setTimeout(() => {
      if (piece) piece.classList.add('flip');
      setTimeout(() => {
        board[f.row][f.col] = player;
        renderBoard();
      }, 200);
    }, i * 120);
  });
  setTimeout(callback, flips.length * 120 + 250);
}

function isGameOver() {
  return getValidMoves(board, 1).length === 0 && getValidMoves(board, 2).length === 0;
}

function showResult() {
  const black = countPieces(board, 1);
  const white = countPieces(board, 2);
  appendLog(`結果: 黒 ${black} - 白 ${white}\n`);
  let text = '';
  if (black > white) text = '黒の勝ち！';
  else if (white > black) text = '白の勝ち！';
  else text = '引き分け';
  resultPopup.textContent = text;
  resultPopup.classList.remove('hidden');
}

function appendLog(text, player) {
  const span = document.createElement('span');
  if (player === 2) span.className = 'white-log';
  span.textContent = text;
  logElem.appendChild(span);
  logElem.scrollTop = logElem.scrollHeight;
}

function startGame() {
  mode = modeSelect.value;
  initBoard();
  renderBoard();
  logElem.textContent = '';
  resultPopup.classList.add('hidden');
  resultPopup.textContent = '';
  if (mode === 'ai-human' && currentPlayer === 1) {
    aiTurn(1);
  } else if (mode === 'ai-ai') {
    aiTurn(currentPlayer);
  }
}

resetButton.addEventListener('click', startGame);
modeSelect.addEventListener('change', startGame);

startGame();

function cloneBoard(b) {
  return b.map(row => row.slice());
}

function countPieces(b, p) {
  return b.flat().filter(x => x === p).length;
}

function getValidMoves(b, p) {
  const moves = [];
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (b[r][c] === 0 && getFlips(b, r, c, p).length > 0) {
        moves.push({ row: r, col: c });
      }
    }
  }
  return moves;
}

function getFlips(b, r, c, p) {
  if (b[r][c] !== 0) return [];
  const opp = 3 - p;
  const flips = [];
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1], [1, 0], [1, 1]
  ];
  for (const [dr, dc] of directions) {
    let i = r + dr;
    let j = c + dc;
    let temp = [];
    let order = 1;
    while (i >= 0 && i < boardSize && j >= 0 && j < boardSize && b[i][j] === opp) {
      temp.push({ row: i, col: j, order });
      order++;
      i += dr;
      j += dc;
    }
    if (temp.length && i >= 0 && i < boardSize && j >= 0 && j < boardSize && b[i][j] === p) {
      flips.push(...temp);
    }
  }
  return flips;
}

function applyMove(b, move, p) {
  const flips = getFlips(b, move.row, move.col, p);
  if (flips.length === 0) return false;
  b[move.row][move.col] = p;
  for (const f of flips) {
    b[f.row][f.col] = p;
  }
  return true;
}

function evaluateBoard(b, p) {
  const opp = 3 - p;
  const myPieces = countPieces(b, p);
  const oppPieces = countPieces(b, opp);
  const pieceDiff = myPieces - oppPieces;
  const mobility = getValidMoves(b, p).length - getValidMoves(b, opp).length;
  const corners = [b[0][0], b[0][7], b[7][0], b[7][7]];
  let cornerScore = 0;
  for (const c of corners) {
    if (c === p) cornerScore += 1; else if (c === opp) cornerScore -= 1;
  }
  return pieceDiff + 2 * mobility + 4 * cornerScore;
}

function minimax(b, depth, player, alpha, beta, aiPlayer) {
  if (depth === 0 || isGameOver()) {
    return evaluateBoard(b, aiPlayer);
  }
  const moves = getValidMoves(b, player);
  if (moves.length === 0) {
    return minimax(b, depth - 1, 3 - player, alpha, beta, aiPlayer);
  }
  if (player === aiPlayer) {
    let value = -Infinity;
    for (const m of moves) {
      const nb = cloneBoard(b);
      applyMove(nb, m, player);
      value = Math.max(value, minimax(nb, depth - 1, 3 - player, alpha, beta, aiPlayer));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const m of moves) {
      const nb = cloneBoard(b);
      applyMove(nb, m, player);
      value = Math.min(value, minimax(nb, depth - 1, 3 - player, alpha, beta, aiPlayer));
      beta = Math.min(beta, value);
      if (beta <= alpha) break;
    }
    return value;
  }
}

function computeAIMove(b, player, depth) {
  const moves = getValidMoves(b, player);
  const logs = [];
  if (moves.length === 0) {
    return { move: null, logs: '打てる場所なし' };
  }
  let best = null;
  let bestVal = -Infinity;
  for (const m of moves) {
    const nb = cloneBoard(b);
    applyMove(nb, m, player);
    const val = minimax(nb, depth - 1, 3 - player, -Infinity, Infinity, player);
    logs.push(`(${m.row+1},${m.col+1}) -> ${val.toFixed(2)}`);
    if (val > bestVal) {
      bestVal = val;
      best = m;
    }
  }
  logs.push(`選択: (${best.row+1},${best.col+1})`);
  return { move: best, logs: logs.join('\n') };
}

