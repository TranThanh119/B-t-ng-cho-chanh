/* ============================================================
   animation/background.js
   Lớp chuyển động nền cinematic: bokeh trôi chậm có chiều sâu,
   hạt bụi ánh sáng, parallax theo chuột, glow nền đổi chậm.

   BẬT/TẮT: đổi BG_ANIM_CONFIG.enabled = false để tắt toàn bộ
   file này — trang sẽ tự rơi về animation CSS gốc (drift/twinkle)
   như trước khi có file này, không lỗi, không thiếu gì.

   Không dùng thư viện ngoài. Chỉ requestAnimationFrame + CSS transform.
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- CẤU HÌNH: bật/tắt từng phần ---------------- */
  var BG_ANIM_CONFIG = {
    enabled: true,          // công tắc tổng
    bokehDepth: true,       // bokeh trôi chậm + scale + đổi opacity (chiều sâu)
    particles: true,        // hạt bụi ánh sáng bay lên
    particleCount: 30,      // số lượng hạt bụi
    glow: true,             // glow nền đổi chậm
    parallax: true,         // parallax theo chuột
    parallaxStrength: 16    // độ lệch tối đa (px) — càng nhỏ càng ít chóng mặt
  };

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Tôn trọng cấu hình hệ điều hành người dùng: nếu họ yêu cầu giảm
  // chuyển động, không chạy JS — trang vẫn dùng animation CSS nhẹ có sẵn.
  if (!BG_ANIM_CONFIG.enabled || reduceMotion) return;

  var bokehEl = document.getElementById("bokeh");
  var starsEl = document.getElementById("stars");
  var particlesEl = document.getElementById("particles");
  var glowEl = document.getElementById("bgGlow");

  /* ---------------- Glow nền: chỉ cần bật animation CSS ---------------- */
  if (BG_ANIM_CONFIG.glow && glowEl) {
    glowEl.classList.add("is-active");
  }

  /* ---------------- Bokeh: tắt CSS drift, JS điều khiển chiều sâu ---------------- */
  var bokehData = [];
  if (BG_ANIM_CONFIG.bokehDepth && bokehEl) {
    bokehEl.classList.add("js-anim"); // vô hiệu hoá keyframe "drift" gốc trong CSS
    bokehData = Array.prototype.slice
      .call(bokehEl.children)
      .map(function (el) {
        return {
          el: el,
          phaseX: Math.random() * Math.PI * 2,
          phaseY: Math.random() * Math.PI * 2,
          phaseS: Math.random() * Math.PI * 2,
          speed: 0.035 + Math.random() * 0.035, // rất chậm
          rangeX: 18 + Math.random() * 24,
          rangeY: 14 + Math.random() * 18,
          scaleRange: 0.05 + Math.random() * 0.07,
          // Nhẹ hơn bản gốc: hoa/chanh là hình vẽ rõ nét nên không cần đậm
          // như quầng sáng mờ trước đây, giữ cảm giác "trôi" thanh thoát.
          opBase: 0.30 + Math.random() * 0.18,
          opRange: 0.10 + Math.random() * 0.10,
          rotBase: Math.random() * 24 - 12,
          rotRange: 5 + Math.random() * 9
        };
      });
  }

  /* ---------------- Hạt bụi ánh sáng ---------------- */
  if (BG_ANIM_CONFIG.particles && particlesEl) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < BG_ANIM_CONFIG.particleCount; i++) {
      var p = document.createElement("span");
      var size = (1 + Math.random() * 1.8).toFixed(2);
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.left = Math.random() * 100 + "%";
      p.style.top = Math.random() * 100 + "%";
      p.dataset.speed = (0.55 + Math.random() * 0.5).toFixed(3); // vòng/giây (rất chậm)
      p.dataset.sway = (5 + Math.random() * 9).toFixed(2);
      p.dataset.phase = (Math.random() * Math.PI * 2).toFixed(3);
      p.dataset.delay = (Math.random() * 10).toFixed(2);
      frag.appendChild(p);
    }
    particlesEl.appendChild(frag);
  }

  /* ---------------- Parallax theo chuột (có làm mượt/lerp) ---------------- */
  var targetX = 0,
    targetY = 0,
    curX = 0,
    curY = 0;

  if (BG_ANIM_CONFIG.parallax) {
    window.addEventListener(
      "mousemove",
      function (e) {
        targetX = e.clientX / window.innerWidth - 0.5;
        targetY = e.clientY / window.innerHeight - 0.5;
      },
      { passive: true }
    );
    // Hỗ trợ thiết bị cảm ứng: nghiêng máy tạo hiệu ứng tương tự (nhẹ nhàng)
    window.addEventListener(
      "touchmove",
      function (e) {
        if (!e.touches || !e.touches[0]) return;
        targetX = e.touches[0].clientX / window.innerWidth - 0.5;
        targetY = e.touches[0].clientY / window.innerHeight - 0.5;
      },
      { passive: true }
    );
  }

  /* ---------------- Vòng lặp chính (requestAnimationFrame) ---------------- */
  var startTime = performance.now();
  var strength = BG_ANIM_CONFIG.parallaxStrength;

  function tick(now) {
    var t = (now - startTime) / 1000; // giây trôi qua

    // làm mượt parallax để không giật, không gây chóng mặt
    curX += (targetX - curX) * 0.035;
    curY += (targetY - curY) * 0.035;

    if (BG_ANIM_CONFIG.parallax) {
      if (bokehEl) {
        bokehEl.style.transform =
          "translate3d(" + curX * strength * 1.3 + "px," + curY * strength * 1.3 + "px,0)";
      }
      if (starsEl) {
        starsEl.style.transform =
          "translate3d(" + curX * strength * 0.45 + "px," + curY * strength * 0.45 + "px,0)";
      }
      if (particlesEl) {
        particlesEl.style.transform =
          "translate3d(" + curX * strength * 0.7 + "px," + curY * strength * 0.7 + "px,0)";
      }
      if (glowEl) {
        glowEl.style.setProperty(
          "--glow-parallax",
          "translate3d(" + curX * strength * 0.25 + "px," + curY * strength * 0.25 + "px,0)"
        );
      }
    }

    // Bokeh: trôi nhẹ + scale nhẹ + đổi opacity nhẹ (chiều sâu)
    for (var i = 0; i < bokehData.length; i++) {
      var d = bokehData[i];
      var dx = Math.sin(t * d.speed + d.phaseX) * d.rangeX;
      var dy = Math.cos(t * d.speed * 0.8 + d.phaseY) * d.rangeY;
      var scale = 1 + Math.sin(t * d.speed * 0.6 + d.phaseS) * d.scaleRange;
      var op = d.opBase + Math.sin(t * d.speed * 0.7 + d.phaseX) * d.opRange;
      var rot = d.rotBase + Math.sin(t * d.speed * 0.5 + d.phaseS) * d.rotRange;
      d.el.style.transform =
        "translate3d(" + dx.toFixed(2) + "px," + dy.toFixed(2) + "px,0) scale(" + scale.toFixed(3) + ") rotate(" + rot.toFixed(1) + "deg)";
      d.el.style.opacity = Math.max(0.12, Math.min(0.9, op)).toFixed(3);
    }

    // Hạt bụi ánh sáng: trôi lên chậm, đung đưa nhẹ, mờ dần ở đầu/cuối chu kỳ
    if (particlesEl) {
      var children = particlesEl.children;
      for (var j = 0; j < children.length; j++) {
        var p2 = children[j];
        var speed = parseFloat(p2.dataset.speed);
        var sway = parseFloat(p2.dataset.sway);
        var phase = parseFloat(p2.dataset.phase);
        var delay = parseFloat(p2.dataset.delay);
        var tt = Math.max(0, t - delay);
        var cycle = 30; // giây cho một vòng trôi trọn vẹn
        var progress = (tt * speed) / cycle;
        progress = progress - Math.floor(progress); // 0..1 lặp lại
        var riseY = -(progress * 140); // px trôi lên
        var swayX = Math.sin(tt * 0.25 + phase) * sway;
        var fadeIn = Math.min(1, progress * 6);
        var fadeOut = Math.min(1, (1 - progress) * 6);
        var opacity = Math.min(fadeIn, fadeOut) * 0.55;
        p2.style.transform = "translate3d(" + swayX.toFixed(2) + "px," + riseY.toFixed(2) + "px,0)";
        p2.style.opacity = opacity.toFixed(3);
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
