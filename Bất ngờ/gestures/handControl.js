/* ============================================================
   gestures/handControl.js
   ------------------------------------------------------------
   CHỈ chịu trách nhiệm:
   - Quản lý trạng thái camera (xin quyền, mở/tắt webcam)
   - Nhận kết quả gesture thô từ gestureDetector.js
   - Debounce: gesture phải giữ ổn định ~600ms mới được xác nhận,
     sau đó cooldown 1500ms để tránh nhận liên tiếp nhiều lần
   File này KHÔNG biết map gesture -> hành động gì trên website.
   Việc đó do nơi khởi tạo HandControl (ví dụ đoạn wiring trong
   index.html) truyền vào qua callback onGestureConfirmed.
   ============================================================ */
(function (global) {
  'use strict';

  var HOLD_MS = 600;      // gesture phải giữ ổn định bao lâu mới xác nhận
  var COOLDOWN_MS = 1500; // sau khi xác nhận, bỏ qua input trong bao lâu

  /**
   * @param {Object} opts
   * @param {(gesture:string)=>void} [opts.onGestureConfirmed] - gọi khi 1 gesture đã được xác nhận (đã debounce)
   * @param {(state:string, detail?:any)=>void} [opts.onStateChange] - 'starting' | 'active' | 'denied' | 'stopped' | 'error'
   * @param {(err:Error)=>void} [opts.onError]
   */
  function HandControl(opts) {
    opts = opts || {};
    this.onGestureConfirmed = opts.onGestureConfirmed || function () {};
    this.onStateChange = opts.onStateChange || function () {};
    this.onError = opts.onError || function () {};

    this.stream = null;
    this.videoEl = null;
    this.detector = null;
    this.active = false;

    // trạng thái debounce
    this._pendingLabel = null;
    this._cooldownUntil = 0;
    this._confirmTimer = null;
  }

  HandControl.prototype.isActive = function () {
    return this.active;
  };

  /**
   * Xin quyền webcam, mở camera vào videoEl, khởi động gestureDetector.
   * Nếu người dùng từ chối quyền hoặc có lỗi, trả về false và website
   * vẫn hoạt động bình thường (không ném lỗi ra ngoài).
   * @param {HTMLVideoElement} videoEl
   * @returns {Promise<boolean>}
   */
  HandControl.prototype.enable = function (videoEl) {
    var self = this;
    if (this.active) return Promise.resolve(true);
    this.videoEl = videoEl;
    this.onStateChange('starting');

    return navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: 'user' },
      audio: false
    }).then(function (stream) {
      self.stream = stream;
      self.videoEl.srcObject = stream;
      var playResult = self.videoEl.play();
      return (playResult && playResult.catch) ? playResult.catch(function () {}) : Promise.resolve();
    }).then(function () {
      if (!global.GestureDetector) {
        throw new Error('gestureDetector.js chưa được nạp trước handControl.js');
      }
      self.detector = new global.GestureDetector({
        videoEl: self.videoEl,
        onGesture: function (label) { self._handleRawGesture(label); },
        onError: function (err) { self.onError(err); }
      });
      return self.detector.start();
    }).then(function () {
      self.active = true;
      self.onStateChange('active');
      return true;
    }).catch(function (err) {
      // Bao gồm cả trường hợp người dùng từ chối quyền camera
      // (DOMException: NotAllowedError) lẫn lỗi khởi tạo detector.
      var isPermissionDenied = err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      self._teardown();
      self.onStateChange(isPermissionDenied ? 'denied' : 'error', err);
      self.onError(err);
      return false;
    });
  };

  /** Tắt camera & dừng nhận diện, đưa mọi thứ về trạng thái ban đầu. */
  HandControl.prototype.disable = function () {
    if (!this.active && !this.stream) return;
    this._teardown();
    this.onStateChange('stopped');
  };

  HandControl.prototype._teardown = function () {
    this.active = false;
    if (this.detector) {
      this.detector.stop();
      this.detector = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(function (t) { t.stop(); });
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
    this._resetDebounce();
  };

  HandControl.prototype._resetDebounce = function () {
    this._pendingLabel = null;
    if (this._confirmTimer) {
      clearTimeout(this._confirmTimer);
      this._confirmTimer = null;
    }
  };

  // Nhận nhãn gesture thô (mỗi frame) từ gestureDetector.js và áp dụng debounce.
  HandControl.prototype._handleRawGesture = function (label) {
    if (!this.active) return;
    var now = performance.now();

    if (now < this._cooldownUntil) {
      // đang trong thời gian cooldown sau lần nhận trước -> bỏ qua toàn bộ input
      return;
    }

    if (!label || label === 'none') {
      this._resetDebounce();
      return;
    }

    if (label === this._pendingLabel) {
      // vẫn đang giữ cùng 1 gesture -> chờ timer HOLD_MS tự xác nhận
      return;
    }

    // gesture mới xuất hiện (khác với gesture đang chờ) -> bắt đầu đếm giữ
    this._pendingLabel = label;
    if (this._confirmTimer) clearTimeout(this._confirmTimer);
    var self = this;
    this._confirmTimer = setTimeout(function () { self._tryConfirm(label); }, HOLD_MS);
  };

  HandControl.prototype._tryConfirm = function (label) {
    var now = performance.now();
    // gesture đã đổi hoặc bị huỷ trước khi đủ HOLD_MS -> không xác nhận
    if (this._pendingLabel !== label) return;
    if (now < this._cooldownUntil) return;

    this._cooldownUntil = now + COOLDOWN_MS;
    this._resetDebounce();
    this.onGestureConfirmed(label);
  };

  global.HandControl = HandControl;
})(window);
