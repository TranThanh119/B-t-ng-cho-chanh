/* ============================================================
   components/CameraPreview.js
   ------------------------------------------------------------
   CHỈ chịu trách nhiệm:
   - Tạo & hiển thị khung preview webcam nhỏ ở góc phải dưới màn hình
   - Show/hide/remove preview
   Không chứa bất kỳ logic gesture hay logic website nào.
   ============================================================ */
(function (global) {
  'use strict';

  var DEFAULT_ID = 'hand-camera-preview';
  var STYLE_ID = 'hand-camera-preview-style';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#' + DEFAULT_ID + '{',
      '  position:fixed; right:calc(16px + env(safe-area-inset-right)); bottom:calc(16px + env(safe-area-inset-bottom)); z-index:9999;',
      '  width:160px; height:120px; border-radius:12px; overflow:hidden;',
      '  border:1px solid rgba(216,180,120,0.35); background:#000;',
      '  box-shadow:0 8px 24px rgba(0,0,0,0.45);',
      '  display:none; opacity:0; transition:opacity .25s ease;',
      '}',
      '#' + DEFAULT_ID + '.hcp-visible{ display:block; opacity:1; }',
      '#' + DEFAULT_ID + ' video{',
      '  width:100%; height:100%; object-fit:cover;',
      '  transform:scaleX(-1);', /* hiển thị như soi gương cho tự nhiên */
      '}',
      '#' + DEFAULT_ID + ' .hcp-label{',
      '  position:absolute; left:6px; bottom:4px; z-index:1;',
      '  font-family:sans-serif; font-size:10px; letter-spacing:.03em;',
      '  color:#e8d4a8; background:rgba(0,0,0,.45); padding:2px 6px; border-radius:6px;',
      '  pointer-events:none;',
      '}',
      '@media (max-width:520px){',
      '  #' + DEFAULT_ID + '{ width:110px; height:84px; right:calc(10px + env(safe-area-inset-right)); bottom:calc(10px + env(safe-area-inset-bottom)); }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  /**
   * Tạo (nếu chưa có) khung preview & trả về thẻ <video> bên trong để
   * gán srcObject. Preview mặc định đang ẩn, gọi show() để hiện ra.
   * @param {Object} [opts]
   * @param {string} [opts.containerId]
   * @param {string} [opts.label] - nhãn nhỏ hiển thị trong preview (tuỳ chọn)
   * @returns {HTMLVideoElement}
   */
  function create(opts) {
    opts = opts || {};
    var containerId = opts.containerId || DEFAULT_ID;
    ensureStyle();

    var wrap = document.getElementById(containerId);
    if (wrap) {
      return wrap.querySelector('video');
    }

    wrap = document.createElement('div');
    wrap.id = containerId;

    var video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    wrap.appendChild(video);

    if (opts.label) {
      var labelEl = document.createElement('div');
      labelEl.className = 'hcp-label';
      labelEl.textContent = opts.label;
      wrap.appendChild(labelEl);
    }

    document.body.appendChild(wrap);
    return video;
  }

  function show(containerId) {
    var wrap = document.getElementById(containerId || DEFAULT_ID);
    if (wrap) wrap.classList.add('hcp-visible');
  }

  function hide(containerId) {
    var wrap = document.getElementById(containerId || DEFAULT_ID);
    if (wrap) wrap.classList.remove('hcp-visible');
  }

  function remove(containerId) {
    var wrap = document.getElementById(containerId || DEFAULT_ID);
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }

  global.CameraPreview = {
    create: create,
    show: show,
    hide: hide,
    remove: remove
  };
})(window);
