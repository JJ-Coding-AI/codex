const boardElement = document.getElementById('board');
const logElement = document.getElementById('log');
const resetBtn = document.getElementById('reset');
const modeHumanBtn = document.getElementById('modeHuman');
const modeAIBtn = document.getElementById('modeAI');
const modeAIvsAIBtn = document.getElementById('modeAIvsAI');

const SIZE = 8;
let board, currentPlayer, mode;
const HUMAN = 'HUMAN';
const AI = 'AI';

function init() {
    board = Array.from({length: SIZE}, () => Array(SIZE).fill(null));
    const mid = SIZE/2;
    board[mid-1][mid-1] = 'W';
    board[mid][mid] = 'W';
    board[mid-1][mid] = 'B';
    board[mid][mid-1] = 'B';
    currentPlayer = 'B';
    render();
    logElement.textContent = '';
}

function render() {
    boardElement.innerHTML = '';
    for(let y=0;y<SIZE;y++){
        for(let x=0;x<SIZE;x++){
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.x = x; cell.dataset.y = y;
            if(board[y][x]){
                const disc = document.createElement('div');
                disc.className = `disc ${board[y][x]==='B'?'black':'white'}`;
                cell.appendChild(disc);
            }
            cell.addEventListener('click', () => onCellClick(x,y));
            boardElement.appendChild(cell);
        }
    }
}

function validMoves(player,b = board){
    const opponent = player==='B'?'W':'B';
    let moves=[];
    for(let y=0;y<SIZE;y++){
        for(let x=0;x<SIZE;x++){
            if(b[y][x]) continue;
            let captures=[];
            for(let dy=-1;dy<=1;dy++){
                for(let dx=-1;dx<=1;dx++){
                    if(dx===0&&dy===0) continue;
                    let nx=x+dx,ny=y+dy, line=[];
                    while(nx>=0&&nx<SIZE&&ny>=0&&ny<SIZE&&b[ny][nx]===opponent){
                        line.push([nx,ny]);
                        nx+=dx;ny+=dy;
                    }
                    if(line.length && nx>=0&&nx<SIZE&&ny>=0&&ny<SIZE&&b[ny][nx]===player){
                        captures=captures.concat(line);
                    }
                }
            }
            if(captures.length) moves.push({x,y,captures});
        }
    }
    return moves;
}

function applyMove(move, player, b=board) {
    b[move.y][move.x] = player;
    for(const [x,y] of move.captures){
        b[y][x] = player;
    }
}

function onCellClick(x,y){
    if(mode===AI&&currentPlayer===aiPlayer) return; // disable when AI's turn
    const moves = validMoves(currentPlayer);
    const move = moves.find(m=>m.x===x&&m.y===y);
    if(move){
        applyMove(move,currentPlayer);
        animateFlips(move.captures,currentPlayer);
        nextTurn();
    }
}

function animateFlips(captures,player){
    let delay=0;
    for(const [x,y] of captures){
        const cell=boardElement.children[y*SIZE+x];
        const disc=cell.firstChild;
        setTimeout(()=>{
            if(disc){disc.classList.add('flip');}
            setTimeout(()=>{
                if(disc){disc.className=`disc ${player==='B'?'black':'white'}`;disc.classList.remove('flip');}
            },300);
        },delay);
        delay+=150;
    }
}

function nextTurn(){
    currentPlayer=currentPlayer==='B'?'W':'B';
    if(validMoves(currentPlayer).length===0){
        currentPlayer=currentPlayer==='B'?'W':'B';
        if(validMoves(currentPlayer).length===0){
            endGame();
            return;
        }
    }
    if((mode===AI && currentPlayer===aiPlayer) || mode==='AIVSAI'){
        setTimeout(aiMove, 500);
    }
}

function score(b=board){
    let bCount=0,wCount=0;
    for(let row of b){
        for(let cell of row){
            if(cell==='B') bCount++; else if(cell==='W') wCount++;
        }
    }
    return {B:bCount,W:wCount};
}

function endGame(){
    const s=score();
    let winner='引き分け';
    if(s.B>s.W) winner='黒の勝ち';
    else if(s.W>s.B) winner='白の勝ち';
    log(`ゲーム終了: ${winner} 黒:${s.B} 白:${s.W}`);
}

function log(text){
    logElement.textContent+=text+'\n';
    logElement.scrollTop=logElement.scrollHeight;
}

let aiPlayer='W';

function aiMove(){
    const {move,logs}=bestMove(board,currentPlayer,4,true);
    logs.forEach(l=>log(`${currentPlayer==='B'?'黒':'白'}: ${l}`));
    if(move){
        applyMove(move,currentPlayer);
        animateFlips(move.captures,currentPlayer);
    }
    nextTurn();
}

function cloneBoard(b){
    return b.map(row=>row.slice());
}

function bestMove(b,player,depth,top=false){
    const moves = validMoves(player,b);
    let bestScore=-Infinity,best=null;
    let logs=[];
    for(const m of moves){
        const nb=cloneBoard(b);
        applyMove(m,player,nb);
        const s=minimax(nb,depth-1,player==='W',-Infinity,Infinity);
        logs.push(`(${m.x+1},${m.y+1}) -> ${s.toFixed(2)}`);
        if(s>bestScore){
            bestScore=s;best=m;
        }
    }
    if(top){
        return {move:best,logs};
    }
    return bestScore;
}

function minimax(b,depth,maximizing,alpha,beta){
    const player=maximizing?'W':'B';
    const moves=validMoves(player,b);
    if(depth===0||moves.length===0){
        return evaluateBoard(b);
    }
    let best = maximizing?-Infinity:Infinity;
    for(const m of moves){
        const nb=cloneBoard(b);
        applyMove(m,player,nb);
        const val=minimax(nb,depth-1,!maximizing,alpha,beta);
        if(maximizing){
            if(val>best) best=val;
            if(best>alpha) alpha=best;
        }else{
            if(val<best) best=val;
            if(best<beta) beta=best;
        }
        if(beta<=alpha) break;
    }
    return best;
}

const weights=[
    [120,-20,20,5,5,20,-20,120],
    [-20,-40,-5,-5,-5,-5,-40,-20],
    [20,-5,15,3,3,15,-5,20],
    [5,-5,3,3,3,3,-5,5],
    [5,-5,3,3,3,3,-5,5],
    [20,-5,15,3,3,15,-5,20],
    [-20,-40,-5,-5,-5,-5,-40,-20],
    [120,-20,20,5,5,20,-20,120]
];

function evaluateBoard(b){
    let val=0;
    for(let y=0;y<SIZE;y++){
        for(let x=0;x<SIZE;x++){
            if(b[y][x]==='W') val+=weights[y][x];
            else if(b[y][x]==='B') val-=weights[y][x];
        }
    }
    return val;
}

resetBtn.onclick=()=>{init();};
modeHumanBtn.onclick=()=>{mode='HUMAN';aiPlayer=null;init();};
modeAIBtn.onclick=()=>{mode=AI;aiPlayer='W';init();};
modeAIvsAIBtn.onclick=()=>{mode='AIVSAI';aiPlayer='B';init();setTimeout(aiMove,500);};

init();
