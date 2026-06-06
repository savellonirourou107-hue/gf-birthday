// 情话数组
const loveMessages = [
    "小团，你的微笑是我每天的动力源",
    "遇见你是我最美丽的意外，小团",
    "你是我漫漫人生旅途中最美的风景",
    "我的眼里只有你，就像星星只有天空",
    "小团，你是我最想写的诗，读的书，看的风景",
    "喜欢你是我做过最好的决定",
    "愿我们执手相看，两不相厌",
    "小团，你的名字是我见过最短的情诗",
    "你的出现让我的世界充满色彩",
    "想和你一起慢慢变老，看遍世间美好",
    "你是我最美的相遇，最甜的心动",
    "愿有岁月可回首，且以深情共白头",
    "小团，你是我平凡生活里的所有惊喜",
    "我爱你，如同飞鸟爱上了蓝天",
    "愿我如星君如月，夜夜流光相皎洁",
    "遇见你是我生命中最大的幸运",
    "你是我最想要的未来和最美的现在",
    "愿我们的爱情，如同星辰般永恒",
    "小团，你是我心中最柔软的部分",
    "想和你一起，走过春夏秋冬",
    "你是我最想珍惜的人，最想守护的人",
    "愿我们的爱情，永远保持最初的悸动",
    "你的存在，让我的生命有了意义",
    "想和你一起，看遍世间美好",
    "小团，你是我最美的梦，最甜的心动"
];

// DOM 元素
const messageElement = document.getElementById('message');
const refreshButton = document.getElementById('refresh-btn');
const musicButton = document.getElementById('music-btn');
const bgm = document.getElementById('bgm');
const heartsBackground = document.querySelector('.hearts-bg');

// 显示随机情话的函数
function showRandomMessage() {
    const randomIndex = Math.floor(Math.random() * loveMessages.length);
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0)';
        typeWriter(messageElement, loveMessages[randomIndex], 150);
    }, 500);
}

// 创建飘落的爱心
function createFloatingHeart() {
    const heart = document.createElement('div');
    heart.innerHTML = '❤';
    heart.style.cssText = `
        position: fixed;
        font-size: ${Math.random() * 20 + 10}px;
        color: rgba(255, 75, 110, ${Math.random() * 0.5 + 0.3});
        left: ${Math.random() * 100}vw;
        top: -20px;
        animation: float ${Math.random() * 3 + 2}s linear forwards;
        z-index: 0;
    `;
    
    heartsBackground.appendChild(heart);
    heart.addEventListener('animationend', () => {
        heart.remove();
    });
}

// 初始化飘落的爱心
function initFloatingHearts() {
    setInterval(createFloatingHeart, 300);
}

// 音乐控制
let isMusicPlaying = false;
function toggleMusic() {
    if (isMusicPlaying) {
        bgm.pause();
        musicButton.textContent = '🎵';
    } else {
        bgm.play();
        musicButton.textContent = '🎶';
    }
    isMusicPlaying = !isMusicPlaying;
}

// 事件监听
refreshButton.addEventListener('click', showRandomMessage);
musicButton.addEventListener('click', toggleMusic);

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    showRandomMessage();
    initFloatingHearts();
    // 不自动播放，等用户关闭弹窗后再播
});

// 添加打字机效果
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.textContent = '';
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// 分享功能
const shareButton = document.getElementById('share-btn');
shareButton.addEventListener('click', async () => {
    try {
        if (navigator.share) {
            await navigator.share({
                title: '💝 小团，生日快乐！',
                text: '一封给小团的生日告白，快来看看吧！',
                url: window.location.href
            });
        } else {
            // 如果浏览器不支持原生分享，则复制链接
            const dummy = document.createElement('textarea');
            document.body.appendChild(dummy);
            dummy.value = window.location.href;
            dummy.select();
            document.execCommand('copy');
            document.body.removeChild(dummy);
            alert('链接已复制到剪贴板！');
        }
    } catch (error) {
        console.error('分享失败:', error);
    }
});

// 留言板功能
const messageList = document.getElementById('message-list');
const nameInput = document.getElementById('name-input');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');

// 存储留言的数组
let messages = JSON.parse(localStorage.getItem('love_messages') || '[]');

// 显示留言
function displayMessages() {
    messageList.innerHTML = messages.map(msg => `
        <div class="message-item">
            <div class="message-name">${msg.name}</div>
            <div class="message-content">${msg.content}</div>
        </div>
    `).join('');
}

// 添加新留言
function addMessage() {
    const name = nameInput.value.trim();
    const content = messageInput.value.trim();
    
    if (!name || !content) {
        alert('请填写名字和留言内容！');
        return;
    }
    
    const newMessage = {
        name: name,
        content: content,
        time: new Date().toISOString()
    };
    
    messages.unshift(newMessage);
    if (messages.length > 50) messages.pop(); // 最多保存50条留言
    
    // 保存到本地存储
    localStorage.setItem('love_messages', JSON.stringify(messages));
    
    // 更新显示
    displayMessages();
    
    // 清空输入
    nameInput.value = '';
    messageInput.value = '';
}

// 事件监听
sendButton.addEventListener('click', addMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addMessage();
    }
});

// 初始化显示留言
displayMessages();

// 留言板控制
const messageBoardToggle = document.getElementById('message-board-toggle');
const messageBoard = document.querySelector('.message-board');
let isMessageBoardOpen = false;

// 切换留言板显示状态
function toggleMessageBoard() {
    isMessageBoardOpen = !isMessageBoardOpen;
    messageBoard.classList.toggle('active');
    messageBoardToggle.style.right = isMessageBoardOpen ? '400px' : '20px';
    
    // 移动端适配
    if (window.innerWidth <= 768) {
        messageBoardToggle.style.right = isMessageBoardOpen ? '10px' : '10px';
        messageBoardToggle.querySelector('.toggle-icon').style.transform = 
            isMessageBoardOpen ? 'rotate(180deg)' : 'rotate(0)';
    }
}

// 点击空白处关闭留言板
document.addEventListener('click', (e) => {
    if (isMessageBoardOpen && 
        !messageBoard.contains(e.target) && 
        !messageBoardToggle.contains(e.target)) {
        toggleMessageBoard();
    }
});

// 事件监听
messageBoardToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMessageBoard();
});

// 阻止留言板内部点击事件冒泡
messageBoard.addEventListener('click', (e) => {
    e.stopPropagation();
});

// 窗口大小改变时调整留言板状态
window.addEventListener('resize', () => {
    if (isMessageBoardOpen) {
        messageBoardToggle.style.right = window.innerWidth <= 768 ? '10px' : '400px';
    }
});

// 信封开屏逻辑
const envelopeScreen = document.getElementById('envelope-screen');
const envelope = document.querySelector('.envelope');
const envelopeWrapper = document.querySelector('.envelope-wrapper');
const birthdayModal = document.getElementById('birthday-modal');
const modalStartBtn = document.getElementById('modal-start-btn');

envelopeWrapper.addEventListener('click', () => {
    // 先打开信封
    envelope.classList.add('open');
    // 延迟后收起信封，显示弹窗
    setTimeout(() => {
        envelopeScreen.classList.add('fade-out');
        setTimeout(() => {
            envelopeScreen.style.display = 'none';
            birthdayModal.classList.remove('hidden');
        }, 800);
    }, 800);
});

// 问答系统
const quizSection = document.getElementById('quiz-section');
const quizQuestion = document.getElementById('quiz-question');
const quizOptions = document.getElementById('quiz-options');
const quizResult = document.getElementById('quiz-result');
const quizContinueBtn = document.getElementById('quiz-continue-btn');
const quizDots = document.querySelectorAll('.quiz-dot');

const quizData = [
    {
        question: 'Q1：小团觉得阳怎么样？',
        options: ['A. 很帅', 'B. 超级帅', 'C. 每天都更帅 😎']
    },
    {
        question: 'Q2：阳最喜欢小团的什么？',
        options: ['A. 笑起来的样子', 'B. 每一个样子', 'C. 包括但不限于以上所有 ✨']
    },
    {
        question: 'Q3：阳现在最想做什么？',
        options: ['A. 抱抱小团', 'B. 亲亲小团', 'C. 当然是全部都要 💕']
    }
];

let currentQuestion = 0;

function showQuestion(index) {
    if (index >= quizData.length) {
        showQuizResult();
        return;
    }
    quizDots.forEach((dot, i) => {
        dot.className = 'quiz-dot';
        if (i < index) dot.classList.add('done');
        if (i === index) dot.classList.add('active');
    });
    const q = quizData[index];
    quizQuestion.textContent = q.question;
    quizOptions.innerHTML = q.options.map(opt =>
        `<div class="quiz-option">${opt}</div>`
    ).join('');
    quizOptions.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.add('correct-flash');
            setTimeout(() => {
                currentQuestion++;
                showQuestion(currentQuestion);
            }, 600);
        });
    });
}

function showQuizResult() {
    quizQuestion.style.display = 'none';
    quizOptions.style.display = 'none';
    quizResult.classList.remove('hidden');
    quizDots.forEach(d => { d.className = 'quiz-dot done'; });
}

function startQuiz() {
    quizSection.classList.remove('hidden');
    currentQuestion = 0;
    showQuestion(0);
    quizSection.scrollIntoView({ behavior: 'smooth' });
}

modalStartBtn.addEventListener('click', () => {
    birthdayModal.classList.add('hidden');
    setTimeout(startQuiz, 300);
    bgm.play().catch(() => {});
    isMusicPlaying = true;
    musicButton.textContent = '🎶';
});

quizContinueBtn.addEventListener('click', () => {
    document.querySelector('.love-message').scrollIntoView({ behavior: 'smooth' });
});

// 微信浏览器音乐自动播放兼容
function autoPlayMusic() {
    bgm.play().then(() => {
        isMusicPlaying = true;
        musicButton.textContent = '🎶';
    }).catch(() => {});
}

if (typeof WeixinJSBridge !== 'undefined') {
    WeixinJSBridge.invoke('getNetworkType', {}, () => {
        autoPlayMusic();
    });
} else {
    document.addEventListener('WeixinJSBridgeReady', () => {
        WeixinJSBridge.invoke('getNetworkType', {}, () => {
            autoPlayMusic();
        });
    }, false);
} 