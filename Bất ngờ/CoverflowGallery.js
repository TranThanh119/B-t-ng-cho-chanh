/* ============================================================
   components/CoverflowGallery.js
   ------------------------------------------------------------
   Gallery ảnh kiểu Apple Coverflow, thuần vanilla JS — không
   dùng thư viện carousel nặng nào.
   - Ảnh ở vị trí "position" hiện tại (số thực, cho phép nội suy
     mượt) được xếp theo offset 3D: ảnh giữa to/rõ/nổi lên trên,
     ảnh hai bên nhỏ hơn + xoay nhẹ + blur rất nhẹ + tối hơn.
   - Kéo bằng chuột/chạm (Pointer Events, hoạt động tốt trên
     mobile); khi thả tay, vị trí đích được tính theo vận tốc kéo
     rồi "đáp" xuống bằng easing mỗi frame (requestAnimationFrame)
     — tạo cảm giác inertia nhẹ nhàng, không giật cục.
   - Hiệu ứng hover (nổi lên/shadow/glow) nằm hoàn toàn ở CSS
     (.cf-photo:hover trong styles/gallery.css), độc lập với
     transform coverflow do file này điều khiển.
   ============================================================ */
(function (global) {
  'use strict';

  var ANGLE = 42;            // góc xoay 3D tối đa của ảnh hai bên (deg)
  var SPACING = 0.56;        // khoảng cách ngang giữa các ảnh (tỉ lệ theo chiều rộng track)
  var EXTRA_SPACING = 0.30;  // khoảng cách thêm cho ảnh ở xa hơn vị trí liền kề, tránh chồng lên nhau
  var DEPTH = 90;            // đẩy lùi theo trục Z (px) mỗi bước offset — ảnh giữa "nổi" lên trước
  var SCALE_STEP = 0.16;     // ảnh càng xa trung tâm càng nhỏ dần
  var MIN_SCALE = 0.62;
  var BLUR_STEP = 0.7;       // px blur mỗi bước offset — cố tình rất nhẹ
  var MAX_BLUR = 2.6;
  var BRIGHTNESS_STEP = 0.16;// ảnh hai bên tối dần
  var MIN_BRIGHTNESS = 0.5;
  var VISIBLE_RANGE = 3.2;   // vượt khoảng này thì ẩn hẳn khỏi tầm nhìn
  var SETTLE_EASE = 0.16;    // hệ số easing mỗi frame khi "đáp" — tạo cảm giác inertia nhẹ
  var CLICK_DRAG_THRESHOLD = 6; // px — phân biệt cú tap với cú kéo

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function placeholderSVG() {
    return '<svg class="placeholder-icon" width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" stroke="#7DD3FC" stroke-width="1.3"/>' +
      '<circle cx="12" cy="13" r="3.4" stroke="#7DD3FC" stroke-width="1.3"/></svg>';
  }

  /**
   * Khởi tạo gallery coverflow.
   * @param {Object} opts
   * @param {HTMLElement} opts.container - phần tử rỗng sẽ chứa track (vd #carousel)
   * @param {HTMLElement} [opts.dotsEl]   - nơi hiển thị dots (vd #dots)
   * @param {HTMLElement} [opts.prevBtn]  - nút lùi (vd #prevBtn)
   * @param {HTMLElement} [opts.nextBtn]  - nút tiến (vd #nextBtn)
   * @param {Array<{url?:string, caption?:string}>} opts.photos
   * @param {(index:number)=>void} [opts.onChange]
   */
  function CoverflowGallery(opts) {
    var track = opts.container;
    var dotsEl = opts.dotsEl || null;
    var prevBtn = opts.prevBtn || null;
    var nextBtn = opts.nextBtn || null;
    var photos = opts.photos || [];
    var onChange = opts.onChange || function () {};

    var n = photos.length;
    var position = 0;   // vị trí liên tục hiện tại (float)
    var target = 0;      // vị trí đích đang "đáp" tới
    var activeIndex = 0;
    var rafId = null;
    var dragging = false;
    var dragMoved = false;
    var dragStartX = 0, dragStartPos = 0;
    var lastX = 0, lastT = 0, velocity = 0;
    var slideEls = [];
    var dotEls = [];

    track.classList.add('cf-track');
    track.innerHTML = '';

    photos.forEach(function (p, i) {
      var slide = document.createElement('div');
      slide.className = 'cf-slide';
      slide.dataset.index = String(i);

      var photo = document.createElement('div');
      photo.className = 'cf-photo';
      if (p.url) {
        photo.style.backgroundImage = "url('" + p.url + "')";
      } else {
        photo.innerHTML = placeholderSVG();
      }
      var caption = document.createElement('div');
      caption.className = 'cf-caption';
      caption.textContent = p.caption || '';
      photo.appendChild(caption);
      slide.appendChild(photo);
      track.appendChild(slide);
      slideEls.push(slide);

      // Bấm vào ảnh hai bên để đưa nó ra giữa (chỉ khi không phải vừa kéo)
      slide.addEventListener('click', function () {
        if (dragMoved) return;
        goTo(i);
      });
    });

    if (dotsEl) {
      dotsEl.innerHTML = '';
      photos.forEach(function (p, i) {
        var dot = document.createElement('div');
        dot.className = 'dot' + (i === 0 ? ' on' : '');
        dot.addEventListener('click', function () { goTo(i); });
        dotsEl.appendChild(dot);
        dotEls.push(dot);
      });
    }

    function render() {
      slideEls.forEach(function (slide, i) {
        var r = i - position;
        if (n > 0) {
          // Vòng lặp: quy về khoảng cách ngắn nhất trên "vòng tròn" ảnh,
          // để kéo mãi sang một bên vẫn tự động lặp lại từ đầu.
          r -= Math.round(r / n) * n;
        }
        var absR = Math.abs(r);
        var dir = r === 0 ? 0 : (r > 0 ? 1 : -1);

        if (absR > VISIBLE_RANGE) {
          slide.style.opacity = '0';
          slide.style.pointerEvents = 'none';
          return;
        }

        var rotate = dir * -ANGLE * Math.min(absR, 1);
        var spacingPct = r * SPACING * 100 + dir * Math.max(absR - 1, 0) * EXTRA_SPACING * 100;
        var scale = Math.max(1 - Math.min(absR, 3) * SCALE_STEP, MIN_SCALE);
        var z = -Math.min(absR, 3) * DEPTH;
        var blur = Math.min(Math.min(absR, 3) * BLUR_STEP, MAX_BLUR);
        var brightness = Math.max(1 - Math.min(absR, 3) * BRIGHTNESS_STEP, MIN_BRIGHTNESS);
        var opacity = absR > VISIBLE_RANGE - 0.6 ? clamp((VISIBLE_RANGE - absR) / 0.6, 0, 1) : 1;

        slide.style.transform =
          'translate(-50%,-50%) translateX(' + spacingPct + '%) translateZ(' + z + 'px) rotateY(' + rotate + 'deg) scale(' + scale + ')';
        slide.style.filter = 'blur(' + blur + 'px) brightness(' + brightness + ')';
        slide.style.opacity = String(opacity);
        slide.style.zIndex = String(200 - Math.round(absR * 10));
        slide.style.pointerEvents = absR > VISIBLE_RANGE ? 'none' : 'auto';
        slide.classList.toggle('cf-center', absR < 0.02);
      });
    }

    function loop() {
      position += (target - position) * SETTLE_EASE;
      if (Math.abs(target - position) < 0.001) {
        position = target;
        render();
        rafId = null;
        updateActive();
        return;
      }
      render();
      rafId = requestAnimationFrame(loop);
    }

    function animateTo(t) {
      target = t;
      if (!rafId) rafId = requestAnimationFrame(loop);
    }

    function updateActive() {
      var idx = Math.round(target);
      var real = n > 0 ? ((idx % n) + n) % n : idx; // chỉ số thật (0..n-1) sau khi quy vòng
      if (real === activeIndex) return;
      activeIndex = real;
      if (dotEls.length) {
        dotEls.forEach(function (d, i) { d.classList.toggle('on', i === real); });
      }
      onChange(real);
    }

    // Đi tới ảnh có chỉ số i theo đường ngắn nhất trên vòng lặp (không giật ngược
    // lại từ đầu danh sách khi đang ở gần cuối, và ngược lại).
    function goTo(i) {
      if (n <= 0) return;
      var cur = target;
      var delta = ((i - cur) % n + n) % n;
      if (delta > n / 2) delta -= n;
      animateTo(cur + delta);
    }
    function next() { goTo(Math.round(target) + 1); }
    function prev() { goTo(Math.round(target) - 1); }

    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);

    // ---- Kéo bằng chuột/chạm, có inertia nhẹ khi thả tay ----
    track.addEventListener('pointerdown', function (e) {
      dragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
      dragStartPos = position;
      lastX = e.clientX;
      lastT = performance.now();
      velocity = 0;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (track.setPointerCapture) {
        try { track.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      }
    });

    track.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - dragStartX;
      if (Math.abs(dx) > CLICK_DRAG_THRESHOLD) dragMoved = true;

      var width = track.clientWidth || 1;
      var deltaIndex = -dx / (width * SPACING);
      position = dragStartPos + deltaIndex; // không giới hạn -> kéo hoài sẽ tự lặp vòng
      target = position;

      var now = performance.now();
      var dt = now - lastT;
      if (dt > 0) velocity = (e.clientX - lastX) / dt; // px/ms
      lastX = e.clientX;
      lastT = now;
      render();
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      var width = track.clientWidth || 1;
      // Chiếu vị trí thêm một đoạn theo vận tốc buông tay -> cảm giác quán tính,
      // rồi bám tới ảnh gần nhất bằng animateTo (easing mỗi frame ở loop()).
      var projected = position - (velocity * 90) / (width * SPACING);
      target = Math.round(projected);
      if (!rafId) rafId = requestAnimationFrame(loop);
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('pointerleave', function () { if (dragging) endDrag(); });

    window.addEventListener('resize', render);

    render();

    return {
      goTo: goTo,
      next: next,
      prev: prev,
      get activeIndex() { return activeIndex; }
    };
  }

  global.CoverflowGallery = CoverflowGallery;
})(window);
