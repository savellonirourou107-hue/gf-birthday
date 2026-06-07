// 情话数组
const loveMessages = [
    "小团，生日快乐，愿今天所有温柔都偏向你",
    "你出现以后，很多普通日子都变成了纪念日",
    "愿你新的一岁，有花可看，有梦可追，也有我陪你",
    "我想把所有慢慢变好的日子，都留给我们一起经历",
    "既见君子，云胡不喜",
    "小团，你的名字是我见过最短的情诗",
    "愿有岁月可回首，且以深情共白头",
    "你是我平凡生活里，最不平凡的惊喜",
    "愿我如星君如月，夜夜流光相皎洁",
    "今天你负责开心，其他的愿望交给阳来努力",
    "想和你一起，把春夏秋冬都过成喜欢的样子",
    "你不需要闪闪发光，因为我已经觉得你很亮了",
    "愿你永远被认真珍惜，也永远被我偏爱",
    "这封生日信很短，但喜欢你这件事会很长",
    "小团，新的一岁也要相信，阳会一直站在你这边"
];

// DOM 元素
const messageElement = document.getElementById('message');
const refreshButton = document.getElementById('refresh-btn');
const musicButton = document.getElementById('music-btn');
const bgm = document.getElementById('bgm');
const heartsBackground = document.querySelector('.hearts-bg');
const maxFloatingHearts = 18;

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
    if (heartsBackground.children.length >= maxFloatingHearts) return;

    const heart = document.createElement('span');
    heart.textContent = '❤';
    heart.setAttribute('aria-hidden', 'true');
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
    setTimeout(() => heart.remove(), 6500);
}

// 初始化飘落的爱心
function initFloatingHearts() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setInterval(createFloatingHeart, 900);
}

// 音乐控制
let isMusicPlaying = false;
async function playMusic() {
    try {
        await bgm.play();
        isMusicPlaying = true;
        musicButton.textContent = '🎶';
    } catch (error) {
        isMusicPlaying = false;
        musicButton.textContent = '🎵';
    }
}

function pauseMusic() {
    bgm.pause();
    isMusicPlaying = false;
    musicButton.textContent = '🎵';
}

function toggleMusic() {
    if (isMusicPlaying) {
        pauseMusic();
    } else {
        playMusic();
    }
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
let messages = [];
try {
    messages = JSON.parse(localStorage.getItem('love_messages') || '[]');
} catch (error) {
    messages = [];
    localStorage.removeItem('love_messages');
}

// 显示留言
function displayMessages() {
    messageList.innerHTML = messages.map(msg => `
        <div class="message-item">
            <div class="message-name">${escapeHtml(msg.name)}</div>
            <div class="message-content">${escapeHtml(msg.content)}</div>
        </div>
    `).join('');
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
const envelopeSvg = document.querySelector('.envelope-svg');
const envelopeFloat = document.querySelector('.envelope-float');
const birthdayModal = document.getElementById('birthday-modal');
const modalStartBtn = document.getElementById('modal-start-btn');

let envelopeStarted = false;

envelopeFloat.addEventListener('click', () => {
    if (envelopeStarted) return;
    envelopeStarted = true;

    envelopeScreen.classList.add('reading');
    envelopeSvg.classList.add('opening');

    setTimeout(() => {
        envelopeSvg.classList.add('extracting');
    }, 900);

    setTimeout(() => {
        envelopeFloat.classList.add('departing');
        envelopeScreen.classList.add('transition-bg');
    }, 2600);

    setTimeout(() => {
        envelopeScreen.classList.add('fade-out');
        setTimeout(() => {
            envelopeScreen.style.display = 'none';
            birthdayModal.classList.remove('hidden');
        }, 400);
    }, 3600);
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
        question: 'Q1：今天的小团应该收到什么？',
        options: ['A. 蛋糕和鲜花', 'B. 拥抱和偏爱', 'C. 以上全部都要 🎂']
    },
    {
        question: 'Q2：新的一岁，阳希望小团怎样？',
        options: ['A. 开心更多一点', 'B. 烦恼少一点', 'C. 被好好爱着 ✨']
    },
    {
        question: 'Q3：这封信里藏着什么？',
        options: ['A. 生日祝福', 'B. 很多想念', 'C. 阳所有认真的喜欢 💕']
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
    playMusic();
});

quizContinueBtn.addEventListener('click', () => {
    document.querySelector('.love-message').scrollIntoView({ behavior: 'smooth' });
});
