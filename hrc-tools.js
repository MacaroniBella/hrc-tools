/*!
 * HRC Tools core
 * One script for every HRC calculator and quiz. Each embed spot on a page looks like:
 *
 *   <div data-hrc-tool="member-leakage" data-hs-portal="123456" data-hs-form="form-guid">
 *     ...fallback content shown only if this script fails to load...
 *   </div>
 *   <script src="https://tools.hrcuso.com/hrc-tools.js" defer></script>
 *
 * This file finds every embed spot, loads that tool's module from /tools/<name>.js,
 * renders it inside a Shadow DOM (so Webflow styles and tool styles never collide),
 * and handles the gated lead form and HubSpot submission for every tool.
 */
(function () {
  'use strict';

  if (window.HRCTools && window.HRCTools.__loaded) return;

  var VERSION = '0.1.1';
  var currentScript = document.currentScript;
  var BASE = (function () {
    var src = currentScript && currentScript.src ? currentScript.src : '';
    return src ? src.replace(/[^/]*$/, '') : './';
  })();

  var registry = {};
  var waiting = {};

  /* ---------------------------------------------------------------- utils */

  function fmtNumber(n) {
    if (!isFinite(n)) return '0';
    return Math.round(n).toLocaleString('en-US');
  }

  function fmtMoney(n) {
    if (!isFinite(n)) return '$0';
    var abs = Math.abs(n);
    if (abs >= 1e9) return '$' + (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (abs >= 1e7) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
    return '$' + fmtNumber(n);
  }

  function fmtPercent(n, digits) {
    if (!isFinite(n)) return '0%';
    return (n * 100).toFixed(digits == null ? 0 : digits) + '%';
  }

  function parseNumber(value) {
    if (value == null) return NaN;
    var cleaned = String(value).replace(/[^0-9.\-]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return NaN;
    return parseFloat(cleaned);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function readCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  function uid(prefix) {
    return (prefix || 'hrc') + '-' + Math.random().toString(36).slice(2, 9);
  }

  /* --------------------------------------------------------------- styles */

  var BASE_CSS = [
    ':host{all:initial;display:block;font-family:var(--hrc-font-body,inherit);color:var(--hrc-text,#1A2733);',
    '--navy:var(--hrc-navy,#0E2C4F);--navy-2:var(--hrc-navy-2,#17406E);--lime:var(--hrc-lime,#7FAE36);',
    '--lime-bright:var(--hrc-lime-bright,#9BC94C);--field:var(--hrc-field,#EDF2F6);--ground:var(--hrc-ground,#FFFFFF);',
    '--text:var(--hrc-text,#1A2733);--muted:var(--hrc-muted,#526170);--line:var(--hrc-line,#C8D2DB);',
    '--on-dark:#EEF3F6;--on-dark-muted:#B5C6D3;--on-dark-line:rgba(238,243,246,.22);--error:#B3261E;',
    '--display:var(--hrc-font-display,inherit);--ui:var(--hrc-font-ui,inherit);line-height:1.55;font-size:16px}',
    '*,*::before,*::after{box-sizing:border-box}',
    '[hidden]{display:none!important}',
    'h2,h3,h4,p{margin:0}',
    'h3{font-family:var(--display);font-size:1.3rem;line-height:1.2;font-weight:700;letter-spacing:-.01em}',
    '.tool{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);border:2px solid var(--navy);background:var(--ground)}',
    '.panel{padding:clamp(24px,4vw,48px);display:flex;flex-direction:column;gap:22px;min-width:0}',
    '.panel-out{background:var(--navy);color:var(--on-dark)}',
    '.label{font-family:var(--ui);font-size:.74rem;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--muted)}',
    '.panel-out .label{color:var(--lime-bright)}',
    '.intro{color:var(--muted);font-size:.95rem}',
    '.field{display:flex;flex-direction:column;gap:7px}',
    '.field label{font-family:var(--ui);font-weight:700;font-size:.9rem}',
    '.hint{font-family:var(--ui);font-size:.8rem;color:var(--muted)}',
    'input[type=text],input[type=email],input[type=tel],select{font:inherit;font-family:var(--ui);font-size:1rem;color:var(--text);',
    'background:var(--ground);border:1.5px solid var(--line);border-bottom:2px solid var(--navy);border-radius:0;padding:12px 13px;width:100%;min-height:46px}',
    'input:focus,select:focus{outline:2px solid var(--lime);outline-offset:1px}',
    '.with-prefix{position:relative}',
    '.with-prefix span{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--muted);font-family:var(--ui);pointer-events:none}',
    '.with-prefix input{padding-left:26px}',
    '.with-suffix{position:relative}',
    '.with-suffix span{position:absolute;right:13px;top:50%;transform:translateY(-50%);color:var(--muted);font-family:var(--ui);pointer-events:none}',
    '.with-suffix input{padding-right:34px}',
    '.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-family:var(--ui);font-weight:700;font-size:.95rem;',
    'padding:13px 22px;border-radius:0;border:2px solid transparent;cursor:pointer;text-decoration:none;line-height:1.2;min-height:46px}',
    '.btn-lime{background:var(--lime-bright);color:#10240A;border-color:#10240A}',
    '.btn-lime:hover{background:#fff}',
    '.btn-navy{background:var(--navy);color:#fff;border-color:var(--navy)}',
    '.btn-navy:hover{background:var(--navy-2);border-color:var(--navy-2)}',
    '.btn-ghost{background:transparent;border-color:var(--on-dark-line);color:var(--on-dark)}',
    '.btn-ghost:hover{border-color:var(--on-dark)}',
    '.btn[disabled]{opacity:.6;cursor:wait}',
    '.btn:focus-visible,a:focus-visible{outline:3px solid var(--lime-bright);outline-offset:2px}',
    '.headline{display:flex;flex-direction:column;gap:6px}',
    '.headline b{font-family:var(--display);font-size:clamp(2.6rem,6vw,3.8rem);line-height:1;font-weight:800;color:var(--lime-bright);',
    'font-variant-numeric:tabular-nums;letter-spacing:-.02em}',
    '.headline span{color:var(--on-dark-muted);font-size:1rem;max-width:34ch}',
    '.rows{display:flex;flex-direction:column}',
    '.row{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:14px 0;border-top:1px solid var(--on-dark-line)}',
    '.row span{color:var(--on-dark-muted);font-size:.95rem;max-width:28ch}',
    '.row b{font-family:var(--display);font-size:clamp(1.3rem,2.6vw,1.7rem);font-weight:800;color:#fff;white-space:nowrap;',
    'font-variant-numeric:tabular-nums;transition:filter .35s ease}',
    '.locked .row b{filter:blur(8px);user-select:none}',
    '.lock-note{display:flex;gap:10px;align-items:center;font-family:var(--ui);font-size:.86rem;color:var(--on-dark-muted)}',
    '.fine{font-family:var(--ui);font-size:.76rem;color:var(--muted);line-height:1.5}',
    '.panel-out .fine{color:var(--on-dark-muted)}',
    /* gate */
    '.gate{grid-column:1/-1;background:var(--field);padding:clamp(24px,4vw,48px);display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(22px,4vw,52px)}',
    '.gate h3{font-size:1.5rem}',
    '.gate form{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
    '.gate .full{grid-column:1/-1}',
    '.check{display:flex;gap:10px;align-items:flex-start;font-family:var(--ui);font-size:.9rem;color:var(--muted)}',
    '.check input{margin-top:3px;width:18px;height:18px;accent-color:var(--navy-2)}',
    '.err{color:var(--error);font-family:var(--ui);font-size:.86rem;min-height:1.2em}',
    '.hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}',
    '.done{display:flex;flex-direction:column;gap:14px;background:var(--ground);border:2px solid var(--lime);padding:26px}',
    '.done .actions{display:flex;flex-wrap:wrap;gap:10px}',
    '.done .btn-ghost{color:var(--navy);border-color:var(--navy)}',
    '.preview-note{font-family:var(--ui);font-size:.78rem;font-weight:700;color:#A9501A;letter-spacing:.04em}',
    /* method */
    'details.method{grid-column:1/-1;border-top:2px solid var(--navy);padding:18px clamp(24px,4vw,48px)}',
    'details.method summary{cursor:pointer;font-family:var(--ui);font-weight:700;font-size:.95rem;color:var(--navy-2)}',
    'details.method .body{display:flex;flex-direction:column;gap:10px;margin-top:14px;font-size:.92rem;color:var(--muted);max-width:72ch}',
    'details.method ul{margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:6px}',
    'details.method a{color:var(--navy-2)}',
    '@media (max-width:820px){.tool,.gate{grid-template-columns:1fr}.gate form{grid-template-columns:1fr}}'
  ].join('');

  /* ------------------------------------------------------------- hubspot */

  /**
   * Submits to a HubSpot form through the Forms API so the submission counts as a real
   * form submission (form-triggered workflows, notifications and follow-up emails all fire).
   * Every field sent must also exist on the HubSpot form, using the property's internal name.
   */
  function submitToHubSpot(opts) {
    var url = 'https://api.hsforms.com/submissions/v3/integration/submit/' +
      encodeURIComponent(opts.portalId) + '/' + encodeURIComponent(opts.formId);
    var fields = Object.keys(opts.fields).filter(function (k) {
      var v = opts.fields[k];
      return v !== undefined && v !== null && v !== '';
    }).map(function (k) {
      return { objectTypeId: '0-1', name: k, value: String(opts.fields[k]) };
    });
    var context = { pageUri: window.location.href, pageName: document.title };
    var hutk = readCookie('hubspotutk');
    if (hutk) context.hutk = hutk;
    var body = { submittedAt: String(Date.now()), fields: fields, context: context };
    if (opts.consentText) {
      body.legalConsentOptions = {
        consent: {
          consentToProcess: true,
          text: opts.consentText,
          communications: opts.subscriptionId ? [{
            value: !!opts.subscribe, subscriptionTypeId: Number(opts.subscriptionId), text: opts.subscribeText || ''
          }] : []
        }
      };
    }
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) {
          var err = new Error('HubSpot rejected the submission');
          err.details = json;
          throw err;
        }
        return json;
      });
    });
  }

  /* ------------------------------------------------------------ gate form */

  var ROLES = ['CEO / President', 'CFO / Finance', 'Lending / Mortgage', 'Marketing', 'Member experience', 'Board member', 'Other'];

  /**
   * Builds the shared lead form. Calls getResults() at submit time so the latest
   * numbers go to HubSpot as hidden fields, then calls onUnlocked().
   */
  function buildGate(ctx, options) {
    var o = options || {};
    var id = uid('g');
    var wrap = document.createElement('div');
    wrap.className = 'gate';
    wrap.innerHTML =
      '<div style="display:flex;flex-direction:column;gap:14px">' +
        '<span class="label">' + escapeHtml(o.eyebrow || 'Your full analysis') + '</span>' +
        '<h3>' + escapeHtml(o.title || 'Get your full analysis') + '</h3>' +
        '<p class="intro">' + escapeHtml(o.body || '') + '</p>' +
        (ctx.preview ? '<p class="preview-note">Preview mode: this embed is not connected to HubSpot yet, so nothing is sent.</p>' : '') +
      '</div>' +
      '<div>' +
        '<form novalidate>' +
          '<div class="field"><label for="' + id + 'f">First name</label><input type="text" id="' + id + 'f" name="firstname" autocomplete="given-name" required></div>' +
          '<div class="field"><label for="' + id + 'l">Last name</label><input type="text" id="' + id + 'l" name="lastname" autocomplete="family-name" required></div>' +
          '<div class="field full"><label for="' + id + 'e">Work email</label><input type="email" id="' + id + 'e" name="email" autocomplete="email" placeholder="you@yourcu.org" required></div>' +
          '<div class="field"><label for="' + id + 'c">Credit union</label><input type="text" id="' + id + 'c" name="company" autocomplete="organization" required></div>' +
          '<div class="field"><label for="' + id + 'r">Your role</label><select id="' + id + 'r" name="jobtitle">' +
            ROLES.map(function (r) { return '<option>' + escapeHtml(r) + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="field full"><label for="' + id + 'p">Phone <span class="hint">(optional)</span></label><input type="tel" id="' + id + 'p" name="phone" autocomplete="tel"></div>' +
          '<div class="hp" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
          '<label class="check full"><input type="checkbox" name="hrc_wants_call"> I\'d like to walk through my results with your team.</label>' +
          (ctx.config.consentText ? '<label class="check full"><input type="checkbox" name="consent" required> ' + escapeHtml(ctx.config.consentText) + '</label>' : '') +
          '<p class="err full" role="alert"></p>' +
          '<div class="full"><button class="btn btn-navy" type="submit">' + escapeHtml(o.button || 'Get your full analysis') + '</button></div>' +
          '<p class="fine full">' + escapeHtml(ctx.config.privacyText || 'We use your information to send your analysis and, if you ask, to set up a conversation. We never sell it.') + '</p>' +
        '</form>' +
        '<div class="done" hidden>' +
          '<span class="label">' + escapeHtml(o.doneEyebrow || 'Request received') + '</span>' +
          '<h3>' + escapeHtml(o.doneTitle || 'Your full analysis is on its way.') + '</h3>' +
          '<p class="intro">' + escapeHtml(o.doneBody || 'Want to walk through it with our team?') + '</p>' +
          '<div class="actions">' +
            (ctx.config.bookingUrl ? '<a class="btn btn-navy" href="' + escapeHtml(ctx.config.bookingUrl) + '" target="_top">' + escapeHtml(o.bookLabel || 'Book a call') + '</a>' : '') +
            '<button class="btn btn-ghost" type="button" data-reset>Run new numbers</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var form = wrap.querySelector('form');
    var done = wrap.querySelector('.done');
    var err = wrap.querySelector('.err');
    var submitBtn = form.querySelector('button[type=submit]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.textContent = '';
      var data = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name) return;
        data[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
      });
      if (data.website) return; // honeypot filled: quietly ignore bots
      if (!data.firstname || !data.lastname || !data.company) {
        err.textContent = 'Add your name and credit union so we know who the analysis is for.';
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        err.textContent = 'Enter a work email like name@yourcu.org.';
        return;
      }
      if (ctx.config.consentText && !data.consent) {
        err.textContent = 'Please check the consent box so we can send your analysis.';
        return;
      }

      var fields = {
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        company: data.company,
        jobtitle: data.jobtitle,
        phone: data.phone,
        hrc_wants_call: data.hrc_wants_call ? 'true' : 'false',
        hrc_tool_name: ctx.toolName,
        hrc_tool_source: ctx.config.source || ''
      };
      var results = (o.getResults && o.getResults()) || {};
      Object.keys(results).forEach(function (k) { fields[k] = results[k]; });

      var finish = function () {
        form.hidden = true;
        done.hidden = false;
        if (o.onUnlocked) o.onUnlocked();
        ctx.host.dispatchEvent(new CustomEvent('hrc:lead', { bubbles: true, composed: true, detail: { tool: ctx.toolName } }));
        if (window.dataLayer && window.dataLayer.push) {
          window.dataLayer.push({ event: 'hrc_tool_lead', hrc_tool: ctx.toolName });
        }
      };

      if (ctx.preview) { finish(); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      submitToHubSpot({
        portalId: ctx.config.hsPortal,
        formId: ctx.config.hsForm,
        fields: fields,
        consentText: ctx.config.consentText,
        subscriptionId: ctx.config.hsSubscription,
        subscribe: true
      }).then(finish).catch(function (e2) {
        if (window.console) console.warn('[HRC Tools] HubSpot submission failed', e2 && e2.details);
        err.textContent = 'Something went wrong sending your request. Please try again, or contact our team directly.';
      }).then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = o.button || 'Get your full analysis';
      });
    });

    wrap.querySelector('[data-reset]').addEventListener('click', function () {
      done.hidden = true;
      form.hidden = false;
      if (o.onReset) o.onReset();
    });

    return wrap;
  }

  /* -------------------------------------------------------------- mounting */

  function readConfig(host) {
    var d = host.dataset;
    return {
      hsPortal: d.hsPortal || '',
      hsForm: d.hsForm || '',
      hsSubscription: d.hsSubscription || '',
      source: d.source || '',
      bookingUrl: d.bookingUrl || '',
      contactUrl: d.contactUrl || '',
      consentText: d.consentText || '',
      privacyText: d.privacyText || '',
      raw: d
    };
  }

  function mount(host) {
    if (host.__hrcMounted) return;
    var name = host.getAttribute('data-hrc-tool');
    var def = registry[name];
    if (!def) return;
    host.__hrcMounted = true;

    var config = readConfig(host);
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var style = document.createElement('style');
    style.textContent = BASE_CSS + (def.css || '');
    root.appendChild(style);
    var container = document.createElement('div');
    root.appendChild(container);

    var ctx = {
      host: host,
      root: root,
      container: container,
      toolName: name,
      config: config,
      preview: !(config.hsPortal && config.hsForm),
      buildGate: function (opts) { return buildGate(ctx, opts); },
      utils: api.utils
    };

    try {
      def.mount(ctx);
      host.setAttribute('data-hrc-ready', 'true');
    } catch (e) {
      if (window.console) console.error('[HRC Tools] could not render ' + name, e);
    }
  }

  function loadTool(name) {
    if (registry[name] || waiting[name]) return;
    waiting[name] = true;
    var s = document.createElement('script');
    s.src = BASE + 'tools/' + encodeURIComponent(name) + '.js?v=' + VERSION;
    s.async = true;
    s.onerror = function () {
      if (window.console) console.warn('[HRC Tools] could not load tool "' + name + '"; showing fallback content');
    };
    document.head.appendChild(s);
  }

  function scan() {
    var hosts = document.querySelectorAll('[data-hrc-tool]');
    Array.prototype.forEach.call(hosts, function (host) {
      var name = host.getAttribute('data-hrc-tool');
      if (registry[name]) mount(host); else loadTool(name);
    });
  }

  var api = {
    __loaded: true,
    version: VERSION,
    base: BASE,
    register: function (name, def) {
      registry[name] = def;
      var hosts = document.querySelectorAll('[data-hrc-tool="' + name + '"]');
      Array.prototype.forEach.call(hosts, mount);
    },
    scan: scan,
    utils: {
      fmtNumber: fmtNumber,
      fmtMoney: fmtMoney,
      fmtPercent: fmtPercent,
      parseNumber: parseNumber,
      escapeHtml: escapeHtml,
      uid: uid
    }
  };
  window.HRCTools = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }
})();
