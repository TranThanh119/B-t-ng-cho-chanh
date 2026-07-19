/* ============================================================
   animations/pageTransition.js
   ------------------------------------------------------------
   Engine chuyển cảnh cinematic cho các "scene" của trang.
   - Dùng GSAP nếu đã load được (xem thẻ <script> gsap trong
     index.html); nếu GSAP không khả dụng (CDN lỗi, offline...)
     thì tự động rơi về Web Animations API — không có fallback
     nào dùng CSS transition đơn giản.
   - Outgoing scene: fade + blur + scale nhỏ lại (lùi máy quay).
   - Incoming scene: slide nhẹ + fade in, chồng lấp với outgoing
     một khoảng ngắn để tạo cảm giác máy quay đang di chuyển
     liên tục giữa hai cảnh, thay vì cắt cảnh đột ngột.
   - direction = 1  -> "Tiếp theo" (tiến tới)
     direction = -1 -> "Quay lại" (đảo ngược hiệu ứng)
   - Tự chặn spam click: trong lúc animation đang chạy,
     transition() sẽ bỏ qua mọi lệnh gọi mới cho tới khi xong.
   ============================================================ */
(function (global) {
  'use strict';

  var DURATION_MS = 950;              // trong khoảng 0.8s - 1.2s
  var OVERLAP = 0.12;                 // % thời gian incoming bắt đầu sớm hơn (cảm giác lia máy)
  var GSAP_EASE = 'power3.inOut';     // easing tự nhiên cho GSAP
  var WAAPI_EASE = 'cubic-bezier(.22, .61, .14, 1)'; // easing tự nhiên cho WAAPI

  var isAnimating = false;

  function hasGSAP() {
    return typeof global.gsap !== 'undefined';
  }

  // ---- Nhánh GSAP ----
  function runGSAP(fromEl, toEl, direction, done) {
    var outY = direction === 1 ? -44 : 44;   // scene cũ trôi theo hướng ngược lại
    var inY = direction === 1 ? 48 : -48;    // scene mới trượt vào từ hướng tiến
    var dur = DURATION_MS / 1000;

    global.gsap.set(toEl, {
      autoAlpha: 0, y: inY, scale: 0.94, filter: 'blur(10px)', visibility: 'visible'
    });

    var tl = global.gsap.timeline({
      defaults: { duration: dur, ease: GSAP_EASE },
      onComplete: function () {
        global.gsap.set(fromEl, { clearProps: 'all' });
        global.gsap.set(toEl, { clearProps: 'transform,filter,visibility' });
        fromEl.classList.remove('active');
        done();
      }
    });

    tl.to(fromEl, { autoAlpha: 0, y: outY, scale: 0.9, filter: 'blur(10px)' }, 0);
    tl.to(toEl, { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)' }, dur * OVERLAP);
  }

  // ---- Nhánh Web Animations API (fallback khi không có GSAP) ----
  function runWAAPI(fromEl, toEl, direction, done) {
    var outY = direction === 1 ? -44 : 44;
    var inY = direction === 1 ? 48 : -48;
    var delay = DURATION_MS * OVERLAP;

    toEl.style.visibility = 'visible';

    var outAnim = fromEl.animate([
      { opacity: 1, transform: 'translateY(0px) scale(1)', filter: 'blur(0px)' },
      { opacity: 0, transform: 'translateY(' + outY + 'px) scale(0.9)', filter: 'blur(10px)' }
    ], { duration: DURATION_MS, easing: WAAPI_EASE, fill: 'forwards' });

    var inAnim = toEl.animate([
      { opacity: 0, transform: 'translateY(' + inY + 'px) scale(0.94)', filter: 'blur(10px)' },
      { opacity: 1, transform: 'translateY(0px) scale(1)', filter: 'blur(0px)' }
    ], { duration: DURATION_MS - delay, delay: delay, easing: WAAPI_EASE, fill: 'forwards' });

    var doneCount = 0;
    function onOneFinished() {
      doneCount++;
      if (doneCount < 2) return;
      outAnim.cancel();
      inAnim.cancel();
      fromEl.classList.remove('active');
      fromEl.style.visibility = '';
      toEl.style.visibility = '';
      done();
    }
    outAnim.onfinish = onOneFinished;
    inAnim.onfinish = onOneFinished;
  }

  /**
   * Chuyển từ scene fromEl sang scene toEl.
   * @param {HTMLElement} fromEl
   * @param {HTMLElement} toEl
   * @param {number} direction 1 = tiến (Tiếp theo), -1 = lùi (Quay lại)
   * @returns {Promise<boolean>} true nếu animation thật sự chạy, false nếu bị chặn spam-click
   */
  function transition(fromEl, toEl, direction) {
    return new Promise(function (resolve) {
      if (isAnimating || !fromEl || !toEl || fromEl === toEl) {
        resolve(false);
        return;
      }
      isAnimating = true;

      toEl.classList.add('active');
      fromEl.style.pointerEvents = 'none';
      toEl.style.pointerEvents = 'none';

      function finish() {
        fromEl.style.pointerEvents = '';
        toEl.style.pointerEvents = '';
        isAnimating = false;
        resolve(true);
      }

      if (hasGSAP()) {
        runGSAP(fromEl, toEl, direction, finish);
      } else {
        runWAAPI(fromEl, toEl, direction, finish);
      }
    });
  }

  global.PageTransition = {
    transition: transition,
    get isAnimating() { return isAnimating; }
  };
})(window);
