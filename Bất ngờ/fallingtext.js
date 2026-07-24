/* ============================================================
   fallingtext.js — Scene "Mưa lời yêu thương"
   ------------------------------------------------------------
   Chuyển thể từ dự án Gift_FallingTextv4 (Chữ rơi):
   - Đã BỎ phần nhạc nền riêng của Chữ rơi (site chính đã có
     nhạc nền + nút bật/tắt âm thanh dùng chung ở góc trên).
   - Đã BỎ màn hình mở đầu (modal "Mở Quà") vì trang chính đã có
     luồng chuyển scene riêng — vào scene này là "mở quà" rồi.
   - Chỉ chạy vòng lặp rơi/vẽ sao khi scene đang active (giống
     cách shape3d.js chỉ render khi ở scene 4), để đỡ tốn máy.
   Sửa lời nhắn / thêm-bớt ảnh: xem FALLINGTEXT_MESSAGES và
   FALLINGTEXT_IMAGES trong config.js.
   ============================================================ */
(function () {
  'use strict';

  var stage = document.getElementById('fallingtextStage');
  var canvas = document.getElementById('fallingtextStarCanvas');
  var ctx = canvas.getContext('2d');
  var particlesEl = document.getElementById('fallingtextParticles');
  var HEART_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s-7.5-4.6-10-9.2C.5 8.1 2.3 4.5 6 4.5c2 0 3.6 1.2 4.6 2.7C11.6 5.7 13.2 4.5 15.2 4.5c3.7 0 5.5 3.6 4 7.3C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>';

  var MESSAGES = (typeof FALLINGTEXT_MESSAGES !== 'undefined' && FALLINGTEXT_MESSAGES.length)
    ? FALLINGTEXT_MESSAGES
    : ['Yêu em'];
  var IMAGES = (typeof FALLINGTEXT_IMAGES !== 'undefined') ? FALLINGTEXT_IMAGES : [];

  var ACCENT_COLORS = [
    '#4DA6FF', '#7DD3FC', '#A5F3FC', '#93C5FD',
    '#60A5FA', '#38BDF8', '#BAE6FD', '#818CF8'
  ];
  var HEART_ICONS = ['❤️', '🩷', '💛', '💚', '💙', '💜', '✦'];

  function randomColor() { return ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)]; }

  // ---- Sao nền (canvas riêng của scene, chỉ vẽ khi active) ----
  var W = 0, H = 0, stars = [], rafId = null, active = false;

  function resizeCanvas() {
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = W; canvas.height = H;
  }

  function buildStars() {
    stars = [];
    var count = W < 520 ? 70 : 130;
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.2 + 0.5,
        speed: Math.random() * 0.18 + 0.04,
        angle: Math.random() * Math.PI * 2,
        drift: (Math.random() - 0.5) * 0.08
      });
    }
  }

  function drawStars() {
    if (!active) return;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(243,233,220,' + (0.6 + Math.random() * 0.3) + ')';
      ctx.shadowColor = '#f3e9dc';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
      s.x += Math.cos(s.angle) * s.speed + s.drift;
      s.y += Math.sin(s.angle) * s.speed;
      if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
    }
    rafId = requestAnimationFrame(drawStars);
  }

  // ---- Hạt bụi ánh sáng xanh trôi lên chậm (ambient, độc lập với sao) ----
  function buildParticles() {
    if (!particlesEl) return;
    particlesEl.innerHTML = '';
    var count = W < 520 ? 16 : 28;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('span');
      var size = Math.random() * 3 + 1.5;
      p.style.left = Math.random() * 100 + '%';
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.setProperty('--fp-x', (Math.random() * 60 - 30) + 'px');
      p.style.setProperty('--fp-o', (Math.random() * 0.4 + 0.35).toFixed(2));
      p.style.animationDuration = (Math.random() * 10 + 10) + 's';
      p.style.animationDelay = (Math.random() * 10) + 's';
      particlesEl.appendChild(p);
    }
  }

  // ---- Chữ & ảnh rơi ----
  function getFallingConfig() {
    var w = W || window.innerWidth;
    if (w <= 480) return { interval: 1300, maxActive: 8, wordWidth: 130, fontSize: 12, imgMin: 60, imgMax: 85, burst: 14 };
    if (w <= 900) return { interval: 1050, maxActive: 14, wordWidth: 155, fontSize: 13, imgMin: 75, imgMax: 105, burst: 22 };
    return { interval: 900, maxActive: 22, wordWidth: 180, fontSize: 14, imgMin: 90, imgMax: 130, burst: 36 };
  }

  function randomLeft(elementWidth) {
    var maxLeft = Math.max(W - elementWidth, 0);
    return Math.random() * maxLeft + 'px';
  }

  var activeFalling = 0, spawnTimer = null;

  function createFalling(config) {
    if (!active || activeFalling >= config.maxActive) return;
    activeFalling++;
    var useImage = IMAGES.length > 0 && Math.random() < 0.3;

    if (useImage) {
      var img = document.createElement('img');
      img.src = IMAGES[Math.floor(Math.random() * IMAGES.length)];
      img.className = 'falling-item falling-img';
      var imgWidth = Math.random() * (config.imgMax - config.imgMin) + config.imgMin;
      img.style.width = imgWidth + 'px';
      img.style.height = 'auto';
      img.style.left = randomLeft(imgWidth);
      var imgDuration = Math.random() * 10 + 8;
      img.style.animation = 'fallingtext-fall ' + imgDuration + 's linear forwards';
      var glow = randomColor();
      img.style.filter = 'drop-shadow(0 0 14px rgba(243,233,220,.5)) drop-shadow(0 0 26px ' + glow + ')';
      stage.appendChild(img);
      setTimeout(function () { img.remove(); activeFalling--; }, imgDuration * 1000 + 100);
    } else {
      var word = document.createElement('div');
      word.className = 'falling-item falling-word';
      word.textContent = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      word.style.width = config.wordWidth + 'px';
      word.style.fontSize = config.fontSize + 'px';
      word.style.left = randomLeft(config.wordWidth);
      var color = randomColor();
      word.style.borderColor = color;
      var wordDuration = Math.random() * 9 + 7;
      word.style.animation = 'fallingtext-fall ' + wordDuration + 's linear forwards';
      stage.appendChild(word);
      setTimeout(function () { word.remove(); activeFalling--; }, wordDuration * 1000 + 100);
    }
  }

  function handleTap(e) {
    if (!active) return;
    var config = getFallingConfig();
    var rect = stage.getBoundingClientRect();
    var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    var y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    // 1) Sparkle nổ tán xạ quanh điểm chạm (giữ hiệu ứng gốc)
    for (var i = 0; i < config.burst; i++) {
      var particle = document.createElement('div');
      particle.className = 'fallingtext-burst';
      particle.textContent = HEART_ICONS[Math.floor(Math.random() * HEART_ICONS.length)];
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      var angle = Math.random() * Math.PI * 2;
      var dist = Math.random() * 150 + 80;
      particle.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
      particle.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
      particle.style.fontSize = (Math.random() * 15 + 18) + 'px';
      stage.appendChild(particle);
      (function (p) { setTimeout(function () { p.remove(); }, 1800); })(particle);
    }

    // 2) Ripple lan toả từ điểm chạm
    var ripple = document.createElement('div');
    ripple.className = 'fallingtext-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    stage.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 1050);

    // 3) Vài trái tim bay thẳng lên, lắc nhẹ hai bên
    var heartCount = 3;
    for (var h = 0; h < heartCount; h++) {
      var heart = document.createElement('div');
      heart.className = 'fallingtext-fly-heart';
      heart.innerHTML = HEART_SVG;
      var hs = Math.random() * 10 + 16;
      heart.style.width = hs + 'px';
      heart.style.height = hs + 'px';
      heart.style.left = (x - hs / 2 + (Math.random() * 24 - 12)) + 'px';
      heart.style.top = (y - hs / 2) + 'px';
      heart.style.setProperty('--fh-x', (Math.random() * 60 - 30) + 'px');
      heart.style.setProperty('--fh-y', -(Math.random() * 60 + 110) + 'px');
      heart.style.animationDelay = (h * 0.08) + 's';
      stage.appendChild(heart);
      (function (el) { setTimeout(function () { el.remove(); }, 1550); })(heart);
    }

    // 4) Sparkle nhỏ lấp lánh quanh điểm chạm
    var sparkleCount = 6;
    for (var s = 0; s < sparkleCount; s++) {
      var sp = document.createElement('div');
      sp.className = 'fallingtext-sparkle';
      sp.textContent = '✦';
      sp.style.left = x + 'px';
      sp.style.top = y + 'px';
      sp.style.fontSize = (Math.random() * 8 + 9) + 'px';
      var spAngle = Math.random() * Math.PI * 2;
      var spDist = Math.random() * 46 + 18;
      sp.style.setProperty('--sp-x', Math.cos(spAngle) * spDist + 'px');
      sp.style.setProperty('--sp-y', Math.sin(spAngle) * spDist + 'px');
      stage.appendChild(sp);
      (function (el) { setTimeout(function () { el.remove(); }, 950); })(sp);
    }
  }

  function clearFalling() {
    var items = stage.querySelectorAll('.falling-item, .fallingtext-burst');
    items.forEach(function (el) { el.remove(); });
    activeFalling = 0;
  }

  stage.addEventListener('click', handleTap);
  window.addEventListener('resize', function () {
    if (!active) return;
    resizeCanvas(); buildStars(); buildParticles();
  });

  // ---- API kích hoạt/tắt theo scene (gọi từ script.js khi chuyển cảnh) ----
  var FallingText = {
    activate: function () {
      if (active) return;
      active = true;
      resizeCanvas();
      buildStars();
      buildParticles();
      drawStars();
      var config = getFallingConfig();
      spawnTimer = setInterval(function () { createFalling(config); }, config.interval);
    },
    deactivate: function () {
      active = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (spawnTimer) clearInterval(spawnTimer);
      rafId = null; spawnTimer = null;
      clearFalling();
      if (particlesEl) particlesEl.innerHTML = '';
      ctx.clearRect(0, 0, W, H);
    }
  };

  window.FallingText = FallingText;
})();
