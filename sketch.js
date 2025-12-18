// ==========================================
// 動物輪廓猜謎遊戲 - p5.js
// 根據輪廓猜測動物，從答案資料夾載入圖片
// ==========================================

let currentAnimalIndex = 0;
let animals = [];
let currentImg = null;
let silhouetteCanvas = null;
let currentScore = 0;
let totalAttempts = 0;
let game1_state = 'teaching'; // 'teaching' 或 'quiz' 
let gameState = 'guessing'; // 'guessing' 或 'reveal'
let revealStartTime = 0;
let buttons = [];
let isCorrectGuess = false;
let currentButtonOrder = [];
let gameMode = 'menu'; // 'menu' | 'game1' | 'game2' | 'game3'
let menuButtons = [];
// 全域背景色
// 剪影遊戲自定義參數
let silhouetteBrightnessFactor = 0.15; // 亮度係數 (0.0 ~ 1.0)，數值越大越亮
let silhouetteFillColor = '#333333'; // 剪影主體顏色 (深灰色，可調整為其他深色)
let silhouetteOutlineColor = '#FFFFFF'; // 剪影輪廓顏色 (白色，可調整為其他亮色)
let silhouetteOutlineThickness = 3; // 剪影輪廓粗細 (像素)
const bgColor = '#B9D9EB';

// 教學頁面滾動變數
let g1_teachingScrollY = 0;
let g1_contentHeight = 0;


// ==========================================
// 全域 UI 主題與設定
// ==========================================
const UI_THEME = {
  primary: '#4D61E3',
  accent: '#FF6B9D',
  hover: '#6C80F5',
  text: '#FFFFFF'
};

// 使用 `答案` 資料夾的最新圖片（請保持與資料夾檔名一致）
const animalNames = ['松鼠', '海豚', '熊貓', '豬', '貓咪', '鹿'];
const animalFiles = [
  '答案/松鼠.webp',
  '答案/海豚.jpg',
  '答案/熊貓.webp',
  '答案/豬.png',
  '答案/貓咪.jpg',
  '答案/鹿.webp'
];

function preload() {
  // 載入所有動物圖片
  for (let i = 0; i < animalFiles.length; i++) {
    try {
      let img = loadImage(animalFiles[i]);
      animals.push({
        img: img,
        name: animalNames[i],
        loaded: true
      });
    } catch (e) {
      animals.push({
        img: null,
        name: animalNames[i],
        loaded: false
      });
      console.log('無法載入: ' + animalFiles[i]);
    }
  }
}

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  // 建立第一個輪廓（會同時建立亂序按鈕）
  createSilhouette();
  setupMenuButtons();
  backButton = { x: 60, y: 40, w: 100, h: 40 };
}

function setupButtons(order) {
  // order: array of animal indices indicating the display order
  buttons = [];
  let buttonW = 150;
  let buttonH = 50;
  let gapX = 60; // 按鈕間距

  let totalButtons = animalNames.length;
  let totalWidth = totalButtons * buttonW + (totalButtons - 1) * gapX;
  let startX = (width - totalWidth) / 2;
  let startY = height * 0.65;  // 距離頂部 65%

  // 如果沒有提供 order，就使用 0..n-1
  if (!order || order.length !== totalButtons) {
    order = [];
    for (let i = 0; i < totalButtons; i++) order.push(i);
  }

  for (let i = 0; i < totalButtons; i++) {
    let animalIdx = order[i];
    buttons.push({
      x: startX + i * (buttonW + gapX),
      y: startY,
      w: buttonW,
      h: buttonH,
      text: animalNames[animalIdx],
      animalIndex: animalIdx, // 實際對應的 animal 索引
      hovered: false
    });
  }
}

function shuffleIndices(n) {
  let arr = [];
  for (let i = 0; i < n; i++) arr.push(i);
  for (let i = n - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    let tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function createSilhouette() {
  if (!animals[currentAnimalIndex].loaded) {
    console.log('圖片未載入');
    return;
  }
  // 為本題建立亂序按鈕順序（包含正確答案）
  currentButtonOrder = shuffleIndices(animals.length);
  setupButtons(currentButtonOrder);
  
  let img = animals[currentAnimalIndex].img;
  
  // 建立輪廓用的 graphics buffer
  silhouetteCanvas = createGraphics(400, 300);
  
  // 將圖片繪製到 graphics，取得像素資訊以製作輪廓
  silhouetteCanvas.image(img, 0, 0, 400, 300);
  
  // 讀取像素，根據透明度建立清晰的剪影
  silhouetteCanvas.loadPixels();
  let d = silhouetteCanvas.pixelDensity();
  
  for (let i = 0; i < silhouetteCanvas.width; i++) {
    for (let j = 0; j < silhouetteCanvas.height; j++) {
      let pixelIndex = (i + j * silhouetteCanvas.width) * 4 * d * d;
      let r = silhouetteCanvas.pixels[pixelIndex];
      let g = silhouetteCanvas.pixels[pixelIndex + 1];
      let b = silhouetteCanvas.pixels[pixelIndex + 2];
      let alpha = silhouetteCanvas.pixels[pixelIndex + 3];
      
      // 只要像素不是完全透明，就將其亮度降低，而不是變為純黑
      if (alpha > 0) {
        const brightnessFactor = silhouetteBrightnessFactor; // 亮度係數 (0.0 ~ 1.0)，越小越黑
        silhouetteCanvas.pixels[pixelIndex] = r * brightnessFactor;     // R
        silhouetteCanvas.pixels[pixelIndex + 1] = g * brightnessFactor; // G
        silhouetteCanvas.pixels[pixelIndex + 2] = b * brightnessFactor; // B
        silhouetteCanvas.pixels[pixelIndex + 3] = 255;
      } else {
        // 其他部分（背景）設為完全透明
        silhouetteCanvas.pixels[pixelIndex + 3] = 0;
      }
    }
  }
  
  silhouetteCanvas.updatePixels();
}

function setupMenuButtons() {
  menuButtons = [];
  let w = 280, h = 220; // 卡片尺寸
  let gap = 40;
  let total = 3;
  let totalW = total * w + (total - 1) * gap;
  let startX = (width - totalW) / 2;
  let centerY = height / 2;

  const gameInfo = [
    { id: 1, title: '課程一：動物觀察家', icon: '🎨', desc: '認識可愛的動物，並進行輪廓猜謎練習。' },
    { id: 2, title: '課程二：刺蝟小博士', icon: '🦔', desc: '學習刺蝟的有趣知識，並透過問答加深印象。' },
    { id: 3, title: '課程三：知識配對王', icon: '🧠', desc: '熟悉動物的奇特知識，並完成知識配對練習。' }
  ];

  for (let i = 0; i < total; i++) {
    menuButtons.push({
      x: startX + i * (w + gap),
      y: centerY - h / 2,
      w: w, h: h,
      id: gameInfo[i].id,
      title: gameInfo[i].title,
      icon: gameInfo[i].icon,
      desc: gameInfo[i].desc
    });
  }
}

// dispatcher draw — p5 需要全域 draw()
function draw() {
  if (gameMode === 'menu') {
    drawMenu();
  } else if (gameMode === 'game1') {
    drawGame1(); // 原本的 draw 改名為 drawGame1
  } else if (gameMode === 'game2') {
    drawGame2(); // placeholder
  } else if (gameMode === 'game3') {
    drawGame3(); // placeholder
  }
}

// ========= 將原本的 draw 改名為 drawGame1（原有內容不變） =========
function drawGame1() {
  background(bgColor);
  drawBackButton();
  
  // 標題
  fill(40);
  textSize(32);
  textAlign(CENTER);
  textStyle(BOLD);
  text('🐾 課程一：動物觀察家', width / 2, 40);

  if (game1_state === 'teaching') {
    drawTeachingStateGame1();
  } else if (game1_state === 'quiz') {
    // 得分顯示
    fill(80);
    textSize(18);
    textStyle(NORMAL);
    textAlign(LEFT);
    text(`正確答案: ${currentScore} / ${Math.max(1, totalAttempts)}`, 30, 70);
    text(`目前題號: ${currentAnimalIndex + 1} / ${animals.length}`, 30, 95);

    if (gameState === 'guessing') {
      drawGuessingState();
    } else if (gameState === 'reveal') {
      drawRevealState();
    } else if (gameState === 'finished') {
      drawFinishedState();
    }
  }
}

function drawMenu() {
  background(bgColor);
  fill(50);
  textSize(48);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text('🐾 動物知識學園 🐾', width / 2, height * 0.2);
  
  for (let b of menuButtons) {
    drawMenuCard(b);
  }

  // 小說明
  fill(80);
  textSize(14);
  textStyle(NORMAL);
  textAlign(CENTER, BOTTOM);
  text('點擊卡片開始學習  |  按 Esc 鍵可隨時返回此選單', width / 2, height * 0.92);
}

// 新增：繪製選單卡片的函式
function drawMenuCard(card) {
  let isHovered = mouseX > card.x && mouseX < card.x + card.w &&
                  mouseY > card.y && mouseY < card.y + card.h;
  
  push();
  // 卡片陰影
  noStroke();
  fill(0, 0, 0, isHovered ? 60 : 30);
  // 懸停時陰影加深
  rect(card.x, card.y + (isHovered ? 10 : 5), card.w, card.h, 20);

  // 卡片主體
  fill(isHovered ? '#FFFFFF' : '#F0F8FF');
  stroke(isHovered ? UI_THEME.primary : '#D0E0F0');
  strokeWeight(isHovered ? 4 : 2);
  translate(0, isHovered ? -8 : 0); // 懸停時輕微上移
  rect(card.x, card.y, card.w, card.h, 20);

  // 卡片內容
  noStroke();
  textAlign(CENTER, CENTER);
  
  fill(0);
  textSize(80);
  text(card.icon, card.x + card.w / 2, card.y + card.h * 0.35);
  
  fill(UI_THEME.primary);
  textSize(22);
  textStyle(BOLD);
  text(card.title, card.x + card.w / 2, card.y + card.h * 0.65);
  
  fill(100);
  textSize(14);
  textStyle(NORMAL);
  // 使用 textBox 讓文字自動換行
  text(card.desc, card.x + 20, card.y + card.h * 0.78, card.w - 40);
  
  pop();
}

// 新增：統一風格的按鈕繪製函式
function drawStyledButton(btn, txt) {
  let isHovered = mouseX > btn.x - btn.w / 2 && mouseX < btn.x + btn.w / 2 &&
                  mouseY > btn.y - btn.h / 2 && mouseY < btn.y + btn.h / 2;

  push();
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  
  // 陰影
  fill(0, 0, 0, 40);
  noStroke();
  rect(btn.x, btn.y + 5, btn.w, btn.h, 15);

  // 按鈕主體
  fill(isHovered ? UI_THEME.hover : UI_THEME.primary);
  rect(btn.x, btn.y, btn.w, btn.h, 15);
  
  // 文字
  fill(UI_THEME.text);
  textSize(20);
  textStyle(BOLD);
  text(txt, btn.x, btn.y);
  pop();
}

// 新增：繪製返回主選單的按鈕
function drawBackButton() {
  let btn = backButton;
  let txt = '← 選單';
  let isHovered = mouseX > btn.x - btn.w / 2 && mouseX < btn.x + btn.w / 2 &&
                  mouseY > btn.y - btn.h / 2 && mouseY < btn.y + btn.h / 2;

  push();
  rectMode(CENTER);
  textAlign(CENTER, CENTER);

  // 使用一個較為低調的樣式
  fill(isHovered ? color(0, 0, 0, 50) : color(0, 0, 0, 20));
  noStroke();
  rect(btn.x, btn.y, btn.w, btn.h, 20); // 圓角藥丸形狀

  fill(isHovered ? 0 : 80);
  textSize(16);
  textStyle(BOLD);
  text(txt, btn.x, btn.y);
  pop();
}

// ========= 將原本的 mousePressed 改名為 mousePressedGame1 =========
function mousePressedGame1() {
  if (game1_state === 'teaching') {
    // 檢查是否點擊 "開始測驗" 按鈕
    let btn = { x: width / 2, y: height * 0.85, w: 220, h: 60 };
    if (mouseX > btn.x - btn.w/2 && mouseX < btn.x + btn.w/2 && mouseY > btn.y - btn.h/2 && mouseY < btn.y + btn.h/2) {
      game1_state = 'quiz';
      restartGameGame1(); // 重置測驗狀態並建立第一題
    }
  } else if (game1_state === 'quiz') {
    if (gameState === 'guessing') {
      // 檢查是否點擊了答案按鈕
      for (let btn of buttons) {
        if (mouseX > btn.x && mouseX < btn.x + btn.w &&
            mouseY > btn.y && mouseY < btn.y + btn.h) {
          // 玩家猜測
          isCorrectGuess = (btn.animalIndex === currentAnimalIndex);
          
          if (isCorrectGuess) {
            currentScore++;
          }
          totalAttempts++;
          
          // 切換到顯示答案狀態
          gameState = 'reveal';
          revealStartTime = millis();
          return;
        }
      }
    } else if (gameState === 'reveal') {
      // 檢查是否點擊 "下一題" 按鈕
      let btn = { x: width / 2, y: height * 0.8, w: 180, h: 55 };
      if (mouseX > btn.x - btn.w/2 && mouseX < btn.x + btn.w/2 && mouseY > btn.y - btn.h/2 && mouseY < btn.y + btn.h/2) {
        nextQuestionGame1();  // 修正為 nextQuestionGame1
      }
    } else if (gameState === 'finished') {
      // 檢查是否點擊重新開始按鈕
      let btn = { x: width / 2, y: height * 0.6, w: 220, h: 60 };
      if (mouseX > btn.x - btn.w/2 && mouseX < btn.x + btn.w/2 && mouseY > btn.y - btn.h/2 && mouseY < btn.y + btn.h/2) {
        restartGameGame1();  // 修正為 restartGameGame1
      }
    }
  }
}

// ========= 同理改名其他 game1 的函式（nextQuestion / restartGame / windowResized / keyPressed） =========
function nextQuestionGame1() {
  currentAnimalIndex++;
  
  // 如果已經完成所有題目，進入結算畫面
  if (currentAnimalIndex >= animals.length) {
    gameState = 'finished';
    // 總結畫面會顯示 currentScore 與 totalAttempts
    return;
  }

  gameState = 'guessing';
  createSilhouette();
}

function restartGameGame1() {
  currentAnimalIndex = 0;
  currentScore = 0;
  totalAttempts = 0;
  gameState = 'guessing';
  // game1_state 維持不變，除非從教學頁面來
  createSilhouette();
}

function windowResizedGame1() {
  // 畫面大小改變時重設 canvas 與按鈕布局
  resizeCanvas(window.innerWidth, window.innerHeight);
  setupButtons(currentButtonOrder);
}

function keyPressedGame1() {
  if (key === 'r' || key === 'R') {
    // 重置遊戲
    currentAnimalIndex = 0;
    currentScore = 0;
    totalAttempts = 0;
    gameState = 'guessing';
    createSilhouette();
  }
}

// ========= 全域的 mousePressed / keyPressed / windowResized 轉發器 =========
function mousePressed() {
  // 優先檢查返回按鈕
  if (gameMode !== 'menu' && checkBackButton()) {
    return;
  }

  if (gameMode === 'menu') {
    mousePressedMenu();
  } else if (gameMode === 'game1') {
    mousePressedGame1();
  } else if (gameMode === 'game2') {
    mousePressedGame2();
  } else if (gameMode === 'game3') {
    mousePressedGame3();
  }
}

function mousePressedMenu() {
  for (let b of menuButtons) {
    if (mouseX > b.x && mouseX < b.x + b.w && mouseY > b.y && mouseY < b.y + b.h) {
      if (b.id === 1) { 
        gameMode = 'game1'; 
        game1_state = 'teaching'; // 每次從主選單進入都先到教學頁
        // createSilhouette(); // 不再需要立即建立，進入測驗時才建立
      } 
      else if (b.id === 2) { gameMode = 'game2'; loadGame2(); } 
      else if (b.id === 3) { gameMode = 'game3'; loadGame3(); }
      return;
    }
  }
}

function checkBackButton() {
  let btn = backButton;
  if (mouseX > btn.x - btn.w / 2 && mouseX < btn.x + btn.w / 2 &&
      mouseY > btn.y - btn.h / 2 && mouseY < btn.y + btn.h / 2) {
    // 重置所有遊戲狀態
    gameMode = 'menu';
    setupMenuButtons();
    return true;
  }
  return false;
}

function keyPressed() {
  if (keyCode === ESCAPE) {
    gameMode = 'menu';
    resetAllScrolls();
    // 重置所有遊戲狀態
    setupMenuButtons();
    return;
  }
  if (gameMode === 'game1') keyPressedGame1();
  else if (gameMode === 'game2') keyPressedGame2();
  else if (gameMode === 'game3') keyPressedGame3();
}

function mouseWheel(event) {
  if (gameMode === 'game1' && game1_state === 'teaching') {
    mouseWheelGame1(event);
  } else if (gameMode === 'game2' && g2_state === 'teaching') {
    mouseWheelGame2(event);
  } else if (gameMode === 'game3' && g3_state === 'teaching') {
    mouseWheelGame3(event);
  }
}

function handleBackToTopClick() {
    if (dist(mouseX, mouseY, width - 60, height - 60) < 25) return true;
}

function resetAllScrolls() {
  g1_teachingScrollY = 0;
  g2_teachingScrollY = 0;
  g3_teachingScrollY = 0;
}

function windowResized() {
  resizeCanvas(window.innerWidth, window.innerHeight);
  if (gameMode === 'menu') setupMenuButtons();
  else if (gameMode === 'game1') windowResizedGame1();
  else if (gameMode === 'game2') windowResizedGame2();
  else if (gameMode === 'game3') windowResizedGame3();
}

function drawScrollbar(scrollY, contentHeight) {
  let viewableRatio = height / contentHeight;
  if (viewableRatio >= 1) return; // 如果內容沒有超出，則不顯示滾動條
  let scrollbarH = height * viewableRatio;
  let scrollbarY = map(scrollY, 0, contentHeight - height, 0, height - scrollbarH);
  fill(0, 0, 0, 50);
  rect(width - 8, scrollbarY, 6, scrollbarH, 3);
}
function drawBackToTopButton(scrollY) {
  if (scrollY < height / 2) return; // 滾動超過半個螢幕才顯示

  let btn = { x: width - 60, y: height - 60, size: 50 };
  let isHovered = dist(mouseX, mouseY, btn.x, btn.y) < btn.size / 2;

  push();
  fill(isHovered ? UI_THEME.primary : 0, 150);
  noStroke();
  circle(btn.x, btn.y, btn.size);

  stroke(255);
  strokeWeight(3);
  line(btn.x, btn.y - 8, btn.x, btn.y + 8);
  line(btn.x, btn.y - 8, btn.x - 6, btn.y - 2);
  line(btn.x, btn.y - 8, btn.x + 6, btn.y - 2);
  pop();
}


function drawScrollDownIndicator() {
  push();
  let arrowY = height - 40;
  let alpha = map(sin(frameCount * 0.1), -1, 1, 100, 255);
  fill(80, alpha);
  noStroke();
  textAlign(CENTER);
  textSize(14);
  text("向下滾動", width / 2, arrowY - 15);
  stroke(80, alpha);
  strokeWeight(2);
  line(width / 2, arrowY, width / 2 - 8, arrowY - 8);
  line(width / 2, arrowY, width / 2 + 8, arrowY - 8);
  pop();
}
// ========= placeholders for Game2 / Game3 (replace with your real code) =========
/*
  已整合：第二個遊戲「刺蝟冷知識挑戰」到 loadGame2/drawGame2，
  並以 g2_ 前綴隔離變數與函式，避免與遊戲一衝突。
*/
// ========= Game2: 刺蝟冷知識挑戰（namespaced 為 g2_） =========
let g2_initialized = false;
let g2_player = {
  img: null,
  loaded: false,
  x: 0,
  y: 0,
  size: 150, // 將刺蝟的大小從 100 增加到 130
  speed: 50,
  bobbingAngle: 0
};
let g2_questionIndex = 0;
let g2_score = 0;
let g2_message = "";
let g2_gameState = 'START'; // 'START' | 'PLAYING' | 'GAME_OVER'
let g2_state = 'teaching'; // 'teaching' | 'quiz'
let g2_lastAnswerTime = 0;
let g2_teachingScrollY = 0;
let g2_teachingImg = null;
let g2_answeredCorrectly = null;

const g2_questions = [
  { text: "刺蝟是兩棲動物。", answer: false },
  { text: "刺蝟遇到危險時會蜷縮成球。", answer: true },
  { text: "刺蝟會把刺射出去攻擊敵人。", answer: false },
  { text: "刺蝟可以游泳。", answer: true },
  { text: "刺蝟白天很活躍。", answer: false }
];

const g2_COLORS = {
  CORRECT_COLOR: "#4CAF50",
  WRONG_COLOR: "#F44336",
  PRIMARY_TEXT_COLOR: "#1a1a1a",
  SECONDARY_TEXT_COLOR: "#666",
  BG_COLOR_TOP: "#FFE5EC",
  BG_COLOR_BOTTOM: "#FFB3D9",
  ACCENT_COLOR: "#FF6B9D"
}; // Game 2 專屬顏色，保留其獨特風格

let g2_circleArea, g2_crossArea;
let g2_startButton, g2_restartButton;

// 請根據你的專案結構放置圖片，這裡預設放在 ../20251112-main/character.png 或與 sketch 同一資料夾
const g2_characterPathCandidates = [
  'character.png',  // 同一資料夾（最常用）
  './character.png',  // 顯式相對路徑
  '../character.png'  // 如果在父資料夾
  // '答案/刺蝟.jpg' // 如果您有刺蝟圖片，可以取消註解此行
];

function loadGame2() {
  // 初始化或重設遊戲2的狀態
  g2_state = 'teaching'; // 每次載入都從教學開始
  
  // 將作答區改為以畫面中心為基準，並設定固定間距
  const answerAreaOffset = 180; // 圓圈中心到畫面中心的距離
  // 設定區域與按鈕位置（根據目前 canvas 大小）
  g2_circleArea = { x: width / 2 - answerAreaOffset, y: height - 80, size: 120 };
  g2_crossArea = { x: width / 2 + answerAreaOffset, y: height - 80, size: 120 };
  g2_startButton = { x: width / 2, y: height / 2 + 80, w: 200, h: 60 };
  g2_restartButton = { x: width / 2, y: height / 2 + 200, w: 200, h: 60 };

  if (g2_initialized) {
    g2_resetQuiz(); // 如果已經初始化過，只需重置測驗狀態
    return;
  }

  // 載入教學圖片
  try {
    g2_teachingImg = loadImage('答案/刺蝟.jpg'); // 請確保此路徑有圖片
  } catch(e) { console.log("無法載入課程二的教學圖片"); }

  // 載入角色圖片（嘗試多個路徑）
  g2_player.loaded = false;
  let loaded = false;
  
  for (let p of g2_characterPathCandidates) {
    if (loaded) break;
    g2_player.img = loadImage(p, 
      () => {
        g2_player.loaded = true;
        loaded = true;
        console.log('✅ 成功載入: ' + p);
      }, 
      () => {
        console.log('❌ 無法載入: ' + p);
      }
    );
  }

  // 初始化玩家位置
  g2_player.x = width / 2;
  g2_player.y = height - 115; // 稍微上移以適應新的大小
  g2_initialized = true;
  g2_resetQuiz();
}

// 新增：重置遊戲2測驗狀態的函式
function g2_resetQuiz() {
  g2_questionIndex = 0;
  g2_score = 0;
  g2_message = "";
  g2_teachingScrollY = 0;
  g2_answeredCorrectly = null;
  g2_gameState = 'START'; // 測驗從自己的 'START' 畫面開始
  g2_lastAnswerTime = 0;
  g2_player.x = width / 2;
}

function drawGame2() {
  if (!g2_initialized) {
    loadGame2();
  }
  
  drawG2GradientBackground();
  drawBackButton();

  if (g2_state === 'teaching') {
    drawG2TeachingState();
  } else if (g2_state === 'quiz') {
    // 根據測驗的內部狀態繪製對應畫面
    if (g2_gameState === 'START') drawG2StartScreen();
    else if (g2_gameState === 'PLAYING') drawG2Game();
    else if (g2_gameState === 'GAME_OVER') drawG2GameOverScreen();
  }
}

/* ---------- g2 繪製 / 邏輯函式 ---------- */
function drawG2GradientBackground() {
  for (let i = 0; i < height; i++) {
    let inter = map(i, 0, height, 0, 1);
    let c = lerpColor(color(g2_COLORS.BG_COLOR_TOP), color(g2_COLORS.BG_COLOR_BOTTOM), inter);
    stroke(c);
    line(0, i, width, i);
  }
  drawG2DecorationCircles();
  if (g2_gameState !== 'GAME_OVER') drawG2GrassArea();
}

function drawG2DecorationCircles() {
  noStroke();
  fill(255, 255, 255, 60);
  ellipse(80, 100, 80, 80);
  ellipse(width - 100, 150, 120, 120);
  ellipse(120, height - 120, 100, 100);
  ellipse(width - 140, height - 100, 90, 90);
  ellipse(width / 2, height / 2 - 100, 60, 60);
}

function drawG2GrassArea() {
  push(); // 保存當前的繪圖設定
  rectMode(CENTER); // 將矩形繪製模式設為中心
  fill(76, 175, 80, 80);
  noStroke();
  rect(width / 2, height - 20, width, 60);
  stroke(76, 175, 80, 150);
  strokeWeight(2);
  line(0, height - 50, width, height - 50);
  pop(); // 恢復先前的繪圖設定
}

function drawG2Player() {
  g2_player.bobbingAngle += 0.05;
  let bobbingOffset = sin(g2_player.bobbingAngle) * 5;

  push();
  fill(0, 0, 0, 20);
  noStroke();
  ellipse(g2_player.x, g2_player.y + g2_player.size / 2 + 10, g2_player.size * 0.9, g2_player.size * 0.3);
  pop();

  if (g2_player.loaded && g2_player.img) {
    image(g2_player.img,
      g2_player.x - g2_player.size / 2,
      g2_player.y - g2_player.size / 2 + bobbingOffset,
      g2_player.size,
      g2_player.size);
  } else {
    // 替代簡單圖示（若圖片尚未載入）
    push();
    fill(200);
    stroke(150);
    ellipse(g2_player.x, g2_player.y, g2_player.size, g2_player.size);
    pop();
  }
}

function drawG2StartScreen() {
  textSize(56);
  textAlign(CENTER, CENTER);
  fill(g2_COLORS.PRIMARY_TEXT_COLOR);
  textStyle(BOLD);
  text("🦔 刺蝟知識問答 🦔", width / 2, height / 2 - 100);

  textSize(18);
  fill(g2_COLORS.SECONDARY_TEXT_COLOR);
  textStyle(NORMAL);
  text("用左右方向鍵移動，選擇 ⭕ 或 ❌ 來答題", width / 2, height / 2 - 20);

  drawG2Button(g2_startButton, "開始問答");
}

function drawG2Game() {
  drawG2ProgressBar();
  fill(g2_COLORS.PRIMARY_TEXT_COLOR);
  textSize(28);
  textStyle(BOLD);
  text(g2_questions[g2_questionIndex].text, width / 2, 70);
  drawG2Options();
  drawG2Player();
  if (g2_message) drawG2MessageBox();
  g2_checkAnswerCollision();
}

function drawG2ProgressBar() {
  push(); // 保存當前的繪圖設定
  rectMode(CENTER); // 將矩形繪製模式設為中心

  fill(220);
  noStroke();
  rect(width / 2, 25, width - 40, 12, 6);
  fill(g2_COLORS.ACCENT_COLOR);
  let progress = (g2_questionIndex / g2_questions.length) * (width - 40);
  // 由於是 CENTER 模式，我們需要從左邊緣開始計算 x 座標
  rect(20 + progress / 2, 25, progress, 12, 6); 
  fill(g2_COLORS.SECONDARY_TEXT_COLOR);
  textSize(14);
  textAlign(RIGHT);
  text(`第 ${g2_questionIndex + 1} / ${g2_questions.length} 題`, width - 20, 28);
  pop(); // 恢復先前的繪圖設定
}

function drawG2MessageBox() {
  rectMode(CENTER); // 將矩形繪製模式設為中心
  textAlign(CENTER, CENTER); // 將文字對齊模式設為中心
  let bg = g2_message.includes("✅") ? color(76, 175, 80, 200) : color(244, 67, 54, 200);
  fill(bg);
  noStroke();
  rect(width / 2, height / 2 + 50, 300, 60, 10);
  textSize(24);
  fill(255);
  textStyle(BOLD);
  text(g2_message, width / 2, height / 2 + 50);
  rectMode(CORNER); // 恢復預設模式，避免影響其他函式
}

function drawG2GameOverScreen() {
  rectMode(CENTER); // 將矩形繪製模式設為中心，方便對齊
  fill(0, 0, 0, 100);
  noStroke();
  rect(width / 2, height / 2, width, height);

  textSize(48);
  fill(g2_COLORS.PRIMARY_TEXT_COLOR);
  textStyle(BOLD);
  text("🎉 問答結束！🎉", width / 2, height / 2 - 150);

  push();
  fill(0, 0, 0, 15);
  noStroke();
  rect(width / 2, height / 2, 380, 180, 20);
  pop();

  fill(255);
  stroke(g2_COLORS.ACCENT_COLOR);
  strokeWeight(3);
  rect(width / 2, height / 2, 380, 180, 20);

  textSize(72);
  fill(g2_COLORS.ACCENT_COLOR);
  textStyle(BOLD);
  text(`${g2_score}`, width / 2 - 80, height / 2 - 20);

  stroke(200);
  strokeWeight(2);
  line(width / 2 - 30, height / 2 - 60, width / 2 - 30, height / 2 + 60);

  textAlign(LEFT);
  textSize(18);
  fill(g2_COLORS.SECONDARY_TEXT_COLOR);
  textStyle(NORMAL);
  text(`總題數：${g2_questions.length}`, width / 2 + 20, height / 2 - 30);
  text(`正確數：${g2_score}`, width / 2 + 20, height / 2);
  text(`錯誤數：${g2_questions.length - g2_score}`, width / 2 + 20, height / 2 + 30);

  let percentage = Math.round((g2_score / g2_questions.length) * 100);
  let ratingText = "";
  let ratingColor = "";
  if (percentage === 100) { ratingText = "⭐ 完美滿分！"; ratingColor = "#FFD700"; }
  else if (percentage >= 80) { ratingText = "🌟 優秀表現！"; ratingColor = "#4CAF50"; }
  else if (percentage >= 60) { ratingText = "👍 不錯喔！"; ratingColor = "#FF9800"; }
  else { ratingText = "💪 再加油！"; ratingColor = "#F44336"; }

  textAlign(CENTER, CENTER); // 確保垂直也置中
  textSize(24);
  fill(ratingColor);
  textStyle(BOLD);
  text(ratingText, width / 2, height / 2 + 70);

  drawG2PercentageBar(percentage);
  drawStyledButton(g2_restartButton, "🔄 再次練習");
  textSize(14);
  fill(g2_COLORS.SECONDARY_TEXT_COLOR);
  textStyle(ITALIC);
  rectMode(CORNER); // 恢復預設的矩形繪製模式，避免影響其他函式
}

function drawG2PercentageBar(percentage) {
  let barWidth = 300;
  let barHeight = 16;
  let barX = width / 2;
  let barY = height / 2 + 105;

  rectMode(CENTER); // 使用中心模式繪製進度條
  fill(230);
  noStroke();
  rect(barX, barY, barWidth, barHeight, 8);

  let progressWidth = (percentage / 100) * barWidth;
  let progressColor;
  if (percentage === 100) progressColor = color("#FFD700");
  else if (percentage >= 80) progressColor = color("#4CAF50");
  else if (percentage >= 60) progressColor = color("#FF9800");
  else progressColor = color("#F44336");

  fill(progressColor);
  // 由於 rect() 現在是從中心點繪製，我們需要調整 x 座標
  rect(barX - (barWidth - progressWidth) / 2, barY, progressWidth, barHeight, 8);

  textSize(16);
  fill(255);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(`${percentage}%`, barX, barY); // 文字也置中於進度條
}

function drawG2Button(btn, txt) {
  // 直接呼叫新的統一風格按鈕函式
  // 為了保持 Game 2 的粉色系，這裡可以做個小客製化
  drawStyledButton(btn, txt);
}

function drawG2Options() {
  let timeSinceAnswer = millis() - g2_lastAnswerTime;
  let animDuration = 500;
  let circleHover = dist(mouseX, mouseY, g2_circleArea.x, g2_circleArea.y) < g2_circleArea.size / 2;
  let circleScale = 1;
  if (g2_answeredCorrectly === true && timeSinceAnswer < animDuration) {
    circleScale = 1 + 0.2 * sin(map(timeSinceAnswer, 0, animDuration, 0, PI));
  }
  drawG2Symbol('circle', g2_circleArea.x, g2_circleArea.y, g2_circleArea.size * 0.7, circleHover, circleScale);

  let crossHover = dist(mouseX, mouseY, g2_crossArea.x, g2_crossArea.y) < g2_crossArea.size / 2;
  let crossScale = 1;
  if (g2_answeredCorrectly === false && timeSinceAnswer < animDuration) {
    crossScale = 1 + 0.2 * sin(map(timeSinceAnswer, 0, animDuration, 0, PI));
  }
  drawG2Symbol('cross', g2_crossArea.x, g2_crossArea.y, g2_crossArea.size * 0.7, crossHover, crossScale);
}

function drawG2Symbol(type, x, y, size, isHovered, scaleAmount = 1) {
  push();
  translate(x, y);
  scale(scaleAmount);
  if (isHovered) {
    fill(0, 0, 0, 10);
    noStroke();
    ellipse(0, 0, size + 30, size + 30);
  }
  noFill();
  strokeWeight(isHovered ? 14 : 8);
  if (type === 'circle') {
    stroke(g2_COLORS.CORRECT_COLOR);
    ellipse(0, 0, size, size);
  } else {
    stroke(g2_COLORS.WRONG_COLOR);
    let r = size / 2;
    line(-r, -r, r, r);
    line(r, -r, -r, r);
  }
  pop();
}

function g2_checkAnswerCollision() {
  let q = g2_questions[g2_questionIndex];
  let answerGiven = null;
  if (dist(g2_player.x, g2_player.y, g2_circleArea.x, g2_circleArea.y) < g2_circleArea.size / 2) {
    answerGiven = true;
  }
  if (dist(g2_player.x, g2_player.y, g2_crossArea.x, g2_crossArea.y) < g2_crossArea.size / 2) {
    answerGiven = false;
  }
  if (answerGiven !== null) {
    if (answerGiven === q.answer) {
      g2_message = "✅ 答對了！";
      g2_score++;
      g2_answeredCorrectly = q.answer;
    } else {
      g2_message = "❌ 答錯了！";
      g2_answeredCorrectly = !q.answer;
    }
    g2_lastAnswerTime = millis();
    g2_questionIndex++;
    g2_player.x = width / 2;
    if (g2_questionIndex >= g2_questions.length) {
      g2_gameState = 'GAME_OVER';
      g2_message = "";
    } else {
      setTimeout(() => {
        g2_message = "";
        g2_answeredCorrectly = null;
      }, 800);
    }
  }
}

/* ---------- g2 事件處理（供 dispatcher 呼叫） ---------- */
function mousePressedGame2() {
  if (g2_state === 'teaching') {
    // 檢查是否點擊 "開始測驗" 按鈕
    let btn = { x: width / 2, y: height - 80, w: 220, h: 60 };
    if (mouseX > btn.x - btn.w/2 && mouseX < btn.x + btn.w/2 && mouseY > btn.y - btn.h/2 && mouseY < btn.y + btn.h/2) {
      g2_state = 'quiz';
      g2_resetQuiz(); // 重置測驗狀態
    }
  } else if (g2_state === 'quiz') {
    if (handleBackToTopClick()) {
      if (g2_state === 'teaching' && g2_teachingScrollY > 0) {
        g2_teachingScrollY = 0; // 平滑滾動效果待實現
        return;
      }
    }

    if (g2_gameState === 'START') {
      let isClicked = mouseX > g2_startButton.x - g2_startButton.w / 2 && mouseX < g2_startButton.x + g2_startButton.w / 2 && mouseY > g2_startButton.y - g2_startButton.h / 2 && mouseY < g2_startButton.y + g2_startButton.h / 2;
      if (isClicked) g2_gameState = 'PLAYING'; // 點擊 "開始問答"
    } else if (g2_gameState === 'GAME_OVER') {
      let isClicked = mouseX > g2_restartButton.x - g2_restartButton.w / 2 && mouseX < g2_restartButton.x + g2_restartButton.w / 2 && mouseY > g2_restartButton.y - g2_restartButton.h / 2 && mouseY < g2_restartButton.y + g2_restartButton.h / 2;
      if (isClicked) g2_resetQuiz();
    }
  }
}

function keyPressedGame2() {
  if (!g2_initialized) loadGame2();
  if (g2_gameState !== 'PLAYING') return;
  if (keyCode === LEFT_ARROW) {
    g2_player.x -= g2_player.speed;
  } else if (keyCode === RIGHT_ARROW) {
    g2_player.x += g2_player.speed;
  }
  g2_player.x = constrain(g2_player.x, g2_player.size / 2, width - g2_player.size / 2);
}

function windowResizedGame2() {
  // 將作答區改為以畫面中心為基準，並設定固定間距
  const answerAreaOffset = 180; // 圓圈中心到畫面中心的距離
  // 更新依賴 width/height 的區域配置
  g2_circleArea = { x: width / 2 - answerAreaOffset, y: height - 80, size: 120 };
  g2_crossArea = { x: width / 2 + answerAreaOffset, y: height - 80, size: 120 };
  g2_startButton = { x: width / 2, y: height / 2 + 80, w: 200, h: 60 };
  g2_restartButton = { x: width / 2, y: height / 2 + 200, w: 200, h: 60 };
  g2_player.x = constrain(g2_player.x, g2_player.size / 2, width - g2_player.size / 2);
}

// 新增：計算滾動動畫效果的函式
function getScrollAnimation(elementY, scrollY) {
  const screenPos = elementY - scrollY;
  const screenBottom = height;
  const triggerPoint = screenBottom - 100; // 當元素底部離螢幕底部 100px 時開始動畫

  if (screenPos > triggerPoint) {
    let progress = map(screenPos, screenBottom, triggerPoint, 0, 1, true);
    return { alpha: progress * 255, offsetY: (1 - progress) * 30 };
  }
  return { alpha: 255, offsetY: 0 };
}

// 新增：遊戲二的教學畫面
function drawG2TeachingState() {
  push();
  const contentWidth = width * 0.7;
  const startX = (width - contentWidth) / 2;
  let currentY = 80;

  // 標題和說明
  fill(g2_COLORS.PRIMARY_TEXT_COLOR);
  textSize(36);
  textAlign(CENTER);
  textStyle(BOLD);  
  text('🦔 刺蝟小學堂 🦔', width / 2, currentY);
  currentY += 40;

  fill(g2_COLORS.SECONDARY_TEXT_COLOR);
  textSize(18);
  textStyle(NORMAL);
  text('在開始測驗前，先來深入了解一下刺蝟吧！', width / 2, currentY);
  currentY += 60;
  
  // --- 滾動內容開始 ---
  translate(0, -g2_teachingScrollY);

  // 動畫效果計算
  let anim;

  // --- 繪製詳細知識 ---
  textAlign(LEFT, TOP);
  
  // 身體與防禦
  fill(g2_COLORS.ACCENT_COLOR);
  textSize(22);
  textStyle(BOLD);
  anim = getScrollAnimation(currentY, g2_teachingScrollY);
  fill(red(g2_COLORS.ACCENT_COLOR), green(g2_COLORS.ACCENT_COLOR), blue(g2_COLORS.ACCENT_COLOR), anim.alpha);
  text('身體與防禦', startX, currentY);
  currentY += 35;
  
  fill(g2_COLORS.PRIMARY_TEXT_COLOR);
  textSize(16);
  textStyle(NORMAL);
  anim = getScrollAnimation(currentY, g2_teachingScrollY);
  fill(red(g2_COLORS.PRIMARY_TEXT_COLOR), green(g2_COLORS.PRIMARY_TEXT_COLOR), blue(g2_COLORS.PRIMARY_TEXT_COLOR), anim.alpha);
  text('• 驚人的刺：成年刺蝟約有 5000 至 8000 根刺，這些刺由角蛋白構成，和我們的指甲成分相同。它們會像頭髮一樣定期脫落並重新生長。', startX + 20, currentY, contentWidth - 20);
  currentY += 50;
  anim = getScrollAnimation(currentY, g2_teachingScrollY);
  fill(red(g2_COLORS.PRIMARY_TEXT_COLOR), green(g2_COLORS.PRIMARY_TEXT_COLOR), blue(g2_COLORS.PRIMARY_TEXT_COLOR), anim.alpha);
  text('• 防禦機制：遇到危險時，刺蝟會豎起全身的刺，並利用強大的背部肌肉將自己捲成一個無法攻破的刺球，這是牠們最經典的防禦行為。', startX + 20, currentY, contentWidth - 20);
  currentY += 50;
  anim = getScrollAnimation(currentY, g2_teachingScrollY);
  fill(red(g2_COLORS.PRIMARY_TEXT_COLOR), green(g2_COLORS.PRIMARY_TEXT_COLOR), blue(g2_COLORS.PRIMARY_TEXT_COLOR), anim.alpha);
  text('• 刺的特性：刺蝟的刺沒有毒性，也不會像箭豬（豪豬）一樣「射」出去。它們只是固定在皮膚上，除非受到外力，否則不會輕易脫落。', startX + 20, currentY, contentWidth - 20);
  currentY += 70;

  // 習性與感官
  fill(g2_COLORS.ACCENT_COLOR);
  textSize(22);
  textStyle(BOLD);
  anim = getScrollAnimation(currentY, g2_teachingScrollY);
  fill(red(g2_COLORS.ACCENT_COLOR), green(g2_COLORS.ACCENT_COLOR), blue(g2_COLORS.ACCENT_COLOR), anim.alpha);
  text('生活習性', startX, currentY);
  currentY += 35;

  fill(g2_COLORS.PRIMARY_TEXT_COLOR);
  textSize(16);
  textStyle(NORMAL);
  anim = getScrollAnimation(currentY, g2_teachingScrollY);
  fill(red(g2_COLORS.PRIMARY_TEXT_COLOR), green(g2_COLORS.PRIMARY_TEXT_COLOR), blue(g2_COLORS.PRIMARY_TEXT_COLOR), anim.alpha);
  text('• 夜行性動物：刺蝟是標準的夜貓子，白天大部分時間都在睡覺，黃昏和夜晚才出來覓食和活動。', startX + 20, currentY, contentWidth - 20);
  currentY += 30;
  anim = getScrollAnimation(currentY, g2_teachingScrollY);
  fill(red(g2_COLORS.PRIMARY_TEXT_COLOR), green(g2_COLORS.PRIMARY_TEXT_COLOR), blue(g2_COLORS.PRIMARY_TEXT_COLOR), anim.alpha);
  text('• 敏銳的感官：牠們的聽覺與嗅覺極為靈敏，主要以此來辨識方向、尋找食物和躲避天敵，但視力相對較差。', startX + 20, currentY, contentWidth - 20);
  currentY += 50;
  anim = getScrollAnimation(currentY, g2_teachingScrollY);
  fill(red(g2_COLORS.PRIMARY_TEXT_COLOR), green(g2_COLORS.PRIMARY_TEXT_COLOR), blue(g2_COLORS.PRIMARY_TEXT_COLOR), anim.alpha);
  text('• 獨居動物：大多數刺蝟是獨行俠，除了繁殖季節外，牠們更喜歡獨自生活。', startX + 20, currentY, contentWidth - 20);
  currentY += 70;
  
  // 特殊行為
  fill(g2_COLORS.ACCENT_COLOR);
  textSize(22);
  textStyle(BOLD);
  anim = getScrollAnimation(currentY, g2_teachingScrollY);
  fill(red(g2_COLORS.ACCENT_COLOR), green(g2_COLORS.ACCENT_COLOR), blue(g2_COLORS.ACCENT_COLOR), anim.alpha);
  text('奇特的「塗刺」行為', startX, currentY);
  currentY += 35;
  
  fill(g2_COLORS.PRIMARY_TEXT_COLOR);
  textSize(16);
  textStyle(NORMAL);
  anim = getScrollAnimation(currentY, g2_teachingScrollY);
  fill(red(g2_COLORS.PRIMARY_TEXT_COLOR), green(g2_COLORS.PRIMARY_TEXT_COLOR), blue(g2_COLORS.PRIMARY_TEXT_COLOR), anim.alpha);
  text('當刺蝟遇到一種新的、強烈的氣味時，牠會開始咀嚼並產生大量泡沫狀的唾液，然後用舌頭將這些唾液塗抹在自己的刺上。這個行為被稱為「塗刺」(self-anointing)。科學家對其確切原因尚無定論，推測可能與氣味標記、偽裝或吸引異性有關。', startX + 20, currentY, contentWidth - 20);
  currentY += 100;
  
  // 刺蝟與人類
  fill(g2_COLORS.ACCENT_COLOR);
  textSize(22);
  textStyle(BOLD);
  anim = getScrollAnimation(currentY, g2_teachingScrollY);
  fill(red(g2_COLORS.ACCENT_COLOR), green(g2_COLORS.ACCENT_COLOR), blue(g2_COLORS.ACCENT_COLOR), anim.alpha);
  text('刺蝟與人類', startX, currentY);
  currentY += 35;

  fill(g2_COLORS.PRIMARY_TEXT_COLOR);
  textSize(16);
  textStyle(NORMAL);
  anim = getScrollAnimation(currentY, g2_teachingScrollY);
  fill(red(g2_COLORS.PRIMARY_TEXT_COLOR), green(g2_COLORS.PRIMARY_TEXT_COLOR), blue(g2_COLORS.PRIMARY_TEXT_COLOR), anim.alpha);
  text('• 寵物刺蝟：非洲迷你刺蝟是常見的寵物種類，牠們經過馴養，性格相對溫和。飼養刺蝟需要提供特定的溫度、飲食和足夠的活動空間。\n\n• 花園幫手：在歐洲，野生刺蝟被視為花園的好朋友，因為牠們會吃掉許多害蟲，如蝸牛和蛞蝓，有助於維持生態平衡。', startX + 20, currentY, contentWidth - 20);
  currentY += 150;

  // 食性
  fill(g2_COLORS.ACCENT_COLOR);
  textSize(22);
  textStyle(BOLD);
  anim = getScrollAnimation(currentY, g2_teachingScrollY);
  fill(red(g2_COLORS.ACCENT_COLOR), green(g2_COLORS.ACCENT_COLOR), blue(g2_COLORS.ACCENT_COLOR), anim.alpha);
  text('牠們吃什麼？', startX, currentY);
  currentY += 35;
  
  fill(g2_COLORS.PRIMARY_TEXT_COLOR);
  textSize(16);
  textStyle(NORMAL);
  anim = getScrollAnimation(currentY, g2_teachingScrollY);
  fill(red(g2_COLORS.PRIMARY_TEXT_COLOR), green(g2_COLORS.PRIMARY_TEXT_COLOR), blue(g2_COLORS.PRIMARY_TEXT_COLOR), anim.alpha);
  text('刺蝟是雜食性動物，主要以昆蟲、蠕蟲、蝸牛等無脊椎動物為食，有時也會吃小型脊椎動物、鳥蛋、水果和蘑菇。牠們是花園裡的好幫手，能幫忙清除害蟲！', startX + 20, currentY, contentWidth - 20);
  currentY += 100;
  
  let g2_contentHeight = currentY; // 記錄內容總高度
  pop(); // 恢復 translate
  
  // --- 固定的 UI 元素 ---
  drawScrollbar(g2_teachingScrollY, g2_contentHeight);
  drawBackToTopButton(g2_teachingScrollY);
  if (g2_teachingScrollY < g2_contentHeight - height - 10) {
    drawScrollDownIndicator();
  }
  

  // 開始測驗按鈕
  drawStyledButton({ x: width / 2, y: height - 80, w: 220, h: 60 }, '🚀 開始問答');
}

// 新增：遊戲一的教學畫面
function drawTeachingStateGame1() {
  push();
  // 標題和說明
  fill(60);
  textSize(24);
  textAlign(CENTER);
  textStyle(NORMAL);
  text('首先，讓我們來認識一下這些可愛的動物吧！', width / 2, height * 0.15);

  // --- 滾動內容開始 ---
  translate(0, -g1_teachingScrollY);

  // 繪製所有動物的圖卡
  const cardW = width * 0.6;
  const cardH = 320; // 增加卡片高度以容納更多內容
  const gapY = 50;
  const startX = (width - cardW) / 2;
  let currentY = height * 0.25;

  const animalFacts = {
    '松鼠': {
      fact: '松鼠會「假裝」埋藏堅果來欺騙可能的偷竊者（比如其他松鼠或鳥類）。',
      habitat: '森林、公園和市區林地', diet: '堅果、種子、水果、昆蟲', life: '5-10年'
    },
    '海豚': {
      fact: '海豚在睡覺時，只有一半的大腦會休息，另一半則保持清醒以維持呼吸和警惕。',
      habitat: '全球的海洋與部分河流', diet: '魚類、魷魚', life: '20-50年'
    },
    '熊貓': {
      fact: '熊貓每天要花12-14個小時來吃竹子，但牠們的消化系統其實更像食肉動物。',
      habitat: '中國中部的山區竹林', diet: '99%是竹子', life: '20-30年'
    },
    '豬': {
      fact: '豬的智商很高，被認為是犬類動物之外最聰明的家養動物之一，甚至能玩簡單的電玩。',
      habitat: '農場、森林', diet: '雜食性', life: '15-20年'
    },
    '貓咪': {
      fact: '貓咪喉嚨發出的呼嚕聲不僅代表滿足，也可能是在自我療癒或感到壓力時發出的。',
      habitat: '全球各地（與人類共居）', diet: '肉食性', life: '15-20年'
    },
    '鹿': {
      fact: '雄鹿的鹿角每年都會脫落並重新生長，是哺乳動物中生長最快的組織之一。',
      habitat: '森林、草原、山地', diet: '草、樹葉、嫩枝', life: '10-20年'
    }
  };

  for (let i = 0; i < animals.length; i++) {
    if (animals[i].loaded) {
      let x = startX;
      let y = currentY; // 卡片原始 y 位置

      // 計算滾動動畫
      let anim = getScrollAnimation(y, g1_teachingScrollY);
      let animatedY = y + anim.offsetY;

      // 卡片背景
      fill(255, 255, 255, 150 * (anim.alpha / 255));
      noStroke();
      rect(x, animatedY, cardW, cardH, 15);

      // 繪製圖片
      push();
      tint(255, anim.alpha); // 圖片也套用淡入效果
      image(animals[i].img, x + 20, animatedY + 20, 200, cardH - 40); // 圖片區域
      pop();
      
      // 繪製文字
      let textX = x + 240;
      let textW = cardW - textX + x - 20;
      let animalData = animalFacts[animals[i].name] || {};

      textAlign(LEFT, TOP);
      fill(red(UI_THEME.primary), green(UI_THEME.primary), blue(UI_THEME.primary), anim.alpha);
      textSize(22);
      textStyle(BOLD);
      text(animals[i].name, textX, animatedY + 30);
      
      fill(60, anim.alpha);
      textSize(16);
      textStyle(NORMAL);
      text(animalData.fact || '這是一種神奇的動物！', textX, animatedY + 70, textW);
      
      // 新增的詳細資料
      let detailY = animatedY + 160;
      fill(80, anim.alpha);
      textStyle(BOLD);
      text('棲息地：', textX, detailY);
      text('食性：', textX, detailY + 40);
      text('平均壽命：', textX, detailY + 80);

      textStyle(NORMAL);
      fill(100, anim.alpha);
      text(animalData.habitat || '未知', textX + 70, detailY);
      text(animalData.diet || '未知', textX + 70, detailY + 40);
      text(animalData.life || '未知', textX + 70, detailY + 80);
      
      currentY += cardH + gapY;
    }
  }
  g1_contentHeight = currentY; // 記錄內容總高度
  pop(); // 恢復 translate

  // --- 固定的 UI 元素 ---
  drawScrollbar(g1_teachingScrollY, g1_contentHeight);
  drawBackToTopButton(g1_teachingScrollY);
  if (g1_teachingScrollY < g1_contentHeight - height - 10) {
    drawScrollDownIndicator();
  }

  // 開始測驗按鈕
  drawStyledButton({ x: width / 2, y: height * 0.85, w: 220, h: 60 }, '🚀 開始練習');
}

// 繪製猜測狀態
function drawGuessingState() {
  // 繪製輪廓 - 居中顯示
  if (silhouetteCanvas) {
    push(); // 隔離繪圖設定，避免 tint() 影響其他繪圖
    let silW = silhouetteCanvas.width;
    let silH = silhouetteCanvas.height;
    let silX = (width - silW) / 2;
    let silY = height * 0.12;

    // 繪製輪廓線 (稍微放大並著色為輪廓顏色)
    tint(silhouetteOutlineColor);
    image(
      silhouetteCanvas,
      silX - silhouetteOutlineThickness,
      silY - silhouetteOutlineThickness,
      silW + silhouetteOutlineThickness * 2,
      silH + silhouetteOutlineThickness * 2
    );
    noTint(); // 重置 tint

    // 繪製剪影主體 (正常大小並著色為剪影顏色)
    // 這裡不再需要繪製主體，因為輪廓線版本已經包含了降低亮度的圖像
    // image(silhouetteCanvas, silX, silY);
    pop(); // 恢復繪圖設定

    // 加上邊框
    noFill();
    stroke(100);
    strokeWeight(2);
    rect(silX, silY, silW, silH);
  }

  // 說明文字
  fill(60);
  textSize(Math.max(14, Math.round(width * 0.02)));
  textAlign(CENTER);
  text('根據輪廓猜測這是哪種動物？', width / 2, height * 0.6);

  // 繪製選擇按鈕
  for (let btn of buttons) {
    btn.hovered = mouseX > btn.x && mouseX < btn.x + btn.w &&
                  mouseY > btn.y && mouseY < btn.y + btn.h;    
    // 使用新的按鈕函式，注意座標轉換
    drawStyledButton({x: btn.x + btn.w/2, y: btn.y + btn.h/2, w: btn.w, h: btn.h}, btn.text);
  }
}

// 繪製揭曉狀態
function drawRevealState() {
  // 加入淡入背景，讓結果更突出
  let revealProgress = min(1, (millis() - revealStartTime) / 400);
  fill(255, 255, 255, 150 * revealProgress);
  rect(0, 0, width, height);

  // 顯示原始圖片 - 居中
  if (animals[currentAnimalIndex].loaded) {
    let imgW = 400;
    let imgH = 300;
    let imgX = (width - imgW) / 2;
    let imgY = height * 0.12;
    image(animals[currentAnimalIndex].img, imgX, imgY, imgW, imgH);

    noFill();
    stroke(100);
    strokeWeight(2);
    rect(imgX, imgY, imgW, imgH);
  }

  // 顯示結果
  fill(isCorrectGuess ? [0, 150, 80] : [200, 80, 80]);
  textSize(28);
  textAlign(CENTER);
  textStyle(BOLD);
  text(isCorrectGuess ? '✓ 正確！' : '✗ 錯誤', width / 2, height * 0.6);

  fill(40);
  textSize(20);
  textStyle(NORMAL);
  text(`答案是：${animals[currentAnimalIndex].name}`, width / 2, height * 0.65);

  // "下一題" 按鈕，置中並使用新樣式
  drawStyledButton({ x: width / 2, y: height * 0.8, w: 180, h: 55 }, '下一題 →');
}

// 結算畫面
function drawFinishedState() {
  // 結算畫面
  fill(255);
  textSize(36);
  textAlign(CENTER);
  textStyle(BOLD);
  text('🎉 練習完成！', width / 2, height * 0.35);

  fill(40);
  textSize(24);
  textStyle(NORMAL);
  text(`練習成果: ${currentScore} / ${Math.max(1, totalAttempts)}`, width / 2, height * 0.45);
  text(`正確率: ${Math.round((currentScore / totalAttempts) * 100)}%`, width / 2, height * 0.50);

  // 重新開始按鈕
  let restartBtn = { x: width / 2, y: height * 0.6, w: 220, h: 60 };
  drawStyledButton(restartBtn, '🔄 再次練習');
}

// ========= Game3: 動物冷知識配對遊戲（namespaced 為 g3_） =========
let g3_cards = [];
let g3_flipped = [];
let g3_matched = [];
let g3_matchedTime = 0;
let g3_gameComplete = false;
let g3_initialized = false;
let g3_state = 'teaching'; // 'teaching' 或 'quiz'
let g3_contentHeight = 0;
let g3_teachingScrollY = 0;

const g3_animalData = [
  { name: "章魚", facts: "有3個心臟", color: "#FF6B9D" },
  { name: "貓咪", facts: "有32塊肌肉控制耳朵", color: "#FFA502" },
  { name: "蜜蜂", facts: "能跳舞溝通", color: "#FFD93D" },
  { name: "企鵝", facts: "游泳速度40km/h", color: "#6BCB77" },
  { name: "大象", facts: "記憶力超強", color: "#4D96FF" },
  { name: "烏鴉", facts: "智商等於7歲小孩", color: "#9D84B7" }
];

function loadGame3() {
  g3_state = 'teaching'; // 每次載入都從教學開始
  if (g3_initialized) return; // 如果已經初始化過，則不需重複執行
  g3_initialized = true;
}

function drawGame3() {
  if (!g3_initialized) {
    loadGame3();
  }

  background('#E8F3F9'); // 使用更柔和的背景色
  drawBackButton();

  if (g3_state === 'teaching') {
    drawG3TeachingState();
  } else if (g3_state === 'quiz') {
    g3_displayCards();
    g3_drawParticles();
    g3_displayTitle();

    if (g3_gameComplete) {
      g3_displayCompleteScreen();
    }
  }
}

// 新增：重置遊戲3測驗狀態的函式
function g3_resetQuiz() {
  g3_gameComplete = false;
  g3_matched = [];
  g3_flipped = [];
  g3_matchedTime = 0;
  g3_teachingScrollY = 0;
  g3_initCards(); // 重新洗牌並建立卡片
}

function g3_shuffle(arr) {
  let result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function g3_initCards() {
  let temp = [];
  g3_animalData.forEach((animal, idx) => {
    temp.push({ id: idx, type: "image", ...animal, particles: [] });
    temp.push({ id: idx, type: "text", ...animal, particles: [] });
  });
  
  g3_cards = g3_shuffle(temp);
  g3_cards.forEach((card, idx) => {
    card.index = idx;
  });
}

function g3_displayTitle() {
  fill(0);
  textSize(36);
  textAlign(CENTER);
  textStyle(BOLD);
  text("🐾 動物知識配對練習", width / 2, 50);
  textSize(20);
  text("已配對: " + (g3_matched.length / 2) + " / 6", width / 2, 90);
}

function g3_displayCards() {
  const cols = 4;
  const cardW = 140;
  const cardH = 140;
  const spacingX = 180;
  const spacingY = 180;
  const startX = (width - cols * spacingX) / 2;
  const startY = 140;
  
  for (let i = 0; i < g3_cards.length; i++) {
    let row = Math.floor(i / cols);
    let col = i % cols;
    let x = startX + col * spacingX;
    let y = startY + row * spacingY;
    
    g3_drawCard(x, y, cardW, cardH, i);
  }
}

function g3_drawCard(x, y, w, h, idx) {
  let card = g3_cards[idx];
  let isMatched = g3_matched.includes(idx);
  let isFlipped = g3_flipped.includes(idx);
  
  card.x = x;
  card.y = y;
  card.w = w;
  card.h = h;
  
  if (isMatched) {
    // 配對成功後的效果
    let timeSinceMatched = frameCount - g3_matchedTime;
    let alpha = map(timeSinceMatched, 0, 30, 255, 100, true);
    fill(red(card.color), green(card.color), blue(card.color), alpha);
    noStroke();
    rect(x, y, w, h, 10);
    
    fill(255);
    if (card.type === "image") {
      textSize(60);
      textAlign(CENTER, CENTER);
      g3_drawAnimal(x + w / 2, y + h / 2 - 25, card.name);
      textSize(16);
      textStyle(NORMAL);
      text(card.name, x + w / 2, y + h / 2 + 35);
    } else {
      textSize(15);
      textStyle(NORMAL);
      textAlign(CENTER, CENTER);
      text(card.facts, x + w / 2 - 60, y + h / 2 - 15, 120, 80);
    }
  } else if (isFlipped) {
    // 翻開時的效果
    fill(255);
    stroke(card.color);
    strokeWeight(4);
    rect(x, y, w, h, 10);
    
    fill(255);
    if (card.type === "image") {
      textSize(60);
      textAlign(CENTER, CENTER);
      g3_drawAnimal(x + w / 2, y + h / 2 - 25, card.name);
      textSize(16);
      textStyle(NORMAL);
      text(card.name, x + w / 2, y + h / 2 + 35);
    } else {
      textSize(15);
      textStyle(NORMAL);
      textAlign(CENTER, CENTER);
      text(card.facts, x + w / 2 - 60, y + h / 2 - 15, 120, 80);
    }
  } else {
    // 未翻開的卡片
    let isHovered = mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
    fill(isHovered ? UI_THEME.hover : UI_THEME.primary);
    noStroke();
    rect(x, y, w, h, 10);
    
    fill(UI_THEME.text);
    textSize(50);
    textAlign(CENTER, CENTER);
    text("?", x + w / 2, y + h / 2);
  }
}

function g3_drawAnimal(x, y, name) {
  fill(0);
  textAlign(CENTER, CENTER);
  
  switch(name) {
    case "章魚": text("🐙", x, y); break;
    case "貓咪": text("🐱", x, y); break;
    case "蜜蜂": text("🐝", x, y); break;
    case "企鵝": text("🐧", x, y); break;
    case "大象": text("🐘", x, y); break;
    case "烏鴉": text("🐦", x, y); break;
  }
}

function g3_checkMatch() {
  let card1 = g3_cards[g3_flipped[0]];
  let card2 = g3_cards[g3_flipped[1]];
  
  if (card1.id === card2.id && card1.type !== card2.type) {
    g3_matched.push(g3_flipped[0], g3_flipped[1]);
    g3_matchedTime = frameCount;
    
    // 生成粒子特效
    g3_createParticles(card1.x + card1.w / 2, card1.y + card1.h / 2, g3_flipped[0]);
    g3_createParticles(card2.x + card2.w / 2, card2.y + card2.h / 2, g3_flipped[1]);
    
    g3_flipped = [];
    
    if (g3_matched.length === g3_cards.length) {
      g3_gameComplete = true;
      g3_finishGame();
    }
  } else {
    setTimeout(() => { g3_flipped = []; }, 800);
  }
}

function g3_finishGame() {
  console.log("遊戲三完成！");
}

function g3_displayCompleteScreen() {
  // 半透明黑色背景
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);
  
  // 恭喜文字
  fill(255, 215, 0);
  textSize(80);
  textAlign(CENTER, CENTER);
  textStyle(NORMAL);
  text("🎉", width / 2, height / 2 - 100);
  
  fill(255);
  textSize(50);
  text("恭喜你完成了！", width / 2, height / 2);
  
  // 使用統一風格的按鈕
  let restartBtn = { x: width / 2, y: height / 2 + 100, w: 220, h: 60 };
  drawStyledButton(restartBtn, '🔄 再次練習');
}

function g3_createParticles(x, y, cardIdx) {
  let card = g3_cards[cardIdx];
  for (let i = 0; i < 20; i++) {
    let angle = (TWO_PI / 20) * i;
    let speed = random(3, 8);
    let particle = {
      x: x,
      y: y,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      life: 1,
      color: card.color,
      size: random(6, 14)
    };
    card.particles.push(particle);
  }
  
  // 添加星形粒子
  for (let i = 0; i < 8; i++) {
    let angle = (TWO_PI / 8) * i;
    let particle = {
      x: x,
      y: y,
      vx: cos(angle) * 6,
      vy: sin(angle) * 6,
      life: 1,
      color: "#FFD700",
      size: random(4, 8),
      isstar: true
    };
    card.particles.push(particle);
  }
}

function g3_drawParticles() {
  for (let card of g3_cards) {
    if (card.particles.length === 0) continue;
    
    for (let i = card.particles.length - 1; i >= 0; i--) {
      let p = card.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= 0.015;
      
      let alpha = Math.floor(p.life * 255);
      fill(p.color + alpha.toString(16).padStart(2, '0'));
      noStroke();
      
      if (p.isstar) {
        g3_drawStar(p.x, p.y, p.size / 2, p.size, 5);
      } else {
        circle(p.x, p.y, p.size);
      }
      
      if (p.life <= 0) {
        card.particles.splice(i, 1);
      }
    }
  }
}

function g3_drawStar(x, y, innerRadius, outerRadius, points) {
  beginShape();
  for (let i = 0; i < points * 2; i++) {
    let radius = i % 2 === 0 ? outerRadius : innerRadius;
    let angle = TWO_PI / (points * 2) * i - PI / 2;
    let sx = x + cos(angle) * radius;
    let sy = y + sin(angle) * radius;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

function mousePressedGame3() {
  if (g3_state === 'teaching') {
    // 檢查是否點擊影片區域
    let videoRect = { x: width/2 - 280, y: 200, w: 560, h: 315 };
    // 點擊偵測需要考慮滾動的位移
    let realMouseY = mouseY + g3_teachingScrollY;
    if (mouseX > videoRect.x && mouseX < videoRect.x + videoRect.w &&
        realMouseY > videoRect.y && realMouseY < videoRect.y + videoRect.h) {
      // 在新分頁中打開 YouTube 影片
      window.open('https://www.youtube.com/watch?v=EK52i2xm_xQ', '_blank'); // 您可以換成任何影片連結
      return; // 避免觸發其他按鈕
    }

    let btn = { x: width / 2, y: height - 80, w: 220, h: 60 };
    if (mouseX > btn.x - btn.w/2 && mouseX < btn.x + btn.w/2 && mouseY > btn.y - btn.h/2 && mouseY < btn.y + btn.h/2) {
      g3_state = 'quiz'; // 點擊 "開始測驗"
      g3_resetQuiz(); // 重置測驗狀態並開始遊戲
    } else if (handleBackToTopClick() && g3_teachingScrollY > 0) {
      g3_teachingScrollY = 0;
    }
  } else if (g3_state === 'quiz') {
    if (g3_gameComplete) {
      // 檢查是否點擊重新開始按鈕
      let btn = { x: width / 2, y: height / 2 + 100, w: 220, h: 60 };
      if (mouseX > btn.x - btn.w/2 && mouseX < btn.x + btn.w/2 && mouseY > btn.y - btn.h/2 && mouseY < btn.y + btn.h/2) {
        g3_resetQuiz(); // 重新開始測驗
        return;
      }
    }
    
    if (g3_flipped.length >= 2) return;
    
    for (let card of g3_cards) {
      if (mouseX > card.x && mouseX < card.x + card.w &&
          mouseY > card.y && mouseY < card.y + card.h) {
        
        let idx = card.index;
        if (!g3_flipped.includes(idx) && !g3_matched.includes(idx)) {
          g3_flipped.push(idx);
          
          if (g3_flipped.length === 2) {
            g3_checkMatch();
          }
        }
      }
    }
  }
}

function mouseWheelGame1(event) {
  g1_teachingScrollY += event.deltaY;
  // 簡易平滑滾動 (可選)
  // let targetScroll = g1_teachingScrollY + event.deltaY;
  // g1_teachingScrollY = lerp(g1_teachingScrollY, targetScroll, 0.1);

  let maxScroll = max(0, g1_contentHeight - height);
  g1_teachingScrollY = constrain(g1_teachingScrollY, 0, maxScroll);
}

function mouseWheelGame2(event) {
  g2_teachingScrollY += event.deltaY;
  let maxScroll = max(0, 1100 - height); // 根據內容手動估算高度
  g2_teachingScrollY = constrain(g2_teachingScrollY, 0, maxScroll);
}

function mouseWheelGame3(event) {
  g3_teachingScrollY += event.deltaY;
  let maxScroll = max(0, g3_contentHeight - height);
  g3_teachingScrollY = constrain(g3_teachingScrollY, 0, maxScroll);
}

function drawG3TeachingState() {
  push();
  // 標題和說明
  textAlign(CENTER);
  fill(0);
  textSize(36);
  textStyle(BOLD);
  text("🧠 動物冷知識搶先看 🧠", width / 2, 80);

  // --- 滾動內容開始 ---
  translate(0, -g3_teachingScrollY);
  let currentY = 140;
  
  fill(80);
  textSize(18);
  textStyle(NORMAL);
  textAlign(CENTER);
  text("在開始配對練習前，可以先看看影片，或直接向下滾動閱讀！", width / 2, currentY);
  currentY += 60;

  // --- 繪製影片預覽畫面 ---
  let videoRect = { x: width/2 - 280, y: currentY, w: 560, h: 315 };
  // 實際滑鼠位置需要加上滾動位移來判斷 hover
  let isHovered = mouseX > videoRect.x && mouseX < videoRect.x + videoRect.w &&
                  (mouseY + g3_teachingScrollY) > videoRect.y && (mouseY + g3_teachingScrollY) < videoRect.y + videoRect.h;
  
  let anim = getScrollAnimation(videoRect.y, g3_teachingScrollY);
  let animatedY = videoRect.y + anim.offsetY;

  // 影片背景
  fill(0, anim.alpha);
  let strokeColor = color(isHovered ? UI_THEME.accent : 100);
  strokeColor.setAlpha(anim.alpha);
  stroke(strokeColor);
  strokeWeight(isHovered ? 4 : 2);
  rect(videoRect.x, animatedY, videoRect.w, videoRect.h, 10);

  // 播放按鈕
  let playBtnSize = 80;
  let centerX = videoRect.x + videoRect.w / 2;
  let centerY = animatedY + videoRect.h / 2;
  
  fill(255, 255, 255, (isHovered ? 255 : 180) * (anim.alpha / 255));
  noStroke();
  circle(centerX, centerY, playBtnSize);
  
  let playIconColor = color(isHovered ? UI_THEME.accent : 0);
  playIconColor.setAlpha(anim.alpha);
  fill(playIconColor);
  triangle(centerX - playBtnSize * 0.15, centerY - playBtnSize * 0.25, centerX - playBtnSize * 0.15, centerY + playBtnSize * 0.25, centerX + playBtnSize * 0.25, centerY);
  currentY += videoRect.h + 60;

  // 擴充的冷知識內容
  const facts = [
    { icon: '🐙', title: '章魚有三個心臟和藍色血液', text: '牠們有兩個心臟負責將血液輸送到鰓部，另一個心臟則負責將富含氧氣的血液輸送到全身。牠們的血液因富含銅蛋白而呈現藍色。' },
    { icon: '🦦', title: '海獺會手牽手睡覺', text: '為了避免在睡覺時被水流沖散，海獺家庭會手牽著手在水面上漂浮。牠們有時還會用海草把自己纏繞起來當作「錨」。' },
    { icon: '🦋', title: '蝴蝶用腳品嚐味道', text: '蝴蝶的味覺感受器位於牠們的腳上。當牠們停在花朵上時，就能立刻「嚐」到花蜜是否美味。' },
    { icon: '🦒', title: '長頸鹿的舌頭是黑色的', text: '長頸鹿擁有長達45-50公分的長舌頭，而且是藍黑色或紫黑色的。科學家推測這可能是為了防止牠們在長時間伸出舌頭吃樹葉時被太陽曬傷。' },
    { icon: '🦐', title: '槍蝦的攻擊比太陽還熱', text: '槍蝦的巨螯在快速閉合時，會產生一個時速高達100公里的水流噴射，並形成一個「空蝕泡」。當氣泡破裂時，溫度瞬間可達攝氏4700度，甚至比太陽表面還熱！' },
    { icon: '🐨', title: '無尾熊的指紋與人類極為相似', text: '無尾熊的指紋紋路與人類的非常相似，即使在電子顯微鏡下也很難區分。這在犯罪現場可能會造成一些有趣的混淆。' },
  ];

  const contentWidth = width * 0.7;
  const startX = (width - contentWidth) / 2;

  for(let fact of facts) {
    let anim = getScrollAnimation(currentY, g3_teachingScrollY);
    let animatedY = currentY + anim.offsetY;

    // 繪製圖示
    push();
    tint(255, anim.alpha);
    textSize(40);
    textAlign(CENTER, TOP);
    text(fact.icon, startX, animatedY);
    pop();

    // 繪製標題和內文
    textAlign(LEFT, TOP);
    let textX = startX + 60;
    let textW = contentWidth - 60;

    fill(0, anim.alpha);
    textSize(20);
    textStyle(BOLD);
    text(fact.title, textX, animatedY, textW);

    fill(80, anim.alpha);
    textSize(16);
    textStyle(NORMAL);
    text(fact.text, textX, animatedY + 30, textW);

    currentY += 140; // 增加每個項目的間距
  }

  g3_contentHeight = currentY;
  pop();

  // --- 固定的 UI 元素 ---
  drawScrollbar(g3_teachingScrollY, g3_contentHeight);
  drawBackToTopButton(g3_teachingScrollY);
  if (g3_teachingScrollY < g3_contentHeight - height - 10) {
    drawScrollDownIndicator();
  }

  // 開始測驗按鈕
  drawStyledButton({ x: width / 2, y: height - 80, w: 220, h: 60 }, '🚀 開始練習');
}

function windowResizedGame3() {
  // 遊戲三目前是靜態佈局，但保留此函式以便未來擴充
}
