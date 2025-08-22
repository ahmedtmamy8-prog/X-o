(function () {
  "use strict";

  /**
   * State
   */
  const state = {
    board: Array(9).fill(null),
    currentPlayer: "X", // X always starts
    isGameOver: false,
    mode: "human", // "human" | "ai"
    winningLine: null, // indices of winning triplet
    scores: { X: 0, O: 0, draw: 0 },
  };

  /**
   * Elements
   */
  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const modeSelect = document.getElementById("mode");
  const newGameBtn = document.getElementById("newGameBtn");
  const resetScoresBtn = document.getElementById("resetScoresBtn");
  const scoreXEl = document.getElementById("scoreX");
  const scoreOEl = document.getElementById("scoreO");
  const scoreDrawEl = document.getElementById("scoreDraw");

  /**
   * Init
   */
  loadScores();
  renderScores();
  buildBoard();
  updateStatus();
  wireControls();

  function buildBoard() {
    boardEl.innerHTML = "";
    for (let i = 0; i < 9; i += 1) {
      const cellBtn = document.createElement("button");
      cellBtn.type = "button";
      cellBtn.className = "cell";
      cellBtn.setAttribute("role", "gridcell");
      cellBtn.setAttribute("aria-label", `خلية ${i + 1}`);
      cellBtn.dataset.index = String(i);
      cellBtn.addEventListener("click", onCellClick);
      boardEl.appendChild(cellBtn);
    }
    renderBoard();
  }

  function wireControls() {
    modeSelect.addEventListener("change", () => {
      state.mode = modeSelect.value;
      startNewGame();
    });

    newGameBtn.addEventListener("click", () => {
      startNewGame();
    });

    resetScoresBtn.addEventListener("click", () => {
      state.scores = { X: 0, O: 0, draw: 0 };
      saveScores();
      renderScores();
      startNewGame();
    });
  }

  function onCellClick(e) {
    const cell = e.currentTarget;
    const index = Number(cell.dataset.index);

    if (state.isGameOver || state.board[index] !== null) return;

    if (state.mode === "ai" && state.currentPlayer === "O") return; // prevent human clicking during AI turn

    makeMove(index, state.currentPlayer);

    const result = evaluateGame();
    if (result.over) return; // game ended and handled inside evaluate

    swapTurn();

    if (state.mode === "ai" && state.currentPlayer === "O") {
      // Small UX delay to feel natural
      setTimeout(aiMakeMove, 450);
    }
  }

  function makeMove(index, player) {
    state.board[index] = player;
    renderBoard();
  }

  function renderBoard() {
    const cells = boardEl.querySelectorAll(".cell");
    for (let i = 0; i < cells.length; i += 1) {
      const value = state.board[i];
      const el = cells[i];
      el.textContent = value ? value : "";
      el.classList.toggle("x", value === "X");
      el.classList.toggle("o", value === "O");
      el.classList.toggle("win", state.winningLine?.includes(i) ?? false);
      el.disabled = state.isGameOver;
    }
    updateStatus();
  }

  function updateStatus(message) {
    if (message) {
      statusEl.textContent = message;
      return;
    }

    if (state.isGameOver) {
      if (state.winningLine) {
        const winner = state.board[state.winningLine[0]];
        statusEl.textContent = `انتهت الجولة! الفائز: ${winner}`;
      } else {
        statusEl.textContent = "انتهت الجولة! تعادل";
      }
      return;
    }

    statusEl.textContent = `دور اللاعب: ${state.currentPlayer}`;
  }

  function evaluateGame() {
    const winLine = getWinningLine(state.board);
    if (winLine) {
      state.isGameOver = true;
      state.winningLine = winLine;
      const winner = state.board[winLine[0]];
      addWin(winner);
      renderBoard();
      renderScores();
      return { over: true, winner };
    }

    if (isDraw(state.board)) {
      state.isGameOver = true;
      state.winningLine = null;
      addDraw();
      renderBoard();
      renderScores();
      return { over: true, draw: true };
    }

    return { over: false };
  }

  function swapTurn() {
    state.currentPlayer = state.currentPlayer === "X" ? "O" : "X";
    updateStatus();
  }

  function aiMakeMove() {
    if (state.isGameOver) return;
    const index = findBestMove(state.board, "O");
    if (index != null) {
      makeMove(index, "O");
      const result = evaluateGame();
      if (result.over) return;
      swapTurn();
    }
  }

  const winTriples = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  function getWinningLine(board) {
    for (const [a, b, c] of winTriples) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return [a, b, c];
      }
    }
    return null;
  }

  function isDraw(board) {
    return board.every(cell => cell !== null) && !getWinningLine(board);
  }

  function startNewGame() {
    state.board = Array(9).fill(null);
    state.currentPlayer = "X";
    state.isGameOver = false;
    state.winningLine = null;
    renderBoard();
    updateStatus();
  }

  function addWin(player) {
    if (player === "X") state.scores.X += 1;
    else if (player === "O") state.scores.O += 1;
    saveScores();
  }

  function addDraw() {
    state.scores.draw += 1;
    saveScores();
  }

  function renderScores() {
    scoreXEl.textContent = String(state.scores.X);
    scoreOEl.textContent = String(state.scores.O);
    scoreDrawEl.textContent = String(state.scores.draw);
  }

  function saveScores() {
    try {
      localStorage.setItem("xoScores", JSON.stringify(state.scores));
    } catch {}
  }

  function loadScores() {
    try {
      const raw = localStorage.getItem("xoScores");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed && typeof parsed === "object" &&
          ["X", "O", "draw"].every(k => typeof parsed[k] === "number")
        ) {
          state.scores = parsed;
        }
      }
    } catch {}
  }

  /**
   * Minimax AI (perfect play for O)
   */
  function findBestMove(board, aiPlayer) {
    const humanPlayer = aiPlayer === "O" ? "X" : "O";

    // If first AI turn and center is free, it's optimal
    if (board.filter(Boolean).length === 1 && board[4] === null) return 4;

    let bestScore = -Infinity;
    let move = null;
    for (let i = 0; i < 9; i += 1) {
      if (board[i] !== null) continue;
      board[i] = aiPlayer;
      const score = minimax(board, 0, false, aiPlayer, humanPlayer);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
    return move;
  }

  function minimax(board, depth, isMaximizing, aiPlayer, humanPlayer) {
    const winLine = getWinningLine(board);
    if (winLine) {
      const winner = board[winLine[0]];
      if (winner === aiPlayer) return 10 - depth;
      if (winner === humanPlayer) return depth - 10;
    }
    if (isDraw(board)) return 0;

    if (isMaximizing) {
      let best = -Infinity;
      for (let i = 0; i < 9; i += 1) {
        if (board[i] !== null) continue;
        board[i] = aiPlayer;
        const score = minimax(board, depth + 1, false, aiPlayer, humanPlayer);
        board[i] = null;
        best = Math.max(best, score);
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i += 1) {
        if (board[i] !== null) continue;
        board[i] = humanPlayer;
        const score = minimax(board, depth + 1, true, aiPlayer, humanPlayer);
        board[i] = null;
        best = Math.min(best, score);
      }
      return best;
    }
  }
})();