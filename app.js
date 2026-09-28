// PRELAUNCH LANDING V1 — атрибуция, цена, аналитика, форма.
(function () {
  'use strict';

  var CFG = window.PRELAUNCH_CONFIG || {};
  var PRICING = CFG.PRICING || {};
  var ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var STORE_ATTR = 'prelaunch_attr_v2';
  var STORE_PRICE = 'prelaunch_price_variant_v1';

  // ---------- storage (может быть недоступен: приватный режим и т.п.) ----------
  function storeGet(k) { try { return JSON.parse(window.localStorage.getItem(k)); } catch (e) { return null; } }
  function storeSet(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* noop */ } }

  // ---------- analytics ----------
  window.dataLayer = window.dataLayer || [];
  window.__prelaunchEvents = window.__prelaunchEvents || [];
  var ANALYTICS = CFG.ANALYTICS || {};
  var ymId = ANALYTICS.YANDEX_METRIKA_ID;

  if (ymId) {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(ymId, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true });
  }

  function track(event, params) {
    var payload = Object.assign({
      event: event,
      landing_version: CFG.LANDING_VERSION,
      price_seen: priceSeen,
      ts: new Date().toISOString(),
    }, attribution, params || {});
    window.dataLayer.push(payload);
    window.__prelaunchEvents.push(payload);
    if (ymId && window.ym) { try { window.ym(ymId, 'reachGoal', event, payload); } catch (e) { /* noop */ } }
    if (ANALYTICS.DEBUG && window.console) console.info('[prelaunch]', event, payload);
  }

  // ---------- attribution ----------
  function referrerSource() {
    if (!document.referrer) return 'direct';
    var host;
    try { host = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) { return 'unknown'; }
    if (host === window.location.hostname) return '';
    if (/instagram\.com$/.test(host)) return 'instagram';
    if (/(^|\.)t\.me$|telegram/.test(host)) return 'telegram';
    if (/youtube\.com$|youtu\.be$/.test(host)) return 'youtube';
    if (/vk\.com$/.test(host)) return 'vk';
    return host;
  }

  // UTM из URL страницы. Параметр ссылки ?source= (канал) хранится как traffic_source:
  // поле source в заявке зарезервировано под идентификатор лендинга (config.js → LEAD.SOURCE).
  function readAttribution() {
    var params = new URLSearchParams(window.location.search);
    var fromUrl = {};
    var hasUrl = false;
    ATTR_KEYS.forEach(function (k) {
      var v = (params.get(k) || '').trim().slice(0, 200);
      fromUrl[k] = v;
      if (v) hasUrl = true;
    });
    var ch = (params.get('source') || '').trim().slice(0, 200);
    if (ch) { fromUrl.traffic_source = ch; hasUrl = true; }
    // последнее известное касание: новые UTM в ссылке перезаписывают сохранённые
    var stored = storeGet(STORE_ATTR);
    var attr = hasUrl ? fromUrl : (stored && typeof stored === 'object' ? stored : fromUrl);
    ATTR_KEYS.forEach(function (k) { if (typeof attr[k] !== 'string') attr[k] = ''; });
    if (!attr.traffic_source) attr.traffic_source = (attr.utm_source || referrerSource() || 'direct').toLowerCase();
    if (hasUrl) storeSet(STORE_ATTR, attr);
    return attr;
  }

  var attribution = readAttribution();

  // ---------- price (централизованно из config.js) ----------
  function formatMoney(n) {
    var cur = PRICING.CURRENCY || 'RUB';
    try {
      return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
    } catch (e) { return n + ' ' + cur; }
  }

  function isAmount(v) { return typeof v === 'number' && v > 0; }

  function resolvePriceVariant() {
    var variants = PRICING.VARIANTS || {};
    var usable = function (v) { return !!variants[v] && isAmount(PRICING[variants[v]]); };
    var q = (new URLSearchParams(window.location.search).get('price') || '').toLowerCase();
    var stored = storeGet(STORE_PRICE);
    var def = PRICING.DEFAULT_VARIANT || 'early';
    var variant = usable(q) ? q : (usable(stored) ? stored : def);
    if (usable(q)) storeSet(STORE_PRICE, q); // посетитель ценового теста дальше видит ту же цену
    return variant;
  }

  var priceVariant = resolvePriceVariant();
  var offerKey = (PRICING.VARIANTS || {})[priceVariant] || 'EARLY_PRICE';
  var offerAmount = PRICING[offerKey];
  var fullAmount = PRICING.FULL_PRICE;
  var priceShown = isAmount(offerAmount);
  var priceEarly = priceShown && offerKey !== 'FULL_PRICE'; // показана ранняя (сниженная) цена
  var showFull = priceShown && offerKey !== 'FULL_PRICE' && isAmount(fullAmount) && fullAmount > offerAmount;
  var discountPct = showFull ? Math.round((1 - offerAmount / fullAmount) * 100) : 0;
  // price_seen: фактически показанная предлагаемая сумма ('64610') или NOT_SHOWN
  var priceSeen = priceShown ? String(offerAmount) : 'NOT_SHOWN';

  function setAll(sel, fn) { document.querySelectorAll(sel).forEach(fn); }

  function renderPrice() {
    setAll('[data-price-state="set"]', function (el) { el.hidden = !priceShown; });
    setAll('[data-price-state="open"]', function (el) { el.hidden = priceShown; });
    setAll('[data-price-show]', function (el) { el.hidden = !priceShown; });
    setAll('[data-price-early]', function (el) { el.hidden = !priceEarly; });
    if (!priceShown) return;
    var label = (PRICING.LABELS || {})[offerKey] || '';
    setAll('[data-price-label]', function (el) { el.textContent = label; });
    setAll('[data-price-offer]', function (el) { el.textContent = formatMoney(offerAmount); });
    setAll('[data-price-full-wrap]', function (el) { el.hidden = !showFull; });
    setAll('[data-price-full]', function (el) { el.textContent = showFull ? formatMoney(fullAmount) : ''; });
    setAll('[data-price-discount-wrap]', function (el) { el.hidden = !discountPct; });
    setAll('[data-price-discount]', function (el) { el.textContent = String(discountPct); });
  }

  // ---------- config-driven text ----------
  function renderConfigText() {
    document.querySelectorAll('[data-cfg]').forEach(function (el) {
      var v = CFG[el.getAttribute('data-cfg')];
      if (v) el.textContent = v;
    });
    document.querySelectorAll('[data-cfg-text]').forEach(function (el) {
      var v = CFG[el.getAttribute('data-cfg-text')];
      el.textContent = v || el.getAttribute('data-fallback') || '';
    });
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
    if (CFG.PRIVACY_URL) {
      document.querySelectorAll('[data-privacy-link]').forEach(function (el) {
        el.hidden = false;
        var a = el.querySelector('a');
        if (a) a.href = CFG.PRIVACY_URL;
      });
    }
  }

  // ---------- form ----------
  var form = document.getElementById('lead-form');
  var success = document.getElementById('success');
  var statusEl = document.getElementById('form-status');
  var submitting = false;
  var started = false;

  var MESSAGES = {
    REQUIRED: 'Заполните это поле',
    name: 'Укажите имя',
    phone: 'Проверьте номер телефона',
    email: 'Проверьте email',
    consent: 'Без согласия мы не сможем сохранить заявку',
    SEND_ERROR: 'Не удалось отправить заявку. Попробуйте ещё раз или свяжитесь с нами.',
  };

  function normalizePhone(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
    else if (d.length === 10 && d[0] === '9') d = '7' + d;
    return '+' + d;
  }

  function setError(field, message) {
    var err = form.querySelector('[data-err="' + field + '"]');
    var input = form.elements[field];
    if (err) err.textContent = message || '';
    if (input && input.setAttribute) {
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }

  // Обязательны: имя и телефон. Email — необязателен, но если указан, проверяется формат.
  function clientValidate(data) {
    var errors = {};
    if (data.name.length < 2) errors.name = data.name ? MESSAGES.name : MESSAGES.REQUIRED;
    if (!data.phone) errors.phone = MESSAGES.REQUIRED;
    else if (!/^\+\d{10,15}$/.test(normalizePhone(data.phone))) errors.phone = MESSAGES.phone;
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.email = MESSAGES.email;
    if (!data.consent) errors.consent = MESSAGES.consent;
    return errors;
  }

  function clean(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }

  function collect() {
    return {
      name: clean(form.elements.name.value),
      phone: clean(form.elements.phone.value),
      email: clean(form.elements.email.value).replace(/\s/g, '').toLowerCase(),
      telegram: clean(form.elements.telegram.value),
      website: form.elements.website.value,
      consent: form.elements.consent.checked,
    };
  }

  // Состояния формы: DEFAULT → SUBMITTING → SUCCESS | ERROR (атрибут data-state на .formcard)
  var FORM_STATE = { DEFAULT: 'default', SUBMITTING: 'submitting', SUCCESS: 'success', ERROR: 'error' };
  var formCard = form ? form.closest('.formcard') : null;

  function setState(state) {
    if (formCard) formCard.setAttribute('data-state', state);
    submitting = state === FORM_STATE.SUBMITTING;
    form.classList.toggle('is-loading', submitting);
    form.querySelector('#submit-btn').disabled = submitting;
    form.setAttribute('aria-busy', submitting ? 'true' : 'false');
  }

  function setLoading(on) {
    if (on) setState(FORM_STATE.SUBMITTING);
    else if (formCard && formCard.getAttribute('data-state') === FORM_STATE.SUBMITTING) setState(FORM_STATE.DEFAULT);
  }

  function showSuccess() {
    setState(FORM_STATE.SUCCESS);
    form.hidden = true;
    success.hidden = false;
    success.focus({ preventScroll: true });
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function fail(reason) {
    setState(FORM_STATE.ERROR);
    statusEl.textContent = MESSAGES.SEND_ERROR;
    track('FORM_SUBMIT_FAILED', { reason: reason });
  }

  // Тело запроса в n8n Webhook. Состав — 02_PRELAUNCH/02_LEAD_CAPTURE/LEAD_CAPTURE_FLOW.md
  function buildPayload(data) {
    var lead = CFG.LEAD || {};
    return {
      name: data.name,
      phone: normalizePhone(data.phone),
      email: data.email,
      source: lead.SOURCE || 'prelaunch_landing',
      offer: lead.OFFER || 'ai_academy_early_access',
      price: priceShown ? offerAmount : null,
      currency: PRICING.CURRENCY || 'RUB',
      submitted_at: new Date().toISOString(),
      page_url: window.location.href.split('#')[0].slice(0, 500),
      utm_source: attribution.utm_source || '',
      utm_medium: attribution.utm_medium || '',
      utm_campaign: attribution.utm_campaign || '',
      utm_content: attribution.utm_content || '',
      utm_term: attribution.utm_term || '',
      // дополнительно (существующая атрибуция и поля формы)
      telegram: data.telegram,
      consent: data.consent === true,
      landing_version: CFG.LANDING_VERSION || 'V1',
      price_seen: priceSeen,
      traffic_source: attribution.traffic_source || '',
    };
  }

  function onStart() {
    if (started) return;
    started = true;
    track('FORM_START');
  }

  function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    statusEl.textContent = '';
    ['name', 'phone', 'email', 'consent'].forEach(function (f) { setError(f, ''); });

    var data = collect();
    if (data.website) return; // honeypot: скрытое поле заполняют только боты — ничего не отправляем
    var errors = clientValidate(data);
    var fields = Object.keys(errors);
    if (fields.length) {
      fields.forEach(function (f) { setError(f, errors[f]); });
      var first = form.elements[fields[0]];
      if (first && first.focus) first.focus();
      return;
    }

    var payload = buildPayload(data);

    track('FORM_SUBMIT');

    if (!CFG.WEBHOOK_URL) {
      if (window.console) console.warn('[prelaunch] WEBHOOK_URL не задан в config.js — заявка не отправлена');
      fail('NOT_CONFIGURED');
      return;
    }

    setLoading(true);
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, CFG.REQUEST_TIMEOUT_MS || 15000) : null;

    fetch(CFG.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) { return { res: res, body: body }; });
      })
      .then(function (r) {
        // SUCCESS только если сервер подтвердил сохранение заявки
        if (r.res.ok && r.body && r.body.ok === true) {
          track('VALID_LEAD', { lead_status: r.body.status || '' });
          showSuccess();
          return;
        }
        if (r.res.status === 400 && r.body && Array.isArray(r.body.fields)) {
          r.body.fields.forEach(function (f) {
            if (f.field !== 'website') setError(f.field, f.code === 'REQUIRED' ? MESSAGES.REQUIRED : (MESSAGES[f.field] || MESSAGES.REQUIRED));
          });
          fail('VALIDATION_ERROR');
          return;
        }
        fail('SERVER_' + r.res.status);
      })
      .catch(function (err) {
        fail(err && err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK');
      })
      .then(function () {
        if (timer) clearTimeout(timer);
        setLoading(false);
      });
  }

  // ---------- init ----------
  renderConfigText();
  renderPrice();
  track('LANDING_VISIT', { referrer: document.referrer ? document.referrer.slice(0, 300) : '' });

  if (form) {
    setState(FORM_STATE.DEFAULT);
    form.addEventListener('focusin', onStart);
    form.addEventListener('input', onStart);
    form.addEventListener('submit', onSubmit);
    ['name', 'phone', 'email'].forEach(function (f) {
      form.elements[f].addEventListener('input', function () { setError(f, ''); });
    });
    form.elements.consent.addEventListener('change', function () { setError('consent', ''); });
  }
})();
