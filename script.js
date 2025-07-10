const gameEl = document.getElementById('game');
const infoEl = document.getElementById('info');

const SIZE = 8;
let board = [];
let current = 1; // 1: black, 2: white

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
  const r = parseInt(e.currentTarget.dataset.row);
  const c = parseInt(e.currentTarget.dataset.col);
  const flips = getFlips(r, c, current);
  if (flips.length) {
    board[r][c] = current;
    for (const [fr, fc] of flips) {
      board[fr][fc] = current;
    }
    current = 3 - current;
    if (!hasValidMove(current)) {
      current = 3 - current;
      if (!hasValidMove(current)) {
        endGame();
        return;
      }
      alert('打てる場所がないため、パスします');
    }
    render();
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

initBoard();
createBoard();
render();
