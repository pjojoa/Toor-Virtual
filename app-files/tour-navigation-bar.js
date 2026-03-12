/**
 * TOUR NAVIGATION BAR
 * Barra de navegación inferior para tours 360°.
 */
(function (window) {
  'use strict';

  var bar = null;
  var opts = { autoHide: false, autoHideDelay: 0, visibleOnInit: true };
  var hideTimer = null;

  function show() {
    if (!bar) return;
    bar.classList.add('is-visible');
    bar.setAttribute('aria-hidden', 'false');
    if (opts.autoHide && opts.autoHideDelay > 0) {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, opts.autoHideDelay);
    }
  }

  function hide() {
    if (!bar) return;
    bar.classList.remove('is-visible');
    bar.setAttribute('aria-hidden', 'true');
    clearTimeout(hideTimer);
  }

  function toggle() {
    bar && bar.classList.contains('is-visible') ? hide() : show();
  }

  function emit(name) {
    if (!bar) return;
    try {
      bar.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: true, detail: {} }));
    } catch (e) {
      var ev = document.createEvent('CustomEvent');
      ev.initCustomEvent(name, true, true, {});
      bar.dispatchEvent(ev);
    }
  }

  function setAutorotateState(active) {
    if (!bar) return;
    var play = bar.querySelector('#tour-nav-play');
    var pause = bar.querySelector('#tour-nav-pause');
    if (play)  play.classList.toggle('is-active',  !!active);
    if (pause) pause.classList.toggle('is-active', !active);
  }

  function setGridState(active) {
    if (!bar) return;
    var grid = bar.querySelector('#tour-nav-grid');
    if (grid) grid.classList.toggle('is-grid-active', !!active);
  }

  function bindButtons() {
    var ids = ['prev','next','grid','play','pause','zoom-in','zoom-out','reset','fullscreen'];
    ids.forEach(function (id) {
      var btn = bar.querySelector('#tour-nav-' + id);
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        emit('tour-nav-' + id);
      });
    });
  }

  function init(options) {
    opts = {
      autoHide:      options && options.autoHide      != null ? options.autoHide      : false,
      autoHideDelay: options && options.autoHideDelay != null ? options.autoHideDelay : 0,
      visibleOnInit: options && options.visibleOnInit != null ? options.visibleOnInit : true
    };

    bar = document.getElementById('tour-navigation-bar');
    if (!bar) return null;

    bindButtons();

    if (opts.visibleOnInit) {
      /* pequeño delay para que la transición CSS sea visible */
      setTimeout(show, 50);
    }

    return { show: show, hide: hide, toggle: toggle,
             setAutorotateState: setAutorotateState, setGridState: setGridState };
  }

  window.TourNavigationBar = {
    init: init, show: show, hide: hide, toggle: toggle,
    setAutorotateState: setAutorotateState, setGridState: setGridState
  };

})(window);
