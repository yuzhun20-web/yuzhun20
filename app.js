// CSV endpoints
const CSV = {
  article: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRtFcnN6Sx_TfSZUOd-z4pJAsdUH9Iwif5O0g511UlRdSj-k3pVMoQJHtYLQhcxOJkpS-BZu0PrI755/pub?output=csv',
  file:    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTRLAWjFV-pv0-Ek3rsR6ITrYwLERjn6gDJES1VfevOZijiFkK4QOIw23gpm4gbJgLm1a6jfxpVFw2L/pub?gid=0&single=true&output=csv',
  daily:   'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5FAscCEiiTPtwoRATyaWkoibduHw-R46MQAemT32oYDB2tp9zzHh3-uErkSt62dqEEwYcFooC3oyg/pub?gid=0&single=true&output=csv'
};

let cache = {article:[], file:[], daily:[]};
let active = 'article';
let pageSize = 100;
let shownCount = 0;
let currentFiltered = [];
let selectedWorks = new Set(); // 多選作品（用 category 欄位）

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

$('#tabArticle').onclick = async ()=>{ setTab('article'); await loadList('article'); };
$('#tabFile').onclick    = async ()=>{ setTab('file'); await loadList('file'); };
$('#tabDaily').onclick   = async ()=>{ setTab('daily'); await loadList('daily'); };
$('#refresh').onclick    = async ()=>{ await loadList(active, true); };
$('#backBottom').onclick = ()=>{ showList(); };

// 書籤：以標題為 key 存卷軸位置（像書籤）
const BM_KEY = 'reader_bookmark_map';
function getBMMap(){ try{ return JSON.parse(localStorage.getItem(BM_KEY)||'{}'); }catch(e){ return {}; } }
function saveBM(title, y){ const m=getBMMap(); m[title]=y; localStorage.setItem(BM_KEY, JSON.stringify(m)); }
function readBM(title){ const m=getBMMap(); return m[title]; }
function clearBM(title){ const m=getBMMap(); delete m[title]; localStorage.setItem(BM_KEY, JSON.stringify(m)); }

$('#bookmark').onclick = ()=>{ saveBM($('#rTitle').textContent, window.scrollY||0); showToast('已加書籤'); };
$('#gotoBM').onclick = ()=>{ const y = readBM($('#rTitle').textContent); if(y!=null) window.scrollTo(0, y); };
$('#clearBM').onclick = ()=>{ clearBM($('#rTitle').textContent); window.scrollTo(0, 0); };

// 搜尋輸入加上 2 字門檻與去抖
let qTimer = null;
$('#q').addEventListener('input', ()=> { if(qTimer) cancelAnimationFrame(qTimer); qTimer = requestAnimationFrame(()=> renderList(active, cache[active])); });

// ===== 字級控制（16/20/24px） =====
const FONT_KEY = 'reader_font_size';
const FONT_MAP = { s:'16px', m:'20px', l:'24px' };
function applyFont(sizeCode){ 
  const px = FONT_MAP[sizeCode] || FONT_MAP.m; 
  document.documentElement.style.setProperty('--fz', px);
  for(const b of $$('.segBtn')) b.setAttribute('aria-pressed','false');
  const btn = document.querySelector(`.segBtn[data-size="${sizeCode}"]`);
  if(btn) btn.setAttribute('aria-pressed','true');
  localStorage.setItem(FONT_KEY, sizeCode);
}
for(const b of $$('.segBtn')) b.addEventListener('click', ()=> applyFont(b.dataset.size));
applyFont(localStorage.getItem(FONT_KEY) || 'm');
// ====================

function setTab(kind){
  active = kind;
  for(const b of $$('nav button')) b.setAttribute('aria-pressed','false');
  (kind==='article'?$('#tabArticle'):kind==='file'?$('#tabFile'):$('#tabDaily')).setAttribute('aria-pressed','true');
  showList();
}

function showList(){
  $('#reader').classList.add('hidden');
  $('#listPanel').classList.remove('hidden');
  $('#toolbar').classList.remove('hidden');
  window.scrollTo(0,0);
}

function showReader(){
  $('#reader').classList.remove('hidden');
  $('#listPanel').classList.add('hidden');
  $('#toolbar').classList.add('hidden');
  window.scrollTo(0,0);
}

// CSV parser with quoted cell handling
function parseCSV(text){
  const rows = [];
  let cur = [], curVal = '', inQuotes = false;
  for(let i=0;i<text.length;i++){ const ch=text[i];
    if(ch=='"'){ if(inQuotes && text[i+1]=='"'){ curVal+='"'; i++; } else inQuotes=!inQuotes; }
    else if(ch==',' && !inQuotes){ cur.push(curVal); curVal=''; }
    else if((ch=='\n' || ch=='\r') && !inQuotes){ if(curVal!==''||cur.length>0){ cur.push(curVal); rows.push(cur); cur=[]; curVal=''; } }
    else curVal+=ch;
  }
  if(curVal!==''||cur.length>0) cur.push(curVal);
  if(cur.length>0) rows.push(cur);
  return rows;
}

async function fetchCSV(url){
  const r = await fetch(url, {cache:'no-store'});
  const text = await r.text();
  const rows = parseCSV(text);
  const body = rows[0] && /日期|date|Date/.test(rows[0][0]) ? rows.slice(1) : rows;
  return body.map(cols => ({date: cols[0]||'', category: cols[1]||'', title: cols[2]||'', content: (cols[3]||'' )}))
             .filter(x => (x.title.trim()!=='' || x.content.trim()!==''));
}

async function loadList(kind){
  const url = kind==='article'?CSV.article:kind==='file'?CSV.file:CSV.daily;
  try{
    const data = await fetchCSV(url);
    cache[kind] = data;
    buildChips(data);
    renderList(kind, data);
  }catch(e){
    console.error('載入 CSV 失敗', e);
    renderEmpty('讀取失敗');
  }
}

function buildChips(arr){
  const wrap = $('#workChips');
  const keep = new Set(selectedWorks);
  const works = Array.from(new Set(arr.map(x => (x.category||'').trim()).filter(Boolean))).sort();
  wrap.innerHTML = '<button class="chip active" data-val="">全部</button>' + works.map(w=>`<button class="chip" data-val="${w}">${w}</button>`).join('');
  selectedWorks = keep;
  wrap.querySelectorAll('.chip').forEach(ch=>{
    ch.addEventListener('click', ()=>{
      const val = ch.getAttribute('data-val');
      if(val===''){
        selectedWorks.clear();
        wrap.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
        ch.classList.add('active');
      } else {
        wrap.querySelector('.chip[data-val=""]').classList.remove('active');
        if(selectedWorks.has(val)) selectedWorks.delete(val); else selectedWorks.add(val);
        ch.classList.toggle('active');
        if(selectedWorks.size===0) wrap.querySelector('.chip[data-val=""]').classList.add('active');
      }
      renderList(active, cache[active]);
    });
    const val2 = ch.getAttribute('data-val');
    if(val2!=='' && selectedWorks.has(val2)) ch.classList.add('active');
  });
  if(selectedWorks.size===0) wrap.querySelector('.chip[data-val=""]').classList.add('active');
}

function renderEmpty(msg){
  const ul = $('#list');
  ul.innerHTML = `<li class="meta">${msg||'目前沒有內容或搜尋不到。'}</li>`;
  $('#loadMoreBox').classList.add('hidden');
}

function renderList(kind, arr){
  const ul = $('#list'); ul.textContent = '';
  let data = arr||[];
  if(selectedWorks.size>0){
    data = data.filter(x => selectedWorks.has((x.category||'').trim()));
  }
  const q = ($('#q').value||'').toLowerCase().trim();
  if(!q && data.length>1500){
    renderEmpty('資料量較大，請先搜尋（至少輸入 2 個字）');
    return;
  }
  if(q.length>0){
    if(q.length<2) return renderEmpty('請至少輸入 2 個字再搜尋');
    data = data.filter(x=>(x.title+x.category+x.content).toLowerCase().includes(q));
  }
  currentFiltered = data;
  shownCount = 0;
  renderMore();
}

function renderMore(){
  const ul = $('#list');
  const end = Math.min(currentFiltered.length, shownCount + pageSize);
  if(shownCount===0 && currentFiltered.length===0) return renderEmpty();
  const batch = 20;
  let i = shownCount;
  function pump(){
    const stop = Math.min(end, i+batch);
    for(; i<stop; i++){ 
      const x = currentFiltered[i];
      const li = document.createElement('li');
      li.className = 'card';
      const title = x.title && x.title.trim()!=='' ? x.title : '(無標題)';
      const cat = (x.category||'').trim();
      const meta = [x.date, cat?('・'+cat):''].join('');
      li.innerHTML = `<h3>${title}</h3><div class="meta">${meta}</div>`;
      li.onclick = ()=> openReader(x);
      ul.appendChild(li);
    }
    if(i<end) requestAnimationFrame(pump);
    else {
      shownCount = end;
      if(shownCount < currentFiltered.length) { $('#loadMoreBox').classList.remove('hidden'); }
      else { $('#loadMoreBox').classList.add('hidden'); }
    }
  }
  pump();
}

function openReader(item){
  const title = item.title && item.title.trim()!=='' ? item.title : '(無標題)';
  $('#rTitle').textContent = title;
  $('#rMeta').textContent  = item.date;
  const el = $('#rContent');
  el.textContent = '';
  progressiveRender(item.content||'');
  showReader();
  const y = readBM(title);
  if(y!=null) { $('#bmNotice').classList.remove('hidden'); }
}

async function progressiveRender(text){
  const el = $('#rContent');
  const bar = $('#progress');
  const fill = $('#progress span');
  bar.classList.remove('hidden');
  const chunkSize = 2000;
  const total = text.length;
  let shown = 0;
  while(shown < total){
    const next = text.slice(shown, shown+chunkSize);
    el.append(document.createTextNode(next));
    shown += next.length;
    const pct = Math.min(100, Math.round((shown/total)*100));
    fill.style.width = pct + '%';
    await new Promise(r => requestAnimationFrame(r));
  }
  bar.classList.add('hidden');
}

// ===== 右滑返回（只在閱讀畫面啟動） =====
let touchStartX=0, touchStartY=0, tracking=false;
const EDGE = 60, THRESH = 50, MAX_ANGLE = 30;
function onTouchStart(e){
  if($('#reader').classList.contains('hidden')) return;
  if(e.touches.length!==1) return;
  const t = e.touches[0];
  touchStartX = t.clientX; touchStartY = t.clientY;
  tracking = (touchStartX <= EDGE);
}
function onTouchMove(e){
  if(!tracking) return;
  const t = e.touches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const angle = Math.abs(Math.atan2(dy, dx) * 180/Math.PI);
  if(angle > 90+MAX_ANGLE || angle < 90-MAX_ANGLE) return;
  if(dx > THRESH){ tracking=false; showList(); }
}
function onTouchEnd(){ tracking=false; }

document.addEventListener('touchstart', onTouchStart, {passive:true});
document.addEventListener('touchmove',  onTouchMove,  {passive:true});
document.addEventListener('touchend',   onTouchEnd,   {passive:true});

// ===== 小提示（輕量 Toast） =====
let toastTimer=null;
function showToast(msg){
  let t = document.querySelector('#toast'); 
  if(!t){
    t = document.createElement('div');
    t.id='toast';
    t.style.position='fixed'; t.style.bottom='24px'; t.style.left='50%'; t.style.transform='translateX(-50%)';
    t.style.background='rgba(0,0,0,.7)'; t.style.color='#fff'; t.style.padding='8px 12px'; t.style.borderRadius='999px';
    t.style.fontSize='14px'; t.style.zIndex='9999';
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity='1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.style.opacity='0', 1200);
}

setTab('article');
loadList('article');
