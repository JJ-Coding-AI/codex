const BLACK = 1;
const WHITE = 2;
let board = [];
let currentPlayer = BLACK;
let players = { [BLACK]: 'human', [WHITE]: 'human' };
const boardElem = document.getElementById('board');
const statusElem = document.getElementById('status');
const logElem = document.getElementById('log');

const weights = [
  [100,-20,10,5,5,10,-20,100],
  [-20,-50,-2,-2,-2,-2,-50,-20],
  [10,-2,-1,-1,-1,-1,-2,10],
  [5,-2,-1,-1,-1,-1,-2,5],
  [5,-2,-1,-1,-1,-1,-2,5],
  [10,-2,-1,-1,-1,-1,-2,10],
  [-20,-50,-2,-2,-2,-2,-50,-20],
  [100,-20,10,5,5,10,-20,100]
];

function initBoard() {
  board = Array.from({ length: 8 }, () => Array(8).fill(0));
  board[3][3] = WHITE;
  board[3][4] = BLACK;
  board[4][3] = BLACK;
  board[4][4] = WHITE;
}

function inBounds(x, y) {
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

const dirs = [
  [-1,-1],[-1,0],[-1,1],
  [0,-1],[0,1],
  [1,-1],[1,0],[1,1]
];

function getValidMoves(player) {
  const opponent = player === BLACK ? WHITE : BLACK;
  const moves = [];
  for (let x=0;x<8;x++) {
    for (let y=0;y<8;y++) {
      if (board[x][y] !== 0) continue;
      let allFlips = [];
      for (const [dx,dy] of dirs) {
        let i=x+dx, j=y+dy;
        const flips=[];
        while(inBounds(i,j) && board[i][j]===opponent) {
          flips.push([i,j]);
          i+=dx; j+=dy;
        }
        if (flips.length && inBounds(i,j) && board[i][j]===player) {
          allFlips = allFlips.concat(flips);
        }
      }
      if (allFlips.length) moves.push({x,y,flips:allFlips});
    }
  }
  return moves;
}

function applyMove(move, player, animate=true, cb) {
  board[move.x][move.y] = player;
  let delay=0;
  for (const [fx,fy] of move.flips) {
    board[fx][fy] = player;
    if (animate) {
      const cell = document.querySelector(`.cell[data-x='${fx}'][data-y='${fy}'] .disc`);
      if (cell) {
        setTimeout(()=>{cell.classList.add('flipping');
          setTimeout(()=>{
            cell.classList.remove('black','white','flipping');
            cell.classList.add(player===BLACK?'black':'white');
          },200);
        }, delay);
        delay += 80;
      }
    }
  }
  setTimeout(()=>{renderBoard(); if(cb)cb();}, delay+50);
}

function renderBoard() {
  boardElem.innerHTML='';
  for(let x=0;x<8;x++){
    for(let y=0;y<8;y++){
      const cell=document.createElement('div');
      cell.className='cell';
      cell.dataset.x=x;
      cell.dataset.y=y;
      if(players[currentPlayer]==='human' && isValidMove(x,y,currentPlayer)){
        cell.classList.add('valid');
        cell.addEventListener('click', onCellClick);
      }
      if(board[x][y]){
        const d=document.createElement('div');
        d.className='disc '+(board[x][y]===BLACK?'black':'white');
        cell.appendChild(d);
      }
      boardElem.appendChild(cell);
    }
  }
  const counts=countPieces();
  statusElem.textContent=`Turn: ${(currentPlayer===BLACK?'Black':'White')} - B:${counts.black} W:${counts.white}`;
}

function isValidMove(x,y,player){
  return getValidMoves(player).some(m=>m.x===x&&m.y===y);
}

function onCellClick(e){
  const x=Number(e.currentTarget.dataset.x);
  const y=Number(e.currentTarget.dataset.y);
  const moves=getValidMoves(currentPlayer);
  const move=moves.find(m=>m.x===x&&m.y===y);
  if(move){
    applyMove(move,currentPlayer,true,()=>{nextTurn();});
  }
}

function countPieces(){
  let black=0,white=0;
  for(const row of board){
    for(const c of row){
      if(c===BLACK)black++; else if(c===WHITE)white++;
    }
  }
  return {black,white};
}

function nextTurn(){
  currentPlayer = currentPlayer===BLACK?WHITE:BLACK;
  const moves=getValidMoves(currentPlayer);
  if(moves.length===0){
    if(getValidMoves(currentPlayer===BLACK?WHITE:BLACK).length===0){
      endGame();
      return;
    } else {
      currentPlayer = currentPlayer===BLACK?WHITE:BLACK;
    }
  }
  renderBoard();
  if(players[currentPlayer]==='ai'){
    setTimeout(aiMove,500);
  }
}

function endGame(){
  const counts=countPieces();
  let msg='Draw';
  if(counts.black>counts.white) msg='Black wins';
  else if(counts.white>counts.black) msg='White wins';
  statusElem.textContent=msg+` - B:${counts.black} W:${counts.white}`;
}

document.getElementById('start').addEventListener('click',()=>{
  players[BLACK]=document.getElementById('black-player').value;
  players[WHITE]=document.getElementById('white-player').value;
  currentPlayer=BLACK;
  initBoard();
  renderBoard();
  if(players[currentPlayer]==='ai') setTimeout(aiMove,500);
});

function cloneBoard(b){
  return b.map(row=>row.slice());
}

function evaluate(b){
  let score=0;
  for(let x=0;x<8;x++){
    for(let y=0;y<8;y++){
      if(b[x][y]===BLACK) score+=weights[x][y];
      else if(b[x][y]===WHITE) score-=weights[x][y];
    }
  }
  return score;
}

function minimax(b, depth, player, alpha, beta, log){
  const moves = getValidMovesForBoard(b, player);
  if(depth===0 || moves.length===0){
    const sc=evaluate(b);
    return {score:sc, log: log+`Eval:${sc}\n`};
  }
  const maximizing = player===BLACK;
  let bestScore = maximizing? -Infinity: Infinity;
  let bestMove = null;
  let bestLog = log;
  for(const m of moves){
    const nb = cloneBoard(b);
    applyMoveOnBoard(nb, m, player);
    const result = minimax(nb, depth-1, player===BLACK?WHITE:BLACK, alpha, beta, log+`Try ${m.x},${m.y}\n`);
    if(maximizing){
      if(result.score>bestScore){ bestScore=result.score; bestMove=m; bestLog=result.log; }
      alpha=Math.max(alpha,bestScore);
    } else {
      if(result.score<bestScore){ bestScore=result.score; bestMove=m; bestLog=result.log; }
      beta=Math.min(beta,bestScore);
    }
    if(beta<=alpha) break;
  }
  return {score:bestScore, move:bestMove, log:bestLog};
}

function applyMoveOnBoard(b, move, player){
  b[move.x][move.y] = player;
  for(const [fx,fy] of move.flips){ b[fx][fy]=player; }
}

function getValidMovesForBoard(b, player){
  const opponent = player===BLACK?WHITE:BLACK;
  const moves=[];
  for(let x=0;x<8;x++){
    for(let y=0;y<8;y++){
      if(b[x][y]!==0) continue;
      let flipsAll=[];
      for(const [dx,dy] of dirs){
        let i=x+dx,j=y+dy,flips=[];
        while(inBounds(i,j)&&b[i][j]===opponent){ flips.push([i,j]); i+=dx;j+=dy; }
        if(flips.length&&inBounds(i,j)&&b[i][j]===player){ flipsAll=flipsAll.concat(flips); }
      }
      if(flipsAll.length) moves.push({x,y,flips:flipsAll});
    }
  }
  return moves;
}

function aiMove(){
  const res = minimax(cloneBoard(board), 4, currentPlayer, -Infinity, Infinity, '');
  logElem.textContent = res.log;
  if(res.move){
    applyMove(res.move,currentPlayer,true,()=>{nextTurn();});
  } else {
    nextTurn();
  }
}
