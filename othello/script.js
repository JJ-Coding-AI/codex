const boardElem = document.getElementById('board');
const logElem = document.getElementById('log');
const size = 8;
let board = [];
let currentPlayer = 1; // 1: black, -1: white
let mode = 'human';
let aiThinking = false;

function initBoard() {
    board = Array.from({length: size}, () => Array(size).fill(0));
    board[3][3] = -1;
    board[3][4] = 1;
    board[4][3] = 1;
    board[4][4] = -1;
}

function renderBoard() {
    boardElem.innerHTML = '';
    for (let y=0; y<size; y++) {
        for (let x=0; x<size; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.addEventListener('click', () => handleCellClick(x, y));
            if (board[y][x] !== 0) {
                const disc = document.createElement('div');
                disc.className = 'disc ' + (board[y][x] === 1 ? 'black' : 'white');
                cell.appendChild(disc);
            }
            boardElem.appendChild(cell);
        }
    }
}

function handleCellClick(x, y) {
    if (aiThinking) return;
    if (mode === 'ai-ai') return;
    if (mode === 'ai-human' && currentPlayer === -1) return;
    placeDisc(x, y);
}

function placeDisc(x, y) {
    const flips = getFlips(x, y, currentPlayer);
    if (flips.length === 0) return;
    board[y][x] = currentPlayer;
    animateFlip([{x,y}], currentPlayer);
    for (const f of flips) {
        board[f.y][f.x] = currentPlayer;
    }
    animateFlip(flips, currentPlayer);
    currentPlayer *= -1;
    renderBoard();
    setTimeout(nextTurn, 350); // after animation
}

function inBounds(x, y) { return x>=0 && x<size && y>=0 && y<size; }

const dirs = [
    [1,0], [-1,0], [0,1], [0,-1],
    [1,1], [1,-1], [-1,1], [-1,-1]
];

function getFlips(x, y, player) {
    if (board[y][x] !== 0) return [];
    let flips = [];
    for (const [dx,dy] of dirs) {
        let nx = x+dx, ny = y+dy;
        let line = [];
        while (inBounds(nx, ny) && board[ny][nx] === -player) {
            line.push({x:nx,y:ny});
            nx+=dx; ny+=dy;
        }
        if (line.length && inBounds(nx, ny) && board[ny][nx] === player) {
            flips = flips.concat(line);
        }
    }
    return flips;
}

function validMoves(player) {
    let moves = [];
    for (let y=0; y<size; y++) {
        for (let x=0; x<size; x++) {
            if (getFlips(x,y,player).length) moves.push({x,y});
        }
    }
    return moves;
}

function scoreBoard(player) {
    let score = 0;
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
    for (let y=0;y<size;y++){
        for (let x=0;x<size;x++){
            if (board[y][x] === player) score += weights[y][x];
            else if (board[y][x] === -player) score -= weights[y][x];
        }
    }
    return score;
}

function cloneBoard() {
    return board.map(row => row.slice());
}

function minimax(depth, player, alpha, beta) {
    if (depth === 0) return {score: scoreBoard(currentPlayer)};
    const moves = validMoves(player);
    if (moves.length === 0) {
        return {score: minimax(depth-1, -player, alpha, beta).score};
    }
    let bestMove = null;
    if (player === currentPlayer) {
        let maxScore = -Infinity;
        for (const m of moves) {
            const backup = cloneBoard();
            const fs = getFlips(m.x, m.y, player);
            board[m.y][m.x] = player;
            for (const f of fs) board[f.y][f.x] = player;
            const result = minimax(depth-1, -player, alpha, beta);
            board = backup;
            if (result.score > maxScore) {
                maxScore = result.score;
                bestMove = m;
            }
            alpha = Math.max(alpha, maxScore);
            if (beta <= alpha) break;
        }
        return {score: maxScore, move: bestMove};
    } else {
        let minScore = Infinity;
        for (const m of moves) {
            const backup = cloneBoard();
            const fs = getFlips(m.x, m.y, player);
            board[m.y][m.x] = player;
            for (const f of fs) board[f.y][f.x] = player;
            const result = minimax(depth-1, -player, alpha, beta);
            board = backup;
            if (result.score < minScore) {
                minScore = result.score;
                bestMove = m;
            }
            beta = Math.min(beta, minScore);
            if (beta <= alpha) break;
        }
        return {score: minScore, move: bestMove};
    }
}

function aiMove() {
    aiThinking = true;
    const moves = validMoves(currentPlayer);
    if (moves.length === 0) {
        currentPlayer *= -1;
        aiThinking = false;
        nextTurn();
        return;
    }
    const depth = 4;
    const evaluations = [];
    let best = {score: -Infinity};
    for (const m of moves) {
        const backup = cloneBoard();
        const fs = getFlips(m.x, m.y, currentPlayer);
        board[m.y][m.x] = currentPlayer;
        for (const f of fs) board[f.y][f.x] = currentPlayer;
        const result = minimax(depth-1, -currentPlayer, -Infinity, Infinity);
        board = backup;
        evaluations.push({move: m, score: result.score});
        if (result.score > best.score) {
            best = {score: result.score, move: m};
        }
    }
    logDecision(evaluations);
    placeDisc(best.move.x, best.move.y);
    aiThinking = false;
}

function logDecision(evals) {
    const lines = evals.map(e => `(${e.move.x+1},${e.move.y+1}) => ${e.score}`);
    logElem.innerHTML += `AI thinking: ${lines.join(', ')}<br>`;
    logElem.scrollTop = logElem.scrollHeight;
}

function animateFlip(flips, player) {
    let delay = 0;
    for (const f of flips) {
        const cellIndex = f.y * size + f.x;
        const cell = boardElem.children[cellIndex];
        if (!cell) continue;
        const disc = document.createElement('div');
        disc.className = 'disc ' + (player === 1 ? 'black' : 'white');
        disc.style.transitionDelay = delay + 'ms';
        disc.classList.add('flip');
        setTimeout(() => {
            cell.innerHTML = '';
            cell.appendChild(disc);
        }, delay);
        delay += 50;
    }
}

function nextTurn() {
    if (mode === 'ai-human' && currentPlayer === 1) aiMove();
    else if (mode === 'ai-ai') aiMove();
}

function startHuman() {
    mode = 'human';
    initBoard();
    renderBoard();
}

function startAIvsHuman() {
    mode = 'ai-human';
    currentPlayer = 1; // AI goes first
    initBoard();
    renderBoard();
    aiMove();
}

function startAIvsAI() {
    mode = 'ai-ai';
    currentPlayer = 1;
    initBoard();
    renderBoard();
    function loop() {
        if (validMoves(1).length === 0 && validMoves(-1).length === 0) return;
        aiMove();
        if (mode === 'ai-ai') setTimeout(loop, 500);
    }
    loop();
}

document.getElementById('human-human').onclick = startHuman;
document.getElementById('ai-human').onclick = startAIvsHuman;
document.getElementById('ai-ai').onclick = startAIvsAI;

startHuman();
