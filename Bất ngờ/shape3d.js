/* ============================================================
   shape3d.js
   ------------------------------------------------------------
   Scene 4: hình 3D bằng hạt (Three.js) — 3 hình: hoa cẩm tú cầu,
   trái tim, quả chanh. Kéo/thả (hoặc cử chỉ tay) để "nổ" hình ra;
   khi hình THU GỌN thì không hiện ảnh nào, chỉ khi nổ mở ra
   HOÀN TOÀN thì 8 ảnh của hình đó mới hiện lên (mỗi hình 8 ảnh).

   Công thức tạo hạt lấy nguyên bản từ Chanh.zip (giữ đúng cảm giác
   hình dáng/màu sắc gốc), chỉ tách ra để nhúng vào 1 khung nhỏ
   trong trang thay vì toàn màn hình, và gắn thêm lớp ảnh 3D.

   Điều khiển:
   - Kéo chuột / chạm vào khung hình để xoay
   - Giữ nút "giữ để nổ ra" để hạt bung ra dần, thả ra để thu lại
   - Bật "Điều khiển bằng tay" (nút DUY NHẤT ở đầu trang — dùng
     chung MỘT camera/model MediaPipe cho toàn bộ website, xem
     gestures/gestureDetector.js + gestures/handControl.js):
       + Hình chữ V (trỏ+giữa), giữ yên   -> hoa cẩm tú cầu
         (vuốt ngang bằng chữ V thì đó là chuyển trang, không đổi hình)
       + Hình chữ W (trỏ+giữa+áp út)      -> trái tim
       + Xòe ngón cái, các ngón khác cong -> quả chanh
       + Đưa tay ngang qua                -> xoay hình
       + Chụm/xòe ngón cái - ngón trỏ     -> nổ ra / thu lại
   File này KHÔNG tự mở camera/MediaPipe — nó nhận landmarks thô
   qua feedHandLandmarks(lm), do wiring trong index.html chuyển tiếp
   từ HandControl dùng chung. File này cũng KHÔNG biết gì về logic
   điều hướng scene của website — chỉ export window.Shape3D với
   init/activate/deactivate/feedHandLandmarks/setHandActive.
   ============================================================ */
(function (global) {
  'use strict';

  var THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var PARTICLE_COUNT = 5200;

  var SHAPE_LABELS = {
    hydrangea: 'Hoa cẩm tú cầu',
    heart: 'Trái tim',
    lemon: 'Quả chanh'
  };

  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Không tải được thư viện: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function placeholderPhotoSVG() {
    return '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" stroke="#7DD3FC" stroke-width="1.3"/>' +
      '<circle cx="12" cy="13" r="3.4" stroke="#7DD3FC" stroke-width="1.3"/></svg>';
  }

  // ---- Trạng thái module ----
  var THREE_ = null;
  var renderer = null, scene = null, camera = null, particleSystem = null, geometry = null;
  var targets = [], dirs = [];
  var anchorIdx = [];
  var currentShape = 'hydrangea';
  var expansionFactor = 0;   // mục tiêu (0..1) hiện tại đang hướng tới
  var smoothExp = 0;         // giá trị mượt dùng để render mỗi frame
  var manualExplode = 0;     // do kéo nút / thanh trượt điều khiển
  var cameraExplode = 0;     // do khoảng cách ngón cái-trỏ (cử chỉ tay, dùng chung) điều khiển
  var handActive = false;    // true khi điều khiển bằng tay (chung toàn site) đang bật VÀ đang ở scene 4
  var lastHandX = null;
  var rafId = null;
  var built = false, active = false;
  var dragging = false, dragLastX = 0, dragMoved = false;
  var rotationVelocity = 0;

  var containerEl, canvasHostEl, photoLayerEl, hintEl, nameEl;
  var photosConfig = {};
  var photoEls = [];
  var lightboxEl, lightboxImgEl;

  function buildParticlesFor(shapeKey) {
    var t = [], d = [];
    var colors = new Float32Array(PARTICLE_COUNT * 3);
    var tmp = new THREE_.Color();
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var x, y, z;
      if (shapeKey === 'hydrangea') {
        var numFlorets = 300;
        var sphereRadius = 3.0;
        var floretIndex = Math.min(numFlorets - 1, Math.floor(i / (PARTICLE_COUNT / numFlorets)));
        var yF = 1 - (floretIndex / (numFlorets - 1)) * 2;
        var radAtY = Math.sqrt(Math.max(0, 1 - yF * yF));
        var theta = Math.PI * (3 - Math.sqrt(5)) * floretIndex;
        var nx = Math.cos(theta) * radAtY, ny = yF, nz = Math.sin(theta) * radAtY;

        var upx = 0, upy = 1, upz = 0;
        if (Math.abs(ny) > 0.99) { upx = 1; upy = 0; upz = 0; }
        var ux = upy * nz - upz * ny, uy = upz * nx - upx * nz, uz = upx * ny - upy * nx;
        var uLen = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
        ux /= uLen; uy /= uLen; uz /= uLen;
        var vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;

        var petals = 4;
        var angle = Math.random() * Math.PI * 2;
        var floretSize = 0.95;
        var petalR = Math.pow(Math.abs(Math.cos(petals / 2 * angle)), 0.4);
        var r = floretSize * petalR * (0.35 + 0.65 * Math.random());
        var bump = Math.random() * 0.3;

        var cx = nx * sphereRadius, cy = ny * sphereRadius, cz = nz * sphereRadius;
        x = cx + ux * r * Math.cos(angle) + vx * r * Math.sin(angle) + nx * bump;
        y = cy + uy * r * Math.cos(angle) + vy * r * Math.sin(angle) + ny * bump;
        z = cz + uz * r * Math.cos(angle) + vz * r * Math.sin(angle) + nz * bump;

        var nearCenter = petalR < 0.35;
        var hue = 0.58 + Math.random() * 0.05;
        var sat = 0.55 + Math.random() * 0.3;
        var light = 0.42 + Math.random() * 0.28;
        if (nearCenter && Math.random() < 0.5) { sat = 0.15 + Math.random() * 0.2; light = 0.82 + Math.random() * 0.12; }
        tmp.setHSL(hue, sat, light);
      } else if (shapeKey === 'heart') {
        var ht = Math.random() * Math.PI * 2;
        x = 0.22 * (16 * Math.pow(Math.sin(ht), 3));
        y = 0.22 * (13 * Math.cos(ht) - 5 * Math.cos(2 * ht) - 2 * Math.cos(3 * ht) - Math.cos(4 * ht));
        z = (Math.random() - 0.5) * 3;
        tmp.setHSL(0.96 + Math.random() * 0.03, 0.75 + Math.random() * 0.2, 0.55 + Math.random() * 0.15);
      } else {
        var phi = Math.acos(1 - 2 * (i + 0.5) / PARTICLE_COUNT);
        var lth = Math.PI * (3 - Math.sqrt(5)) * i;
        var rx = 2.1, ry = 4.0, rz = 2.1;
        var jitter = 1 + (Math.random() - 0.5) * 0.04;
        x = rx * Math.sin(phi) * Math.cos(lth) * jitter;
        y = ry * Math.cos(phi) * jitter;
        z = rz * Math.sin(phi) * Math.sin(lth) * jitter;
        tmp.setHSL(0.16 + Math.random() * 0.04, 0.75 + Math.random() * 0.2, 0.5 + Math.random() * 0.15);
      }
      t.push(new THREE_.Vector3(x, y, z));
      d.push(new THREE_.Vector3(x, y, z).normalize().multiplyScalar(Math.random() * 8 + 2));
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    return { targets: t, dirs: d, colors: colors };
  }

  function pickAnchors(shapeKey) {
    // 8 điểm neo trải đều theo chỉ số hạt — dùng làm vị trí gắn 8 ảnh.
    var idxs = [];
    for (var k = 0; k < 8; k++) {
      idxs.push(Math.floor((k + 0.5) * PARTICLE_COUNT / 8));
    }
    return idxs;
  }

  function mountPhotos(shapeKey) {
    photoLayerEl.innerHTML = '';
    photoEls = [];
    var list = (photosConfig[shapeKey] || []).slice(0, 8);
    list.forEach(function (p) {
      var div = document.createElement('div');
      div.className = 'shape3d-photo';
      if (p && p.url) {
        div.style.backgroundImage = "url('" + p.url + "')";
        div.addEventListener('click', function () {
          if (!div.classList.contains('is-visible')) return;
          lightboxImgEl.style.backgroundImage = "url('" + p.url + "')";
          lightboxEl.classList.add('show');
        });
      } else {
        div.innerHTML = placeholderPhotoSVG();
      }
      photoLayerEl.appendChild(div);
      photoEls.push(div);
    });
  }

  function applyShape(key) {
    currentShape = key;
    if (nameEl) nameEl.textContent = SHAPE_LABELS[key] || '';
    document.querySelectorAll('.shape3d-shape-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-shape') === key);
    });
    mountPhotos(key);
    if (!geometry) return; // chưa dựng xong Three.js — sẽ áp dụng lại khi initScene() chạy
    var res = buildParticlesFor(key);
    targets = res.targets; dirs = res.dirs;
    geometry.setAttribute('color', new THREE_.BufferAttribute(res.colors, 3));
    anchorIdx = pickAnchors(key);
  }

  function resize() {
    if (!renderer || !containerEl) return;
    var w = containerEl.clientWidth, h = containerEl.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function initScene() {
    THREE_ = global.THREE;
    scene = new THREE_.Scene();
    camera = new THREE_.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.z = 11;
    renderer = new THREE_.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    canvasHostEl.innerHTML = '';
    canvasHostEl.appendChild(renderer.domElement);

    geometry = new THREE_.BufferGeometry();
    var material = new THREE_.PointsMaterial({
      size: 0.06, color: 0xffffff, vertexColors: true, transparent: true,
      blending: THREE_.AdditiveBlending, depthWrite: false, opacity: 0.92
    });
    particleSystem = new THREE_.Points(geometry, material);
    scene.add(particleSystem);

    applyShape(currentShape);
    resize();
    global.addEventListener('resize', resize);
  }

  // Kéo các mốc gắn ảnh gần tâm hình hơn khi chiếu ra màn hình (không ảnh
  // hưởng vị trí hạt thật) — khi nổ hoàn toàn, nhiều mốc nằm quá xa lên
  // trên/xuống dưới, dễ bị tràn ra ngoài khung hình.
  var ANCHOR_CENTER_PULL = 0.55;

  function projectAnchor(idx) {
    var t = targets[idx], d = dirs[idx];
    var v = new THREE_.Vector3(
      (t.x + d.x * smoothExp) * ANCHOR_CENTER_PULL,
      (t.y + d.y * smoothExp) * ANCHOR_CENTER_PULL,
      (t.z + d.z * smoothExp) * ANCHOR_CENTER_PULL
    );
    particleSystem.updateMatrixWorld();
    v.applyMatrix4(particleSystem.matrixWorld);
    v.project(camera);
    var w = containerEl.clientWidth, h = containerEl.clientHeight;
    return { x: (v.x * 0.5 + 0.5) * w, y: (1 - (v.y * 0.5 + 0.5)) * h };
  }

  function tick() {
    rafId = global.requestAnimationFrame(tick);
    var targetExp = handActive ? cameraExplode : manualExplode;
    expansionFactor += (targetExp - expansionFactor) * 0.12;
    smoothExp += (expansionFactor - smoothExp) * 0.1;

    particleSystem.rotation.y += rotationVelocity;
    rotationVelocity *= 0.92;
    particleSystem.rotation.y += 0.0015;

    var posAttr = new Float32Array(PARTICLE_COUNT * 3);
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var t = targets[i], d = dirs[i];
      posAttr[i * 3] = t.x + d.x * smoothExp;
      posAttr[i * 3 + 1] = t.y + d.y * smoothExp;
      posAttr[i * 3 + 2] = t.z + d.z * smoothExp;
    }
    geometry.setAttribute('position', new THREE_.BufferAttribute(posAttr, 3));
    renderer.render(scene, camera);

    // Chỉ khi nổ mở ra GẦN NHƯ HOÀN TOÀN thì 8 ảnh mới dần hiện lên;
    // thu gọn lại thì ẩn hẳn, không lộ ảnh.
    var revealStart = 0.8, revealFull = 0.99;
    var vis = (smoothExp - revealStart) / (revealFull - revealStart);
    vis = Math.max(0, Math.min(1, vis));
    for (var k = 0; k < photoEls.length; k++) {
      var idx = anchorIdx[k];
      if (idx === undefined) continue;
      var p = projectAnchor(idx);
      var el = photoEls[k];
      el.style.transform = 'translate(-50%,-50%) translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) scale(' + (0.55 + 0.45 * vis).toFixed(3) + ')';
      el.style.opacity = vis.toFixed(3);
      if (vis > 0.5) el.classList.add('is-visible'); else el.classList.remove('is-visible');
    }
    if (hintEl) hintEl.style.opacity = vis > 0.5 ? '0' : '';
  }

  function bindPointerControls() {
    canvasHostEl.addEventListener('pointerdown', function (e) {
      dragging = true; dragMoved = false; dragLastX = e.clientX;
    });
    global.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - dragLastX;
      if (Math.abs(dx) > 1) dragMoved = true;
      dragLastX = e.clientX;
      rotationVelocity += dx * 0.006;
    });
    global.addEventListener('pointerup', function () { dragging = false; });
    canvasHostEl.style.touchAction = 'none';
  }

  function bindExplodeButton(btn) {
    if (!btn) return;
    var setHeld = function (held) { manualExplode = held ? 1 : 0; };
    btn.addEventListener('pointerdown', function (e) { e.preventDefault(); setHeld(true); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
      btn.addEventListener(ev, function () { setHeld(false); });
    });
  }

  function bindShapeButtons() {
    document.querySelectorAll('.shape3d-shape-btn').forEach(function (b) {
      b.addEventListener('click', function () { applyShape(b.getAttribute('data-shape')); });
    });
  }

  // ---- Cử chỉ tay (giống Chanh.zip gốc, giờ dùng chung MỘT camera với cả
  // trang thay vì tự mở camera riêng): V/W/xòe ngón cái để đổi hình, đưa tay
  // ngang để xoay, chụm/xòe ngón cái-trỏ để nổ/thu. Được gọi mỗi frame từ
  // wiring trong index.html — CHỈ khi đang ở scene 4 (xem setHandActive). ----
  function feedHandLandmarks(lm) {
    if (!lm) {
      // Mất dấu tay giữa chừng: giữ nguyên hình dạng/độ nổ hiện tại, chỉ
      // ngắt theo dõi vị trí để lần thấy tay tiếp theo không bị giật.
      lastHandX = null;
      return;
    }

    var currentX = lm[9].x;
    if (lastHandX !== null) {
      var dx = currentX - lastHandX;
      rotationVelocity += dx * 0.8;
    }
    lastHandX = currentX;

    var isFingerOpen = function (tipIdx) { return lm[tipIdx].y < lm[tipIdx - 2].y; };
    var thumbOpen = Math.abs(lm[4].x - lm[9].x) > 0.15;
    var indexOpen = isFingerOpen(8), middleOpen = isFingerOpen(12), ringOpen = isFingerOpen(16), pinkyOpen = isFingerOpen(20);

    var newShape = currentShape;
    if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) newShape = 'hydrangea';
    else if (indexOpen && middleOpen && ringOpen && !pinkyOpen) newShape = 'heart';
    else if (thumbOpen && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen) newShape = 'lemon';
    if (newShape !== currentShape) applyShape(newShape);

    var d = Math.sqrt(Math.pow(lm[4].x - lm[8].x, 2) + Math.pow(lm[4].y - lm[8].y, 2));
    cameraExplode = Math.pow(Math.min(1, Math.max(0, (d - 0.08) / 0.25)), 2);
  }

  // wiring trong index.html gọi hàm này khi bật/tắt "Điều khiển bằng tay"
  // (chung toàn site) VÀ khi vào/rời scene 4, để tick() biết nên lấy độ nổ
  // từ chụm ngón tay (cameraExplode) hay từ nút "giữ để nổ ra" (manualExplode).
  function setHandActive(isActive) {
    handActive = !!isActive;
    if (!handActive) { cameraExplode = 0; lastHandX = null; }
  }

  function activate() {
    if (active) return;
    active = true;
    if (!built) {
      loadScriptOnce(THREE_SRC).then(function () {
        built = true;
        initScene();
        if (active) tick();
      }).catch(function (err) { console.warn('[Shape3D] không tải được three.js:', err); });
    } else {
      resize();
      tick();
    }
  }

  function deactivate() {
    active = false;
    if (rafId) { global.cancelAnimationFrame(rafId); rafId = null; }
    setHandActive(false);
  }

  function init(opts) {
    containerEl = opts.container;
    canvasHostEl = opts.canvasHost;
    photoLayerEl = opts.photoLayer;
    hintEl = opts.hint;
    nameEl = opts.nameEl;
    lightboxEl = opts.lightboxEl;
    lightboxImgEl = opts.lightboxImgEl;
    photosConfig = opts.photos || {};

    bindPointerControls();
    bindExplodeButton(opts.explodeBtn);
    bindShapeButtons();
    if (nameEl) nameEl.textContent = SHAPE_LABELS[currentShape];
    mountPhotos(currentShape);
  }

  global.Shape3D = {
    init: init,
    activate: activate,
    deactivate: deactivate,
    feedHandLandmarks: feedHandLandmarks,
    setHandActive: setHandActive,
    isHandActive: function () { return handActive; }
  };
})(window);
