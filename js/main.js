// 情话数组
const loveMessages = [
    "小团，生日快乐，愿今天所有温柔都偏向你",
    "你出现以后，很多普通日子都变成啦纪念日",
    "愿你新的一岁，有花可看，有梦可追，也有我陪你",
    "我想把所有慢慢变好的日子，都留给我们一起经历",
    "既见君子，云胡不喜",
    "小团，你的名字是我见过最短的情诗",
    "愿有岁月可回首，且以深情共白头",
    "你是我平凡生活里，最不平凡的惊喜",
    "愿我如星君如月，夜夜流光相皎洁",
    "今天你负责开心，其他的愿望交给阳来努力",
    "想和你一起，把春夏秋冬都过成喜欢的样子",
    "你不需要闪闪发光，因为我已经觉得你很亮啦",
    "愿你永远被认真珍惜，也永远被我偏爱",
    "这封生日信很短，但喜欢你这件事会很长",
    "小团，新的一岁也要相信，阳会一直站在你这边"
];

// DOM 元素
const messageElement = document.getElementById('message');
const refreshButton = document.getElementById('refresh-btn');
const musicButton = document.getElementById('music-btn');
const musicToggle = document.getElementById('music-toggle');
const musicPlayer = document.getElementById('music-player');
const musicProgressBar = document.getElementById('music-progress-bar');
const musicProgressSlider = document.getElementById('music-progress-slider');
const musicTimeCurrent = document.getElementById('music-time-current');
const musicTimeDuration = document.getElementById('music-time-duration');
const bgm = document.getElementById('bgm');
const particlesLayer = document.getElementById('page-particles');
const introMask = document.getElementById('intro-mask');
const particleCount = 32;
let typeTimer = null;
let hasTypedInitialMessage = false;
let isMusicProgressDragging = false;

// 显示随机情话的函数
function showRandomMessage() {
    const randomIndex = Math.floor(Math.random() * loveMessages.length);
    messageElement.classList.add('visible');
    typeWriter(messageElement, loveMessages[randomIndex], 214);
}

// 初始化背景粒子
function initFloatingParticles() {
    if (!particlesLayer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    particlesLayer.innerHTML = '';
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('span');
        const inner = document.createElement('span');
        const isHeart = Math.random() > 0.45;
        const size = Math.round(Math.random() * 12 + 8);
        particle.className = `particle ${isHeart ? 'heart' : 'petal'}`;
        inner.className = 'particle-inner';
        inner.textContent = isHeart ? '♥' : '';
        inner.setAttribute('aria-hidden', 'true');
        particle.style.setProperty('--x', `${Math.random() * 100}vw`);
        particle.style.setProperty('--size', `${size}px`);
        particle.style.setProperty('--opacity', (Math.random() * 0.4 + 0.4).toFixed(2));
        particle.style.setProperty('--duration', `${(Math.random() * 12 + 14).toFixed(1)}s`);
        particle.style.setProperty('--sway-duration', `${(Math.random() * 3 + 4).toFixed(1)}s`);
        particle.style.setProperty('--delay', `${(-Math.random() * 18).toFixed(1)}s`);
        particle.appendChild(inner);
        particlesLayer.appendChild(particle);
    }
}

function initIntroMask() {
    if (!introMask) {
        document.body.classList.remove('intro-pending');
        document.body.classList.add('intro-ready');
        return;
    }

    const reveal = () => {
        if (introMask.classList.contains('opening')) return;

        document.body.classList.remove('intro-pending');
        document.body.classList.add('intro-ready');

        if (typeof gsap !== 'undefined') {
            gsap.to(introMask, {
                clipPath: 'circle(0% at 50% 50%)',
                opacity: 0,
                duration: 1.15,
                ease: 'power2.in',
                onComplete: () => introMask.remove(),
            });
        } else {
            introMask.classList.add('opening');
            setTimeout(() => { introMask.remove(); }, 1200);
        }
    };

    introMask.addEventListener('click', reveal);
    introMask.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') reveal();
    });
}

// 音乐控制
let isMusicPlaying = false;
async function playMusic() {
    try {
        await bgm.play();
        isMusicPlaying = true;
        updateMusicButtonIcon();
        musicPlayer.classList.add('playing');
    } catch (error) {
        isMusicPlaying = false;
        updateMusicButtonIcon();
        musicPlayer.classList.remove('playing');
    }
}

function pauseMusic() {
    bgm.pause();
    isMusicPlaying = false;
    updateMusicButtonIcon();
    musicPlayer.classList.remove('playing');
}

function updateMusicButtonIcon() {
    const iconEl = musicButton.querySelector('.music-btn-icon');
    if (iconEl) {
        iconEl.textContent = isMusicPlaying ? '⏸' : '▶';
    } else {
        musicButton.textContent = isMusicPlaying ? '⏸' : '▶';
    }
}

function toggleMusic() {
    if (isMusicPlaying) {
        pauseMusic();
    } else {
        playMusic();
    }
}

// 事件监听
refreshButton.addEventListener('click', () => {
    refreshButton.classList.add('spinning');
    showRandomMessage();
    setTimeout(() => refreshButton.classList.remove('spinning'), 500);
});
musicButton.addEventListener('click', toggleMusic);
musicToggle.addEventListener('click', () => {
    musicPlayer.classList.toggle('expanded');
});

bgm.addEventListener('timeupdate', updateMusicProgress);
bgm.addEventListener('loadedmetadata', updateMusicProgress);

// 进度条拖动
if (musicProgressSlider) {
    musicProgressSlider.addEventListener('input', () => {
        isMusicProgressDragging = true;
        if (bgm.duration) {
            const val = parseFloat(musicProgressSlider.value);
            bgm.currentTime = (val / 100) * bgm.duration;
        }
    });
    musicProgressSlider.addEventListener('change', () => {
        isMusicProgressDragging = false;
    });
}

function updateMusicProgress() {
    const duration = Number.isFinite(bgm.duration) ? bgm.duration : 0;
    const current = Number.isFinite(bgm.currentTime) ? bgm.currentTime : 0;
    if (!isMusicProgressDragging && musicProgressSlider) {
        const percent = duration ? Math.min(100, (current / duration) * 100) : 0;
        musicProgressSlider.value = percent;
        musicProgressSlider.style.setProperty('--progress', `${percent}%`);
    }
    // 更新旧版进度条（兼容）
    if (musicProgressBar) {
        const percent = duration ? Math.min(100, (current / duration) * 100) : 0;
        musicProgressBar.style.width = `${percent}%`;
    }
    // 更新时间显示
    if (musicTimeCurrent) musicTimeCurrent.textContent = formatTime(current);
    if (musicTimeDuration) musicTimeDuration.textContent = formatTime(duration);
}

function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(safeSeconds / 60);
    const secs = String(safeSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

// 注册 Service Worker（PWA）
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/gf-birthday/sw.js');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initFloatingParticles();
    initIntroMask();
    initAlbumSwiper();
    initWishCharCount();
    // 不自动播放，等用户关闭弹窗后再播
});

// 添加打字机效果
function typeWriter(element, text, speed = 214) {
    clearTimeout(typeTimer);
    let i = 0;
    element.textContent = '';
    element.classList.add('typing');
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            typeTimer = setTimeout(type, speed);
        } else {
            element.classList.remove('typing');
        }
    }
    type();
}

function initMessageObserver() {
    const loveMessage = document.querySelector('.love-message');
    if (!loveMessage) return;

    if (!('IntersectionObserver' in window)) {
        showRandomMessage();
        hasTypedInitialMessage = true;
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const envelopeClosed = getComputedStyle(envelopeScreen).display === 'none';
            const modalClosed = birthdayModal.classList.contains('hidden');
            const quizDone = !quizResult.classList.contains('hidden');
            if (entry.isIntersecting && envelopeClosed && modalClosed && quizDone && !hasTypedInitialMessage) {
                hasTypedInitialMessage = true;
                showRandomMessage();
                observer.disconnect();
            }
        });
    }, { threshold: 0.45 });

    observer.observe(loveMessage);
}

// Toast 提示
function showToast(text) {
    const toast = document.getElementById('share-toast');
    toast.innerHTML = `<span>✓ ${text}</span><span class="share-toast-subtitle">发给小团了吗？😊</span>`;
    toast.classList.remove('hiding');
    clearTimeout(toast._timeout);

    if (typeof gsap !== 'undefined') {
        gsap.killTweensOf(toast);
        gsap.fromTo(toast, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
        toast._timeout = setTimeout(() => {
            gsap.to(toast, {
                opacity: 0, y: -10, duration: 0.2, ease: 'power2.in',
                onComplete: () => { toast.classList.remove('show'); },
            });
        }, 2500);
    } else {
        toast.classList.add('show');
        toast._timeout = setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.classList.remove('show', 'hiding'), 200);
        }, 2500);
    }
}

// 分享功能
const shareButton = document.getElementById('share-btn');
shareButton.addEventListener('click', async () => {
    try {
        if (navigator.share) {
            await navigator.share({
                title: '小团，生日快乐',
                text: '小团的生日信，一起来看吧',
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
            showToast('链接已复制');
        }
    } catch (error) {
        console.error('分享失败:', error);
    }
});

// 古诗词名句集
const loveQuotes = [
    { text: '死生契阔，与子成说。执子之手，与子偕老。', source: '《诗经·邶风·击鼓》' },
    { text: '山有木兮木有枝，心悦君兮君不知。', source: '《越人歌》' },
    { text: '愿得一心人，白头不相离。', source: '卓文君《白头吟》' },
    { text: '两情若是久长时，又岂在朝朝暮暮。', source: '秦观《鹊桥仙》' },
    { text: '曾经沧海难为水，除却巫山不是云。', source: '元稹《离思》' },
    { text: '身无彩凤双飞翼，心有灵犀一点通。', source: '李商隐《无题》' },
    { text: '此情可待成追忆，只是当时已惘然。', source: '李商隐《锦瑟》' },
    { text: '天长地久有时尽，此恨绵绵无绝期。', source: '白居易《长恨歌》' },
    { text: '在天愿作比翼鸟，在地愿为连理枝。', source: '白居易《长恨歌》' },
    { text: '衣带渐宽终不悔，为伊消得人憔悴。', source: '柳永《蝶恋花》' },
    { text: '问世间情为何物，直教生死相许。', source: '元好问《摸鱼儿》' },
    { text: '只愿君心似我心，定不负相思意。', source: '李之仪《卜算子》' },
    { text: '金风玉露一相逢，便胜却人间无数。', source: '秦观《鹊桥仙》' },
    { text: '玲珑骰子安红豆，入骨相思知不知。', source: '温庭筠《南歌子》' },
    { text: '一寸相思千万绪，人间没个安排处。', source: '李冠《蝶恋花》' },
    { text: '平生不会相思，才会相思，便害相思。', source: '徐再思《折桂令》' },
    { text: '天涯地角有穷时，只有相思无尽处。', source: '晏殊《玉楼春》' },
    { text: '似此星辰非昨夜，为谁风露立中宵。', source: '黄景仁《绮怀》' },
    { text: '换我心，为你心，始知相忆深。', source: '顾夐《诉衷情》' },
    { text: '相思相见知何日，此时此夜难为情。', source: '李白《三五七言》' },
    { text: '落红不是无情物，化作春泥更护花。', source: '龚自珍《己亥杂诗》' },
    { text: '相见时难别亦难，东风无力百花残。', source: '李商隐《无题》' },
    { text: '月上柳梢头，人约黄昏后。', source: '欧阳修《生查子》' },
    { text: '愿我如星君如月，夜夜流光相皎洁。', source: '范成大《车遥遥篇》' },
    { text: '结发为夫妻，恩爱两不疑。', source: '苏武《留别妻》' },
    { text: '山无陵，江水为竭。冬雷震震，夏雨雪。天地合，乃敢与君绝。', source: '《上邪》' },
    { text: '一日不见兮，思之如狂。', source: '司马相如《凤求凰》' },
    { text: '相思一夜梅花发，忽到窗前疑是君。', source: '卢仝《有所思》' },
    { text: '若是前生未有缘，待重结、来生愿。', source: '乐婉《卜算子》' },
    { text: '关关雎鸠，在河之洲。窈窕淑女，君子好逑。', source: '《诗经·关雎》' },
];

const messageBoardToggle = document.getElementById('message-board-toggle');

// ══════════════════════════════════════
// 天幕古诗展示
// ══════════════════════════════════════

const skyCurtain = document.getElementById('sky-curtain');
const skyStars = document.getElementById('sky-stars');
const skyPetals = document.getElementById('sky-petals');
const skyTitleStage = document.getElementById('sky-title-stage');
const skyLine1 = document.getElementById('sky-line-1');
const skyLine2 = document.getElementById('sky-line-2');
const skyPoemScroll = document.getElementById('sky-poem-scroll');
const skyPoemList = document.getElementById('sky-poem-list');
const skyExitBtn = document.getElementById('sky-exit-btn');

let skyOpen = false;
let skyAutoScrollTimer = null;
let skyUserInteracted = false;
let skyClosing = false;

// 初始化星空粒子
function initStars() {
    skyStars.innerHTML = '';
    for (let i = 0; i < 80; i++) {
        const star = document.createElement('span');
        star.className = 'sky-star';
        const size = Math.random() * 2.5 + 1;
        star.style.setProperty('--star-size', `${size}px`);
        star.style.setProperty('--star-glow', `${size * 3 + 2}px`);
        star.style.setProperty('--twinkle-duration', `${Math.random() * 3 + 2.5}s`);
        star.style.setProperty('--twinkle-delay', `${Math.random() * 4}s`);
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        skyStars.appendChild(star);
    }
    scheduleShootingStar();
}

function scheduleShootingStar() {
    if (!skyOpen) return;
    const delay = Math.random() * 6000 + 4000;
    setTimeout(() => {
        if (!skyOpen) return;
        spawnShootingStar();
        scheduleShootingStar();
    }, delay);
}

function spawnShootingStar() {
    const star = document.createElement('span');
    star.className = 'sky-star shooting';
    star.style.left = `${Math.random() * 60 + 20}%`;
    star.style.top = `${Math.random() * 30}%`;
    skyStars.appendChild(star);
    setTimeout(() => star.remove(), 1600);
}

// CSS 流星（Module 7）
let skyMeteorTimer = null;
function scheduleMeteor() {
    if (!skyOpen) return;
    const delay = Math.random() * 4000 + 4000;
    skyMeteorTimer = setTimeout(() => {
        if (!skyOpen) return;
        spawnMeteor();
        scheduleMeteor();
    }, delay);
}

function spawnMeteor() {
    const meteor = document.createElement('span');
    meteor.className = 'sky-meteor';
    meteor.style.left = `${Math.random() * 70 + 5}%`;
    meteor.style.top = `${Math.random() * 20}%`;
    skyCurtain.appendChild(meteor);
    setTimeout(() => meteor.remove(), 1300);
}

function stopMeteorTimer() {
    if (skyMeteorTimer) {
        clearTimeout(skyMeteorTimer);
        skyMeteorTimer = null;
    }
}

// 初始化花瓣
function initSkyPetals() {
    skyPetals.innerHTML = '';
    const colors = ['#ffb7c5', '#ffc8d6', '#fda4b5', '#fecdd5', '#ffd1dc'];
    for (let i = 0; i < 28; i++) {
        const petal = document.createElement('span');
        petal.className = 'sky-petal';
        const inner = document.createElement('span');
        inner.className = 'sky-petal-inner';
        const size = Math.random() * 10 + 8;
        petal.style.setProperty('--sp-x', `${Math.random() * 100}%`);
        petal.style.setProperty('--sp-size', `${size}px`);
        petal.style.setProperty('--sp-opacity', (Math.random() * 0.35 + 0.35).toFixed(2));
        petal.style.setProperty('--sp-color', colors[Math.floor(Math.random() * colors.length)]);
        petal.style.setProperty('--sp-duration', `${(Math.random() * 10 + 14).toFixed(1)}s`);
        petal.style.setProperty('--sp-sway-duration', `${(Math.random() * 3 + 4).toFixed(1)}s`);
        petal.style.setProperty('--sp-delay', `${(-Math.random() * 18).toFixed(1)}s`);
        petal.appendChild(inner);
        skyPetals.appendChild(petal);
    }
}

// 毛笔书写动画
function brushWrite(element, text, duration) {
    return new Promise(resolve => {
        element.textContent = text;
        element.classList.add('writing');
        const start = performance.now();
        function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            element.style.setProperty('--reveal', `${eased * 100}%`);
            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                element.style.setProperty('--reveal', '100%');
                resolve();
            }
        }
        requestAnimationFrame(tick);
    });
}

// 渲染诗句列表
function renderSkyPoems() {
    skyPoemList.innerHTML = loveQuotes.map(q => `
        <div class="sky-poem-item">
            <p class="sky-poem-text">${q.text}</p>
            <p class="sky-poem-source">—— ${q.source}</p>
        </div>
    `).join('');
}

// 自动滚动
function startSkyAutoScroll() {
    if (skyUserInteracted) return;
    if (skyPoemScroll.scrollHeight <= skyPoemScroll.clientHeight) return;
    stopSkyAutoScroll();
    skyAutoScrollTimer = setInterval(() => {
        if (!skyOpen || skyUserInteracted) {
            stopSkyAutoScroll();
            return;
        }
        skyPoemScroll.scrollTop += 1;
        if (skyPoemScroll.scrollHeight - skyPoemScroll.clientHeight - skyPoemScroll.scrollTop < 4) {
            skyExitBtn.classList.add('glow');
            stopSkyAutoScroll();
        }
    }, 35);
}

function stopSkyAutoScroll() {
    if (skyAutoScrollTimer) {
        clearInterval(skyAutoScrollTimer);
        skyAutoScrollTimer = null;
    }
}

// 打开天幕
async function openSkyCurtain() {
    if (skyOpen || skyClosing) return;
    skyOpen = true;
    skyClosing = false;
    skyUserInteracted = false;
    skyExitBtn.classList.remove('glow');
    setOverlayActive(true);

    skyCurtain.classList.remove('hidden');
    skyCurtain.classList.remove('closing');

    skyLine1.classList.remove('writing');
    skyLine2.classList.remove('writing');
    skyLine1.style.setProperty('--reveal', '0%');
    skyLine2.style.setProperty('--reveal', '0%');
    skyTitleStage.classList.remove('fade-out');
    skyPoemScroll.classList.remove('visible');
    skyPoemScroll.scrollTop = 0;

    initStars();
    initSkyPetals();
    renderSkyPoems();
    scheduleMeteor();

    // GSAP curtain reveal
    if (typeof gsap !== 'undefined') {
        gsap.fromTo(skyCurtain, { clipPath: 'circle(0% at 50% 50%)', opacity: 0 },
            { clipPath: 'circle(150% at 50% 50%)', opacity: 1, duration: 0.8, ease: 'power2.out' });
    } else {
        skyCurtain.classList.add('opening');
    }

    await new Promise(r => setTimeout(r, 900));
    await brushWrite(skyLine1, '花开有期', 1200);
    await new Promise(r => setTimeout(r, 200));
    await brushWrite(skyLine2, '思念无涯', 1200);
    await new Promise(r => setTimeout(r, 500));
    skyTitleStage.classList.add('fade-out');
    await new Promise(r => setTimeout(r, 400));
    skyPoemScroll.classList.add('visible');
    await new Promise(r => setTimeout(r, 800));
    startSkyAutoScroll();
}

// 关闭天幕
function closeSkyCurtain() {
    if (!skyOpen || skyClosing) return;
    skyClosing = true;
    stopSkyAutoScroll();
    stopMeteorTimer();
    skyExitBtn.classList.remove('glow');

    if (typeof gsap !== 'undefined') {
        gsap.to(skyCurtain, {
            clipPath: 'circle(0% at 50% 50%)',
            opacity: 0,
            duration: 0.6,
            ease: 'power2.in',
            onComplete: () => {
                skyCurtain.classList.add('hidden');
                skyCurtain.classList.remove('opening', 'closing');
                skyCurtain.style.clipPath = '';
                skyCurtain.style.opacity = '';
                skyStars.innerHTML = '';
                skyPetals.innerHTML = '';
                skyOpen = false;
                skyClosing = false;
                setOverlayActive(false);
            },
        });
    } else {
        skyCurtain.classList.add('closing');
        setTimeout(() => {
            skyCurtain.classList.add('hidden');
            skyCurtain.classList.remove('opening', 'closing');
            skyStars.innerHTML = '';
            skyPetals.innerHTML = '';
            skyOpen = false;
            skyClosing = false;
            setOverlayActive(false);
        }, 600);
    }
}

// 事件绑定
messageBoardToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    openSkyCurtain();
});

skyExitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSkyCurtain();
});

// 用户手动滚动打断自动播放
skyPoemScroll.addEventListener('wheel', () => {
    if (skyOpen && !skyUserInteracted) {
        skyUserInteracted = true;
        stopSkyAutoScroll();
        skyExitBtn.classList.add('glow');
    }
}, { passive: true });

skyPoemScroll.addEventListener('touchstart', () => {
    if (skyOpen && !skyUserInteracted) {
        skyUserInteracted = true;
        stopSkyAutoScroll();
    }
}, { passive: true });

// ESC 关闭
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && skyOpen && !skyClosing) {
        closeSkyCurtain();
    }
});

function setOverlayActive(isActive) {
    document.body.classList.toggle('overlay-active', isActive);
}

// 信封开屏逻辑
const envelopeScreen = document.getElementById('envelope-screen');
const cssEnvelope = document.querySelector('.css-envelope');
const envelopeFloat = document.querySelector('.envelope-float');
const birthdayModal = document.getElementById('birthday-modal');
const modalStartBtn = document.getElementById('modal-start-btn');

let envelopeStarted = false;

function openEnvelope() {
    if (envelopeStarted) return;
    envelopeStarted = true;

    envelopeScreen.classList.add('reading');

    // 信封三层动画用 CSS 原生（最可靠），GSAP 只管漂浮淡出增强
    cssEnvelope.classList.add('opening', 'flap-opening');

    setTimeout(() => {
        cssEnvelope.classList.add('extracting');
    }, 900);

    setTimeout(() => {
        // GSAP 增强漂浮 + 背景渐变
        if (typeof gsap !== 'undefined') {
            gsap.to(envelopeFloat, {
                scale: 1.4, opacity: 0, duration: 1, ease: 'power2.in',
            });
            gsap.to(envelopeScreen, {
                background: 'radial-gradient(ellipse at center, #ff9a9e 0%, #fad0c4 100%)',
                duration: 1.2, ease: 'power2.out',
            });
        } else {
            envelopeFloat.classList.add('departing');
            envelopeScreen.classList.add('transition-bg');
        }
    }, 2600);

    setTimeout(() => {
        if (typeof gsap !== 'undefined') {
            gsap.to(envelopeScreen, {
                opacity: 0, duration: 0.4, ease: 'power2.in',
                onComplete: () => {
                    envelopeScreen.style.display = 'none';
                    birthdayModal.classList.remove('hidden');
                },
            });
        } else {
            envelopeScreen.classList.add('fade-out');
            setTimeout(() => {
                envelopeScreen.style.display = 'none';
                birthdayModal.classList.remove('hidden');
            }, 400);
        }
    }, 3600);
}

// 整个信封区域可点击
envelopeFloat.addEventListener('click', openEnvelope);
envelopeScreen.addEventListener('click', (e) => {
    // 如果点击了浮动信封以外（信封包裹器）也触发
    if (!envelopeFloat.contains(e.target) && e.target !== envelopeFloat) {
        openEnvelope();
    }
});
cssEnvelope.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openEnvelope();
    }
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
        question: 'Q1：小团最喜欢的人是谁？',
        options: ['A. 一个叫阳的笨蛋', 'B. 上面那个名字', 'C. 当然是阳啦 💕'],
        correct: 2
    },
    {
        question: 'Q2：今天是什么特别的日子？',
        options: ['A. 普通的一天', 'B. 有点特别的一天', 'C. 小团的生日呀 🎂'],
        correct: 2
    },
    {
        question: 'Q3：新的一岁，阳希望小团怎样？',
        options: ['A. 开心更多一点', 'B. 烦恼少一点', 'C. 天天都开心 ✨'],
        correct: 2
    },
    {
        question: 'Q4：阳最喜欢小团什么？',
        options: ['A. 笑起来的样子', 'B. 每一个样子', 'C. 全部，包括没列出来的 🌸'],
        correct: 2
    },
    {
        question: 'Q5：这封信里藏着什么？',
        options: ['A. 生日祝福', 'B. 很多想念', 'C. 想对你说的所有话 💝'],
        correct: 2
    }
];

let currentQuestion = 0;
let quizScore = 0;
const quizHintTexts = ['再想想哦~', '差一点点，再看看~', '别急，慢慢想~', '嗯…换个思路试试~'];

function showQuestion(index) {
    if (index >= quizData.length) {
        showQuizResult();
        return;
    }
    // 更新进度
    const quizCount = document.querySelector('.quiz-count');
    if (quizCount) quizCount.textContent = `第 ${index + 1} / 5 题`;
    const quizDotsContainer = document.querySelector('.quiz-dots');
    const dots = quizDotsContainer ? quizDotsContainer.querySelectorAll('.quiz-dot') : document.querySelectorAll('.quiz-dot');
    dots.forEach((dot, i) => {
        dot.className = 'quiz-dot';
        if (i < index) dot.classList.add('done');
        if (i === index) dot.classList.add('active');
    });
    const q = quizData[index];
    quizQuestion.textContent = q.question;
    quizOptions.innerHTML = q.options.map(opt =>
        `<div class="quiz-option">${opt}</div>`
    ).join('');
    // 清除旧提示
    const oldHint = quizOptions.parentElement.querySelector('.quiz-hint-text');
    if (oldHint) oldHint.remove();
    quizOptions.querySelectorAll('.quiz-option').forEach((btn, optIdx) => {
        btn.addEventListener('click', () => handleAnswer(btn, optIdx, index));
    });
}

function handleAnswer(btn, chosenIdx, questionIdx) {
    quizScore++;
    // 禁用所有选项
    const allBtns = quizOptions.querySelectorAll('.quiz-option');
    allBtns.forEach(b => b.style.pointerEvents = 'none');
    // 所有选项都绿（全对）
    allBtns.forEach(b => b.classList.add('correct'));
    setTimeout(() => {
        currentQuestion++;
        showQuestion(currentQuestion);
    }, 600);
}

function showQuizResult() {
    quizQuestion.style.display = 'none';
    quizOptions.style.display = 'none';
    const oldHint = quizOptions.parentElement.querySelector('.quiz-hint-text');
    if (oldHint) oldHint.remove();
    quizResult.classList.remove('hidden');
    const dotsContainer = document.querySelector('.quiz-dots');
    const dots = dotsContainer ? dotsContainer.querySelectorAll('.quiz-dot') : document.querySelectorAll('.quiz-dot');
    dots.forEach(d => { d.className = 'quiz-dot done'; });
    const quizCount = document.querySelector('.quiz-count');
    if (quizCount) quizCount.textContent = '完成！';

    const resultTitle = document.getElementById('quiz-result-title');
    if (resultTitle) resultTitle.textContent = '我就知道你都懂 ❤';
    // 庆祝 confetti
    fireConfetti({ particleCount: 120, spread: 100, origin: { y: 0.4, x: 0.5 } });
    setTimeout(() => fireConfetti({ particleCount: 60, spread: 70, origin: { y: 0.3, x: 0.3 } }), 200);
    setTimeout(() => fireConfetti({ particleCount: 60, spread: 70, origin: { y: 0.3, x: 0.7 } }), 400);

    quizSection.scrollTo({ top: 0, behavior: 'smooth' });
}

function initQuizParticles() {
    const layer = document.getElementById('quiz-particles');
    if (!layer) return;
    layer.innerHTML = '';
    const symbols = ['❤️', '🌹', '💕', '🥀', '💗', '🌸', '💖', '🌷'];
    for (let i = 0; i < 36; i++) {
        const p = document.createElement('span');
        p.className = 'quiz-particle';
        p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        p.style.setProperty('--qp-size', `${Math.random() * 16 + 14}px`);
        p.style.setProperty('--qp-duration', `${(Math.random() * 10 + 12).toFixed(1)}s`);
        p.style.setProperty('--qp-delay', `${(-Math.random() * 16).toFixed(1)}s`);
        p.style.setProperty('--qp-rotate', `${(Math.random() - 0.5) * 720}deg`);
        p.style.setProperty('--qp-sway', `${(Math.random() - 0.5) * 120}px`);
        p.style.left = `${Math.random() * 100}%`;
        layer.appendChild(p);
    }
}

function startQuiz() {
    setOverlayActive(true);
    quizSection.classList.remove('hidden');
    quizSection.scrollTo({ top: 0 });
    quizQuestion.style.display = '';
    quizOptions.style.display = '';
    quizResult.classList.add('hidden');
    initQuizParticles();
    currentQuestion = 0;
    quizScore = 0;
    showQuestion(0);
}

modalStartBtn.addEventListener('click', () => {
    birthdayModal.classList.add('hidden');
    setTimeout(startQuiz, 300);
    playMusic();
});

// 长信内容
const letterText = `古人叙述年岁，总喜欢立个名目。仿佛一旦有了称谓，飘忽的光阴便在宣纸上落了款，有了重量。男子二十曰弱冠，女子二十，礼法里唤作"桃李年华"。可今夜坐在灯下想起你，我总觉得这些词都太轻，装不下你的二十岁。有些人的双十之年，注定要用更长、更深的笔触去写。

算起来，这趟笔触落向了极远的地方。

从东北边陲的那座小城出发，我们竟走了这么远。那时的校园局促，四季分明得有些凛冽，谁能料到，一段缘分能从冰雪消融处走出来。"溯洄从之，道阻且长"，路是难走的，我们却一直在走，而且越走，越舍不得停步。

如今，你在潇湘水边，我在燕山脚下。

两地之间的距离，在地图上不过是一根线条，在现实里却是一夜火车。窗外的风景在睡梦里换了天地：南方的山是被雨水洗透的翠绿，北方的天是一整块洗净的湛蓝。我常想，长久望着那片温润山色，你的眼眸大约也是温软的；而我每每抬头看见这澄澈的北国天空，心中唯一的念头，不过是想找个人说一句："你看。"

可此刻是期末周，我们连这句"你看"也说得克制。

你在岳麓山下埋头备考，我在书桌前看着灯影悬笔。各自的世界都沉甸甸的，能交换的话语寥寥无几。然而陶渊明写"此中有真意，欲辨已忘言"，那些无法宣之于口的想念，就藏在日子的缝隙里，不着一字，却无处不在。

相聚总是太短。假期的时光快得像一首律诗的起承转合，刚窥见春光，便已到了尾声。在月台上，许多话在舌尖打转，最后都化作长久的沉默。苏子叹"此事古难全"，不圆满才是人生的常态，可我如今倒觉得，只要与你有关，哪怕是这些带着缺憾的日常，也已是命运极大的慷慨。

异地二字，除了遗憾，其实也赠予了我们一些别的东西。你在湘江边邂逅的某次日落，我未能免俗地错过了；而我在北方清冷晨曦中望见的星斗，也未曾落入你的眼中。好在，这些各自错过的风景，最终都变成了故事。每次听你讲起那些我未曾参与的光景，我都感到一种隐秘的庆幸——庆幸你愿意将你的世界折叠寄我，庆幸我是那个唯一的拆信人。

二十岁。你走过了双十长路，我有幸见证了其中一程。

往后的年岁，我想不止于见证。我不甘心只做那个听你描述日落的人，我更盼着有朝一日，能与你并肩站在同一片暮色下，看晚霞如何染红同一江水。

在这个期末的深夜，没有惊艳的礼物，也没有华丽的辞藻。只是在落笔的这一刻，想让你知道：我记得，我一直都记得。

但愿人长久，千里共婵娟。今夜共此一轮明月，我也在心里偷偷许了愿——愿数年之后的今日，不必再隔千里，不必面对屏幕~

生日快乐！`;
const longLetter = document.getElementById('long-letter');
const letterBody = document.getElementById('letter-body');
const letterSign = document.getElementById('letter-sign');
const letterSignDate = document.querySelector('.letter-sign-date');
const LETTER_TYPE_SPEED = 56;
let letterTyped = false;

function typeLetter(text, element, speed = LETTER_TYPE_SPEED) {
    return new Promise(resolve => {
        element.classList.add('typing');
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
                element.classList.remove('typing');
                resolve();
            }
        }, speed);
    });
}

function initLetterSakura() {
    const layer = document.getElementById('letter-sakura-layer');
    if (!layer) return;
    layer.innerHTML = '';
    const petals = ['🌸', '💮', '🌺'];
    for (let i = 0; i < 28; i++) {
        const p = document.createElement('span');
        p.className = 'letter-sakura';
        p.textContent = petals[Math.floor(Math.random() * petals.length)];
        p.style.setProperty('--ls-size', `${Math.random() * 14 + 12}px`);
        p.style.setProperty('--ls-duration', `${(Math.random() * 8 + 10).toFixed(1)}s`);
        p.style.setProperty('--ls-delay', `${(-Math.random() * 14).toFixed(1)}s`);
        p.style.setProperty('--ls-rotate', `${(Math.random() - 0.5) * 360}deg`);
        p.style.setProperty('--ls-sway', `${(Math.random() - 0.5) * 100}px`);
        p.style.left = `${Math.random() * 100}%`;
        layer.appendChild(p);
    }
}

function showLongLetter() {
    if (!longLetter) return;
    setOverlayActive(true);
    letterBody.textContent = '';
    letterSign.classList.remove('visible');
    letterSign.classList.add('hidden');
    const letterDone = document.getElementById('letter-done');
    if (letterDone) {
        letterDone.classList.remove('visible');
        letterDone.classList.add('hidden');
    }

    initLetterSakura();

    // 显现长信遮罩，背景变暗，信纸浮入
    longLetter.classList.remove('hidden');
    longLetter.scrollTo({ top: 0 });
    requestAnimationFrame(() => {
        longLetter.classList.add('reveal');
    });
}

quizContinueBtn.addEventListener('click', async () => {
    if (letterTyped) return; // 长信只打一次

    // 先启动长信淡入，再关闭问答，无缝衔接
    showLongLetter();
    setTimeout(() => {
        quizSection.classList.add('hidden');
    }, 400);

    await new Promise(r => setTimeout(r, 1100));
    await typeLetter(letterText, letterBody, LETTER_TYPE_SPEED);

    // 打印完毕，显示签名和日期
    const today = new Date();
    letterSignDate.textContent = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    letterSign.classList.remove('hidden');
    letterSign.classList.add('visible');
    letterTyped = true;

    // 显示"看完了"按钮
    const letterDone = document.getElementById('letter-done');
    letterDone.classList.remove('hidden');
    requestAnimationFrame(() => {
        letterDone.classList.add('visible');
        setTimeout(() => {
            longLetter.scrollTo({ top: longLetter.scrollHeight, behavior: 'smooth' });
        }, 120);
    });
});

// "看完了" → 关闭长信，浮现情话和相册
document.getElementById('letter-continue-btn').addEventListener('click', () => {
    // 右侧按钮文案更改为「点我点我」
    const toggleLabel = document.querySelector('.toggle-label');
    if (toggleLabel) toggleLabel.textContent = '点我点我';
    longLetter.classList.remove('reveal');
    setTimeout(() => {
        longLetter.classList.add('hidden');
        setOverlayActive(false);
    }, 600);

    document.querySelector('.page-title').classList.add('entrance-anim');
    document.querySelector('.love-message').classList.add('delayed-reveal');
    document.querySelector('.album-section').classList.add('delayed-reveal');
    document.querySelector('.button-group').classList.add('delayed-reveal');
    document.querySelector('.cake-entry').classList.add('delayed-reveal');
    requestAnimationFrame(() => {
        document.querySelector('.love-message').classList.add('visible');
        document.querySelector('.album-section').classList.add('visible');
        document.querySelector('.button-group').classList.add('visible');
        document.querySelector('.cake-entry').classList.add('visible');
        // 刷新 Swiper 尺寸 & 初始化（若未初始化）
        if (albumSwiper) {
            albumSwiper.update();
        } else {
            initAlbumSwiper();
        }
    });

    setTimeout(() => {
        document.querySelector('.love-message').scrollIntoView({ behavior: 'smooth' });
        if (!hasTypedInitialMessage) {
            hasTypedInitialMessage = true;
            showRandomMessage();
        }
    }, 500);
});

// 所有 DOM 引用就绪后再启动情话监听
initMessageObserver();

// 照片灯箱
const photoLightbox = document.getElementById('photo-lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxDots = document.getElementById('lightbox-dots');
const photoCards = document.querySelectorAll('.photo-card');
let lightboxIndex = 0;

// Swiper 照片轮播初始化（Module 4）
let albumSwiper = null;
function initAlbumSwiper() {
    if (albumSwiper) return;
    const swiperEl = document.querySelector('.album-swiper');
    if (!swiperEl || typeof Swiper === 'undefined') return;

    albumSwiper = new Swiper(swiperEl, {
        slidesPerView: 1,
        centeredSlides: true,
        spaceBetween: 16,
        loop: false,
        grabCursor: true,
        keyboard: { enabled: true, onlyInViewport: true },
        pagination: {
            el: '.album-swiper .swiper-pagination',
            clickable: true,
        },
        on: {
            slideChange: function () {
                updateAlbumDots(this.activeIndex);
            },
            click: function () {
                openLightbox(this.activeIndex);
            },
        },
    });
    // 初始状态更新
    updateAlbumDots(0);
}

function updateAlbumDots(index) {
    // Swiper pagination 自动处理，保留函数签名兼容旧逻辑
}

function openLightbox(index) {
    lightboxIndex = index;
    // 同步 Swiper
    if (albumSwiper && albumSwiper.activeIndex !== index) {
        albumSwiper.slideTo(index, 300);
    }
    const card = photoCards[index];
    const img = card.querySelector('img');
    const svg = card.querySelector('.photo-placeholder');
    const caption = card.querySelector('.polaroid-caption');
    if (img && img.src) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
    } else if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        lightboxImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        lightboxImg.alt = svg.getAttribute('aria-label') || '';
    }
    lightboxCaption.textContent = caption.textContent;
    lightboxImg.classList.remove('switching');
    renderDots();
    photoLightbox.classList.remove('hidden');
    requestAnimationFrame(() => photoLightbox.classList.add('fade-in'));
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    photoLightbox.classList.remove('fade-in');
    photoLightbox.classList.add('hidden');
    document.body.style.overflow = '';
}

function navigateLightbox(dir) {
    const total = photoCards.length;
    lightboxIndex = (lightboxIndex + dir + total) % total;
    // 同步 Swiper
    if (albumSwiper && albumSwiper.activeIndex !== lightboxIndex) {
        albumSwiper.slideTo(lightboxIndex, 300);
    }
    const card = photoCards[lightboxIndex];
    const img = card.querySelector('img');
    const svg = card.querySelector('.photo-placeholder');
    lightboxImg.classList.add('switching');
    setTimeout(() => {
        if (img && img.src) {
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
        } else if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            lightboxImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
            lightboxImg.alt = svg.getAttribute('aria-label') || '';
        }
        lightboxCaption.textContent = card.querySelector('.polaroid-caption').textContent;
        lightboxImg.classList.remove('switching');
        renderDots();
    }, 300);
}

function renderDots() {
    lightboxDots.innerHTML = Array.from(photoCards).map((_, i) =>
        `<span class="lightbox-dot ${i === lightboxIndex ? 'active' : ''}"></span>`
    ).join('');
}

photoCards.forEach((card, i) => {
    card.addEventListener('click', () => openLightbox(i));
});

document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
document.querySelector('.lightbox-prev').addEventListener('click', () => navigateLightbox(-1));
document.querySelector('.lightbox-next').addEventListener('click', () => navigateLightbox(1));

photoLightbox.addEventListener('click', (e) => {
    if (e.target === photoLightbox) closeLightbox();
});

document.addEventListener('keydown', (e) => {
    if (photoLightbox.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
});

// 灯箱触摸滑动
let touchStartX = 0;
let touchStartY = 0;
photoLightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

photoLightbox.addEventListener('touchend', (e) => {
    const diffX = touchStartX - e.changedTouches[0].clientX;
    const diffY = touchStartY - e.changedTouches[0].clientY;
    const isHorizontalSwipe = Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5;
    if (isHorizontalSwipe) navigateLightbox(diffX > 0 ? 1 : -1);
});

photoLightbox.addEventListener('touchcancel', () => {
    touchStartX = 0;
    touchStartY = 0;
});

// ══════════════════════════════════════
// 二维卡通蛋糕场景
// ══════════════════════════════════════

const cakeIconBtn = document.getElementById('cake-icon-btn');
const cakeSceneContainer = document.getElementById('cake-scene-container');
const cakeCloseBtn = document.getElementById('cake-close-btn');
const blowCandleBtn = document.getElementById('blow-candle-btn');
const cartoonCake = document.getElementById('cartoon-cake');
const cakeHint = document.getElementById('cake-hint');
const wishOverlay = document.getElementById('wish-overlay');
const wishInput = document.getElementById('wish-input');
const wishDoneBtn = document.getElementById('wish-done-btn');

function openCartoonCakeScene() {
    if (!cakeSceneContainer || !cartoonCake || !blowCandleBtn) return;
    setOverlayActive(true);
    cakeSceneContainer.classList.remove('hidden');
    cartoonCake.classList.remove('blown');
    wishOverlay?.classList.add('hidden');
    blowCandleBtn.disabled = false;
    blowCandleBtn.textContent = '呼～帮我吹灭蜡烛';
    if (cakeHint) cakeHint.textContent = '轻轻点一下，许个愿再吹灭蜡烛吧';
    if (wishInput) wishInput.value = '';
    const countEl = document.querySelector('.wish-char-count');
    if (countEl) countEl.textContent = '0 / 50';
}

function closeCartoonCakeScene() {
    cakeSceneContainer?.classList.add('hidden');
    wishOverlay?.classList.add('hidden');
    setOverlayActive(false);
}

function spawnCakeHeartBurst() {
    if (!cakeSceneContainer) return;
    const symbols = ['♡', '❤', '✦', '✧'];
    for (let i = 0; i < 18; i++) {
        const burst = document.createElement('span');
        burst.className = 'cake-heart-burst';
        burst.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        burst.style.setProperty('--burst-x', `${(Math.random() - 0.5) * 260}px`);
        burst.style.setProperty('--burst-y', `${-80 - Math.random() * 160}px`);
        burst.style.setProperty('--burst-r', `${(Math.random() - 0.5) * 120}deg`);
        burst.style.setProperty('--burst-size', `${Math.random() * 10 + 14}px`);
        burst.style.animationDelay = `${Math.random() * 0.18}s`;
        cakeSceneContainer.appendChild(burst);
        setTimeout(() => burst.remove(), 1700);
    }
}

function blowCandles() {
    if (!cartoonCake || !blowCandleBtn) return;
    cartoonCake.classList.add('blown');
    blowCandleBtn.disabled = true;
    blowCandleBtn.textContent = '生日快乐呀';
    if (cakeHint) cakeHint.textContent = '蜡烛熄灭啦，许个愿吧';

    fireConfetti({ particleCount: 120, spread: 80, origin: { y: 0.55, x: 0.5 } });
    spawnCakeHeartBurst();
    setTimeout(() => {
        wishOverlay?.classList.remove('hidden');
        wishInput?.focus();
    }, 900);
}

function initCartoonCakeScene() {
    if (!cakeIconBtn || !cakeSceneContainer || !cakeCloseBtn || !blowCandleBtn || !cartoonCake) return;
    cakeIconBtn.addEventListener('click', openCartoonCakeScene);
    cakeCloseBtn.addEventListener('click', closeCartoonCakeScene);
    blowCandleBtn.addEventListener('click', blowCandles);
}

initCartoonCakeScene();

wishDoneBtn?.addEventListener('click', () => {
    if (wishDoneBtn.classList.contains('done')) return;
    spawnWishStars();
    wishDoneBtn.textContent = '✨ 愿望进入实现倒计时……';
    wishDoneBtn.classList.add('done');
    setTimeout(() => {
        wishOverlay?.classList.add('hidden');
        wishDoneBtn.textContent = '我写好了';
        wishDoneBtn.classList.remove('done');
        if (cakeHint) cakeHint.textContent = '愿望已经收好啦';
    }, 2200);
});

// 愿望字数统计（Module 8）
function initWishCharCount() {
    if (!wishInput) return;
    const countEl = document.querySelector('.wish-char-count');
    if (!countEl) return;
    wishInput.addEventListener('input', () => {
        const len = wishInput.value.length;
        const max = parseInt(wishInput.getAttribute('maxlength')) || 50;
        countEl.textContent = `${len} / ${max}`;
        if (len > max) {
            countEl.classList.add('over');
        } else {
            countEl.classList.remove('over');
        }
    });
}

// ─── confetti 封装：canvas-confetti 优先，CSS fallback ───
function fireConfetti(options = {}) {
    if (typeof confetti !== 'undefined') {
        const defaults = {
            particleCount: 80,
            spread: 80,
            origin: { y: 0.6, x: 0.5 },
            colors: ['#ff8fa3', '#ffd6e0', '#d63865', '#FFD700', '#FFA07A', '#FFB7C5', '#ffffff'],
            ...options,
        };
        confetti(defaults);
        // 第二波延迟散射
        setTimeout(() => {
            confetti({
                ...defaults,
                particleCount: Math.floor(defaults.particleCount * 0.6),
                spread: defaults.spread * 1.4,
                origin: { ...defaults.origin, y: defaults.origin.y - 0.05 },
                colors: defaults.colors,
            });
        }, 150);
    } else {
        // CSS fallback：保持原有的 emoji 星星
        spawnCSSStars(options && options.origin ? options.origin.x * window.innerWidth : window.innerWidth / 2,
                      options && options.origin ? options.origin.y * window.innerHeight : window.innerHeight / 2);
    }
}

function spawnCSSStars(centerX, centerY) {
    const stars = ['⭐', '✨', '🌟', '💫', '⚡'];
    for (let i = 0; i < 8; i++) {
        const star = document.createElement('span');
        star.className = 'wish-star';
        star.textContent = stars[Math.floor(Math.random() * stars.length)];
        star.style.left = `${centerX + (Math.random() - 0.5) * 200}px`;
        star.style.top = `${centerY + (Math.random() - 0.5) * 100}px`;
        star.style.animationDelay = `${i * 0.1}s`;
        star.style.fontSize = `${Math.random() * 16 + 20}px`;
        document.body.appendChild(star);
        setTimeout(() => star.remove(), 2000);
    }
}

// 愿望提交 confetti（Module 8）
function spawnWishStars() {
    fireConfetti({ particleCount: 60, spread: 60, origin: { y: 0.55, x: 0.5 } });
}

// ESC 关闭蛋糕场景
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cakeSceneContainer && !cakeSceneContainer.classList.contains('hidden')) {
        if (!wishOverlay.classList.contains('hidden')) {
            // 如果许愿信纸开着，先关信纸
            wishOverlay.classList.add('hidden');
            if (cakeHint) cakeHint.textContent = '按 ESC 可收起蛋糕';
            setTimeout(() => { if (cakeHint) cakeHint.textContent = '蜡烛熄灭啦，许个愿吧'; }, 1800);
        } else {
            closeCartoonCakeScene();
        }
    }
});

