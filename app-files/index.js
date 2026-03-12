/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

(function() {
  var Marzipano = window.Marzipano;
  var bowser    = window.bowser;
  var screenfull= window.screenfull;
  var data      = window.APP_DATA;

  // DOM elements
  var panoElement             = document.querySelector('#pano');
  var galleryToggleElement    = document.querySelector('#galleryToggle');
  var galleryOverlayElement   = document.querySelector('#galleryOverlay');
  var galleryStripElement     = document.querySelector('#galleryStrip');
  var floorPlanToggleElement  = document.querySelector('#floorPlanToggle');
  var floorPlanOverlayElement = document.querySelector('#floorPlanOverlay');
  var floorPlanMarkersElement = document.querySelector('#floorPlanMarkers');
  var galleryImgBySceneId     = {};
  var galleryDragBound        = false;
  var gallerySuppressClickUntil = 0;

  // Floor plan marker registry
  var floorPlanMarkerBySceneId = {};

  function normalizeFloorPlanConfig() {
    var fp = (data && data.settings && data.settings.floorPlan) ? data.settings.floorPlan : null;
    var markers = fp && Array.isArray(fp.markers) ? fp.markers : [];
    var map = {};
    for (var i = 0; i < markers.length; i++) {
      var m = markers[i];
      if (!m || !m.sceneId) continue;
      if (typeof m.x !== 'number' || typeof m.y !== 'number') continue;
      map[m.sceneId] = { x: m.x, y: m.y };
    }
    return map;
  }

  function setFloorPlanCurrentScene(sceneId) {
    for (var id in floorPlanMarkerBySceneId) {
      if (!Object.prototype.hasOwnProperty.call(floorPlanMarkerBySceneId, id)) continue;
      var el = floorPlanMarkerBySceneId[id];
      if (!el) continue;
      if (id === sceneId) el.classList.add('is-current');
      else el.classList.remove('is-current');
    }
  }

  function createFloorPlanMarkers() {
    if (!floorPlanMarkersElement) return;
    floorPlanMarkersElement.innerHTML = '';
    floorPlanMarkerBySceneId = {};

    var posById = normalizeFloorPlanConfig();
    var count   = data.scenes.length;

    function fallbackPos(i) {
      var cols   = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(count))));
      var rows   = Math.ceil(count / cols);
      var col    = i % cols;
      var row    = Math.floor(i / cols);
      var pad    = 10;
      var usableW = 100 - pad * 2;
      var usableH = 100 - pad * 2;
      return {
        x: pad + (cols === 1 ? usableW / 2 : usableW * (col / (cols - 1))),
        y: pad + (rows === 1 ? usableH / 2 : usableH * (row / (rows - 1)))
      };
    }

    // Pixel positions fine-tuned in the browser for each scene
    var manualPositions = {
      'Baño principal':                { left: '256px', top: '78px'  },
      'Baño secundario':               { left: '220px', top: '78px'  },
      'Cocina':                        { left: '102px', top: '76px'  },
      'Comedor':                       { left: '103px', top: '151px' },
      'Entrada':                       { left: '143px', top: '10px'  },
      'Espacio abierto':               { left: '189px', top: '213px' },
      'Sala':                          { left: '108px', top: '201px' },
      'Vestier':                       { left: '284px', top: '33px'  },
      'Zona de oficios':               { left: '178px', top: '39px'  },
      'Punto central 1':               { left: '144px', top: '96px'  },
      'Punto central 2':               { left: '231px', top: '151px' },
      'Punto medio Espacio abierto':   { left: '155px', top: '214px' },
      'Habitación secundaria':         { left: '248px', top: '250px' },
      'Habitación secundaria 2':       { left: '250px', top: '182px' },
      'Habitación ppal mesa de noche': { left: '335px', top: '77px'  },
      'Habitación entrada':            { left: '284px', top: '148px' },
      'Habitación entrada vestier':    { left: '283px', top: '76px'  },
      'Balcon 2':                      { left: '78px',  top: '252px' }
    };

    data.scenes.forEach(function(sceneData, i) {
      var sceneId = sceneData.id;
      var pos     = posById[sceneId] || fallbackPos(i);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'floorPlanMarker';
      btn.setAttribute('aria-label', 'Ir a: ' + sceneData.name);
      btn.style.left = pos.x + '%';
      btn.style.top  = pos.y + '%';
      btn.style.pointerEvents = 'auto';

      var manual = manualPositions[sceneData.name];
      if (manual) {
        if (manual.left) btn.style.left = manual.left;
        if (manual.top)  btn.style.top  = manual.top;
      }

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var target = findSceneById(sceneId);
        if (target) switchScene(target);
      });

      floorPlanMarkersElement.appendChild(btn);
      floorPlanMarkerBySceneId[sceneId] = btn;
    });

    if (scenes && scenes[0]) setFloorPlanCurrentScene(scenes[0].data.id);
  }

  // Desktop / mobile detection
  if (window.matchMedia) {
    var mql     = matchMedia("(max-width: 500px), (max-height: 500px)");
    var setMode = function() {
      document.body.classList.toggle('mobile',  mql.matches);
      document.body.classList.toggle('desktop', !mql.matches);
    };
    setMode();
    mql.addListener(setMode);
  } else {
    document.body.classList.add('desktop');
  }

  // Touch detection
  document.body.classList.add('no-touch');
  window.addEventListener('touchstart', function() {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  });

  // IE < 11 tooltip fallback
  if (bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add('tooltip-fallback');
  }

  // Marzipano viewer
  var viewer = new Marzipano.Viewer(panoElement, {
    controls: { mouseViewMode: data.settings.mouseViewMode }
  });

  // Create scenes — note: callback param named 'sceneData' to avoid shadowing outer 'data'
  var scenes = data.scenes.map(function(sceneData) {
    var urlPrefix = 'tiles';
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + '/' + sceneData.id + '/{z}/{f}/{y}/{x}.jpg',
      { cubeMapPreviewUrl: urlPrefix + '/' + sceneData.id + '/preview.jpg' }
    );
    var geometry = new Marzipano.CubeGeometry(sceneData.levels);
    var limiter  = Marzipano.RectilinearView.limit.traditional(
      sceneData.faceSize, 100 * Math.PI / 180, 120 * Math.PI / 180
    );
    var view  = new Marzipano.RectilinearView(sceneData.initialViewParameters, limiter);
    var scene = viewer.createScene({ source: source, geometry: geometry, view: view, pinFirstLevel: true });

    sceneData.linkHotspots.forEach(function(hotspot) {
      scene.hotspotContainer().createHotspot(
        createLinkHotspotElement(hotspot), { yaw: hotspot.yaw, pitch: hotspot.pitch }
      );
    });
    sceneData.infoHotspots.forEach(function(hotspot) {
      scene.hotspotContainer().createHotspot(
        createInfoHotspotElement(hotspot), { yaw: hotspot.yaw, pitch: hotspot.pitch }
      );
    });

    return { data: sceneData, scene: scene, view: view };
  });

  // Autorotate
  var autorotate = Marzipano.autorotate({
    yawSpeed: 0.03, targetPitch: 0, targetFov: Math.PI / 2
  });
  var autorotateEnabled = !!data.settings.autorotateEnabled;

  function startAutorotate() {
    if (!autorotateEnabled) return;
    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);
    if (window.TourNavigationBar) TourNavigationBar.setAutorotateState(true);
  }

  function stopAutorotate() {
    viewer.stopMovement();
    viewer.setIdleMovement(Infinity);
    if (window.TourNavigationBar) TourNavigationBar.setAutorotateState(false);
  }

  // Fullscreen
  if (screenfull.enabled && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    screenfull.on('change', function() {
      var btn = document.getElementById('tour-nav-fullscreen');
      if (btn) {
        btn.classList.toggle('is-active', screenfull.isFullscreen);
        var icon = btn.querySelector('i');
        if (icon) {
          icon.className = screenfull.isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
        }
      }
    });
  } else {
    document.body.classList.add('fullscreen-disabled');
  }

  // Gallery overlay
  function openGallery() {
    if (!galleryOverlayElement) return;
    galleryOverlayElement.classList.add('is-open');
    galleryOverlayElement.setAttribute('aria-hidden', 'false');
    stopAutorotate();
    if (window.TourNavigationBar) TourNavigationBar.setGridState(true);
  }

  function closeGallery() {
    if (!galleryOverlayElement) return;
    galleryOverlayElement.classList.remove('is-open');
    galleryOverlayElement.setAttribute('aria-hidden', 'true');
    startAutorotate();
    if (window.TourNavigationBar) TourNavigationBar.setGridState(false);
  }

  function toggleGallery() {
    if (!galleryOverlayElement) return;
    if (galleryOverlayElement.classList.contains('is-open')) closeGallery();
    else openGallery();
  }

  function populateGallery() {
    if (!galleryStripElement) return;
    galleryStripElement.innerHTML = '';
    galleryImgBySceneId = {};
    scenes.forEach(function(scene) {
      var item = document.createElement('div');
      item.className = 'galleryItem';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', 'Ir a ' + scene.data.name);

      var img = document.createElement('img');
      img.loading  = 'lazy';
      img.decoding = 'async';
      img.alt      = scene.data.name;
      img.src      = 'tiles/' + scene.data.id + '/preview.jpg';
      img.dataset.sceneId = scene.data.id;

      var label = document.createElement('div');
      label.className   = 'galleryItem-label';
      label.textContent = scene.data.name;

      item.appendChild(img);
      item.appendChild(label);

      var go = function() { switchScene(scene); closeGallery(); };
      item.addEventListener('click', function(e) {
        // Evita navegación accidental inmediatamente después de un drag.
        if (Date.now() < gallerySuppressClickUntil) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        go();
      });
      item.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });

      galleryStripElement.appendChild(item);
      galleryImgBySceneId[scene.data.id] = img;
    });
  }

  function enableGalleryStripDrag() {
    if (!galleryStripElement || galleryDragBound) return;
    galleryDragBound = true;

    // Desktop (mouse): drag horizontal robusto sin romper click.
    // Touch: se deja el swipe nativo del navegador (touch-action: pan-x).
    var isMouseDown = false;
    var didDrag = false;
    var startX = 0;
    var startScrollLeft = 0;
    var dragThresholdPx = 6;

    function onMouseDown(e) {
      if (e.button !== 0) return;
      isMouseDown = true;
      didDrag = false;
      startX = e.clientX;
      startScrollLeft = galleryStripElement.scrollLeft;
      galleryStripElement.classList.add('is-dragging');
    }

    function onMouseMove(e) {
      if (!isMouseDown) return;
      var dx = e.clientX - startX;
      if (!didDrag && Math.abs(dx) >= dragThresholdPx) {
        didDrag = true;
      }
      if (didDrag) {
        galleryStripElement.scrollLeft = startScrollLeft - dx;
        e.preventDefault();
      }
    }

    function onMouseUp() {
      if (!isMouseDown) return;
      isMouseDown = false;
      galleryStripElement.classList.remove('is-dragging');
      if (didDrag) {
        // Bloqueo corto para que el \"click\" sintético del drag no abra escena.
        gallerySuppressClickUntil = Date.now() + 220;
      }
      didDrag = false;
    }

    galleryStripElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove, { passive: false });
    window.addEventListener('mouseup', onMouseUp);
  }

  // Reemplaza miniaturas de galería con la primera vista real de cada escena.
  // Mantiene preview.jpg como fallback para no perder funcionalidad.
  function buildInitialViewGalleryThumbs() {
    if (!Marzipano || !galleryStripElement || !data || !data.scenes || !data.scenes.length) return;

    var container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.position = 'fixed';
    container.style.left = '-9999px';  /* fuera de pantalla, SIN opacity:0 para que WebGL renderice bien */
    container.style.top = '0';
    container.style.width = '480px';   /* más grande → captura de mayor calidad */
    container.style.height = '270px';
    container.style.overflow = 'hidden';
    container.style.pointerEvents = 'none';
    container.style.visibility = 'hidden'; /* oculto visualmente pero sin afectar el renderizado WebGL */
    document.body.appendChild(container);

    var thumbViewer = new Marzipano.Viewer(container, { controls: { mouseViewMode: 'drag' } });
    var thumbScenes = data.scenes.map(function(sceneData) {
      var urlPrefix = 'tiles';
      var source = Marzipano.ImageUrlSource.fromString(
        urlPrefix + '/' + sceneData.id + '/{z}/{f}/{y}/{x}.jpg',
        { cubeMapPreviewUrl: urlPrefix + '/' + sceneData.id + '/preview.jpg' }
      );
      var geometry = new Marzipano.CubeGeometry(sceneData.levels);
      var limiter  = Marzipano.RectilinearView.limit.traditional(
        sceneData.faceSize, 100 * Math.PI / 180, 120 * Math.PI / 180
      );
      var view  = new Marzipano.RectilinearView(sceneData.initialViewParameters, limiter);
      var scene = thumbViewer.createScene({ source: source, geometry: geometry, view: view, pinFirstLevel: true });
      return { id: sceneData.id, scene: scene };
    });

    function cleanup() {
      try { if (container && container.parentNode) container.parentNode.removeChild(container); } catch (_) {}
    }

    function captureAt(i) {
      if (i >= thumbScenes.length) {
        cleanup();
        return;
      }

      thumbViewer.switchScene(thumbScenes[i].scene);
      setTimeout(function() {
        try {
          var canvas = container.querySelector('canvas');
          if (canvas && canvas.width > 0 && canvas.height > 0) {
            var dataUrl = canvas.toDataURL('image/jpeg', 1.0); /* máxima calidad */
            var img = galleryImgBySceneId[thumbScenes[i].id];
            if (img) {
              img.src = dataUrl;
              img.style.opacity = '1';
              img.style.filter  = 'none';
            }
          }
        } catch (_) {}
        captureAt(i + 1);
      }, 320); /* más tiempo → más tiles cargados antes de capturar */
    }

    setTimeout(function() { captureAt(0); }, 400); /* espera inicial para que el viewer esté listo */
  }

  if (galleryOverlayElement) {
    populateGallery();
    enableGalleryStripDrag();
    buildInitialViewGalleryThumbs();

    // Flechas de navegación de la tira de miniaturas
    var galleryArrowPrev = document.getElementById('gallery-arrow-prev');
    var galleryArrowNext = document.getElementById('gallery-arrow-next');
    var ARROW_SCROLL_PX  = 500; // píxeles que avanza cada clic

    if (galleryArrowPrev) {
      galleryArrowPrev.addEventListener('click', function() {
        if (galleryStripElement) {
          galleryStripElement.scrollBy({ left: -ARROW_SCROLL_PX, behavior: 'smooth' });
        }
      });
    }
    if (galleryArrowNext) {
      galleryArrowNext.addEventListener('click', function() {
        if (galleryStripElement) {
          galleryStripElement.scrollBy({ left: ARROW_SCROLL_PX, behavior: 'smooth' });
        }
      });
    }

    if (galleryToggleElement) galleryToggleElement.addEventListener('click', toggleGallery);
    galleryOverlayElement.addEventListener('click', function(e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute('data-gallery-close') === 'true') {
        closeGallery();
      }
    });
    window.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeGallery();
    });
  }

  // Floor plan overlay
  function openFloorPlan() {
    if (!floorPlanOverlayElement) return;
    floorPlanOverlayElement.classList.add('is-open');
    floorPlanOverlayElement.setAttribute('aria-hidden', 'false');
    document.body.classList.add('floorplan-open');
  }

  function closeFloorPlan() {
    if (!floorPlanOverlayElement) return;
    floorPlanOverlayElement.classList.remove('is-open');
    floorPlanOverlayElement.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('floorplan-open');
  }

  function toggleFloorPlan() {
    if (!floorPlanOverlayElement) return;
    if (floorPlanOverlayElement.classList.contains('is-open')) closeFloorPlan();
    else openFloorPlan();
  }

  if (floorPlanToggleElement && floorPlanOverlayElement) {
    createFloorPlanMarkers();
    openFloorPlan();
    floorPlanToggleElement.addEventListener('click', toggleFloorPlan);
    floorPlanOverlayElement.addEventListener('click', function(e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute('data-floorplan-close') === 'true') {
        closeFloorPlan();
      }
    });
  }

  // View control buttons (directional arrows + zoom)
  var viewUpElement    = document.querySelector('#viewUp');
  var viewDownElement  = document.querySelector('#viewDown');
  var viewLeftElement  = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement    = document.querySelector('#viewIn');
  var viewOutElement   = document.querySelector('#viewOut');

  var velocity = 0.7;
  var friction = 3;
  var controls = viewer.controls();
  controls.registerMethod('upElement',    new Marzipano.ElementPressControlMethod(viewUpElement,    'y', -velocity, friction), true);
  controls.registerMethod('downElement',  new Marzipano.ElementPressControlMethod(viewDownElement,  'y',  velocity, friction), true);
  controls.registerMethod('leftElement',  new Marzipano.ElementPressControlMethod(viewLeftElement,  'x', -velocity, friction), true);
  controls.registerMethod('rightElement', new Marzipano.ElementPressControlMethod(viewRightElement, 'x',  velocity, friction), true);
  controls.registerMethod('inElement',    new Marzipano.ElementPressControlMethod(viewInElement,  'zoom', -velocity, friction), true);
  controls.registerMethod('outElement',   new Marzipano.ElementPressControlMethod(viewOutElement, 'zoom',  velocity, friction), true);

  // Scene management
  var currentScene = null;

  function switchScene(scene) {
    stopAutorotate();
    currentScene = scene;
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();
    startAutorotate();
    setFloorPlanCurrentScene(scene.data.id);
  }

  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) return scenes[i];
    }
    return null;
  }

  function findSceneDataById(id) {
    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) return data.scenes[i];
    }
    return null;
  }

  // Hotspot creation
  function createLinkHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot', 'link-hotspot');

    var icon = document.createElement('img');
    icon.src = 'img/circle-circle-white.svg';
    icon.alt = '';
    icon.classList.add('link-hotspot-icon');

    if (typeof hotspot.pitch === 'number') {
      if (hotspot.pitch < -0.1)      icon.classList.add('link-hotspot-icon--floor');
      else if (hotspot.pitch > 0.1)  icon.classList.add('link-hotspot-icon--ceiling');
      else                           icon.classList.add('link-hotspot-icon--wall');
    }

    var rotate = 'rotate(' + hotspot.rotation + 'rad)';
    icon.style['-ms-transform']      = rotate;
    icon.style['-webkit-transform']  = rotate;
    icon.style['transform']          = rotate;

    wrapper.addEventListener('click', function() {
      switchScene(findSceneById(hotspot.target));
    });

    stopTouchAndScrollEventPropagation(wrapper);

    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip', 'link-hotspot-tooltip');
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;

    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);
    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot', 'info-hotspot');

    var header = document.createElement('div');
    header.classList.add('info-hotspot-header');

    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');
    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.classList.add('info-hotspot-icon');
    iconWrapper.appendChild(icon);

    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('info-hotspot-title-wrapper');
    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.innerHTML = hotspot.title;
    titleWrapper.appendChild(title);

    var closeWrapper = document.createElement('div');
    closeWrapper.classList.add('info-hotspot-close-wrapper');
    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('info-hotspot-close-icon');
    closeWrapper.appendChild(closeIcon);

    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');
    text.innerHTML = hotspot.text;

    wrapper.appendChild(header);
    wrapper.appendChild(text);

    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');
    document.body.appendChild(modal);

    var toggle = function() {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    };

    wrapper.querySelector('.info-hotspot-header').addEventListener('click', toggle);
    modal.querySelector('.info-hotspot-close-wrapper').addEventListener('click', toggle);

    stopTouchAndScrollEventPropagation(wrapper);
    return wrapper;
  }

  function stopTouchAndScrollEventPropagation(element) {
    var events = ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel', 'mousewheel'];
    events.forEach(function(evt) {
      element.addEventListener(evt, function(e) { e.stopPropagation(); });
    });
  }

  // Start with the first scene
  switchScene(scenes[0]);

  // Navigation bar integration
  if (window.TourNavigationBar) {
    TourNavigationBar.init({ autoHide: false, autoHideDelay: 0, visibleOnInit: true, toggleArea: null });

    var barEl = document.getElementById('tour-navigation-bar');
    if (barEl) {

      barEl.addEventListener('tour-nav-prev', function() {
        if (!currentScene) return;
        var idx = scenes.indexOf(currentScene);
        switchScene(scenes[(idx - 1 + scenes.length) % scenes.length]);
      });

      barEl.addEventListener('tour-nav-next', function() {
        if (!currentScene) return;
        var idx = scenes.indexOf(currentScene);
        switchScene(scenes[(idx + 1) % scenes.length]);
      });

      barEl.addEventListener('tour-nav-grid', function() {
        if (galleryOverlayElement.classList.contains('is-open')) closeGallery();
        else openGallery();
      });

      barEl.addEventListener('tour-nav-play', function() {
        autorotateEnabled = true;
        startAutorotate();
      });

      barEl.addEventListener('tour-nav-pause', function() {
        autorotateEnabled = false;
        stopAutorotate();
      });

      barEl.addEventListener('tour-nav-zoom-in', function() {
        if (!currentScene) return;
        var p = currentScene.view.parameters();
        currentScene.view.setParameters({ yaw: p.yaw, pitch: p.pitch, fov: Math.max(0.3, p.fov * 0.85) });
      });

      barEl.addEventListener('tour-nav-zoom-out', function() {
        if (!currentScene) return;
        var p = currentScene.view.parameters();
        currentScene.view.setParameters({ yaw: p.yaw, pitch: p.pitch, fov: Math.min(Math.PI * 0.95, p.fov * 1.18) });
      });

      barEl.addEventListener('tour-nav-reset', function() {
        if (currentScene) currentScene.view.setParameters(currentScene.data.initialViewParameters);
      });
    }

    // Fullscreen button (direct click, not via CustomEvent)
    var fullscreenBtn = document.getElementById('tour-nav-fullscreen');
    if (fullscreenBtn && screenfull.enabled) {
      fullscreenBtn.addEventListener('click', function() { screenfull.toggle(); });
    }

    if (autorotateEnabled) TourNavigationBar.setAutorotateState(true);
  }

})();
