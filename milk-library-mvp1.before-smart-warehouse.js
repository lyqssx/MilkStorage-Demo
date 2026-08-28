(function () {
  var host = document.getElementById('demo');
  if (!host || typeof state === 'undefined') return;

  state.page = 'homeRoot';
  state.mvp = {
    scanMode: null,
    scanSource: null,
    scanSuccess: false,
    toast: '',
    sheet: null,
    selectedRecordId: null,
    selectedTags: [],
    pumpTimeUnknown: false,
    records: [
      { id: 'm1', bagId: 'BAG-102', status: 'active', volume: '4.5', storage: '冷冻', storedAt: '2026-08-17T21:30', pumpAt: '2026-08-17T20:58', safety: 'high', tag: '规范存奶', desc: '夜间吸奶' },
      { id: 'm2', bagId: 'BAG-218', status: 'closed_feeding', volume: '3.8', storage: '冷藏', storedAt: '2026-08-16T08:20', pumpAt: '2026-08-16T07:55', safety: 'medium', tag: '补记存奶', desc: '已完整销账' },
      { id: 'm3', bagId: 'BAG-309', status: 'active', volume: '2.6', storage: '冷藏', storedAt: '2026-08-18T10:10', pumpAt: '', safety: 'low', tag: '奶库补存', desc: '吸奶时间未知' }
    ],
    pending: []
  };

  function pad(n) { return String(n).padStart(2, '0'); }
  function nowLocal() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
  function fmt(iso) { if (!iso) return '未知'; var d = new Date(iso); if (isNaN(d.getTime())) return iso; return (d.getMonth()+1) + '月' + d.getDate() + '日 ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function m() { return state.mvp; }
  function activeRecords() { return m().records.filter(function (r) { return r.status === 'active'; }); }
  function tagClass(safety) { return safety === 'high' ? 'high' : safety === 'medium' ? 'medium' : 'low'; }
  function tagIcon(safety) { return safety === 'high' ? '✓' : safety === 'medium' ? '!' : '⚠'; }
  function back(target) { return '<button class="v4-circle mvp-back" data-mvp="route" data-page="' + target + '" aria-label="Back"><img src="./assets/figma/back.svg" alt=""><span>返回</span></button>'; }
  function status() { return typeof v4Status === 'function' ? v4Status() : '<div class="status"><span>9:41</span><i>▮▮▮ ◔ ▰</i></div>'; }
  function nav(active) { return typeof v4Nav === 'function' ? v4Nav(active) : ''; }
  function toastHtml() { return m().toast ? '<div class="mvp-toast">' + m().toast + '</div>' : ''; }
  function showToast(text) { m().toast = text; mvpView(); setTimeout(function () { m().toast = ''; mvpView(); }, 2300); }

  var originalV4Home = window.v4Home;
  var originalV4Device = window.v4Device;
  var originalV4Control = window.v4Control;
  var originalV4List = window.v4List;
  var originalV4Nav = window.v4Nav;

  window.v4Nav = function (active) {
    if (typeof originalV4Nav !== 'function') return '';
    return '<nav class="v4-nav"><button data-mvp="route" data-page="homeRoot" class="' + (active === 'home' ? 'active' : '') + '"><span>⌂</span>Home</button><button data-mvp="route" data-page="device" class="' + (active === 'device' ? 'active' : '') + '"><span>⬡</span>Device</button><button><span>◔</span>Community</button><button><span>♙</span>Me</button></nav>';
  };

  function homeRoot() {
    var low = activeRecords().filter(function (r) { return r.safety === 'low'; }).length;
    return '<section class="v4 mvp-home-root">' + status() +
      '<header class="v4-top"><span></span><h1>Home</h1><span></span></header>' +
      '<main class="mvp-scroll">' +
        '<section class="mvp-feeding-frame"><div class="mvp-section-head"><h3>喂养</h3><small>Feeding</small></div><button class="mvp-feeding-card" data-mvp="library"><span><span class="mvp-eyebrow">Milk Library</span><h3>奶库</h3><p>库存 ' + activeRecords().length + ' 袋 · 待确认 ' + m().pending.length + ' 条 · 高风险 ' + low + ' 袋</p><p>查看库存、扫码取奶、处理待确认去向。</p></span><span class="mvp-feeding-art">◌</span></button></section>' +
      '</main>' + nav('home') + '</section>';
  }

  function devicePage() {
    var html = originalV4Device();
    return html.replace(/data-v4="home"/g, 'data-mvp="route" data-page="pumpHome"');
  }

  function libraryPage() {
    var pending = m().pending.length ? '<section class="mvp-card"><span class="mvp-tag pending">待确认 ' + m().pending.length + '</span><h3>有待处理的库存</h3><p>只有“已在库奶袋再次扫码入库”才会出现在这里。请标记旧奶袋是否用于喂养。</p><button class="mvp-btn secondary" data-mvp="pending">去处理</button></section>' : '';
    return '<section class="v4 mvp-library">' + status() +
      '<header class="v4-top">' + back('homeRoot') + '<h1>奶库</h1><button class="v4-circle" data-mvp="store" data-source="library_backfill">＋</button></header>' +
      '<main class="mvp-scroll">' + pending +
        '<div class="mvp-quick-grid"><button class="mvp-card" data-mvp="scanView"><h3>取奶扫码</h3><p>扫码后进入取用确认；确认用于喂养后才会销账。</p></button><button class="mvp-card" data-mvp="store" data-source="library_backfill"><span class="mvp-tag low">⚠ 奶库补存</span><h3>存奶</h3><p>从奶库直接发起扫码存奶。</p></button></div>' +
        '<div class="mvp-section-head"><h3>当前库存</h3><small>按存奶时间</small></div>' + activeRecords().map(recordCard).join('') +
      '</main>' + nav('home') + '</section>';
  }

  function recordCard(r) {
    return '<button class="mvp-card mvp-library-card" data-mvp="detail" data-id="' + r.id + '"><span><span class="mvp-tag ' + tagClass(r.safety) + '">' + tagIcon(r.safety) + ' ' + r.tag + '</span><h3>' + r.bagId + ' · ' + r.volume + ' oz</h3><p class="meta">' + r.storage + ' · 存入 ' + fmt(r.storedAt) + '</p><p class="meta">吸奶时间：' + fmt(r.pumpAt) + '</p></span><span class="arrow">›</span></button>';
  }

  function manualRecordPage() {
    return '<section class="v4 mvp-manual">' + status() +
      '<header class="v4-top">' + back('homeRoot') + '<h1>补充记录</h1><span></span></header>' +
      '<main class="mvp-scroll"><section class="mvp-card"><span class="mvp-tag medium">! 补记存奶</span><h3>补充吸奶 / 奶量记录</h3><div class="mvp-form"><div class="mvp-field"><label>总奶量</label><input id="mvpManualVolume" value="4.8" inputmode="decimal"></div><div class="mvp-field"><label>吸奶时间</label><input id="mvpManualPumpAt" type="datetime-local" value="' + nowLocal() + '"></div><div class="mvp-field"><label>吸奶时长</label><input value="20 min"></div><button class="mvp-btn" data-mvp="store" data-source="after_manual_record">保存并存入储奶袋</button></div></section></main></section>';
  }

  function pumpingRecordPage() {
    return '<section class="v4 mvp-library">' + status() +
      '<header class="v4-top">' + back('pumpHome') + '<h1>吸奶记录卡</h1><span></span></header>' +
      '<main class="mvp-scroll"><section class="mvp-card"><span class="mvp-tag high">✓ 规范存奶</span><h3>本次吸奶 5.2 oz</h3><p>吸奶时间：8月18日 09:41</p><p>吸奶时长：20 min</p><p>吸奶结束后直接存奶，是安全级别最高的存奶方式。</p><div class="mvp-action-row"><button class="mvp-btn" data-mvp="store" data-source="after_pumping">存入储奶袋</button><button class="mvp-btn ghost" data-mvp="route" data-page="pumpHome">稍后</button></div></section></main></section>';
  }

  function detailPage() {
    var r = m().records.find(function (x) { return x.id === m().selectedRecordId; }) || activeRecords()[0];
    if (!r) return libraryPage();
    return '<section class="v4 mvp-library">' + status() +
      '<header class="v4-top">' + back('library') + '<h1>存奶详情</h1><span></span></header>' +
      '<main class="mvp-scroll"><section class="mvp-card"><span class="mvp-tag ' + tagClass(r.safety) + '">' + tagIcon(r.safety) + ' ' + r.tag + '</span><h3>' + r.bagId + ' · ' + r.volume + ' oz</h3><p>存储方式：' + r.storage + '</p><p>存奶时间：' + fmt(r.storedAt) + '</p><p>吸奶时间：' + fmt(r.pumpAt) + '</p><p>描述：' + (r.desc || '无') + '</p><p>初始奶量不代表实时剩余量，请结合袋身信息和实际状态判断。</p></section><button class="mvp-btn" data-mvp="scanView">取奶扫码</button></main></section>';
  }

  function takeConfirmPage() {
    var r = m().records.find(function (x) { return x.id === m().selectedRecordId; });
    if (!r || r.status !== 'active') return libraryPage();
    return '<section class="v4 mvp-library">' + status() +
      '<header class="v4-top">' + back('library') + '<h1>确认取奶</h1><span></span></header>' +
      '<main class="mvp-scroll"><section class="mvp-card mvp-confirm-use"><span class="mvp-tag ' + tagClass(r.safety) + '">' + tagIcon(r.safety) + ' ' + r.tag + '</span><h3>是否确认使用这袋奶？</h3><p class="meta">' + r.bagId + ' · ' + r.volume + ' oz · ' + r.storage + '</p><p class="meta">存入：' + fmt(r.storedAt) + '　吸奶：' + fmt(r.pumpAt) + '</p><p>确认用于喂养后，这袋奶会从当前库存中销账，并计入宝宝喂养消耗。若只是扫错或暂时查看，请选择暂不使用。</p><div class="mvp-action-row"><button class="mvp-btn" data-mvp="confirmTake" data-disposition="feeding">确认用于喂养并销账</button><button class="mvp-btn ghost" data-mvp="route" data-page="library">暂不使用</button></div></section></main></section>';
  }

  function pendingPage() {
    var body = m().pending.map(function (p) {
      return '<section class="mvp-card"><span class="mvp-tag pending">待确认去向</span><h3>' + p.bagId + ' · ' + p.volume + ' oz</h3><p>这条旧库存因为同袋再次入库而移出当前库存，但不能自动判断是否已喂养。</p><div class="mvp-action-row"><button class="mvp-btn" data-mvp="mark" data-id="' + p.id + '" data-disposition="feeding">用于喂养</button><button class="mvp-btn danger" data-mvp="mark" data-id="' + p.id + '" data-disposition="other">其他/丢弃</button></div></section>';
    }).join('') || '<section class="mvp-card"><h3>暂无待确认库存</h3><p>扫新奶袋、扫已完整销账奶袋都不会触发待确认。</p></section>';
    return '<section class="v4 mvp-library">' + status() + '<header class="v4-top">' + back('library') + '<h1>待确认</h1><span></span></header><main class="mvp-scroll">' + body + '</main></section>';
  }

  function scanPage() {
    var mode = m().scanMode;
    var title = mode === 'view' ? '取奶扫码' : '扫码储奶袋';
    var desc = mode === 'view' ? '选择右侧触发器，模拟不同奶袋被取奶扫码。' : '选择右侧触发器：新奶袋、已销账奶袋、已在库奶袋。';
    return '<section class="v4 mvp-scan ' + (m().scanSuccess ? 'mvp-scanning-success' : '') + '">' + status() +
      '<header class="v4-top">' + back(m().scanBack || 'library') + '<h1>' + title + '</h1><span></span></header>' +
      '<div class="mvp-scan-area"><div class="mvp-scan-frame"><span class="mvp-scan-line"></span><span class="mvp-scan-ok">✓</span></div><h2>' + title + '</h2><p>' + desc + '</p></div></section>';
  }

  function sheetHtml() {
    if (!m().sheet) return '';
    var source = m().sheet.source;
    var isStandard = source === 'after_pumping';
    var tag = isStandard ? '<span class="mvp-tag high">✓ 规范存奶</span>' : source === 'after_manual_record' ? '<span class="mvp-tag medium">! 补记存奶</span>' : '<span class="mvp-tag low">⚠ 奶库补存</span>';
    var chips = ['手写标签为准','吸奶时间未知','家人代存','混合奶','需优先确认'].map(function (c) { return '<button class="mvp-chip ' + (m().selectedTags.indexOf(c) >= 0 ? 'active' : '') + '" data-mvp="tag" data-tag="' + c + '">' + c + '</button>'; }).join('');
    return '<div class="mvp-sheet"><section class="mvp-sheet-body"><h2>存奶信息</h2>' + tag + '<div class="mvp-form" style="margin-top:14px"><div class="mvp-field"><label>储奶袋</label><input id="mvpBag" value="' + m().sheet.bagId + '" disabled></div><div class="mvp-field"><label>总奶量</label><input id="mvpVolume" value="' + (isStandard ? '5.2' : '4.8') + '" inputmode="decimal"></div><div class="mvp-field"><label>存奶时间</label><input id="mvpStoredAt" type="datetime-local" value="' + nowLocal() + '"></div><div class="mvp-field"><label>存储方式</label><select id="mvpStorage"><option>冷藏</option><option>冷冻</option></select></div>' + (isStandard ? '<div class="mvp-field"><label>吸奶时间</label><input value="' + fmt('2026-08-18T09:41') + '" disabled></div>' : '<div class="mvp-field"><label>吸奶时间（选填）</label><input id="mvpPumpAt" type="datetime-local"><div class="mvp-chip-row" style="margin-top:8px"><button class="mvp-chip ' + (m().pumpTimeUnknown ? 'active' : '') + '" data-mvp="unknown">吸奶时间未知</button></div></div><div class="mvp-field"><label>描述标签</label><div class="mvp-chip-row">' + chips + '</div></div><div class="mvp-field"><label>自定义描述</label><textarea id="mvpDesc" placeholder="例如：冰箱上层，蓝色夹子"></textarea></div>') + '<div class="mvp-action-row"><button class="mvp-btn" data-mvp="submitStore">确认入库</button><button class="mvp-btn ghost" data-mvp="closeSheet">取消</button></div></div></section></div>';
  }

  function triggerPanel() {
    var disabled = !m().scanMode;
    return '<div id="mvpTrigger" class="mvp-trigger-panel ' + (disabled ? 'disabled' : '') + '"><div class="mvp-trigger-head"><b>扫码触发器</b><small>可拖动</small></div><button data-mvp-scan="bag" data-bag="new">扫新奶袋</button><button data-mvp-scan="bag" data-bag="cleared">扫清洗后奶袋</button><button data-mvp-scan="bag" data-bag="active">扫已在库奶袋</button></div>';
  }

  function mvpView() {
    var page = state.page;
    var html = page === 'homeRoot' ? homeRoot() : page === 'library' ? libraryPage() : page === 'manualRecord' ? manualRecordPage() : page === 'pumpingRecord' ? pumpingRecordPage() : page === 'milkDetail' ? detailPage() : page === 'takeConfirm' ? takeConfirmPage() : page === 'pending' ? pendingPage() : page === 'mvpScan' ? scanPage() : (page === 'pumpHome' || page === 'home') ? originalV4Home() : page === 'device' ? devicePage() : page === 'list' ? originalV4List() : originalV4Control();
    var modal = state.modal === 'fit' ? v4Fit() : state.modal === 'confirm' ? v4Confirm() : state.modal === 'log' ? v4Log() : state.modal === 'logged' ? v4Logged() : '';
    host.innerHTML = html + modal + toastHtml() + sheetHtml();
    syncTrigger();
  }

  function startStore(source) { m().scanMode = 'store'; m().scanSource = source; m().scanBack = state.page; m().scanSuccess = false; state.page = 'mvpScan'; mvpView(); }
  function startViewScan() { m().scanMode = 'view'; m().scanSource = null; m().scanBack = 'library'; m().scanSuccess = false; state.page = 'mvpScan'; mvpView(); }
  function bagFromKind(kind) { return kind === 'new' ? 'BAG-501' : kind === 'cleared' ? 'BAG-218' : 'BAG-102'; }

  function completeScan(kind) {
    if (!m().scanMode) { showToast('当前页面没有等待扫码'); return; }
    m().scanSuccess = true; mvpView();
    setTimeout(function () {
      var bagId = bagFromKind(kind);
      var mode = m().scanMode;
      m().scanMode = null; m().scanSuccess = false;
      if (mode === 'view') {
        var found = activeRecords().find(function (r) { return r.bagId === bagId; });
        if (found) { m().selectedRecordId = found.id; state.page = 'takeConfirm'; showToast('扫码成功：找到 ' + bagId); }
        else { state.page = 'library'; showToast(kind === 'cleared' ? '该奶袋已完整销账，无当前库存' : '没有找到当前有效库存'); }
      } else {
        m().sheet = { source: m().scanSource || 'library_backfill', bagId: bagId, bagKind: kind };
        state.page = m().scanBack || 'library';
        showToast('扫码成功：' + bagId);
      }
      mvpView();
    }, 820);
  }

  function submitStore() {
    var sheet = m().sheet;
    if (!sheet) return;
    var previous = activeRecords().find(function (r) { return r.bagId === sheet.bagId; });
    if (previous) {
      previous.status = 'pending_disposition';
      m().pending.unshift(previous);
    }
    var source = sheet.source;
    var safety = source === 'after_pumping' ? 'high' : source === 'after_manual_record' ? 'medium' : 'low';
    var tag = source === 'after_pumping' ? '规范存奶' : source === 'after_manual_record' ? '补记存奶' : '奶库补存';
    var rec = {
      id: 'm' + Date.now(), bagId: sheet.bagId, status: 'active', volume: val('mvpVolume', '4.8'), storage: val('mvpStorage', '冷藏'), storedAt: val('mvpStoredAt', nowLocal()),
      pumpAt: source === 'after_pumping' ? '2026-08-18T09:41' : (m().pumpTimeUnknown ? '' : val('mvpPumpAt', '')), safety: safety, tag: tag, desc: m().selectedTags.join(' / ') || val('mvpDesc', '')
    };
    m().records.unshift(rec);
    m().sheet = null;
    state.page = 'library';
    showToast(previous ? '已入库；旧库存进入待确认' : '已存入奶库');
    mvpView();
  }
  function val(id, fallback) { var el = document.getElementById(id); return el && el.value ? el.value : fallback; }

  window.v4View = mvpView;
  window.view = mvpView;

  function handleMvpClick(event) {
    var a = event.target.closest('[data-mvp]');
    if (a) {
      window.__mvpLastClick = { act: a.dataset.mvp, page: a.dataset.page || '', text: a.textContent || '' };
      event.preventDefault(); event.stopImmediatePropagation();
      var act = a.dataset.mvp;
      if (act === 'route') { state.page = a.dataset.page; state.modal = null; mvpView(); }
      if (act === 'library') { state.page = 'library'; mvpView(); }
      if (act === 'manualRecord') { state.page = 'manualRecord'; mvpView(); }
      if (act === 'store') startStore(a.dataset.source || 'library_backfill');
      if (act === 'scanView') startViewScan();
      if (act === 'detail') { m().selectedRecordId = a.dataset.id; state.page = 'milkDetail'; mvpView(); }
      if (act === 'confirmTake') { var take = activeRecords().find(function (r) { return r.id === m().selectedRecordId; }); if (take) { take.status = 'closed_feeding'; take.disposition = 'feeding'; take.usedAt = nowLocal(); state.page = 'library'; showToast('已销账：用于喂养'); } }
      if (act === 'pending') { state.page = 'pending'; mvpView(); }
      if (act === 'closeSheet') { m().sheet = null; mvpView(); }
      if (act === 'submitStore') submitStore();
      if (act === 'unknown') { m().pumpTimeUnknown = !m().pumpTimeUnknown; mvpView(); }
      if (act === 'tag') { var t = a.dataset.tag; m().selectedTags = m().selectedTags.indexOf(t) >= 0 ? m().selectedTags.filter(function (x) { return x !== t; }) : m().selectedTags.concat([t]); mvpView(); }
      if (act === 'mark') { var item = m().pending.find(function (p) { return p.id === a.dataset.id; }); if (item) { item.status = a.dataset.disposition === 'feeding' ? 'closed_feeding' : 'closed_other'; item.disposition = a.dataset.disposition; m().pending = m().pending.filter(function (p) { return p.id !== item.id; }); showToast(a.dataset.disposition === 'feeding' ? '已标记：用于喂养' : '已标记：其他/丢弃'); } }
      return;
    }
    var finish = event.target.closest('[data-v4="finish"]');
    if (finish) {
      event.preventDefault(); event.stopImmediatePropagation();
      state.running = false;
      state.modal = 'log';
      mvpView();
      return;
    }
    var save = event.target.closest('[data-v4="save"]');
    if (save) {
      event.preventDefault(); event.stopImmediatePropagation();
      state.modal = 'logged';
      mvpView();
      setTimeout(function () { if (state.modal === 'logged') { state.modal = null; state.page = 'pumpingRecord'; mvpView(); } }, 1200);
      return;
    }
    var v = event.target.closest('[data-v4]');
    if (v && v.dataset.v4 === 'home') { event.preventDefault(); event.stopImmediatePropagation(); state.page = 'pumpHome'; state.modal = null; mvpView(); }
    if (v && v.dataset.v4 === 'pumpHome') { event.preventDefault(); event.stopImmediatePropagation(); state.page = 'pumpHome'; state.modal = null; mvpView(); }
    if (v && v.dataset.v4 === 'homeRoot') { event.preventDefault(); event.stopImmediatePropagation(); state.page = 'homeRoot'; state.modal = null; mvpView(); }
    if (v && v.dataset.v4 === 'library') { event.preventDefault(); event.stopImmediatePropagation(); state.page = 'library'; state.modal = null; mvpView(); }
  }

  window.addEventListener('click', handleMvpClick, true);
  document.addEventListener('click', handleMvpClick, true);
  host.addEventListener('click', handleMvpClick, true);

  document.addEventListener('click', function (event) {
    var b = event.target.closest('[data-mvp-scan="bag"]');
    if (!b) return;
    event.preventDefault();
    completeScan(b.dataset.bag);
  }, true);

  function syncTrigger() {
    var old = document.getElementById('mvpTrigger');
    if (!old) {
      document.body.insertAdjacentHTML('beforeend', triggerPanel());
      makeDraggable(document.getElementById('mvpTrigger'));
    } else {
      old.classList.toggle('disabled', !m().scanMode);
    }
  }

  function makeDraggable(el) {
    if (!el) return;
    var drag = null;
    el.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      drag = { x: e.clientX, y: e.clientY, left: el.offsetLeft, top: el.offsetTop };
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag) return;
      el.style.left = (drag.left + e.clientX - drag.x) + 'px';
      el.style.top = (drag.top + e.clientY - drag.y) + 'px';
      el.style.right = 'auto';
    });
    el.addEventListener('pointerup', function () { drag = null; });
    el.addEventListener('pointercancel', function () { drag = null; });
  }

  mvpView();
  setTimeout(mvpView, 300);
  setTimeout(mvpView, 900);
}());
