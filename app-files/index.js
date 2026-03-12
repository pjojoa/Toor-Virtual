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
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  // Grab elements from DOM.
  var panoElement = document.querySelector('#pano');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');
  var galleryToggleElement = document.querySelector('#galleryToggle');
  var galleryOverlayElement = document.querySelector('#galleryOverlay');
  var galleryStripElement = document.querySelector('#galleryStrip');
  var floorPlanToggleElement = document.querySelector('#floorPlanToggle');
  var floorPlanOverlayElement = document.querySelector('#floorPlanOverlay');
  var floorPlanMarkersElement = document.querySelector('#floorPlanMarkers');
  var floorPlanImageElement = document.querySelector('#floorPlanImage');

  // Floor plan markers (one per scene).
  var floorPlanMarkerBySceneId = {};

  function normalizeFloorPlanConfig() {
    // Expected shape:
    // data.settings.floorPlan = { markers: [ { sceneId, x, y } ] }
    // x/y are percentages in the [0..100] range.
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

    // Remove previous markers if any (e.g. script reload).
    floorPlanMarkersElement.innerHTML = '';
    floorPlanMarkerBySceneId = {};

    var posById = normalizeFloorPlanConfig();
    var count = data.scenes.length;

    // Fallback placement (grid) when no coordinates are provided.
    // This keeps everything functional; you can later add real x/y in data.js.
    function fallbackPos(i) {
      var cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(count))));
      var rows = Math.ceil(count / cols);
      var col = i % cols;
      var row = Math.floor(i / cols);

      var padding = 10; // %
      var usableW = 100 - padding * 2;
      var usableH = 100 - padding * 2;

      var x = padding + (cols === 1 ? usableW / 2 : (usableW * (col / (cols - 1))));
      var y = padding + (rows === 1 ? usableH / 2 : (usableH * (row / (rows - 1))));
      return { x: x, y: y };
    }

    data.scenes.forEach(function(sceneData, i) {
      var sceneId = sceneData.id;
      var pos = posById[sceneId] || fallbackPos(i);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'floorPlanMarker';
      btn.setAttribute('aria-label', 'Ir a: ' + sceneData.name);

      // Posición base en porcentaje (configurada o de fallback).
      btn.style.left = pos.x + '%';
      btn.style.top = pos.y + '%';

      // Ajustes finos por escena basados en las coordenadas editadas en el navegador.
      var manualPixelPositions = {
        // Baño principal
        'Baño principal': { left: '256px', top: '78px' },
        // Baño secundario (a la izquierda del baño principal)
        'Baño secundario': { left: '220px', top: '78px' },
        // Cocina
        'Cocina': { left: '102px', top: '76px' },
        // Comedor
        'Comedor': { left: '103px', top: '151px' },
        // Entrada
        'Entrada': { left: '143px', top: '10px' },
        // Espacio abierto
        'Espacio abierto': { left: '189px', top: '213px' },
        // Sala
        'Sala': { left: '108px', top: '201px' },
        // Vestier
        'Vestier': { left: '284px', top: '33px' },
        // Zona de oficios
        'Zona de oficios': { left: '178px', top: '39px' },
        // Punto central 1
        'Punto central 1': { left: '144px', top: '96px' },
        // Punto central 2
        'Punto central 2': { left: '231px', top: '151px' },
        // Punto medio Espacio abierto
        'Punto medio Espacio abierto': { left: '155px', top: '214px' },
        // Habitación secundaria
        'Habitación secundaria': { left: '248px', top: '250px' },
        // Habitación secundaria 2
        'Habitación secundaria 2': { left: '250px', top: '182px' },
        // Habitación ppal mesa de noche
        'Habitación ppal mesa de noche': { left: '335px', top: '77px' },
        // Habitación entrada
        'Habitación entrada': { left: '284px', top: '148px' },
        // Habitación entrada vestier
        'Habitación entrada vestier': { left: '283px', top: '76px' },
        // Balcon 2
        'Balcon 2': { left: '78px', top: '252px' }
      };

      var manual = manualPixelPositions[sceneData.name];
      if (manual) {
        if (manual.left != null) btn.style.left = manual.left;
        if (manual.top != null) btn.style.top = manual.top;
      }

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var targetScene = findSceneById(sceneId);
        if (targetScene) {
          switchScene(targetScene);
        }
      });

      // Allow clicking markers even though the container is pointer-events:none.
      btn.style.pointerEvents = 'auto';

      floorPlanMarkersElement.appendChild(btn);
      floorPlanMarkerBySceneId[sceneId] = btn;
    });

    // If we already have an active scene, highlight it.
    // (Updated again on every scene switch.)
    if (scenes && scenes[0] && scenes[0].data && scenes[0].data.id) {
      setFloorPlanCurrentScene(scenes[0].data.id);
    }
  }

  // Detect desktop or mobile mode.
  if (window.matchMedia) {
    var setMode = function() {
      if (mql.matches) {
        document.body.classList.remove('desktop');
        document.body.classList.add('mobile');
      } else {
        document.body.classList.remove('mobile');
        document.body.classList.add('desktop');
      }
    };
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    setMode();
    mql.addListener(setMode);
  } else {
    document.body.classList.add('desktop');
  }

  // Detect whether we are on a touch device.
  document.body.classList.add('no-touch');
  window.addEventListener('touchstart', function() {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  });

  // Use tooltip fallback mode on IE < 11.
  if (bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add('tooltip-fallback');
  }

  // Viewer options.
  var viewerOpts = {
    controls: {
      mouseViewMode: data.settings.mouseViewMode
    }
  };

  // Initialize viewer.
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  // Scene title overlay (moved into #pano).
  var sceneNameElement = document.createElement('h1');
  sceneNameElement.className = 'sceneName';
  panoElement.appendChild(sceneNameElement);

  // Create scenes.
  var scenes = data.scenes.map(function(data) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + data.id + "/preview.jpg" });
    var geometry = new Marzipano.CubeGeometry(data.levels);

    var limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);

    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    // Create link hotspots.
    data.linkHotspots.forEach(function(hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create info hotspots.
    data.infoHotspots.forEach(function(hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    return {
      data: data,
      scene: scene,
      view: view
    };
  });

  // Set up autorotate, if enabled.
  var autorotate = Marzipano.autorotate({
    yawSpeed: 0.03,
    targetPitch: 0,
    targetFov: Math.PI/2
  });
  if (data.settings.autorotateEnabled) {
    autorotateToggleElement.classList.add('enabled');
  }

  // Set handler for autorotate toggle.
  autorotateToggleElement.addEventListener('click', toggleAutorotate);

  // Set up fullscreen mode, if supported.
  if (screenfull.enabled && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    fullscreenToggleElement.addEventListener('click', function() {
      screenfull.toggle();
    });
    screenfull.on('change', function() {
      if (screenfull.isFullscreen) {
        fullscreenToggleElement.classList.add('enabled');
      } else {
        fullscreenToggleElement.classList.remove('enabled');
      }
    });
  } else {
    document.body.classList.add('fullscreen-disabled');
  }

  // Set handler for scene list toggle.
  sceneListToggleElement.addEventListener('click', toggleSceneList);

  // Start with the scene list open on desktop.
  if (!document.body.classList.contains('mobile')) {
    showSceneList();
  }

  // Set handler for scene switch.
  scenes.forEach(function(scene) {
    var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
    el.addEventListener('click', function() {
      switchScene(scene);
    });
  });

  // Add thumbnails to the scene list using each scene preview.
  scenes.forEach(function(scene) {
    var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
    if (!el) return;

    // Avoid duplicates if the script is reloaded.
    if (el.querySelector('.sceneThumb')) return;

    el.style.position = 'relative';

    var img = document.createElement('img');
    img.className = 'sceneThumb';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = '';
    img.src = 'tiles/' + scene.data.id + '/preview.jpg';

    el.insertBefore(img, el.firstChild);
  });

  // Allow dragging the horizontal scene strip (desktop/mouse).
  (function enableSceneListDrag() {
    if (!sceneListElement) return;

    var isDown = false;
    var startX = 0;
    var startScrollLeft = 0;
    var dragThresholdPx = 6;
    var didDrag = false;
    var lastDragAt = 0;

    function onPointerDown(e) {
      // Only left click or touch/pen.
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!sceneListElement.classList.contains('enabled')) return;

      isDown = true;
      didDrag = false;
      startX = e.clientX;
      startScrollLeft = sceneListElement.scrollLeft;
      sceneListElement.classList.add('is-dragging');
      try { sceneListElement.setPointerCapture(e.pointerId); } catch (_) {}
    }

    function onPointerMove(e) {
      if (!isDown) return;
      var dx = e.clientX - startX;
      if (!didDrag && Math.abs(dx) >= dragThresholdPx) {
        didDrag = true;
        lastDragAt = Date.now();
      }
      sceneListElement.scrollLeft = startScrollLeft - dx;
      if (didDrag) {
        e.preventDefault();
      }
    }

    function endDrag() {
      if (!isDown) return;
      isDown = false;
      sceneListElement.classList.remove('is-dragging');
      if (didDrag) {
        lastDragAt = Date.now();
      }
      didDrag = false;
    }

    // Prevent clicks on scene items when a drag happened.
    sceneListElement.addEventListener('click', function(e) {
      if (Date.now() - lastDragAt > 250) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    sceneListElement.addEventListener('pointerdown', onPointerDown, { passive: false });
    sceneListElement.addEventListener('pointermove', onPointerMove, { passive: false });
    sceneListElement.addEventListener('pointerup', endDrag);
    sceneListElement.addEventListener('pointercancel', endDrag);
    sceneListElement.addEventListener('pointerleave', endDrag);
  })();

  // Gallery overlay (uses scene previews as gallery items).
  function openGallery() {
    if (!galleryOverlayElement || !galleryStripElement) return;
    galleryOverlayElement.classList.add('is-open');
    galleryOverlayElement.setAttribute('aria-hidden', 'false');
    stopAutorotate();
  }

  function closeGallery() {
    if (!galleryOverlayElement) return;
    galleryOverlayElement.classList.remove('is-open');
    galleryOverlayElement.setAttribute('aria-hidden', 'true');
    startAutorotate();
  }

  function toggleGallery() {
    if (!galleryOverlayElement) return;
    if (galleryOverlayElement.classList.contains('is-open')) {
      closeGallery();
    } else {
      openGallery();
    }
  }

  function populateGallery() {
    if (!galleryStripElement) return;
    galleryStripElement.innerHTML = '';

    scenes.forEach(function(scene) {
      var item = document.createElement('div');
      item.className = 'galleryItem';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', 'Ir a ' + scene.data.name);

      var img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = scene.data.name;
      img.src = 'tiles/' + scene.data.id + '/preview.jpg';

      var label = document.createElement('div');
      label.className = 'galleryItem-label';
      label.textContent = scene.data.name;

      item.appendChild(img);
      item.appendChild(label);

      var go = function() {
        switchScene(scene);
        closeGallery();
      };

      item.addEventListener('click', go);
      item.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          go();
        }
      });

      galleryStripElement.appendChild(item);
    });
  }

  if (galleryToggleElement && galleryOverlayElement) {
    populateGallery();

    galleryToggleElement.addEventListener('click', toggleGallery);
    galleryOverlayElement.addEventListener('click', function(e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute('data-gallery-close') === 'true') {
        closeGallery();
      }
    });
    window.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeGallery();
      }
    });
  }

  // Floor plan overlay.
  function openFloorPlan() {
    if (!floorPlanOverlayElement) return;
    floorPlanOverlayElement.classList.add('is-open');
    floorPlanOverlayElement.setAttribute('aria-hidden', 'false');
    stopAutorotate();
  }

  function closeFloorPlan() {
    if (!floorPlanOverlayElement) return;
    floorPlanOverlayElement.classList.remove('is-open');
    floorPlanOverlayElement.setAttribute('aria-hidden', 'true');
    startAutorotate();
  }

  function toggleFloorPlan() {
    if (!floorPlanOverlayElement) return;
    if (floorPlanOverlayElement.classList.contains('is-open')) {
      closeFloorPlan();
    } else {
      openFloorPlan();
    }
  }

  if (floorPlanToggleElement && floorPlanOverlayElement) {
    createFloorPlanMarkers();
    // Mantener el plano abierto mientras se navega por el tour.
    openFloorPlan();

    // El usuario controla explícitamente abrir/cerrar con el botón del plano.
    floorPlanToggleElement.addEventListener('click', toggleFloorPlan);
    floorPlanOverlayElement.addEventListener('click', function(e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute('data-floorplan-close') === 'true') {
        closeFloorPlan();
      }
    });
  }

  // DOM elements for view controls.
  var viewUpElement = document.querySelector('#viewUp');
  var viewDownElement = document.querySelector('#viewDown');
  var viewLeftElement = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement = document.querySelector('#viewIn');
  var viewOutElement = document.querySelector('#viewOut');

  // Dynamic parameters for controls.
  var velocity = 0.7;
  var friction = 3;

  // Associate view controls with elements.
  var controls = viewer.controls();
  controls.registerMethod('upElement',    new Marzipano.ElementPressControlMethod(viewUpElement,     'y', -velocity, friction), true);
  controls.registerMethod('downElement',  new Marzipano.ElementPressControlMethod(viewDownElement,   'y',  velocity, friction), true);
  controls.registerMethod('leftElement',  new Marzipano.ElementPressControlMethod(viewLeftElement,   'x', -velocity, friction), true);
  controls.registerMethod('rightElement', new Marzipano.ElementPressControlMethod(viewRightElement,  'x',  velocity, friction), true);
  controls.registerMethod('inElement',    new Marzipano.ElementPressControlMethod(viewInElement,  'zoom', -velocity, friction), true);
  controls.registerMethod('outElement',   new Marzipano.ElementPressControlMethod(viewOutElement, 'zoom',  velocity, friction), true);

  function sanitize(s) {
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
  }

  function switchScene(scene) {
    stopAutorotate();
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();
    startAutorotate();
    updateSceneName(scene);
    updateSceneList(scene);
    setFloorPlanCurrentScene(scene.data.id);
  }

  function updateSceneName(scene) {
    sceneNameElement.innerHTML = sanitize(scene.data.name);
  }

  function updateSceneList(scene) {
    for (var i = 0; i < sceneElements.length; i++) {
      var el = sceneElements[i];
      if (el.getAttribute('data-id') === scene.data.id) {
        el.classList.add('current');
      } else {
        el.classList.remove('current');
      }
    }
  }

  function showSceneList() {
    sceneListElement.classList.add('enabled');
    sceneListToggleElement.classList.add('enabled');
  }

  function hideSceneList() {
    sceneListElement.classList.remove('enabled');
    sceneListToggleElement.classList.remove('enabled');
  }

  function toggleSceneList() {
    sceneListElement.classList.toggle('enabled');
    sceneListToggleElement.classList.toggle('enabled');
  }

  function startAutorotate() {
    if (!autorotateToggleElement.classList.contains('enabled')) {
      return;
    }
    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);
  }

  function stopAutorotate() {
    viewer.stopMovement();
    viewer.setIdleMovement(Infinity);
  }

  function toggleAutorotate() {
    if (autorotateToggleElement.classList.contains('enabled')) {
      autorotateToggleElement.classList.remove('enabled');
      stopAutorotate();
    } else {
      autorotateToggleElement.classList.add('enabled');
      startAutorotate();
    }
  }

  function createLinkHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('link-hotspot');

    // Create image element.
    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');

    // Set rotation transform.
    var transformProperties = [ '-ms-transform', '-webkit-transform', 'transform' ];
    for (var i = 0; i < transformProperties.length; i++) {
      var property = transformProperties[i];
      icon.style[property] = 'rotate(' + hotspot.rotation + 'rad)';
    }

    // Add click event handler.
    wrapper.addEventListener('click', function() {
      switchScene(findSceneById(hotspot.target));
    });

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    // Create tooltip element.
    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip');
    tooltip.classList.add('link-hotspot-tooltip');
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;

    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);

    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('info-hotspot');

    // Create hotspot/tooltip header.
    var header = document.createElement('div');
    header.classList.add('info-hotspot-header');

    // Create image element.
    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');
    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.classList.add('info-hotspot-icon');
    iconWrapper.appendChild(icon);

    // Create title element.
    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('info-hotspot-title-wrapper');
    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.innerHTML = hotspot.title;
    titleWrapper.appendChild(title);

    // Create close element.
    var closeWrapper = document.createElement('div');
    closeWrapper.classList.add('info-hotspot-close-wrapper');
    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('info-hotspot-close-icon');
    closeWrapper.appendChild(closeIcon);

    // Construct header element.
    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    // Create text element.
    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');
    text.innerHTML = hotspot.text;

    // Place header and text into wrapper element.
    wrapper.appendChild(header);
    wrapper.appendChild(text);

    // Create a modal for the hotspot content to appear on mobile mode.
    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');
    document.body.appendChild(modal);

    var toggle = function() {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    };

    // Show content when hotspot is clicked.
    wrapper.querySelector('.info-hotspot-header').addEventListener('click', toggle);

    // Hide content when close icon is clicked.
    modal.querySelector('.info-hotspot-close-wrapper').addEventListener('click', toggle);

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    return wrapper;
  }

  // Prevent touch and scroll events from reaching the parent element.
  function stopTouchAndScrollEventPropagation(element, eventList) {
    var eventList = [ 'touchstart', 'touchmove', 'touchend', 'touchcancel',
                      'wheel', 'mousewheel' ];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function(event) {
        event.stopPropagation();
      });
    }
  }

  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) {
        return scenes[i];
      }
    }
    return null;
  }

  function findSceneDataById(id) {
    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) {
        return data.scenes[i];
      }
    }
    return null;
  }

  // Display the initial scene.
  switchScene(scenes[0]);

})();
