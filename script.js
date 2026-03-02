// // ゲームの基本データ // //
const initialDeck = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
let pHand = [];
let cHand = [];
let pScore = 0;
let cScore = 0;
let pTable = []; // 場に出した2枚
let cTable = []; // CPUが出した2枚
let phase = 'WAIT'; // 状態管理

// // DOMの取得 // //
const handEl = document.getElementById('player-hand');
const guideEl = document.getElementById('guide-text');
const btnEl = document.getElementById('battle-btn');
const overlayEl = document.getElementById('result-overlay');
const resultTextEl = document.getElementById('result-text');

// // ゲーム開始処理 // //
function startGame() {
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    pScore = 0; cScore = 0;
    pHand = [...initialDeck];
    cHand = [...initialDeck];
    updateScoreDisplay();
    startNewTurn();
}

// // ターン開始の準備 // //
function startNewTurn() {
    pTable = []; cTable = [];
    
    // // スロットの掃除
    for(let i=0; i<2; i++) {
        resetSlot(`player-slot-${i}`);
        resetSlot(`cpu-slot-${i}`);
    }

    // // 最後の1枚だけ残った場合の特殊処理
    if (pHand.length === 1) {
        phase = 'FINAL_CHOICE';
        pTable = [pHand[0]];
        cTable = [cHand[0]];
        btnEl.classList.add('hidden');
        
        // 自動で場にセット
        document.getElementById('player-slot-0').appendChild(createCardDOM(pTable[0]));
        document.getElementById('cpu-slot-0').appendChild(createCardDOM(cTable[0]));
        
        updateTableSlots(); // クリック可能にする
        guideEl.textContent = "最後の一戦！カードをクリックして勝負！";
        return;
    }

    phase = 'SELECT_TWO';
    guideEl.textContent = "手札からカードを2枚選んでください";
    btnEl.classList.remove('hidden');
    btnEl.disabled = true;
    renderHand();
}

function resetSlot(id) {
    const el = document.getElementById(id);
    el.innerHTML = '';
    el.style.opacity = '1';
    el.classList.remove('final-p-choice', 'final-c-choice', 'clickable-slot');
    el.onclick = null;
}

// // 手札を画面に描画 // //
function renderHand() {
    handEl.innerHTML = '';
    pHand.sort((a, b) => a - b).forEach(val => {
        const card = createCardDOM(val);
        if (pTable.includes(val)) {
            card.classList.add('selected');
        } else {
            card.onclick = () => {
                if (phase === 'SELECT_TWO' && pTable.length < 2) {
                    pTable.push(val);
                    pTable.sort((a, b) => a - b); // 場に出す時もソート
                    updateTableSlots();
                    renderHand();
                    if (pTable.length === 2) btnEl.disabled = false;
                }
            };
        }
        handEl.appendChild(card);
    });
}

// // 場（スロット）の更新 // //
function updateTableSlots() {
    for(let i=0; i<2; i++) {
        const slot = document.getElementById(`player-slot-${i}`);
        if (pTable[i] !== undefined) {
            slot.innerHTML = '';
            slot.appendChild(createCardDOM(pTable[i]));
            slot.classList.add('clickable-slot');
            slot.onclick = () => {
                if (phase === 'SELECT_TWO') deselectCard(i);
                else if (phase === 'FINAL_CHOICE') finalBattle(i);
            };
        } else {
            slot.innerHTML = '';
            slot.classList.remove('clickable-slot');
        }
    }
}

function deselectCard(index) {
    pTable.splice(index, 1);
    btnEl.disabled = true;
    updateTableSlots();
    renderHand();
}

// // CPUが2枚提示 // //
function cpuReveal() {
    phase = 'FINAL_CHOICE';
    btnEl.classList.add('hidden');

    // // CPUの思考：ランダムに2枚選択
    let temp = [...cHand];
    while(cTable.length < 2) {
        let idx = Math.floor(Math.random() * temp.length);
        cTable.push(temp.splice(idx, 1)[0]);
    }
    cTable.sort((a, b) => a - b);

    for(let i=0; i<2; i++) {
        document.getElementById(`cpu-slot-${i}`).appendChild(createCardDOM(cTable[i]));
    }

    guideEl.textContent = "どちらか1枚を選んでください";
    updateTableSlots();
}

// // 最後の1枚を選んで決着 // //
function finalBattle(pIdx) {
    phase = 'RESULT';
    const pCard = pTable[pIdx];
    
    // CPUも1枚選ぶ
    const cIdx = (cTable.length === 1) ? 0 : Math.floor(Math.random() * 2);
    const cCard = cTable[cIdx];

    // 演出：選ばれなかった方を消す
    if (pTable.length > 1) {
        document.getElementById(`player-slot-${1-pIdx}`).style.opacity = '0.1';
        document.getElementById(`cpu-slot-${1-cIdx}`).style.opacity = '0.1';
    }
    
    document.getElementById(`player-slot-${pIdx}`).classList.add('final-p-choice');
    document.getElementById(`cpu-slot-${cIdx}`).classList.add('final-c-choice');

    setTimeout(() => {
        const result = judge(pCard, cCard);
        const sum = pCard + cCard;
        showOverlay(result, sum);
        
        // ログ更新
        const logMsg = `あなた:${pCard} vs CPU:${cCard} (合計:${sum}) → ${result === 'player' ? '勝ち' : result === 'cpu' ? '負け' : '引分'}`;
        document.getElementById('log').innerHTML = `<div>${logMsg}</div>` + document.getElementById('log').innerHTML;

        // データ更新
        pHand.splice(pHand.indexOf(pCard), 1);
        cHand.splice(cHand.indexOf(cCard), 1);
        if (result === 'player') pScore += sum;
        else if (result === 'cpu') cScore += sum;
        updateScoreDisplay();

        setTimeout(() => {
            overlayEl.classList.add('hidden');
            if (pHand.length === 0) showGameOver();
            else startNewTurn();
        }, 1500);
    }, 800);
}

// // 勝敗判定：特殊ルールを最優先 // //
function judge(p, c) {
    if (p === c) return "draw";
    // 特殊ルール
    if (p === 1 && c === 5) return "player";
    if (c === 1 && p === 5) return "cpu";
    if (p === -5 && c === -1) return "player";
    if (c === -5 && p === -1) return "cpu";
    // 通常
    return p > c ? "player" : "cpu";
}

// // 演出とユーティリティ // //
function createCardDOM(val) {
    const d = document.createElement('div');
    d.className = 'card';
    d.textContent = val;
    if (val > 0) d.classList.add('positive');
    else if (val < 0) d.classList.add('negative');
    else d.classList.add('zero');
    return d;
}

function showOverlay(res, sum) {
    overlayEl.classList.remove('hidden');
    if (res === 'player') {
        resultTextEl.innerHTML = `WIN!<br>+${sum}`;
        resultTextEl.style.color = "#2ecc71";
    } else if (res === 'cpu') {
        resultTextEl.innerHTML = `LOSE<br>CPU +${sum}`;
        resultTextEl.style.color = "#e74c3c";
    } else {
        resultTextEl.innerHTML = `DRAW`;
        resultTextEl.style.color = "#95a5a6";
    }
}

function updateScoreDisplay() {
    document.getElementById('player-score').textContent = pScore;
    document.getElementById('cpu-score').textContent = cScore;
}

// // ゲーム終了時の処理をリザルト画面遷移に書き換え
function showGameOver() {
    // // ゲーム画面を隠してリザルト画面を表示
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');

    // // スコアを反映
    document.getElementById('final-player-score').textContent = pScore;
    document.getElementById('final-cpu-score').textContent = cpuScore; // スコア変数名に注意（pScore, cScoreなど）

    // // 勝敗に応じたコメントを表示
    const commentEl = document.getElementById('final-comment');
    if (pScore > cScore) {
        commentEl.textContent = "YOU WIN!";
        commentEl.style.color = "#2ecc71";
    } else if (pScore < cScore) {
        commentEl.textContent = "YOU LOSE...";
        commentEl.style.color = "#e74c3c";
    } else {
        commentEl.textContent = "DRAW";
        commentEl.style.color = "#95a5a6";
    }
}

// // タイトルへ戻る処理
function backToTitle() {
    // // リザルトを隠してタイトルを表示
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('title-screen').classList.remove('hidden');
    
    // // ログや表示のリセット（必要に応じて）
    document.getElementById('log').innerHTML = '';
}