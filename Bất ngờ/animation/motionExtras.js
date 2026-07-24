/* ============================================================
   animation/motionExtras.js
   ------------------------------------------------------------
   Bổ sung các lớp chuyển động trang trí mới, tách biệt hoàn toàn
   khỏi animation/background.js và logic điều hướng scene:
     1) Đom đóm (fireflies) — chớp sáng + trôi ngẫu nhiên, thuần CSS.
     2) Bong bóng (bubbles) — trôi lên chậm, thuần CSS.
     3) Cursor glow / trail / sparkle — chỉ bật trên thiết bị có
        con trỏ chuột thật (pointer:fine), dùng requestAnimationFrame
        + transform/opacity, không dùng thư viện ngoài.

   BẬT/TẮT: đổi MOTION_EXTRAS_CONFIG.enabled = false để tắt toàn bộ
   file này mà không ảnh hưởng gì tới phần còn lại của trang.
   Tôn trọng "prefers-reduced-motion" và tự tắt cursor-fx trên
   thiết bị cảm ứng (điện thoại/tablet).
   ============================================================ */
(function () {
  "use strict";

  var MOTION_EXTRAS_CONFIG = {
    enabled: true,
    fireflyCount: 16,
    bubbleCount: 14,
    cursorGlow: true,
    cursorTrail: true,
    cursorSparkle: true
  };

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!MOTION_EXTRAS_CONFIG.enabled || reduceMotion) return;

  /* ---------------- Đom đóm ---------------- */
  var fireflyEl = document.getElementById("fireflies");
  if (fireflyEl && MOTION_EXTRAS_CONFIG.fireflyCount > 0) {
    var frag1 = document.createDocumentFragment();
    for (var i = 0; i < MOTION_EXTRAS_CONFIG.fireflyCount; i++) {
      var fly = document.createElement("span");
      var top = Math.random() * 92 + 2;
      var left = Math.random() * 96 + 2;
      var driftDur = 14 + Math.random() * 14;
      var blinkDur = 2.4 + Math.random() * 3;
      var delay = Math.random() * -20;
      fly.style.top = top + "%";
      fly.style.left = left + "%";
      fly.style.setProperty("--fx1", (Math.random() * 50 - 25).toFixed(1) + "px");
      fly.style.setProperty("--fy1", (Math.random() * -40 - 8).toFixed(1) + "px");
      fly.style.setProperty("--fx2", (Math.random() * 50 - 25).toFixed(1) + "px");
      fly.style.setProperty("--fy2", (Math.random() * -60 - 16).toFixed(1) + "px");
      fly.style.setProperty("--fx3", (Math.random() * 50 - 25).toFixed(1) + "px");
      fly.style.setProperty("--fy3", (Math.random() * -30 - 6).toFixed(1) + "px");
      fly.style.animationDuration = driftDur.toFixed(1) + "s, " + blinkDur.toFixed(1) + "s";
      fly.style.animationDelay = delay.toFixed(1) + "s, " + (delay * 0.6).toFixed(1) + "s";
      frag1.appendChild(fly);
    }
    fireflyEl.appendChild(frag1);
  }

  /* ---------------- Bong bóng ---------------- */
  var bubbleEl = document.getElementById("bubbles");
  if (bubbleEl && MOTION_EXTRAS_CONFIG.bubbleCount > 0) {
    var frag2 = document.createDocumentFragment();
    for (var j = 0; j < MOTION_EXTRAS_CONFIG.bubbleCount; j++) {
      var bub = document.createElement("span");
      var size = 8 + Math.random() * 22;
      var left2 = Math.random() * 100;
      var dur = 16 + Math.random() * 18;
      var delay2 = Math.random() * -30;
      bub.style.width = size + "px";
      bub.style.height = size + "px";
      bub.style.left = left2 + "%";
      bub.style.setProperty("--bx", (Math.random() * 60 - 30).toFixed(1) + "px");
      bub.style.animationDuration = dur.toFixed(1) + "s";
      bub.style.animationDelay = delay2.toFixed(1) + "s";
      frag2.appendChild(bub);
    }
    bubbleEl.appendChild(frag2);
  }

  /* ---------------- Cursor glow / trail / sparkle ---------------- */
  var pointerFine =
    window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!pointerFine) return; // không thêm gì trên thiết bị cảm ứng

  var mx = window.innerWidth / 2,
    my = window.innerHeight / 2; // vị trí chuột thực
  var gx = mx,
    gy = my; // vị trí glow đã làm mượt (lerp)
  var tx = mx,
    ty = my; // vị trí dot đã làm mượt (lerp nhanh hơn glow)
  var hasMoved = false;
  var trailPool = [];
  var TRAIL_MAX = 10;
  var lastTrailTime = 0;
  var lastSparkleTime = 0;
  var rafId = null;

  var glowEl, dotEl;

  function ensureCursorEls() {
    if (MOTION_EXTRAS_CONFIG.cursorGlow) {
      glowEl = document.createElement("div");
      glowEl.className = "cursor-glow";
      document.body.appendChild(glowEl);
      dotEl = document.createElement("div");
      dotEl.className = "cursor-dot";
      document.body.appendChild(dotEl);
    }
  }
  ensureCursorEls();

  function spawnTrailDot(x, y) {
    if (!MOTION_EXTRAS_CONFIG.cursorTrail) return;
    var dot = trailPool.pop();
    if (!dot) {
      dot = document.createElement("div");
      dot.className = "cursor-trail";
      document.body.appendChild(dot);
    }
    dot.style.opacity = "0.7";
    dot.style.transform = "translate3d(" + x + "px," + y + "px,0) scale(1)";
    requestAnimationFrame(function () {
      dot.style.transition = "opacity .6s ease, transform .6s ease";
      dot.style.opacity = "0";
      dot.style.transform = "translate3d(" + x + "px," + y + "px,0) scale(.3)";
    });
    window.setTimeout(function () {
      dot.style.transition = "";
      if (trailPool.length < TRAIL_MAX) trailPool.push(dot);
    }, 650);
  }

  function spawnSparkle(x, y) {
    if (!MOTION_EXTRAS_CONFIG.cursorSparkle) return;
    var s = document.createElement("div");
    s.className = "cursor-sparkle";
    s.textContent = "✦";
    var ang = Math.random() * Math.PI * 2;
    var dist = 12 + Math.random() * 14;
    s.style.setProperty("--sx", (Math.cos(ang) * dist).toFixed(1) + "px");
    s.style.setProperty("--sy", (Math.sin(ang) * dist - 10).toFixed(1) + "px");
    s.style.left = x + "px";
    s.style.top = y + "px";
    document.body.appendChild(s);
    window.setTimeout(function () {
      if (s.parentNode) s.parentNode.removeChild(s);
    }, 750);
  }

  window.addEventListener(
    "pointermove",
    function (e) {
      mx = e.clientX;
      my = e.clientY;
      if (!hasMoved) {
        hasMoved = true;
        gx = mx; gy = my; tx = mx; ty = my;
        if (glowEl) glowEl.classList.add("is-visible");
        if (dotEl) dotEl.classList.add("is-visible");
      }
      var now = performance.now();
      if (now - lastTrailTime > 55) {
        lastTrailTime = now;
        spawnTrailDot(mx, my);
      }
      // sparkle ngẫu nhiên, thưa, không gây rối mắt
      if (now - lastSparkleTime > 900 && Math.random() < 0.12) {
        lastSparkleTime = now;
        spawnSparkle(mx, my);
      }
    },
    { passive: true }
  );

  window.addEventListener(
    "pointerleave",
    function () {
      if (glowEl) glowEl.classList.remove("is-visible");
      if (dotEl) dotEl.classList.remove("is-visible");
    },
    { passive: true }
  );

  window.addEventListener(
    "pointerdown",
    function (e) {
      spawnSparkle(e.clientX, e.clientY);
      spawnSparkle(e.clientX, e.clientY);
    },
    { passive: true }
  );

  function loop() {
    gx += (mx - gx) * 0.08;
    gy += (my - gy) * 0.08;
    tx += (mx - tx) * 0.32;
    ty += (my - ty) * 0.32;
    if (glowEl) glowEl.style.transform = "translate3d(" + gx + "px," + gy + "px,0)";
    if (dotEl) dotEl.style.transform = "translate3d(" + tx + "px," + ty + "px,0)";
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
})();
