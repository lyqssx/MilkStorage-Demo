(function(){
  var STORE_KEY = 'air2_demo_annotations_v49';
  try { localStorage.removeItem('air2_demo_annotations_v1'); localStorage.removeItem('air2_demo_annotations_v2'); localStorage.removeItem('air2_demo_annotations_v3'); localStorage.removeItem('air2_demo_annotations_v4'); localStorage.removeItem('air2_demo_annotations_v5'); localStorage.removeItem('air2_demo_annotations_v6'); localStorage.removeItem('air2_demo_annotations_v7'); localStorage.removeItem('air2_demo_annotations_v8'); localStorage.removeItem('air2_demo_annotations_v9'); localStorage.removeItem('air2_demo_annotations_v10'); localStorage.removeItem('air2_demo_annotations_v11'); localStorage.removeItem('air2_demo_annotations_v12'); localStorage.removeItem('air2_demo_annotations_v13'); localStorage.removeItem('air2_demo_annotations_v14'); localStorage.removeItem('air2_demo_annotations_v15'); localStorage.removeItem('air2_demo_annotations_v16'); localStorage.removeItem('air2_demo_annotations_v17'); localStorage.removeItem('air2_demo_annotations_v18'); localStorage.removeItem('air2_demo_annotations_v19'); localStorage.removeItem('air2_demo_annotations_v20'); localStorage.removeItem('air2_demo_annotations_v21'); localStorage.removeItem('air2_demo_annotations_v22'); localStorage.removeItem('air2_demo_annotations_v23'); localStorage.removeItem('air2_demo_annotations_v24'); localStorage.removeItem('air2_demo_annotations_v25'); localStorage.removeItem('air2_demo_annotations_v26'); localStorage.removeItem('air2_demo_annotations_v27'); localStorage.removeItem('air2_demo_annotations_v28'); localStorage.removeItem('air2_demo_annotations_v29'); localStorage.removeItem('air2_demo_annotations_v30'); localStorage.removeItem('air2_demo_annotations_v31'); localStorage.removeItem('air2_demo_annotations_v32'); localStorage.removeItem('air2_demo_annotations_v33'); localStorage.removeItem('air2_demo_annotations_v34'); localStorage.removeItem('air2_demo_annotations_v35'); localStorage.removeItem('air2_demo_annotations_v36'); localStorage.removeItem('air2_demo_annotations_v37'); localStorage.removeItem('air2_demo_annotations_v38'); localStorage.removeItem('air2_demo_annotations_v39'); localStorage.removeItem('air2_demo_annotations_v40'); localStorage.removeItem('air2_demo_annotations_v41'); localStorage.removeItem('air2_demo_annotations_v42'); localStorage.removeItem('air2_demo_annotations_v43'); localStorage.removeItem('air2_demo_annotations_v44'); localStorage.removeItem('air2_demo_annotations_v45'); localStorage.removeItem('air2_demo_annotations_v46'); localStorage.removeItem('air2_demo_annotations_v47'); localStorage.removeItem('air2_demo_annotations_v48'); } catch(e){}
  var host = document.createElement('div');
  host.className = 'anno-root';
  document.body.appendChild(host);

  var enabled = false;
  var drawing = false;
  var start = null;
  var draftBox = null;
  var editingId = null;
  var annotations = load();

  function load(){ try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch(e){ return []; } }
  function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(annotations)); }
  function uid(){ return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function pageKey(){
    var proto = window.__milkStoragePrototype;
    if(proto && proto.page){
      var key = '#milk-' + proto.page;
      if(proto.page === 'scan' && proto.scanState === 'failed') key = '#milk-scan-failed';
      if(proto.page === 'storage' && proto.activeTab) key += '-' + proto.activeTab;
      return key;
    }
    var title = document.querySelector('.ms-header h1,.ms-home-header h1,.v4-title,h1');
    var text = title ? title.textContent.trim().toLowerCase().replace(/\s+/g,'-') : '';
    return text ? '#page-' + text : (location.hash || '#home').replace(/^#$/, '#home');
  }
  function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
  function esc(s){ return String(s || '').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  function render(){
    var page = pageKey();
    var count = annotations.filter(function(a){ return a.page === page; }).length;
    host.innerHTML = ''+
      '<div class="anno-toolbar '+(enabled ? 'is-on' : '')+'">'+
        '<button class="anno-toggle" data-anno="toggle">'+(enabled ? 'Done' : 'Annotate')+'</button>'+
        '<button class="anno-small" data-anno="list">Notes '+(count ? '('+count+')' : '')+'</button>'+
        '<button class="anno-small" data-anno="export">Export</button>'+
        '<button class="anno-small danger" data-anno="clear">Clear</button>'+
      '</div>'+
      '<div class="anno-layer '+(enabled ? 'is-active' : '')+'"></div>'+
      '<div class="anno-list" hidden></div>'+
      '<div class="anno-editor" hidden></div>';
    renderMarks();
  }
  function layer(){ return host.querySelector('.anno-layer'); }
  function editor(){ return host.querySelector('.anno-editor'); }
  function listEl(){ return host.querySelector('.anno-list'); }

  function renderMarks(){
    var l = layer();
    if(!l) return;
    var page = pageKey();
    var pageItems = annotations.filter(function(a){ return a.page === page; });
    l.innerHTML = pageItems.map(function(a,idx){
      return '<button class="anno-mark" data-id="'+a.id+'" style="left:'+a.x+'px;top:'+a.y+'px;width:'+a.w+'px;height:'+a.h+'px"><span>'+(idx+1)+'</span></button>';
    }).join('');
  }

  function openEditor(box, existing){
    editingId = existing ? existing.id : null;
    var e = editor();
    e.hidden = false;
    e.innerHTML = ''+
      '<div class="anno-card">'+
        '<div class="anno-card-title">'+(existing ? 'Edit note' : 'Add note')+'</div>'+
        '<textarea placeholder="写下这里要怎么改，比如：字号太大、位置偏下、颜色不对……">'+esc(existing && existing.note)+'</textarea>'+
        '<div class="anno-meta">'+Math.round(box.w)+'×'+Math.round(box.h)+' · x '+Math.round(box.x)+', y '+Math.round(box.y)+'</div>'+
        '<div class="anno-actions">'+
          (existing ? '<button data-anno="delete-note" class="danger">Delete</button>' : '')+
          '<button data-anno="cancel-note">Cancel</button>'+
          '<button data-anno="save-note" class="primary">Save</button>'+
        '</div>'+
      '</div>';
    e.dataset.box = JSON.stringify(box);
    e.querySelector('textarea').focus();
  }
  function closeEditor(){ editingId = null; var e = editor(); e.hidden = true; e.innerHTML = ''; delete e.dataset.box; }

  function openList(){
    var page = pageKey();
    var items = annotations.filter(function(a){ return a.page === page; });
    var box = listEl();
    box.hidden = false;
    box.innerHTML = '<div class="anno-list-card"><div class="anno-list-head"><strong>Annotations</strong><button data-anno="close-list">Close</button></div>'+
      (items.length ? items.map(function(a,i){ return '<button class="anno-list-item" data-id="'+a.id+'"><b>#'+(i+1)+'</b><span>'+(esc(a.note) || 'No note')+'</span><small>'+Math.round(a.w)+'×'+Math.round(a.h)+' · '+esc(a.page)+'</small></button>'; }).join('') : '<p class="anno-empty">No notes on this page.</p>')+
      '</div>';
  }
  function fallbackExport(text){
    var e = editor();
    e.hidden = false;
    e.innerHTML = '<div class="anno-card"><div class="anno-card-title">Copy annotations</div><textarea>'+esc(text)+'</textarea><div class="anno-actions"><button data-anno="cancel-note" class="primary">Close</button></div></div>';
    e.querySelector('textarea').select();
  }
  function flash(msg){ var t = document.createElement('div'); t.className = 'anno-flash'; t.textContent = msg; document.body.appendChild(t); setTimeout(function(){ t.remove(); }, 1400); }
  function exportNotes(){
    var grouped = {};
    annotations.forEach(function(a){
      if(!grouped[a.page]) grouped[a.page] = [];
      grouped[a.page].push(a);
    });
    var pages = Object.keys(grouped);
    var pageName = {
      '#milk-home':'Home',
      '#milk-device':'Device',
      '#milk-storage-storage':'Milk Storage / Storage Log',
      '#milk-storage-use':'Milk Storage / Use Log',
      '#milk-scan':'Scan before use',
      '#milk-scan-failed':'Scan before use / Not recognized',
      '#milk-result':'Scan result'
    };
    var blocks = pages.map(function(page){
      var lines = ['## ' + (pageName[page] || page)];
      grouped[page].forEach(function(a,i){
        lines.push('');
        lines.push('#' + (i+1));
        lines.push('区域：x=' + Math.round(a.x) + ', y=' + Math.round(a.y) + ', w=' + Math.round(a.w) + ', h=' + Math.round(a.h));
        lines.push('备注：' + (a.note || ''));
      });
      return lines.join(String.fromCharCode(10));
    });
    var text = blocks.join(String.fromCharCode(10) + String.fromCharCode(10));
    if(navigator.clipboard){ navigator.clipboard.writeText(text).then(function(){ flash('Copied annotations by page'); }).catch(function(){ fallbackExport(text); }); }
    else fallbackExport(text);
  }

  function beginDraw(ev){
    if(!enabled || ev.target.closest('.anno-toolbar,.anno-list,.anno-editor,.anno-mark')) return;
    drawing = true;
    start = {x: ev.clientX, y: ev.clientY};
    draftBox = document.createElement('div');
    draftBox.className = 'anno-draft';
    layer().appendChild(draftBox);
    updateDraft(ev);
    ev.preventDefault();
  }
  function updateDraft(ev){
    if(!drawing || !draftBox) return;
    var x = Math.min(start.x, ev.clientX), y = Math.min(start.y, ev.clientY);
    var w = Math.abs(ev.clientX - start.x), h = Math.abs(ev.clientY - start.y);
    draftBox.style.left = x+'px'; draftBox.style.top = y+'px'; draftBox.style.width = w+'px'; draftBox.style.height = h+'px';
  }
  function endDraw(ev){
    if(!drawing) return;
    drawing = false;
    var x = Math.min(start.x, ev.clientX), y = Math.min(start.y, ev.clientY);
    var w = Math.abs(ev.clientX - start.x), h = Math.abs(ev.clientY - start.y);
    if(draftBox) draftBox.remove();
    draftBox = null; start = null;
    if(w < 10 || h < 10) return;
    openEditor({x:clamp(x,0,innerWidth), y:clamp(y,0,innerHeight), w:w, h:h}, null);
  }

  host.addEventListener('click', function(ev){
    var btn = ev.target.closest('[data-anno]');
    var mark = ev.target.closest('.anno-mark');
    var listItem = ev.target.closest('.anno-list-item');
    if(mark){ var a = annotations.find(function(x){ return x.id === mark.dataset.id; }); if(a) openEditor({x:a.x,y:a.y,w:a.w,h:a.h}, a); ev.preventDefault(); return; }
    if(listItem){ var b = annotations.find(function(x){ return x.id === listItem.dataset.id; }); if(b) openEditor({x:b.x,y:b.y,w:b.w,h:b.h}, b); ev.preventDefault(); return; }
    if(!btn) return;
    var act = btn.dataset.anno;
    if(act === 'toggle'){ enabled = !enabled; closeEditor(); render(); }
    if(act === 'list') openList();
    if(act === 'close-list') listEl().hidden = true;
    if(act === 'export') exportNotes();
    if(act === 'clear'){
      if(confirm('Clear annotations on this page?')){ var page = pageKey(); annotations = annotations.filter(function(a){ return a.page !== page; }); save(); render(); }
    }
    if(act === 'cancel-note') closeEditor();
    if(act === 'delete-note'){ if(editingId){ annotations = annotations.filter(function(a){ return a.id !== editingId; }); save(); closeEditor(); render(); } }
    if(act === 'save-note'){
      var e = editor(); var box = JSON.parse(e.dataset.box || '{}'); var note = e.querySelector('textarea').value.trim();
      if(editingId){ var a2 = annotations.find(function(x){ return x.id === editingId; }); if(a2) Object.assign(a2, box, {note:note, updatedAt:new Date().toISOString()}); }
      else annotations.push(Object.assign({id:uid(), page:pageKey(), note:note, createdAt:new Date().toISOString()}, box));
      save(); closeEditor(); render();
    }
    ev.preventDefault();
  });
  document.addEventListener('pointerdown', beginDraw, true);
  document.addEventListener('pointermove', updateDraft, true);
  document.addEventListener('pointerup', endDraw, true);
  window.addEventListener('hashchange', render);
  document.addEventListener('click', function(ev){
    if(ev.target.closest('[data-ms],[data-v4]')) setTimeout(render, 30);
  }, true);
  var oldPush = history.pushState;
  history.pushState = function(){ oldPush.apply(this, arguments); setTimeout(render, 0); };
  var lastKey = '';
  setInterval(function(){
    var key = pageKey();
    if(key !== lastKey){ lastKey = key; render(); }
  }, 500);
  render();
})();
