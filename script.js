(function(){
  "use strict";

  // =====================================================================
  // MODE EDITOR — true = tampilkan semua tombol edit (+ Tambah Spot, Edit
  // Hotspot, Zona Material, Kelola Kombinasi, Ekspor Konfigurasi). Gunakan
  // true saat Anda sedang menyiapkan/menguji konten sendiri.
  // Ganti ke false SEBELUM upload ke hosting publik (GitHub Pages, dll) —
  // pengunjung situs hanya akan bisa MELIHAT tur (pindah spot, klik
  // hotspot, ganti material lewat zona yang sudah Anda siapkan), tanpa
  // bisa menambah atau mengubah apa pun.
  // =====================================================================
  var MODE_EDITOR = false;

  // =====================================================================
  // DAFTAR SPOT TETAP — edit bagian ini untuk tur virtual Anda.
  // Setiap foto WAJIB ada di folder "images/" di samping file HTML ini,
  // dan situs harus diakses lewat http/https (hosting), BUKAN dibuka
  // langsung dengan dobel-klik (file://) — browser memblokir tekstur
  // WebGL yang dimuat dari file lokal untuk alasan keamanan.
  // =====================================================================
var SCENE_MANIFEST = [
  {
    name: "TANGGA1",
    src: "images/TANGGA1.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
    hotspots: [
      { lat: -18.9, lon: 246.4, target: "POOL" },
      { lat: 15.6, lon: 157.9, target: "TANGGA2" },
      { lat: -28.1, lon: 199.5, target: "DPL1" },
    ]
  },
  {
    name: "TANGGA2",
    src: "images/TANGGA2.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
    hotspots: [
      { lat: -37.1, lon: 173.7, target: "TANGGA1" },
      { lat: -46.4, lon: 97.4, target: "TAS" },
    ]
  },
  {
    name: "TAS",
    src: "images/TAS.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
    hotspots: [
      { lat: -37.6, lon: 82.3, target: "BATHROOM" },
      { lat: -35.8, lon: 150.3, target: "BEDROOM" },
      { lat: -55.6, lon: 273.4, target: "TANGGA2" },
    ]
  },
  {
    name: "BATHROOM",
    src: "images/BATHROOM.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
    hotspots: [
      { lat: -42.4, lon: 359.4, target: "TAS" },
      { lat: -31.1, lon: 1.1, target: "TANGGA2" },
    ]
  },
  {
    name: "BEDROOM",
    src: "images/BEDROOM.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
    hotspots: [
      { lat: -25.1, lon: 317.4, target: "TAS" },
    ]
  },
  {
    name: "POOL",
    src: "images/POOL.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
    hotspots: [
      { lat: -20.1, lon: 264.8, target: "DPL1" },
      { lat: -12.0, lon: 239.9, target: "TANGGA1" },
    ]
  },
  {
    name: "DPL1",
    src: "images/DPL1.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
    materialZones: [
      { id: "z1_wall", label: "WALL", lat: -0.3, lon: 154.9, options: [{ key: "paint", label: "PAINT" }, { key: "brick", label: "BRICK" }, { key: "stone", label: "STONE" }] },
      { id: "z2_lantai", label: "LANTAI", lat: -51.5, lon: 234.2, options: [{ key: "mozaik", label: "MOZAIK" }, { key: "granite", label: "GRANITE" }, { key: "wood", label: "WOOD" }] },
    ],
    combos: {
      "paint|granite": "images/DPL2.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
      "paint|wood": "images/DPL3.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
      "brick|mozaik": "images/DBAL1.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
      "brick|granite": "images/DBAL2.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
      "brick|wood": "images/DBAL3.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
      "stone|mozaik": "images/DBL1.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
      "stone|granite": "images/DBL2.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
      "stone|wood": "images/DBL3.png",  // TODO: salin file aslinya ke images/ dan sesuaikan nama file
    },
    hotspots: [
      { lat: -17.7, lon: 201.9, target: "TANGGA1" },
      { lat: -23.3, lon: 93.8, target: "POOL" },
    ]
  },
];
  var canvas = document.getElementById('gl');
  var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if(!gl){
    document.getElementById('hint').innerHTML = 'Browser Anda tidak mendukung WebGL.';
    return;
  }

  // ---------- Shaders ----------
  var vsSource = [
    "attribute vec3 aPosition;",
    "attribute vec2 aUV;",
    "uniform mat4 uMVP;",
    "varying vec2 vUV;",
    "void main(){",
    "  vUV = aUV;",
    "  gl_Position = uMVP * vec4(aPosition, 1.0);",
    "}"
  ].join("\n");

  var fsSource = [
    "precision mediump float;",
    "varying vec2 vUV;",
    "uniform sampler2D uTex;",
    "uniform sampler2D uTexB;",
    "uniform float uBlend;",
    "void main(){",
    "  vec4 a = texture2D(uTex, vUV);",
    "  vec4 b = texture2D(uTexB, vUV);",
    "  gl_FragColor = mix(a, b, uBlend);",
    "}"
  ].join("\n");

  function compileShader(type, src){
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
      console.error(gl.getShaderInfoLog(s));
    }
    return s;
  }

  var vs = compileShader(gl.VERTEX_SHADER, vsSource);
  var fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
    console.error(gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);

  var aPosition = gl.getAttribLocation(program, 'aPosition');
  var aUV = gl.getAttribLocation(program, 'aUV');
  var uMVP = gl.getUniformLocation(program, 'uMVP');
  var uTex = gl.getUniformLocation(program, 'uTex');
  var uTexB = gl.getUniformLocation(program, 'uTexB');
  var uBlend = gl.getUniformLocation(program, 'uBlend');

  // ---------- Sphere geometry (viewed from inside) ----------
  var latSeg = 40, lonSeg = 60, radius = 10;
  var positions = [], uvs = [], indices = [];

  for(var i = 0; i <= latSeg; i++){
    var theta = (i / latSeg) * Math.PI; // 0..PI
    var sinT = Math.sin(theta), cosT = Math.cos(theta);
    for(var j = 0; j <= lonSeg; j++){
      var phi = (j / lonSeg) * Math.PI * 2; // 0..2PI
      var sinP = Math.sin(phi), cosP = Math.cos(phi);
      var x = -radius * sinT * cosP;
      var y = radius * cosT;
      var z = radius * sinT * sinP;
      positions.push(x, y, z);
      uvs.push(j / lonSeg, i / latSeg);
    }
  }
  for(var i2 = 0; i2 < latSeg; i2++){
    for(var j2 = 0; j2 < lonSeg; j2++){
      var a = i2 * (lonSeg + 1) + j2;
      var b = a + lonSeg + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  var posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  var uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

  var idxBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  gl.disable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  // ---------- Guard against exceeding this device's GPU texture limit ----------
  var MAX_TEX_SIZE = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
  function fitImageToDeviceLimit(img){
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if(w <= MAX_TEX_SIZE && h <= MAX_TEX_SIZE) return img;
    var scale = MAX_TEX_SIZE / Math.max(w, h);
    var c = document.createElement('canvas');
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    var ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  // ---------- Matrix helpers (no external math library) ----------
  function mat4Identity(){ return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }

  function mat4Multiply(a, b){
    var out = new Array(16);
    for(var r = 0; r < 4; r++){
      for(var c = 0; c < 4; c++){
        var sum = 0;
        for(var k = 0; k < 4; k++){ sum += a[k*4 + r] * b[c*4 + k]; }
        out[c*4 + r] = sum;
      }
    }
    return out;
  }

  function mat4RotateX(rad){
    var c = Math.cos(rad), s = Math.sin(rad);
    return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1];
  }
  function mat4RotateY(rad){
    var c = Math.cos(rad), s = Math.sin(rad);
    return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1];
  }
  function mat4Perspective(fovyRad, aspect, near, far){
    var f = 1.0 / Math.tan(fovyRad / 2);
    var nf = 1 / (near - far);
    return [
      f/aspect,0,0,0,
      0,f,0,0,
      0,0,(far+near)*nf,-1,
      0,0,(2*far*near)*nf,0
    ];
  }
  function mat4Transpose(m){
    var out = new Array(16);
    for(var r = 0; r < 4; r++){ for(var c = 0; c < 4; c++){ out[r*4+c] = m[c*4+r]; } }
    return out;
  }
  // Rotate a direction vector by the 3x3 rotation part of a column-major mat4 (ignores translation)
  function mat4TransformDir(m, v){
    return {
      x: m[0]*v.x + m[4]*v.y + m[8]*v.z,
      y: m[1]*v.x + m[5]*v.y + m[9]*v.z,
      z: m[2]*v.x + m[6]*v.y + m[10]*v.z
    };
  }
  function vecNormalize(v){
    var len = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z) || 1;
    return { x: v.x/len, y: v.y/len, z: v.z/len };
  }
  // Fixed point on the panorama sphere from lat/lon degrees (lat: -90..90, lon: 0..360)
  function sphereFromLatLon(latDeg, lonDeg, r){
    var theta = (90 - latDeg) * Math.PI / 180;
    var phi = lonDeg * Math.PI / 180;
    return {
      x: -r * Math.sin(theta) * Math.cos(phi),
      y: r * Math.cos(theta),
      z: r * Math.sin(theta) * Math.sin(phi)
    };
  }
  // Inverse: unit world direction -> lat/lon degrees on the sphere
  function latLonFromDir(dir){
    var d = vecNormalize(dir);
    var theta = Math.acos(Math.max(-1, Math.min(1, d.y)));
    var phi = Math.atan2(d.z, -d.x);
    if(phi < 0) phi += Math.PI * 2;
    return { lat: 90 - theta * 180/Math.PI, lon: phi * 180/Math.PI };
  }

  // ---------- Default placeholder texture ----------
  function buildPlaceholderTexture(){
    var c = document.createElement('canvas');
    c.width = 2048; c.height = 1024;
    var ctx = c.getContext('2d');
    var grad = ctx.createLinearGradient(0,0,0,c.height);
    grad.addColorStop(0, '#2b2620');
    grad.addColorStop(0.5, '#14120f');
    grad.addColorStop(1, '#1d1a15');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,c.width,c.height);

    ctx.strokeStyle = 'rgba(201,136,79,0.35)';
    ctx.lineWidth = 2;
    for(var lon = 0; lon <= 360; lon += 30){
      var x = (lon/360) * c.width;
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,c.height); ctx.stroke();
    }
    for(var lat = -60; lat <= 60; lat += 30){
      var y = c.height/2 - (lat/90) * (c.height/2);
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(c.width,y); ctx.stroke();
    }

    ctx.fillStyle = '#c9884f';
    ctx.font = '600 46px ' + getComputedStyle(document.body).fontFamily;
    ctx.textAlign = 'center';
    var dirs = [['N',0],['E',90],['S',180],['W',270]];
    dirs.forEach(function(d){
      var x = (d[1]/360) * c.width;
      ctx.fillText(d[0], x, c.height/2 - 20);
    });

    ctx.fillStyle = 'rgba(236,231,221,0.5)';
    ctx.font = '400 22px ' + getComputedStyle(document.body).fontFamily;
    ctx.fillText('Klik "Muat Panorama" untuk membuka foto equirectangular Anda', c.width/2, c.height/2 + 60);

    return c;
  }

  function setTexParams(){
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  var texture = gl.createTexture();   // currently displayed
  var textureB = gl.createTexture();  // incoming, only used during a transition
  function uploadTexture(source){
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    setTexParams();
  }
  function uploadTextureB(source){
    gl.bindTexture(gl.TEXTURE_2D, textureB);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    setTexParams();
  }
  // Re-upload the current video frame as texture data (called every render frame while a video scene is active)
  function refreshVideoTexture(){
    if(!activeVideoEl || activeVideoEl.readyState < 2) return;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, activeVideoEl);
  }
  uploadTexture(buildPlaceholderTexture());
  uploadTextureB(buildPlaceholderTexture());

  // ---------- Smooth crossfade transition ----------
  var TRANSITION_MS = 380;
  var transition = null; // { start, onComplete }
  function nowMs(){ return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function startCrossfade(source, onComplete){
    uploadTextureB(source);
    transition = { start: nowMs(), onComplete: onComplete };
  }
  // Advances the transition and returns the current blend factor (0..1) to use this frame.
  function tickTransition(){
    if(!transition) return 0;
    var t = Math.min(1, (nowMs() - transition.start) / TRANSITION_MS);
    var eased = t * t * (3 - 2 * t); // smoothstep
    if(t >= 1){
      var tmp = texture; texture = textureB; textureB = tmp;
      var cb = transition.onComplete;
      transition = null;
      if(cb) cb();
      return 0;
    }
    return eased;
  }

  // ---------- State ----------
  var yaw = 0, pitch = 0, fov = 90;
  var dragging = false, lastX = 0, lastY = 0;
  var downX = 0, downY = 0, downTime = 0;
  var autoRotate = false;
  var editMode = false;
  var currentViewMatrix = mat4Identity();
  var hintEl = document.getElementById('hint');
  var hasCustomImage = false;
  var activeVideoEl = null;

  function resize(){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0,0,canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- Interaction ----------
  canvas.addEventListener('pointerdown', function(e){
    dragging = true;
    lastX = e.clientX; lastY = e.clientY;
    downX = e.clientX; downY = e.clientY;
    downTime = Date.now();
    canvas.classList.add('dragging');
    canvas.setPointerCapture(e.pointerId);
    hintEl.classList.add('hidden');
  });
  canvas.addEventListener('pointermove', function(e){
    if(!dragging) return;
    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    var sensitivity = 0.0035 * (fov / 90);
    yaw += dx * sensitivity * 60;
    pitch -= dy * sensitivity * 60;
    pitch = Math.max(-89, Math.min(89, pitch));
    yaw = ((yaw % 360) + 360) % 360;
  });
  function endDrag(e){
    dragging = false;
    canvas.classList.remove('dragging');
    if(e && (editMode || zoneEditMode)){
      var moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if(moved < 6 && (Date.now() - downTime) < 600){
        if(zoneEditMode){
          handleZoneEditClick(e.clientX, e.clientY);
        } else {
          handleEditClick(e.clientX, e.clientY);
        }
      }
    }
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', function(){ dragging = false; canvas.classList.remove('dragging'); });
  canvas.addEventListener('pointerleave', function(){ if(dragging){ dragging = false; canvas.classList.remove('dragging'); } });

  canvas.addEventListener('wheel', function(e){
    e.preventDefault();
    fov += e.deltaY * 0.04;
    fov = Math.max(30, Math.min(100, fov));
    updateFovReadout();
  }, { passive: false });

  function updateFovReadout(){
    document.getElementById('fov-readout').textContent = 'FOV ' + Math.round(fov) + '°';
  }

  // ---------- Studio brand (was: compass ticks) ----------
  var playFallbackBtn = document.getElementById('playFallbackBtn');
  playFallbackBtn.addEventListener('click', function(){
    if(activeVideoEl){
      activeVideoEl.play().then(function(){
        playFallbackBtn.classList.remove('on');
      }).catch(function(){});
    }
  });

  var stageEl = document.getElementById('stage');
  var uiToggleBtn = document.getElementById('uiToggleBtn');
  var uiHidden = false;
  uiToggleBtn.addEventListener('click', function(){
    uiHidden = !uiHidden;
    stageEl.classList.toggle('ui-hidden', uiHidden);
    uiToggleBtn.textContent = uiHidden ? '👁‍🗨' : '👁';
    uiToggleBtn.title = uiHidden ? 'Tampilkan UI' : 'Sembunyikan UI';
    if(uiHidden && editMode){
      editMode = false;
      hotspotBtn.classList.remove('active');
      canvas.classList.remove('edit-mode');
      editBanner.classList.remove('on');
      rebuildHotspotMarkers();
    }
  });

  // ---------- Controls ----------
  var fileInput = document.getElementById('fileInput');
  document.getElementById('loadBtn').addEventListener('click', function(){
    fileInput.click();
  });

  // ---------- Multi-scene ("spot") management ----------
  var scenes = [];        // { name, dataURL, img }
  var activeSceneIndex = -1;
  var scenePanel = document.getElementById('scenePanel');
  var sceneFade = document.getElementById('sceneFade');

  function niceNameFromFile(filename){
    var base = filename.replace(/\.[^/.]+$/, '');
    base = base.replace(/[_-]+/g, ' ').trim();
    return base.length ? base.charAt(0).toUpperCase() + base.slice(1) : 'Spot';
  }

  // Every scene keeps material-zone state: named zones (e.g. "Lantai",
  // "Dinding") positioned on the sphere, each with several options, plus a
  // combo table mapping "the full set of choices across every zone" to one
  // complete rendered photo (since we swap whole images, not live materials).
  function initSceneMaterials(scene){
    scene.materialZones = [];
    scene.combos = {};
    scene.selection = {};
  }

  function renderScenePanel(){
    scenePanel.innerHTML = '';
    scenes.forEach(function(scene, i){
      var item = document.createElement('div');
      item.className = 'scene-item' + (i === activeSceneIndex ? ' active' : '');

      var thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.style.backgroundImage = 'url(' + scene.thumbSrc + ')';
      if(scene.type === 'video'){
        var vbadge = document.createElement('div');
        vbadge.className = 'vbadge';
        vbadge.textContent = '▶ VIDEO';
        thumb.appendChild(vbadge);
      }

      var idx = document.createElement('div');
      idx.className = 'idx';
      idx.textContent = String(i + 1).padStart(2,'0');

      var remove = document.createElement('div');
      remove.className = 'remove';
      remove.textContent = '✕';
      remove.title = 'Hapus spot';
      remove.addEventListener('click', function(ev){
        ev.stopPropagation();
        removeScene(i);
      });

      var label = document.createElement('div');
      label.className = 'label';
      label.textContent = scene.name;
      label.title = 'Klik dua kali untuk ganti nama';
      label.addEventListener('dblclick', function(ev){
        ev.stopPropagation();
        var newName = prompt('Nama spot:', scene.name);
        if(newName && newName.trim()){
          scene.name = newName.trim();
          renderScenePanel();
        }
      });

      thumb.appendChild(idx);
      thumb.appendChild(remove);
      item.appendChild(thumb);
      item.appendChild(label);
      item.addEventListener('click', function(){ switchScene(i); });

      scenePanel.appendChild(item);
    });
  }

  function switchScene(i){
    if(i === activeSceneIndex || !scenes[i] || transition) return;
    playFallbackBtn.classList.remove('on');
    var prev = scenes[activeSceneIndex];
    var next = scenes[i];
    var incomingSource = (next.type === 'video' && next.videoEl) ? next.videoEl : next.img;

    startCrossfade(incomingSource, function(){
      if(prev && prev.type === 'video' && prev.videoEl){
        prev.videoEl.pause();
      }
      if(next.type === 'video' && next.videoEl){
        activeVideoEl = next.videoEl;
        next.videoEl.currentTime = 0;
        var playPromise = next.videoEl.play();
        if(playPromise && playPromise.catch){
          playPromise.catch(function(){ playFallbackBtn.classList.add('on'); });
        }
      } else {
        activeVideoEl = null;
      }
      activeSceneIndex = i;
      renderScenePanel();
      rebuildHotspotMarkers();
      rebuildZoneMarkers();
    });
  }

  function removeScene(i){
    var wasActive = (i === activeSceneIndex);
    var removed = scenes[i];
    if(transition) transition = null;
    if(removed && removed.type === 'video' && removed.videoEl){
      removed.videoEl.pause();
      if(removed.objectUrl) URL.revokeObjectURL(removed.objectUrl);
      if(activeVideoEl === removed.videoEl) activeVideoEl = null;
    }
    if(removed && removed.combos){
      Object.keys(removed.combos).forEach(function(k){
        if(removed.combos[k].objectUrl) URL.revokeObjectURL(removed.combos[k].objectUrl);
      });
    }
    scenes.splice(i, 1);
    if(scenes.length === 0){
      activeSceneIndex = -1;
      uploadTexture(buildPlaceholderTexture());
      hintEl.classList.remove('hidden');
      hotspotLayer.innerHTML = '';
      materialZoneLayer.innerHTML = '';
    } else if(wasActive){
      activeSceneIndex = -1;
      switchScene(Math.max(0, i - 1));
      return;
    } else if(i < activeSceneIndex){
      activeSceneIndex -= 1;
    }
    renderScenePanel();
  }

  function labelToColor(str){
    var hash = 0;
    for(var i = 0; i < str.length; i++){ hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    var hue = Math.abs(hash) % 360;
    return 'hsl(' + hue + ', 42%, 27%)';
  }

  function slugify(name){
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'x';
  }

  // ---------- Material zones (in-image, combinatorial) ----------
  var materialZoneLayer = document.getElementById('materialZoneLayer');
  var zonePopup = document.getElementById('zonePopup');
  var zonePopupHeader = document.getElementById('zonePopupHeader');
  var zonePopupSwatches = document.getElementById('zonePopupSwatches');
  var zoneEditBanner = document.getElementById('zoneEditBanner');
  var zoneBtn = document.getElementById('zoneBtn');
  var comboBtn = document.getElementById('comboBtn');
  var comboModal = document.getElementById('comboModal');
  var comboTable = document.getElementById('comboTable');
  var comboSceneLabel = document.getElementById('comboSceneLabel');
  var comboFileInput = document.getElementById('comboFileInput');
  var zoneEditMode = false;
  var pendingComboKey = null;

  function comboKeyFor(scene, selection){
    return scene.materialZones.map(function(z){ return selection[z.id]; }).join('|');
  }

  function closeZonePopup(){
    zonePopup.classList.remove('on');
  }

  document.addEventListener('pointerdown', function(e){
    if(zonePopup.classList.contains('on') && !zonePopup.contains(e.target) && !materialZoneLayer.contains(e.target)){
      closeZonePopup();
    }
  });

  zoneBtn.addEventListener('click', function(){
    zoneEditMode = !zoneEditMode;
    if(zoneEditMode && editMode){
      editMode = false;
      hotspotBtn.classList.remove('active');
      canvas.classList.remove('edit-mode');
      editBanner.classList.remove('on');
    }
    zoneBtn.classList.toggle('active', zoneEditMode);
    canvas.classList.toggle('edit-mode', zoneEditMode || editMode);
    zoneEditBanner.classList.toggle('on', zoneEditMode);
    closeZonePopup();
  });

  comboBtn.addEventListener('click', function(){
    if(activeSceneIndex === -1){
      alert('Buka salah satu spot dulu.');
      return;
    }
    comboSceneLabel.textContent = scenes[activeSceneIndex].name;
    renderComboMatrix();
    comboModal.classList.add('on');
  });
  document.getElementById('comboCloseBtn').addEventListener('click', function(){
    comboModal.classList.remove('on');
  });

  function handleZoneEditClick(clientX, clientY){
    if(activeSceneIndex === -1) return;
    var scene = scenes[activeSceneIndex];
    var rect = canvas.getBoundingClientRect();
    var ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    var ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    var tanHalfFovY = Math.tan((fov * Math.PI/180) / 2);
    var aspect = rect.width / rect.height;
    var dirView = vecNormalize({ x: ndcX * tanHalfFovY * aspect, y: ndcY * tanHalfFovY, z: -1 });
    var invRot = mat4Transpose(currentViewMatrix);
    var dirWorld = mat4TransformDir(invRot, dirView);
    var ll = latLonFromDir(dirWorld);

    var label = prompt('Nama zona material baru (misal: Lantai):');
    if(!label || !label.trim()) return;
    label = label.trim();
    var optsRaw = prompt('Pilihan material untuk zona "' + label + '", pisahkan dengan koma (misal: Marmer, Kayu, Granit):');
    if(!optsRaw) return;
    var optLabels = optsRaw.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    if(optLabels.length < 2){
      alert('Minimal 2 pilihan material.');
      return;
    }

    if(scene.materialZones.length && Object.keys(scene.combos).length){
      if(!confirm('Menambah zona baru akan mengosongkan semua kombinasi foto yang sudah pernah diupload untuk spot ini (karena kombinasi harus mencakup semua zona). Lanjutkan?')){
        return;
      }
      scene.combos = {};
    }

    var zoneId = 'z' + (scene.materialZones.length + 1) + '_' + slugify(label);
    var options = optLabels.map(function(l){ return { key: slugify(l), label: l }; });
    scene.materialZones.push({ id: zoneId, label: label, lat: ll.lat, lon: ll.lon, options: options });
    scene.selection[zoneId] = options[0].key;

    // If this is the very first zone, register the scene's current photo as
    // the default combination automatically.
    if(scene.materialZones.length === 1){
      var defaultKey = comboKeyFor(scene, scene.selection);
      scene.combos[defaultKey] = { type: scene.type, img: scene.img, videoEl: scene.videoEl, src: scene.src, thumbSrc: scene.thumbSrc };
    }

    rebuildZoneMarkers();
    alert('Zona "' + label + '" dibuat. Buka "Kelola Kombinasi" untuk mengupload foto tiap kombinasinya.');
  }

  function manageZone(zoneIndex){
    var scene = scenes[activeSceneIndex];
    var zone = scene.materialZones[zoneIndex];
    var choice = prompt(
      'Zona "' + zone.label + '"\n\n1 = Tambah pilihan material baru\n2 = Hapus zona ini\n\nMasukkan nomor (kosongkan untuk batal):'
    );
    if(choice === null || choice.trim() === '') return;
    if(choice.trim() === '1'){
      var newLabel = prompt('Nama pilihan material baru untuk zona "' + zone.label + '":');
      if(!newLabel || !newLabel.trim()) return;
      zone.options.push({ key: slugify(newLabel.trim()), label: newLabel.trim() });
      rebuildZoneMarkers();
      alert('Pilihan "' + newLabel.trim() + '" ditambahkan. Jangan lupa upload foto kombinasinya lewat "Kelola Kombinasi".');
    } else if(choice.trim() === '2'){
      if(confirm('Hapus zona "' + zone.label + '"? Semua kombinasi yang tersimpan untuk spot ini juga akan dihapus.')){
        scene.materialZones.splice(zoneIndex, 1);
        delete scene.selection[zone.id];
        scene.combos = {};
        rebuildZoneMarkers();
      }
    }
  }

  function rebuildZoneMarkers(){
    materialZoneLayer.innerHTML = '';
    closeZonePopup();
    if(activeSceneIndex === -1) return;
    var scene = scenes[activeSceneIndex];
    (scene.materialZones || []).forEach(function(zone, zi){
      var el = document.createElement('div');
      el.className = 'zone-marker';
      el.innerHTML = '<div class="zone-ring"></div><div class="zone-core"></div><div class="zone-tag"></div>';
      el.querySelector('.zone-tag').textContent = zone.label;
      el.addEventListener('click', function(ev){
        ev.stopPropagation();
        if(zoneEditMode){
          manageZone(zi);
        } else {
          var r = el.getBoundingClientRect();
          openZonePopup(zi, r.left + r.width/2, r.top);
        }
      });
      el._zone = zone;
      materialZoneLayer.appendChild(el);
    });
  }

  function updateZonePositions(mvp, rectW, rectH){
    var children = materialZoneLayer.children;
    for(var i = 0; i < children.length; i++){
      var el = children[i];
      var z = el._zone;
      var p = sphereFromLatLon(z.lat, z.lon, radius);
      var cw = mvp[3]*p.x + mvp[7]*p.y + mvp[11]*p.z + mvp[15];
      if(cw <= 0.05){ el.style.display = 'none'; continue; }
      var cx = mvp[0]*p.x + mvp[4]*p.y + mvp[8]*p.z + mvp[12];
      var cy = mvp[1]*p.x + mvp[5]*p.y + mvp[9]*p.z + mvp[13];
      var ndx = cx / cw, ndy = cy / cw;
      if(ndx < -1.15 || ndx > 1.15 || ndy < -1.15 || ndy > 1.15){ el.style.display = 'none'; continue; }
      el.style.display = 'block';
      el.style.left = ((ndx * 0.5 + 0.5) * rectW) + 'px';
      el.style.top = ((1 - (ndy * 0.5 + 0.5)) * rectH) + 'px';
    }
  }

  function openZonePopup(zoneIndex, screenX, screenY){
    var scene = scenes[activeSceneIndex];
    var zone = scene.materialZones[zoneIndex];
    zonePopupHeader.textContent = zone.label;
    zonePopupSwatches.innerHTML = '';
    zone.options.forEach(function(opt){
      var sw = document.createElement('div');
      sw.className = 'swatch' + (scene.selection[zone.id] === opt.key ? ' active' : '');
      var icon = document.createElement('div');
      icon.className = 'swatch-icon';
      icon.style.background = labelToColor(opt.label);
      icon.textContent = opt.label.charAt(0).toUpperCase();
      var label = document.createElement('div');
      label.className = 'swatch-label';
      label.textContent = opt.label;
      sw.appendChild(icon);
      sw.appendChild(label);
      sw.addEventListener('click', function(){
        applyZoneSelection(zoneIndex, opt.key);
        closeZonePopup();
      });
      zonePopupSwatches.appendChild(sw);
    });

    zonePopup.classList.add('on');
    var pw = zonePopup.offsetWidth || 220, ph = zonePopup.offsetHeight || 100;
    var x = Math.min(Math.max(8, screenX - pw/2), window.innerWidth - pw - 8);
    var y = Math.max(8, screenY - ph - 14);
    zonePopup.style.left = x + 'px';
    zonePopup.style.top = y + 'px';
  }

  function applyZoneSelection(zoneIndex, optionKey){
    var scene = scenes[activeSceneIndex];
    var zone = scene.materialZones[zoneIndex];
    if(scene.selection[zone.id] === optionKey) return;

    var newSelection = {};
    Object.keys(scene.selection).forEach(function(k){ newSelection[k] = scene.selection[k]; });
    newSelection[zone.id] = optionKey;
    var comboKey = comboKeyFor(scene, newSelection);
    var combo = scene.combos[comboKey];
    if(!combo || (!combo.img && !combo.videoEl)){
      alert('Kombinasi ini belum tersedia. Render fotonya lalu upload lewat "Kelola Kombinasi".');
      return;
    }

    playFallbackBtn.classList.remove('on');
    var prevType = scene.type, prevVideoEl = scene.videoEl;
    var incomingSource = (combo.type === 'video' && combo.videoEl) ? combo.videoEl : combo.img;

    startCrossfade(incomingSource, function(){
      if(prevType === 'video' && prevVideoEl){ prevVideoEl.pause(); }
      scene.selection = newSelection;
      scene.type = combo.type;
      scene.src = combo.src;
      scene.img = combo.img;
      scene.videoEl = combo.videoEl;
      if(combo.thumbSrc) scene.thumbSrc = combo.thumbSrc;
      if(scene.type === 'video' && scene.videoEl){
        activeVideoEl = scene.videoEl;
        scene.videoEl.currentTime = 0;
        var p = scene.videoEl.play();
        if(p && p.catch){ p.catch(function(){ playFallbackBtn.classList.add('on'); }); }
      } else {
        activeVideoEl = null;
      }
      renderScenePanel();
    });
  }

  // ---------- Combination matrix manager ----------
  function cartesianProduct(zones){
    return zones.reduce(function(acc, zone){
      var next = [];
      acc.forEach(function(combo){
        zone.options.forEach(function(opt){
          next.push(combo.concat([{ zoneId: zone.id, key: opt.key, label: opt.label }]));
        });
      });
      return next;
    }, [[]]);
  }

  function renderComboMatrix(){
    comboTable.innerHTML = '';
    var scene = scenes[activeSceneIndex];
    if(!scene.materialZones.length){
      comboTable.innerHTML = '<p style="font-family:var(--mono);font-size:12px;color:var(--text-dim)">Spot ini belum punya zona material. Aktifkan "Zona Material" lalu klik di gambar untuk membuat zona dulu.</p>';
      return;
    }
    var combos = cartesianProduct(scene.materialZones);
    combos.forEach(function(combo){
      var key = combo.map(function(c){ return c.key; }).join('|');
      var comboLabel = combo.map(function(c){ return c.label; }).join(' + ');
      var existing = scene.combos[key];

      var row = document.createElement('div');
      row.className = 'combo-row';

      var status = document.createElement('div');
      status.className = 'combo-status';
      status.textContent = existing ? '✅' : '⬜';

      var text = document.createElement('div');
      text.className = 'combo-label';
      text.textContent = comboLabel;

      var uploadBtn = document.createElement('button');
      uploadBtn.className = 'btn combo-upload-btn';
      uploadBtn.textContent = existing ? 'Ganti Foto' : 'Upload Foto';
      uploadBtn.addEventListener('click', function(){
        pendingComboKey = key;
        comboFileInput.click();
      });

      row.appendChild(status);
      row.appendChild(text);
      row.appendChild(uploadBtn);
      comboTable.appendChild(row);
    });
  }

  comboFileInput.addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    comboFileInput.value = '';
    if(!file || !pendingComboKey || activeSceneIndex === -1) return;
    var scene = scenes[activeSceneIndex];
    var key = pendingComboKey;
    pendingComboKey = null;

    function finalize(media){
      scene.combos[key] = media;
      renderComboMatrix();
      // If this combo matches what's currently selected, refresh the view live.
      if(comboKeyFor(scene, scene.selection) === key && activeSceneIndex !== -1){
        var incomingSource = (media.type === 'video' && media.videoEl) ? media.videoEl : media.img;
        var prevType = scene.type, prevVideoEl = scene.videoEl;
        startCrossfade(incomingSource, function(){
          if(prevType === 'video' && prevVideoEl){ prevVideoEl.pause(); }
          scene.type = media.type; scene.src = media.src; scene.img = media.img; scene.videoEl = media.videoEl;
          if(media.thumbSrc) scene.thumbSrc = media.thumbSrc;
          if(scene.type === 'video' && scene.videoEl){
            activeVideoEl = scene.videoEl;
            scene.videoEl.currentTime = 0;
            var p = scene.videoEl.play();
            if(p && p.catch){ p.catch(function(){ playFallbackBtn.classList.add('on'); }); }
          } else { activeVideoEl = null; }
          renderScenePanel();
        });
      }
    }

    if(file.type.indexOf('video/') === 0){
      var objectUrl = URL.createObjectURL(file);
      var video = document.createElement('video');
      video.src = objectUrl;
      video.muted = true; video.loop = true; video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.addEventListener('loadeddata', function onReady(){
        video.removeEventListener('loadeddata', onReady);
        finalize({ type: 'video', img: null, videoEl: video, objectUrl: objectUrl, src: null, thumbSrc: capturePosterFrame(video) });
      });
    } else {
      var reader = new FileReader();
      reader.onload = function(ev){
        var img = new Image();
        img.onload = function(){
          finalize({ type: 'image', img: fitImageToDeviceLimit(img), videoEl: null, src: null, thumbSrc: ev.target.result });
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  function addFilesAsScenes(fileList){
    var files = Array.prototype.slice.call(fileList);
    files.forEach(function(file){
      if(file.type.indexOf('video/') === 0){
        addVideoFileAsScene(file);
        return;
      }
      var reader = new FileReader();
      reader.onload = function(ev){
        var img = new Image();
        img.onload = function(){
          scenes.push({ name: niceNameFromFile(file.name), thumbSrc: ev.target.result, img: fitImageToDeviceLimit(img), type: 'image', hotspots: [] });
          initSceneMaterials(scenes[scenes.length - 1]);
          hintEl.classList.add('hidden');
          if(activeSceneIndex === -1){
            switchScene(scenes.length - 1);
          } else {
            renderScenePanel();
          }
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function addVideoFileAsScene(file){
    var objectUrl = URL.createObjectURL(file);
    var video = document.createElement('video');
    video.src = objectUrl;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.crossOrigin = 'anonymous';
    video.addEventListener('loadeddata', function onReady(){
      video.removeEventListener('loadeddata', onReady);
      var poster = capturePosterFrame(video);
      scenes.push({ name: niceNameFromFile(file.name), thumbSrc: poster, img: null, videoEl: video, objectUrl: objectUrl, type: 'video', hotspots: [] });
      initSceneMaterials(scenes[scenes.length - 1]);
      hintEl.classList.add('hidden');
      if(activeSceneIndex === -1){
        switchScene(scenes.length - 1);
      } else {
        renderScenePanel();
      }
    });
  }

  function capturePosterFrame(videoEl){
    try{
      var c = document.createElement('canvas');
      c.width = 512; c.height = 256;
      var ctx = c.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.7);
    } catch(err){
      return '';
    }
  }

  fileInput.addEventListener('change', function(e){
    if(e.target.files && e.target.files.length){
      addFilesAsScenes(e.target.files);
    }
    fileInput.value = '';
  });

  // ---------- Hotspots ----------
  var hotspotLayer = document.getElementById('hotspotLayer');
  var editBanner = document.getElementById('editBanner');
  var hotspotBtn = document.getElementById('hotspotBtn');

  hotspotBtn.addEventListener('click', function(){
    editMode = !editMode;
    hotspotBtn.classList.toggle('active', editMode);
    canvas.classList.toggle('edit-mode', editMode);
    editBanner.classList.toggle('on', editMode);
    rebuildHotspotMarkers();
  });

  function findSceneIndexByName(name){
    var target = (name || '').trim().toLowerCase();
    for(var i = 0; i < scenes.length; i++){
      if(scenes[i].name.trim().toLowerCase() === target) return i;
    }
    return -1;
  }

  function handleEditClick(clientX, clientY){
    if(activeSceneIndex === -1) return;
    var rect = canvas.getBoundingClientRect();

    // Clicked directly on an existing marker -> handled by the marker's own
    // listener (delete), so if we're here it's empty panorama space -> add.
    var ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    var ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    var tanHalfFovY = Math.tan((fov * Math.PI/180) / 2);
    var aspect = rect.width / rect.height;
    var dirView = vecNormalize({ x: ndcX * tanHalfFovY * aspect, y: ndcY * tanHalfFovY, z: -1 });
    var invRot = mat4Transpose(currentViewMatrix);
    var dirWorld = mat4TransformDir(invRot, dirView);
    var ll = latLonFromDir(dirWorld);

    var others = scenes.filter(function(s, i){ return i !== activeSceneIndex; });
    if(others.length === 0){
      alert('Muat / tambahkan spot lain dulu sebelum membuat hotspot tujuan.');
      return;
    }
    var list = others.map(function(s, i){ return (i+1) + '. ' + s.name; }).join('\n');
    var answer = prompt('Hotspot ini menuju ke spot mana?\n\n' + list + '\n\nMasukkan nomor:', '1');
    if(answer === null) return;
    var idx = parseInt(answer, 10) - 1;
    if(isNaN(idx) || idx < 0 || idx >= others.length){
      alert('Nomor tidak valid, hotspot tidak dibuat.');
      return;
    }
    var targetScene = others[idx];

    if(!scenes[activeSceneIndex].hotspots) scenes[activeSceneIndex].hotspots = [];
    scenes[activeSceneIndex].hotspots.push({
      lat: ll.lat, lon: ll.lon,
      target: targetScene.name
    });
    rebuildHotspotMarkers();
  }

  function rebuildHotspotMarkers(){
    hotspotLayer.innerHTML = '';
    if(activeSceneIndex === -1) return;
    var scene = scenes[activeSceneIndex];
    var hotspots = scene.hotspots || [];
    hotspots.forEach(function(hs, hIdx){
      var el = document.createElement('div');
      el.className = 'hotspot' + (editMode ? ' edit-mode' : '');
      el.innerHTML = '<div class="ring"></div><div class="ring2"></div><div class="core"></div><div class="arrow"></div><div class="tag"></div>';
      el.querySelector('.tag').textContent = editMode ? ('Hapus · → ' + hs.target) : ('→ ' + hs.target);
      el.addEventListener('click', function(ev){
        ev.stopPropagation();
        if(editMode){
          if(confirm('Hapus hotspot menuju "' + hs.target + '"?')){
            hotspots.splice(hIdx, 1);
            rebuildHotspotMarkers();
          }
        } else {
          var targetIdx = findSceneIndexByName(hs.target);
          if(targetIdx === -1){
            alert('Spot tujuan "' + hs.target + '" belum dimuat.');
          } else {
            switchScene(targetIdx);
          }
        }
      });
      el._hs = hs;
      hotspotLayer.appendChild(el);
    });
  }

  function updateHotspotPositions(mvp, rectW, rectH){
    var children = hotspotLayer.children;
    for(var i = 0; i < children.length; i++){
      var el = children[i];
      var hs = el._hs;
      var p = sphereFromLatLon(hs.lat, hs.lon, radius);
      var cw = mvp[3]*p.x + mvp[7]*p.y + mvp[11]*p.z + mvp[15];
      if(cw <= 0.05){ el.style.display = 'none'; continue; }
      var cx = mvp[0]*p.x + mvp[4]*p.y + mvp[8]*p.z + mvp[12];
      var cy = mvp[1]*p.x + mvp[5]*p.y + mvp[9]*p.z + mvp[13];
      var ndx = cx / cw, ndy = cy / cw;
      if(ndx < -1.15 || ndx > 1.15 || ndy < -1.15 || ndy > 1.15){ el.style.display = 'none'; continue; }
      el.style.display = 'block';
      el.style.left = ((ndx * 0.5 + 0.5) * rectW) + 'px';
      el.style.top = ((1 - (ndy * 0.5 + 0.5)) * rectH) + 'px';
    }
  }

  // ---------- Export configuration ----------
  var exportModal = document.getElementById('exportModal');
  var exportText = document.getElementById('exportText');

  function buildExportText(){
    var lines = ['var SCENE_MANIFEST = ['];
    scenes.forEach(function(s){
      var defaultKey = (s.materialZones && s.materialZones.length) ? s.materialZones.map(function(z){ return z.options[0].key; }).join('|') : null;
      var baseMedia = (defaultKey && s.combos[defaultKey]) ? s.combos[defaultKey] : { type: s.type, src: s.src };
      var baseExt = baseMedia.type === 'video' ? '.mp4' : '.jpg';
      var basePlaceholder = 'images/' + slugify(s.name) + baseExt;
      lines.push('  {');
      lines.push('    name: ' + JSON.stringify(s.name) + ',');
      lines.push('    src: ' + (baseMedia.src ? JSON.stringify(baseMedia.src) : ('"' + basePlaceholder + '"')) + (baseMedia.src ? '' : ',  // TODO: salin file aslinya ke images/ dan sesuaikan nama file'));

      if(s.materialZones && s.materialZones.length){
        lines.push('    materialZones: [');
        s.materialZones.forEach(function(z){
          var optsText = z.options.map(function(o){ return '{ key: ' + JSON.stringify(o.key) + ', label: ' + JSON.stringify(o.label) + ' }'; }).join(', ');
          lines.push('      { id: ' + JSON.stringify(z.id) + ', label: ' + JSON.stringify(z.label) + ', lat: ' + z.lat.toFixed(1) + ', lon: ' + z.lon.toFixed(1) + ', options: [' + optsText + '] },');
        });
        lines.push('    ],');

        var comboKeys = Object.keys(s.combos).filter(function(k){ return k !== defaultKey; });
        lines.push('    combos: {');
        comboKeys.forEach(function(k){
          var combo = s.combos[k];
          var ext = combo.type === 'video' ? '.mp4' : '.jpg';
          var placeholder = 'images/' + slugify(s.name) + '-' + slugify(k) + ext;
          var srcText = combo.src ? JSON.stringify(combo.src) : ('"' + placeholder + '"');
          var todo = combo.src ? '' : '  // TODO: salin file aslinya ke images/ dan sesuaikan nama file';
          lines.push('      ' + JSON.stringify(k) + ': ' + srcText + ',' + todo);
        });
        lines.push('    },');
      }

      var hs = s.hotspots || [];
      if(hs.length){
        lines.push('    hotspots: [');
        hs.forEach(function(h){
          lines.push('      { lat: ' + h.lat.toFixed(1) + ', lon: ' + h.lon.toFixed(1) + ', target: ' + JSON.stringify(h.target) + ' },');
        });
        lines.push('    ]');
      } else {
        lines.push('    hotspots: []');
      }
      lines.push('  },');
    });
    lines.push('];');
    return lines.join('\n');
  }

  document.getElementById('exportBtn').addEventListener('click', function(){
    exportText.value = buildExportText();
    exportModal.classList.add('on');
  });
  document.getElementById('exportCloseBtn').addEventListener('click', function(){
    exportModal.classList.remove('on');
  });
  document.getElementById('exportCopyBtn').addEventListener('click', function(){
    exportText.select();
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(exportText.value);
    } else {
      document.execCommand('copy');
    }
  });

  // ---------- Loading screen ----------
  // Only waits for the FIRST scene's default photo/video — everything else
  // (material combinations, additional spots) keeps loading quietly in the
  // background afterward, so visitors aren't stuck waiting on a large batch.
  var loadingScreenEl = document.getElementById('loadingScreen');
  var loadingBarFill = document.getElementById('loadingBarFill');
  var loadingPercentEl = document.getElementById('loadingPercent');
  var loadingSubEl = document.getElementById('loadingSub');
  var loadingHidden = false;
  var sceneLoadedCount = 0;

  function updateLoadingUI(){
    var total = SCENE_MANIFEST.length || 1;
    var pct = Math.min(100, Math.round((sceneLoadedCount / total) * 100));
    loadingBarFill.style.width = pct + '%';
    loadingPercentEl.textContent = pct + '%';
  }

  function hideLoadingScreen(){
    if(loadingHidden) return;
    loadingHidden = true;
    loadingBarFill.style.width = '100%';
    loadingPercentEl.textContent = '100%';
    loadingSubEl.textContent = 'Menyiapkan tampilan…';
    loadingScreenEl.classList.add('done');
    setTimeout(function(){ loadingScreenEl.style.display = 'none'; }, 550);
  }

  if(!SCENE_MANIFEST.length){
    hideLoadingScreen();
  } else {
    loadingSubEl.textContent = 'Memuat "' + SCENE_MANIFEST[0].name + '"…';
    updateLoadingUI();
    // Failsafe: never leave a visitor stuck on the loading screen forever
    // if every file happens to be slow or blocked (e.g. network hiccup).
    setTimeout(hideLoadingScreen, 25000);
  }

  // ---------- Preload fixed manifest (auto scenes for every visitor) ----------
  var VIDEO_EXT = /\.(mp4|webm|ogv|mov)(\?.*)?$/i;

  // Generic loader: fetches an image or video from a URL and returns a media descriptor via callback.
  function loadMediaEntry(src, label, cb, onError){
    if(VIDEO_EXT.test(src)){
      var video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.preload = 'auto';
      video.addEventListener('loadeddata', function onReady(){
        video.removeEventListener('loadeddata', onReady);
        cb({ label: label, thumbSrc: capturePosterFrame(video), type: 'video', img: null, videoEl: video, src: src });
      });
      video.addEventListener('error', function(){
        console.warn('Gagal memuat media:', src);
        if(onError) onError();
      });
      video.src = src;
    } else {
      var img = new Image();
      img.onload = function(){
        cb({ label: label, thumbSrc: src, type: 'image', img: fitImageToDeviceLimit(img), videoEl: null, src: src });
      };
      img.onerror = function(){
        console.warn('Gagal memuat media:', src);
        if(onError) onError();
      };
      img.src = src;
    }
  }

  function preloadManifest(){
    if(!SCENE_MANIFEST.length) return;

    function loadEntryAsScene(entry, isFirst){
      loadMediaEntry(entry.src, 'Default', function(media){
        var scene = {
          name: entry.name,
          thumbSrc: media.thumbSrc, img: media.img, videoEl: media.videoEl,
          src: media.src, type: media.type,
          hotspots: (entry.hotspots || []).slice()
        };
        scenes.push(scene);
        initSceneMaterials(scene);

        // Material zones (combinatorial): register zone definitions + the
        // scene's own base photo as the default combination.
        if(entry.materialZones && entry.materialZones.length){
          scene.materialZones = entry.materialZones.map(function(z){
            return { id: z.id || slugify(z.label), label: z.label, lat: z.lat, lon: z.lon, options: (z.options || []).slice() };
          });
          scene.selection = {};
          scene.materialZones.forEach(function(z){
            scene.selection[z.id] = z.options[0] ? z.options[0].key : null;
          });
          var defaultKey = comboKeyFor(scene, scene.selection);
          scene.combos[defaultKey] = { type: media.type, img: media.img, videoEl: media.videoEl, src: media.src, thumbSrc: media.thumbSrc };

          // Load the rest of the combination photos quietly in the background —
          // does not block or extend the loading screen.
          Object.keys(entry.combos || {}).forEach(function(comboKey){
            loadMediaEntry(entry.combos[comboKey], comboKey, function(comboMedia){
              scene.combos[comboKey] = comboMedia;
            }, function(){});
          });
        }

        hintEl.classList.add('hidden');
        if(activeSceneIndex === -1){
          switchScene(scenes.length - 1);
          hideLoadingScreen();
        } else {
          renderScenePanel();
        }
        sceneLoadedCount++;
        updateLoadingUI();

        // The first scene gets the network to itself so it shows up as fast
        // as possible; only once it's ready do the remaining spots (and their
        // material combinations) start downloading in the background.
        if(isFirst){
          for(var i = 1; i < SCENE_MANIFEST.length; i++){
            loadEntryAsScene(SCENE_MANIFEST[i], false);
          }
        }
      }, function(){
        sceneLoadedCount++;
        updateLoadingUI();
        if(isFirst){
          for(var i = 1; i < SCENE_MANIFEST.length; i++){
            loadEntryAsScene(SCENE_MANIFEST[i], false);
          }
        }
      });
    }

    loadEntryAsScene(SCENE_MANIFEST[0], true);
  }
  preloadManifest();

  var autoBtn = document.getElementById('autoBtn');
  autoBtn.addEventListener('click', function(){
    autoRotate = !autoRotate;
    autoBtn.classList.toggle('active', autoRotate);
  });

  document.getElementById('fsBtn').addEventListener('click', function(){
    var el = document.getElementById('stage');
    if(!document.fullscreenElement){
      if(el.requestFullscreen) el.requestFullscreen();
    } else {
      if(document.exitFullscreen) document.exitFullscreen();
    }
  });

  // ---------- Render loop ----------
  function render(){
    if(autoRotate && !dragging){
      yaw = (yaw + 0.08) % 360;
    }

    resize();
    refreshVideoTexture();
    gl.clearColor(0.08, 0.07, 0.06, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var aspect = canvas.width / canvas.height;
    var proj = mat4Perspective(fov * Math.PI/180, aspect, 0.1, 100);
    var view = mat4Multiply(mat4RotateX(pitch * Math.PI/180), mat4RotateY(-yaw * Math.PI/180));
    var mvp = mat4Multiply(proj, view);
    currentViewMatrix = view;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.uniformMatrix4fv(uMVP, false, new Float32Array(mvp));

    var blend = tickTransition();
    gl.uniform1f(uBlend, blend);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uTex, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textureB);
    gl.uniform1i(uTexB, 1);

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    var canvasRect = canvas.getBoundingClientRect();
    updateHotspotPositions(mvp, canvasRect.width, canvasRect.height);
    updateZonePositions(mvp, canvasRect.width, canvasRect.height);

    requestAnimationFrame(render);
  }
  updateFovReadout();
  requestAnimationFrame(render);

  // ---------- Apply MODE_EDITOR ----------
  if(!MODE_EDITOR){
    ['loadBtn', 'hotspotBtn', 'zoneBtn', 'comboBtn', 'exportBtn'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.style.display = 'none';
    });
  }
})();