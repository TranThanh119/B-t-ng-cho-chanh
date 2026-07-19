/* ============================================================
   gestures/gestureDetector.js
   ------------------------------------------------------------
   CHỈ chịu trách nhiệm:
   - Khởi tạo MediaPipe Hands
   - Đọc luồng webcam (qua thẻ <video> được truyền vào)
   - Nhận diện gesture thô mỗi frame: 'swipe-left', 'swipe-right'
     (chỉ tính khi bàn tay đang xòe), 'fist' (nắm tay), 'ok', hoặc 'none'
   File này KHÔNG biết gì về giao diện / kịch bản website.
   Dùng thuần JavaScript + thư viện MediaPipe Hands (tải qua CDN).
   ============================================================ */
(function (global) {
  'use strict';

  var HANDS_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
  var CAMERA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';

  // Ngưỡng & mốc thời gian cho việc nhận diện swipe (tính bằng tọa độ
  // chuẩn hoá 0..1 của MediaPipe và mốc thời gian performance.now()).
  var SWIPE_WINDOW_MS = 400;   // cửa sổ thời gian theo dõi chuyển động cổ tay
  var SWIPE_MIN_DT_MS = 80;    // tránh nhiễu do rung tay quá nhanh
  var SWIPE_MIN_DX = 0.32;     // quãng đường ngang tối thiểu (theo tỉ lệ khung hình)
  var SWIPE_LATCH_MS = 700;    // giữ nhãn swipe đủ lâu để handControl.js có thể debounce
  var SWIPE_INTERNAL_COOLDOWN_MS = 900; // tránh phát hiện swipe mới ngay lập tức

  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Không tải được thư viện: ' + src)); };
      document.head.appendChild(s);
    });
  }

  /**
   * @param {Object} opts
   * @param {HTMLVideoElement} opts.videoEl - thẻ video đang phát webcam
   * @param {(label:string)=>void} opts.onGesture - callback nhận nhãn gesture mỗi frame
   * @param {(err:Error)=>void} [opts.onError]
   */
  function GestureDetector(opts) {
    this.videoEl = opts.videoEl;
    this.onGesture = opts.onGesture || function () {};
    this.onError = opts.onError || function () {};

    this.hands = null;
    this.camera = null;
    this._running = false;

    // trạng thái theo dõi swipe
    this._wristHistory = [];
    this._swipeLabel = null;
    this._swipeLatchUntil = 0;
    this._swipeCooldownUntil = 0;
  }

  GestureDetector.prototype.init = function () {
    var self = this;
    return loadScriptOnce(HANDS_SCRIPT_SRC)
      .then(function () { return loadScriptOnce(CAMERA_SCRIPT_SRC); })
      .then(function () {
        if (!global.Hands) throw new Error('MediaPipe Hands chưa sẵn sàng sau khi tải script.');
        if (!global.Camera) throw new Error('MediaPipe Camera Utils chưa sẵn sàng sau khi tải script.');

        self.hands = new global.Hands({
          locateFile: function (file) {
            return 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + file;
          }
        });
        self.hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6
        });
        self.hands.onResults(function (results) { self._onResults(results); });
      });
  };

  /**
   * Bắt đầu đọc webcam & nhận diện. videoEl phải đã có srcObject sẵn
   * (việc xin quyền & mở camera do handControl.js đảm nhiệm).
   */
  GestureDetector.prototype.start = function () {
    var self = this;
    var ready = this.hands ? Promise.resolve() : this.init();
    return ready.then(function () {
      self._running = true;
      self.camera = new global.Camera(self.videoEl, {
        onFrame: function () {
          if (!self._running) return Promise.resolve();
          return self.hands.send({ image: self.videoEl });
        },
        width: 320,
        height: 240
      });
      self.camera.start();
    }).catch(function (err) {
      self.onError(err);
      throw err;
    });
  };

  GestureDetector.prototype.stop = function () {
    this._running = false;
    if (this.camera) {
      try { this.camera.stop(); } catch (e) { /* noop */ }
      this.camera = null;
    }
    this._wristHistory = [];
    this._swipeLabel = null;
  };

  GestureDetector.prototype._onResults = function (results) {
    if (!this._running) return;
    var hasHand = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
    if (!hasHand) {
      this.onGesture('none');
      return;
    }
    var landmarks = results.multiHandLandmarks[0];
    this.onGesture(this._classify(landmarks));
  };

  GestureDetector.prototype._classify = function (lm) {
    var now = performance.now();
    var isPalmOpen = this._isPalmOpen(lm);
    var swipeLabel = this._trackSwipe(lm, now, isPalmOpen);
    if (swipeLabel) return swipeLabel;

    if (this._isFist(lm)) return 'fist';
    if (this._isOK(lm)) return 'ok';
    return 'none';
  };

  // Theo dõi chuyển động ngang của cổ tay (landmark #0) để phát hiện swipe.
  // CHỈ tích luỹ lịch sử khi bàn tay đang XOÈ (isPalmOpen) — vuốt bằng tay nắm
  // lại hoặc đang làm dấu OK sẽ không bị tính nhầm là swipe.
  GestureDetector.prototype._trackSwipe = function (lm, now, isPalmOpen) {
    var wrist = lm[0];

    if (!isPalmOpen) {
      this._wristHistory = [];
    } else {
      this._wristHistory.push({ x: wrist.x, t: now });
      var minT = now - SWIPE_WINDOW_MS;
      this._wristHistory = this._wristHistory.filter(function (p) { return p.t >= minT; });

      if (this._wristHistory.length >= 2 && now > this._swipeCooldownUntil) {
        var first = this._wristHistory[0];
        var dx = wrist.x - first.x;
        var dt = now - first.t;
        if (dt > SWIPE_MIN_DT_MS && Math.abs(dx) > SWIPE_MIN_DX) {
          // Preview webcam được hiển thị mirror (scaleX(-1)) cho tự nhiên như soi
          // gương, nên hướng vẫy tay người dùng NHÌN THẤY ngược với dx thô của
          // MediaPipe (toạ độ gốc, chưa mirror). Đảo dấu để khớp cảm nhận thị giác.
          this._swipeLabel = dx > 0 ? 'swipe-left' : 'swipe-right';
          this._swipeLatchUntil = now + SWIPE_LATCH_MS;
          this._swipeCooldownUntil = now + SWIPE_INTERNAL_COOLDOWN_MS;
          this._wristHistory = [];
        }
      }
    }

    if (this._swipeLabel) {
      if (now < this._swipeLatchUntil) return this._swipeLabel;
      this._swipeLabel = null;
    }
    return null;
  };

  // Bàn tay xòe: 4 ngón (trỏ, giữa, áp út, út) đều duỗi thẳng.
  GestureDetector.prototype._isPalmOpen = function (lm) {
    var indexExt = this._isFingerExtended(lm, 8, 6);
    var middleExt = this._isFingerExtended(lm, 12, 10);
    var ringExt = this._isFingerExtended(lm, 16, 14);
    var pinkyExt = this._isFingerExtended(lm, 20, 18);
    return indexExt && middleExt && ringExt && pinkyExt;
  };

  GestureDetector.prototype._dist = function (a, b) {
    var dx = a.x - b.x, dy = a.y - b.y, dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  // Ngón cong: đầu ngón (tip) nằm thấp hơn khớp giữa (pip) trong ảnh (y lớn hơn = thấp hơn).
  GestureDetector.prototype._isFingerCurled = function (lm, tipIdx, pipIdx) {
    return lm[tipIdx].y > lm[pipIdx].y;
  };

  GestureDetector.prototype._isFingerExtended = function (lm, tipIdx, pipIdx) {
    return lm[tipIdx].y < lm[pipIdx].y;
  };

  // Nắm tay (fist): 4 ngón cong lại VÀ ngón cái cụp vào sát lòng bàn tay
  // (không chĩa ra ngoài như thumbs-up hay chạm ngón trỏ như dấu OK).
  GestureDetector.prototype._isFist = function (lm) {
    var indexCurled = this._isFingerCurled(lm, 8, 6);
    var middleCurled = this._isFingerCurled(lm, 12, 10);
    var ringCurled = this._isFingerCurled(lm, 16, 14);
    var pinkyCurled = this._isFingerCurled(lm, 20, 18);
    var thumbTucked = this._dist(lm[4], lm[5]) < 0.12;
    return indexCurled && middleCurled && ringCurled && pinkyCurled && thumbTucked;
  };

  // OK: đầu ngón cái và đầu ngón trỏ chạm nhau (khoảng cách nhỏ),
  // 3 ngón còn lại (giữa, áp út, út) duỗi thẳng.
  GestureDetector.prototype._isOK = function (lm) {
    var pinchDist = this._dist(lm[4], lm[8]);
    var middleExt = this._isFingerExtended(lm, 12, 10);
    var ringExt = this._isFingerExtended(lm, 16, 14);
    var pinkyExt = this._isFingerExtended(lm, 20, 18);
    return pinchDist < 0.07 && middleExt && ringExt && pinkyExt;
  };

  global.GestureDetector = GestureDetector;
})(window);
