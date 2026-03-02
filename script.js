// // 初期データ
const initialDeck = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
let pHand = [...initialDeck];
let cHand = [...initialDeck];
let pScore = 0;
let cScore = 0;

// // ターンの状態管理
let pTable = []; 
let cTable = []; 
let phase = 'SELECT_TWO'; 

// // DOM要素
const handEl = document.getElementById('player-hand');
const guideEl = document.getElementById('guide-text');
const btnEl = document.getElementById('battle-btn');
const overlayEl = document.getElementById('result-overlay');
const resultTextEl = document.getElementById('result-text');

// // 初期化
function initGame() {
    pScore = 0; cScore = 0;
    pHand = [...initialDeck];
    cHand = [...initialDeck];
    updateScore();
    startNewTurn();
}

function startNewTurn() {
    pTable = []; cTable = [];
    
    // 全てのスロットを一旦まっさらにする
    for(let i=0; i<2; i++) {
        clearSlot(`player-slot-${i}`);
        clearSlot(`cpu-slot-${i}`);
    }

    // 【修正】手札が1枚だけ残っている場合（最終決戦）
    if (pHand.length === 1) {
        phase = 'FINAL_CHOICE';
        pTable = [pHand[0]];
        cTable = [cHand[0]];
        
        btnEl.classList.add('hidden'); // ボタンは不要
        
        // 中央のスロット（index 0）に1枚ずつ配置
        document.getElementById('player-slot-0').appendChild(createCardDOM(pTable[0]));
        document.getElementById('cpu-slot-0').appendChild(createCardDOM(cTable[0]));
        
        // 相手のカードはまだ隠さない（または見せる）ルール通りに表示
        renderHand(); 
        updateSlots(); // クリックイベントを有効化
        
        guideEl.textContent = "運命の最後の一枚！クリックして勝負！";
        guideEl.style.color = "#ff4757";
        return;
    }

    // 通常ターン（2枚選択）
    phase = 'SELECT_TWO';
    guideEl.textContent = "手札からカードを2枚選んでください";
    guideEl.style.color = "#f1c40f";
    btnEl.classList.remove('hidden');
    btnEl.disabled = true;
    
    renderHand();
}

function clearSlot(id) {
    const slot = document.getElementById(id);
    slot.innerHTML = '';
    slot.style.opacity = '1';
    slot.classList.remove('final-p-choice', 'final-c-choice', 'clickable-slot');
    slot.onclick = null;
}

// // 手札の描画
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
                    pTable.sort((a, b) => a - b);
                    updateSlots();
                    renderHand();
                    if (pTable.length === 2) btnEl.disabled = false;
                }
            };
        }
        handEl.appendChild(card);
    });
}

// // スロットの表示更新
function updateSlots() {
    for(let i=0; i<2; i++) {
        const slot = document.getElementById(`player-slot-${i}`);
        // 1枚のみの時は2つ目のスロットは触らせない
        if (pTable.length === 1 && phase === 'FINAL_CHOICE' && i === 1) {
            slot.classList.remove('clickable-slot');
            continue;
        }

        if (pTable[i] !== undefined) {
            slot.innerHTML = ''; // 再描画
            slot.appendChild(createCardDOM(pTable[i]));
            slot.classList.add('clickable-slot');
            
            slot.onclick = () => {
                if (phase === 'SELECT_TWO') {
                    deselectFromSlot(i);
                } else if (phase === 'FINAL_CHOICE') {
                    finalChoose(i);
                }
            };
        } else {
            slot.innerHTML = '';
            slot.classList.remove('clickable-slot');
            slot.onclick = null;
        }
    }
}

function deselectFromSlot(index) {
    pTable.splice(index, 1);
    btnEl.disabled = true;
    updateSlots();
    renderHand();
}

function createCardDOM(val) {
    const card = document.createElement('div');
    card.className = 'card';
    card.textContent = val;
    if (val > 0) card.classList.add('positive');
    else if (val < 0) card.classList.add('negative');
    else card.classList.add('zero');
    return card;
}

// // 2枚提示（CPU）
function cpuReveal() {
    phase = 'FINAL_CHOICE';
    btnEl.classList.add('hidden');

    cTable = [];
    let tempCHand = [...cHand];
    while(cTable.length < 2) {
        const idx = Math.floor(Math.random() * tempCHand.length);
        cTable.push(tempCHand.splice(idx, 1)[0]);
    }
    cTable.sort((a, b) => a - b);

    for(let i=0; i<2; i++) {
        const cpuSlot = document.getElementById(`cpu-slot-${i}`);
        cpuSlot.innerHTML = '';
        cpuSlot.appendChild(createCardDOM(cTable[i]));
    }

    guideEl.textContent = "どちらか1枚をクリックして勝負！";
    guideEl.style.color = "#e67e22";
    updateSlots();
}

// // 最後の1枚を選択
function finalChoose(playerChoiceIdx) {
    if (phase !== 'FINAL_CHOICE') return;
    phase = 'RESULT';

    const pFinalCard = pTable[playerChoiceIdx];
    
    // CPUの選択
    const cpuChoiceIdx = (cTable.length === 1) ? 0 : Math.floor(Math.random() * 2);
    const cFinalCard = cTable[cpuChoiceIdx];

    // 演出：選ばれなかった方をさらに透明にする
    if (pTable.length > 1) {
        document.getElementById(`player-slot-${1-playerChoiceIdx}`).style.opacity = '0.05';
        document.getElementById(`cpu-slot-${1-cpuChoiceIdx}`).style.opacity = '0.05';
    }
    
    // アニメーション発動
    document.getElementById(`player-slot-${playerChoiceIdx}`).classList.add('final-p-choice');
    document.getElementById(`cpu-slot-${cpuChoiceIdx}`).classList.add('final-c-choice');

    setTimeout(() => {
        resolveBattle(pFinalCard, cFinalCard);
    }, 1000);
}

// // 判定
function judge(p, c) {
    if (p === c) return "draw";
    return p > c ? "player" : "cpu";
}

function resolveBattle(pCard, cCard) {
    const result = judge(pCard, cCard);
    const sum = pCard + cCard;
    let turnMsg = `あなた:${pCard} vs CPU:${cCard} (合計:${sum}) → `;
    let overlayMsg = "";
    let overlayColor = "";

    if (result === "player") {
        pScore += sum;
        turnMsg += "勝利";
        overlayMsg = `WIN!<br>+${sum}`;
        overlayColor = "#2ecc71";
    } else if (result === "cpu") {
        cScore += sum;
        turnMsg += "敗北";
        overlayMsg = `LOSE<br>CPU +${sum}`;
        overlayColor = "#e74c3c";
    } else {
        turnMsg += "引分";
        overlayMsg = "DRAW";
        overlayColor = "#95a5a6";
    }

    resultTextEl.innerHTML = overlayMsg;
    resultTextEl.style.color = overlayColor;
    overlayEl.classList.remove('hidden');

    updateScore();
    const log = document.getElementById('log');
    log.innerHTML = `<div>${turnMsg}</div>` + log.innerHTML;

    pHand.splice(pHand.indexOf(pCard), 1);
    cHand.splice(cHand.indexOf(cCard), 1);

    setTimeout(() => {
        overlayEl.classList.remove('hidden'); // 一旦消すアニメーション待ちならここを調整
        overlayEl.classList.add('hidden');
        if (pHand.length === 0) gameOver();
        else startNewTurn();
    }, 1500);
}

function updateScore() {
    document.getElementById('player-score').textContent = pScore;
    document.getElementById('cpu-score').textContent = cScore;
}

function gameOver() {
    guideEl.textContent = "すべての戦いが終了しました";
    const finalMsg = pScore > cScore ? "あなたの総合勝利！" : (pScore < cScore ? "CPUの総合勝利..." : "引き分け！");
    document.getElementById('log').innerHTML = `<h2 style="background:linear-gradient(to right, #8e44ad, #c0392b); color:white; padding:10px; border-radius:5px;">${finalMsg}</h2>` + document.getElementById('log').innerHTML;
}

initGame();