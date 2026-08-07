/* =============================================================================
   StreamStage booth kiosk — shared core
   Calgary Dance Teacher Expo, Tue Aug 11 – Wed Aug 12 2026

   THE ONE PLACE YOU EDIT.  Everything about the five products — the film file,
   the signup URL, the tile copy — lives in CONFIG below.  Nothing is hard-coded
   anywhere else.  Re-render a film, drop it in media/, done.

   Loaded by BOTH tablet.html and tv.html.  No dependencies, no network, no CDN.
   ========================================================================== */

var CONFIG = {

  /* ---------------------------------------------------------------------
     THE FIVE PRODUCTS.  Order here == order of the tiles on the tablet.

     film[]  — tried in order, first one that loads wins.  Put the newest cut
               first.  sync-media.sh copies whichever exists upstream, so when
               Daniel's ElevenLabs VO lands and a new promo.mp4 is rendered,
               re-running sync-media.sh is the entire deploy.
     url     — where the per-product QR points.  ?src/&p/&s are appended
               automatically (see qrUrl()) so a real scan is attributable on
               the destination side.  That is the ONLY true scan count we get.
     --------------------------------------------------------------------- */
  products: [
    {
      id:     'studiosage',
      name:   'StudioSage',
      short:  'The AI front desk. Parents text it.',
      tagline:'The AI front desk. Parents text it — it answers from your own emails.',
      accent: '#4EC5D4',
      film:   ['media/studiosage.mp4'],
      url:    'https://studiosage.ai'
    },
    {
      id:     'compsync',
      name:   'CompSync',
      short:  'Runs the whole competition weekend.',
      tagline:'Competition management, from entries through to the livestream.',
      accent: '#F59E0B',
      film:   ['media/compsync.mp4'],
      url:    'https://compsync.net',
      // ⚠ Daniel never gave a signup URL for CompSync. compsync.net is an
      // assumption so the QR is not dead on the floor.  Confirm before Aug 10.
      urlUnconfirmed: true
    },
    {
      id:     'callboard',
      name:   'Callboard',
      short:  'Scheduling that knows your rules.',
      tagline:'Rehearsal scheduling that already knows your rules.',
      accent: '#4EC5D4',
      film:   ['media/callboard.mp4'],
      url:    'https://callboard-scheduler.vercel.app'
    },
    {
      id:     'costumecraft',
      name:   'CostumeCraft',
      short:  'Design, measurements, quantities — one place.',
      tagline:'Design, measurements and per-class quantities in one place.',
      accent: '#F59E0B',
      film:   ['media/costumecraft.mp4'],
      url:    'https://costume-craft.vercel.app'
    },
    {
      // The repo is called StudioSync. The PRODUCT is StudioBeat. "StudioSync"
      // is the old name and must never appear on a booth screen.
      id:     'studiobeat',
      name:   'StudioBeat',
      short:  'The whole studio, in one place.',
      tagline:'Classes, families, payments and the season calendar — one platform instead of five.',
      accent: '#C2785C',
      film:   ['media/studiobeat.mp4'],
      // Confirmed live 2026-08-06: Vercel project `studiosync` serves this, and
      // the page title reads "StudioBeat — Studio Management".
      url:    'https://www.studiobeat.io'
    },
    {
      id:     'reflect',
      name:   'Reflect',
      short:  'Every room on one screen.',
      // Verbatim from the film's own closing line, /mnt/data/reflect-video/out/
      // VO-SCRIPT.md beat 16.  NOT a tagline invented here, and NOT confirmed
      // by Daniel — see README-BOOTH.md.
      tagline:"The system that runs your studio's day — and remembers it.",
      accent: '#4EC5D4',
      film:   ['media/reflect.mp4'],
      url:    'https://reflect-vert.vercel.app/demo/login'
    }
  ],

  /* The community QR that is on BOTH screens at ALL times. Left clean on
     purpose: Facebook strips nothing, but Daniel has no way to read a query
     string off a group join, so an attribution tag would be a fake number. */
  facebook: {
    id:    'facebook',
    label: 'Join the community',
    sub:   'Studio owners + teachers. What ships next, first.',
    url:   'https://www.facebook.com/groups/2834366403591742'
  },

  /* Attribution appended to every PRODUCT QR. Read these off the destination
     side (Vercel logs / analytics) for the only honest scan count. */
  attribution: { src: 'booth-calgary' },

  /* Idle behaviour — the thing that matters more than the demo. */
  idle: {
    returnToAttractMs: 6000,   // after a film ends / is stopped, before attract
    tabletResetMs:     90000,  // tablet drops back to the tile grid if untouched
    attractHoldMs:     11000   // dwell per attract card
  },

  lead: { url: '/expo-leads.html?staff=1' },   // the EXISTING form. Do not build a second one.

  storageKeyPrefix: 'ssKiosk.v1.',
  logEndpoint: '/log',         // serve.py appends to disk. Absent == silent no-op.
  busEndpoint: '/bus'          // serve.py relays taps to a TV on another device.
};

/* Telemetry goes to its own port, one above the page's.

   A browser allows about six connections per HOST. The TV holds a permanent
   event stream plus a live connection per film — the whole budget — so
   telemetry POSTs queued behind the videos and never sent. Measured: fifteen
   films played, fifteen events in the page, zero on disk. A different port is
   a different origin with its own pool, so the record cannot be starved by
   the films. Falls back to same-origin when the port is not knowable. */
(function () {
  if (typeof location === 'undefined') return;
  if (location.protocol.indexOf('http') !== 0 || !location.port) return;
  var next = parseInt(location.port, 10) + 1;
  if (!isFinite(next)) return;
  CONFIG.logEndpoint = location.protocol + '//' + location.hostname + ':' + next + '/log';
})();

/* Build the QR target for a product, with attribution.  surface is 'tv' or
   'tablet' so Daniel can tell which screen actually earned the scan. */
function qrUrl(product, surface) {
  var u = product.url;
  if (!u) return '';
  var sep = u.indexOf('?') === -1 ? '?' : '&';
  return u + sep + 'src=' + encodeURIComponent(CONFIG.attribution.src) +
         '&p=' + encodeURIComponent(product.id) +
         '&s=' + encodeURIComponent(surface);
}

function productById(id) {
  for (var i = 0; i < CONFIG.products.length; i++) {
    if (CONFIG.products[i].id === id) return CONFIG.products[i];
  }
  return null;
}

/* =============================================================================
   BUS — shared state between the tablet and the TV.

   THREE transports, all running at once, because the TV might be either a
   second window on the same laptop OR a Fire Stick across the room:

     1. BroadcastChannel  — instant, same device, same browser. Zero latency.
     2. localStorage      — same device, older browsers, belt and braces.
     3. SSE via serve.py  — THE CROSS-DEVICE PATH. This is what makes a Fire
                            Stick (or an iPad, or any browser on the same wifi)
                            work as the TV. GET /bus is a live event stream;
                            POST /bus publishes to every connected screen.

   Every message carries an id and receivers drop duplicates, so a message that
   arrives twice (once locally, once off the wire) is handled once.

   If serve.py dies, transports 1 and 2 keep a same-laptop setup running. If
   the wifi dies, the same is true. Only the Fire Stick setup needs the server,
   and the browser auto-reconnects to it — EventSource retries on its own.
   ========================================================================== */
var Bus = (function () {
  var NAME    = CONFIG.storageKeyPrefix + 'bus';
  var chan    = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel(NAME) : null;
  var handlers = [];
  var seen    = [];              // ring buffer of recently handled message ids
  var me      = Math.random().toString(36).slice(2, 8);
  var n       = 0;
  var online  = false;           // is the SSE relay connected?
  var onlineHandlers = [];

  function deliver(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg._from === me) return;                 // never handle our own echo
    if (msg._id) {
      if (seen.indexOf(msg._id) !== -1) return;   // already handled by another transport
      seen.push(msg._id);
      if (seen.length > 200) seen.splice(0, 100);
    }
    for (var i = 0; i < handlers.length; i++) {
      try { handlers[i](msg); }
      catch (e) {
        // One bad handler must never stop the booth — but swallowing silently
        // hid a real bug during testing, so it still gets reported.
        if (window.console && console.error) console.error('bus handler failed', e);
      }
    }
  }

  if (chan) chan.onmessage = function (e) { deliver(e.data); };

  window.addEventListener('storage', function (e) {
    if (e.key !== NAME || !e.newValue) return;
    try { deliver(JSON.parse(e.newValue).msg); } catch (err) {}
  });

  /* ---- the cross-device stream ---------------------------------------- */
  function setOnline(v) {
    if (online === v) return;
    online = v;
    for (var i = 0; i < onlineHandlers.length; i++) {
      try { onlineHandlers[i](v); } catch (e) {}
    }
  }

  if (CONFIG.busEndpoint && typeof EventSource !== 'undefined') {
    try {
      var es = new EventSource(CONFIG.busEndpoint);
      es.onopen = function () { setOnline(true); };
      es.onmessage = function (e) {
        setOnline(true);
        try { deliver(JSON.parse(e.data)); } catch (err) {}
      };
      // EventSource reconnects by itself; we only need to reflect the state.
      es.onerror = function () { setOnline(false); };
    } catch (e) { /* file:// or no server — the local transports still work */ }
  }

  return {
    send: function (msg) {
      msg._id   = me + '-' + (++n);
      msg._from = me;

      if (chan) { try { chan.postMessage(msg); } catch (e) {} }
      try { localStorage.setItem(NAME, JSON.stringify({ n: Math.random(), msg: msg })); } catch (e) {}

      if (CONFIG.busEndpoint && typeof fetch !== 'undefined') {
        try {
          fetch(CONFIG.busEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msg),
            keepalive: true
          }).then(function () { setOnline(true); })
            .catch(function () { setOnline(false); });
        } catch (e) {}
      }
    },
    on: function (fn) { handlers.push(fn); },
    onConnection: function (fn) { onlineHandlers.push(fn); fn(online); },
    isOnline: function () { return online; }
  };
})();

/* =============================================================================
   TELEMETRY — the only record of two days of floor traffic.

   Rules this obeys:
   - Append-only, written to localStorage the instant the event happens, so a
     tab that dies loses nothing.
   - Each surface writes its OWN key ('tv' / 'tablet'), so two windows can
     never clobber each other's writes.  Export merges and sorts.
   - Best-effort POST to serve.py, which appends a JSONL file on disk so a
     browser-profile wipe is survivable too.  Failure here is not an error.
   - We record QR IMPRESSIONS, not scans.  A scan happens on the attendee's
     phone and is not observable from this page.  Anything labelled "scan"
     in the export would be a lie, so nothing is.
   ========================================================================== */
var Telemetry = (function () {
  var surface = 'unknown';
  var KEY = function () { return CONFIG.storageKeyPrefix + 'events.' + surface; };
  var sessionId = null;
  var seq = 0;

  function nowIso() { return new Date().toISOString(); }

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { return []; }
  }

  function push(ev) {
    var key = KEY();
    var arr = read(key);
    arr.push(ev);
    try { localStorage.setItem(key, JSON.stringify(arr)); }
    catch (e) {
      // Storage full (two days of events should not get near this, but if it
      // does): drop the OLDEST half rather than lose today's tail.
      try {
        arr = arr.slice(Math.floor(arr.length / 2));
        arr.push(ev);
        localStorage.setItem(key, JSON.stringify(arr));
      } catch (e2) {}
    }
  }

  /* ----------------------------------------------------------------------
     GETTING EVENTS ONTO DISK.

     Not one POST per event. The TV holds a permanent EventSource plus a live
     <video> connection per film — six sockets to one origin, which is exactly
     Chrome's per-host limit, so single-event POSTs queue behind the videos and
     never send. Measured on a TV eight seconds after load: film_start and
     film_first_frame were in its own localStorage and the server had received
     neither. Two days of floor traffic would have quietly stopped reaching the
     disk the moment the films warmed up. sendBeacon did not fix it either.

     So: localStorage stays the source of truth and is written synchronously as
     always, and a flusher posts everything not yet acknowledged as ONE batch
     every few seconds. An event is only marked sent when the server has
     confirmed it, so a stalled request costs nothing — the next flush carries
     the backlog. Far fewer requests, and it self-heals.
     -------------------------------------------------------------------- */
  var flushing = false;

  function flush() {
    if (!CONFIG.logEndpoint || typeof fetch === 'undefined' || flushing) return;
    var key = KEY();
    var arr = read(key);
    var out = [];
    for (var i = 0; i < arr.length; i++) if (!arr[i].sent) out.push(arr[i]);
    if (!out.length) return;

    /* A flush that STALLS must not wedge the flusher. The whole reason this
       is batched is that requests can sit unsent behind the video connections;
       if the in-flight guard never cleared, the first stalled request would
       block every later event for the rest of the day. So each attempt is
       given a deadline and then abandoned — the events stay unsent and the
       next tick tries again. */
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var bail = setTimeout(function () {
      flushing = false;
      if (ctrl) { try { ctrl.abort(); } catch (e) {} }
    }, 6000);

    flushing = true;
    fetch(CONFIG.logEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },  // safelisted: no preflight
      body: JSON.stringify(out),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(bail);
      flushing = false;
      if (!r.ok) return;                       // leave them unsent; retry next tick
      var ids = {};
      for (var j = 0; j < out.length; j++) ids[out[j].eid] = 1;
      var now = read(key);
      for (var k = 0; k < now.length; k++) if (ids[now[k].eid]) now[k].sent = 1;
      try { localStorage.setItem(key, JSON.stringify(now)); } catch (e) {}
    }).catch(function () { clearTimeout(bail); flushing = false; });
  }

  function flushOnExit() {
    // Last chance as the tab dies. Best effort; localStorage still holds it all.
    if (!CONFIG.logEndpoint) return;
    try {
      var arr = read(KEY()), out = [];
      for (var i = 0; i < arr.length; i++) if (!arr[i].sent) out.push(arr[i]);
      if (!out.length) return;
      if (navigator && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(CONFIG.logEndpoint, new Blob([JSON.stringify(out)], { type: 'text/plain' }));
      }
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    setInterval(flush, 3000);
    window.addEventListener('pagehide', flushOnExit);
  }

  return {
    init: function (s) {
      surface = s;
      sessionId = nowIso() + '-' + Math.floor(Math.random() * 1e6).toString(36);
      this.log('surface_open', {});
    },

    /* type: tap | film_start | film_complete | film_abandon | qr_impression |
             attract_cycle | lead_captured | surface_open | export      */
    log: function (type, data) {
      var ev = {
        eid: Date.now().toString(36) + '-' + (seq++).toString(36),
        t: nowIso(),
        ms: Date.now(),
        surface: surface,
        session: sessionId,
        type: type
      };
      for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k)) ev[k] = data[k];
      push(ev);
      flush();
      return ev;
    },

    all: function () {
      var out = [];
      var surfaces = ['tv', 'tablet'];
      for (var i = 0; i < surfaces.length; i++) {
        out = out.concat(read(CONFIG.storageKeyPrefix + 'events.' + surfaces[i]));
      }
      out.sort(function (a, b) { return (a.ms || 0) - (b.ms || 0); });
      return out;
    },

    clear: function () {
      var surfaces = ['tv', 'tablet'];
      for (var i = 0; i < surfaces.length; i++) {
        try { localStorage.removeItem(CONFIG.storageKeyPrefix + 'events.' + surfaces[i]); } catch (e) {}
      }
    }
  };
})();

/* -----------------------------------------------------------------------------
   QR IMPRESSION TIMER.  Starts when a QR becomes visible, logs one event with
   the number of seconds it was actually on screen when it goes away.  This is
   an impression, and the export says so.
   -------------------------------------------------------------------------- */
function QrImpression(target, surface) {
  this.target = target;         // product id, or 'facebook'
  this.surface = surface;
  this.t0 = null;
}
QrImpression.prototype.start = function () {
  if (this.t0 !== null) return;
  this.t0 = Date.now();
};
QrImpression.prototype.stop = function () {
  if (this.t0 === null) return;
  var secs = (Date.now() - this.t0) / 1000;
  this.t0 = null;
  if (secs < 0.4) return;       // a flicker is not an impression
  Telemetry.log('qr_impression', {
    target: this.target,
    shownSeconds: Math.round(secs * 10) / 10
  });
};

/* =============================================================================
   ROLLUP + EXPORT — what the hidden operator view shows, and what the
   one-click export writes.
   ========================================================================== */
var Report = (function () {

  function rollup(events) {
    var per = {};        // product id -> counters
    var r = {
      taps: 0, starts: 0, completes: 0, abandons: 0,
      attractCycles: 0, leads: 0, offersShown: 0,
      fbImpressions: 0, fbSeconds: 0,
      firstEvent: null, lastEvent: null,
      per: per
    };

    function bucket(id) {
      if (!per[id]) per[id] = {
        id: id, name: (productById(id) || {}).name || id,
        taps: 0, starts: 0, completes: 0, abandons: 0,
        watchedSeconds: 0, qrImpressions: 0, qrSeconds: 0
      };
      return per[id];
    }
    for (var i = 0; i < CONFIG.products.length; i++) bucket(CONFIG.products[i].id);

    /* Watch time is walked as a sequence of VIEWS rather than summed off the
       closing event, because a view can end three ways and one of them is
       "the tab died". A view opened by film_start stays open, absorbing
       film_progress marks, until it is closed by a complete or an abandon.
       Anything still open at the end of the log is a crash: it commits the
       last progress mark we saw, so a lost view still contributes the
       seconds it genuinely got. */
    var open = {};              // surface -> {product, watched}
    var lat = [];               // tap -> first painted frame, per play

    function commit(view) {
      if (!view) return;
      bucket(view.product).watchedSeconds += (view.watched || 0);
    }

    for (var j = 0; j < events.length; j++) {
      var e = events[j];
      if (r.firstEvent === null) r.firstEvent = e.t;
      r.lastEvent = e.t;
      var s = e.surface || 'tv';

      if (e.type === 'tap') { r.taps++; bucket(e.product).taps++; }

      else if (e.type === 'film_start') {
        commit(open[s]);                       // an unclosed previous view = crash
        open[s] = { product: e.product, watched: 0 };
        r.starts++; bucket(e.product).starts++;
      }

      else if (e.type === 'film_progress') {
        if (open[s] && open[s].product === e.product) {
          open[s].watched = Math.max(open[s].watched, e.watchedSeconds || 0);
        }
      }

      else if (e.type === 'film_complete') {
        r.completes++;
        var bc = bucket(e.product); bc.completes++;
        bc.watchedSeconds += (e.watchedSeconds || 0);
        open[s] = null;
      }

      else if (e.type === 'film_abandon') {
        r.abandons++;
        var ba = bucket(e.product); ba.abandons++;
        // Real seconds watched; older events only carried the stop position.
        ba.watchedSeconds += (e.watchedSeconds !== undefined ? e.watchedSeconds : (e.atSecond || 0));
        open[s] = null;
      }

      else if (e.type === 'film_first_frame') {
        if (typeof e.latencyMs === 'number') {
          lat.push(e.latencyMs);
          var bl = bucket(e.product);
          bl.latencySamples = (bl.latencySamples || 0) + 1;
          bl.latencyTotal = (bl.latencyTotal || 0) + e.latencyMs;
        }
      }

      else if (e.type === 'attract_cycle') { r.attractCycles++; }
      else if (e.type === 'offer_shown')   { r.offersShown++; }
      else if (e.type === 'lead_captured') { r.leads++; }
      else if (e.type === 'qr_impression') {
        if (e.target === 'facebook') {
          r.fbImpressions++; r.fbSeconds += (e.shownSeconds || 0);
        } else {
          var bq = bucket(e.target); bq.qrImpressions++; bq.qrSeconds += (e.shownSeconds || 0);
        }
      }
    }
    for (var sk in open) if (Object.prototype.hasOwnProperty.call(open, sk)) commit(open[sk]);

    lat.sort(function (a, b) { return a - b; });
    r.startLatency = lat.length ? {
      samples: lat.length,
      medianMs: lat[Math.floor(lat.length / 2)],
      worstMs:  lat[lat.length - 1]
    } : null;

    r.completionRate = r.starts ? Math.round((r.completes / r.starts) * 100) : 0;

    // Most-watched == most seconds of film actually consumed, not most taps.
    var best = null;
    for (var id in per) {
      if (!Object.prototype.hasOwnProperty.call(per, id)) continue;
      if (!best || per[id].watchedSeconds > best.watchedSeconds) best = per[id];
    }
    r.mostWatched = (best && best.watchedSeconds > 0) ? best : null;

    r.ranked = CONFIG.products.map(function (p) { return per[p.id]; })
      .sort(function (a, b) { return b.taps - a.taps || b.watchedSeconds - a.watchedSeconds; });

    return r;
  }

  function toCsv(events) {
    var cols = ['t', 'surface', 'type', 'product', 'target', 'atSecond',
                'watchedSeconds', 'durationSeconds', 'shownSeconds', 'percent',
                'latencyMs', 'via', 'session'];
    var lines = [cols.join(',')];
    for (var i = 0; i < events.length; i++) {
      var e = events[i], row = [];
      for (var c = 0; c < cols.length; c++) {
        var v = e[cols[c]];
        v = (v === undefined || v === null) ? '' : String(v);
        row.push(/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
      }
      lines.push(row.join(','));
    }
    return lines.join('\n');
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  function stamp() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  /* --------------------------------------------------------------------
     THE WHOLE RECORD, not just this browser's half.

     When the TV is a Fire Stick it is a different DEVICE, so its events are
     in its own localStorage and this page can never see them. Both screens
     POST every event to serve.py though, so the server holds the only
     complete record — ask it first, and fall back to local storage when
     there is no server (or it is unreachable).

     Local events are merged on top rather than replaced: if the relay was
     down for a stretch, this browser still holds events the server missed.
     ------------------------------------------------------------------- */
  function key(e) {
    return [e.t, e.surface, e.type, e.product || '', e.target || ''].join('|');
  }

  function load() {
    var local = Telemetry.all();
    if (typeof fetch === 'undefined') return Promise.resolve(local);
    return fetch('/events', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (server) {
        if (!server || !server.length) return local;
        var seen = {}, out = [];
        server.concat(local).forEach(function (e) {
          var k = key(e);
          if (seen[k]) return;
          seen[k] = 1;
          out.push(e);
        });
        out.sort(function (a, b) { return (a.ms || 0) - (b.ms || 0); });
        return out;
      })
      .catch(function () { return local; });
  }

  return {
    rollup: rollup,
    load: load,
    exportAll: function (events) {
      events = events || Telemetry.all();
      var r = rollup(events);
      Telemetry.log('export', { events: events.length });
      download('booth-calgary-' + stamp() + '.csv', toCsv(events), 'text/csv');
      setTimeout(function () {
        download('booth-calgary-' + stamp() + '.json', JSON.stringify({
          exportedAt: new Date().toISOString(),
          note: 'qr_impression counts times a QR was ON SCREEN and for how long. ' +
                'It is NOT a scan count — a scan happens on the attendee phone and ' +
                'cannot be observed from this page. Real scans are attributable on ' +
                'the destination side via ?src=booth-calgary&p=<product>&s=<screen>.',
          summary: r,
          events: events
        }, null, 2), 'application/json');
      }, 400);
      return r;
    }
  };
})();
