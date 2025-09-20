(function(){
  const cfg = window.AppConfig || {};
  const state = { chapters: [], selectedId: null };
  const getMode = () => localStorage.getItem("readingMode") || cfg.DEFAULT_MODE || "dark";
  const applyMode = () => { document.body.classList.remove("dark","eyecare","lightgray","paper"); document.body.classList.add(getMode()); };

  function parseCSV(text){
    text = text.replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/).filter(l=>l.length>0);
    if(!lines.length) return [];
    const headers = lines[0].split(',');
    return lines.slice(1).map(line=>{
      const cols=[]; let cur='', inQ=false;
      for(let i=0;i<line.length;i++){ const ch=line[i];
        if(ch==='"'){ if(inQ && line[i+1]==='"'){ cur+='"'; i++; } else { inQ=!inQ; } }
        else if(ch===',' && !inQ){ cols.push(cur); cur=''; }
        else cur+=ch;
      } cols.push(cur);
      const row={}; headers.forEach((h,i)=>row[h.trim()]=(cols[i]||'').trim()); return row;
    });
  }
  async function loadData(){
    if(cfg.DATA_SOURCE==="csv"){
      const res = await fetch(cfg.CSV_PATH);
      const txt = await res.text();
      return parseCSV(txt);
    } else if(cfg.DATA_SOURCE==="api" && cfg.API_ENDPOINT){
      const res = await fetch(cfg.API_ENDPOINT, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(cfg.API_PARAMS||{})});
      const data = await res.json();
      return (data.rows || data || []);
    }
    return [];
  }
  function renderList(){
    const ul = document.getElementById("chapterList"); if(!ul) return;
    ul.innerHTML="";
    const t=cfg.TITLE_FIELD,s=cfg.SUBTITLE_FIELD,p=cfg.SUBPART_FIELD,id=cfg.ID_FIELD,st=cfg.STATUS_FIELD;
    state.chapters.forEach(ch=>{
      const li=document.createElement("li"); li.className="chapter-item"; li.dataset.id=ch[id];
      const title=(ch[t]||"").toString(), sub=(ch[s]||"").toString(), subp=(ch[p]||"").toString(), status=(ch[st]||"").toString();
      li.innerHTML=`<div><strong>${title}</strong> ${sub} ${subp} ${status?`<span class="badge">${status}</span>`:''}</div>`;
      li.addEventListener("click", ()=>openChapter(ch[id])); ul.appendChild(li);
    });
  }
  function openChapter(id){
    state.selectedId=id;
    const idk=cfg.ID_FIELD, ck=cfg.CONTENT_FIELD, tk=cfg.TITLE_FIELD, sk=cfg.SUBTITLE_FIELD, pk=cfg.SUBPART_FIELD, uk=cfg.URL_FIELD;
    const ch=state.chapters.find(x=>(x[idk]||'').toString()===(id||'').toString()); if(!ch) return;
    const titleEl=document.getElementById("chapterTitle"); const contentEl=document.getElementById("chapterContent");
    if(titleEl) titleEl.textContent=[ch[tk], ch[sk], ch[pk]].filter(Boolean).join(" ");
    const body=(ch[ck]||"").toString(); const url=(ch[uk]||"").toString();
    if(contentEl){
      if(body){ contentEl.textContent=body; }
      else if(url){ contentEl.innerHTML=`<a href="${url}" target="_blank" rel="noopener">在原站閱讀本章（來源連結）</a>`; }
      else { contentEl.textContent="（尚未搬入內容。可在表格的「內容」欄貼上本文，或填來源URL）"; }
    }
    const ct=document.getElementById("content"); if(ct) ct.scrollIntoView({behavior:"smooth", block:"start"});
  }
  async function initReader(){ applyMode(); state.chapters = await loadData(); renderList(); }

  function initSettings(){
    applyMode();
    const now = document.getElementById("currentMode");
    if(now) now.textContent = (localStorage.getItem("readingMode") || cfg.DEFAULT_MODE || "dark");
    window.chooseMode = (mode)=>{
      localStorage.setItem("readingMode", mode);
      applyMode();
      const n = document.getElementById("currentMode");
      if(n) n.textContent = mode;
    };
    const sourceLabel = document.getElementById("sourceLabel");
    const csvPath = document.getElementById("csvPath");
    const apiEndpoint = document.getElementById("apiEndpoint");
    if(sourceLabel) sourceLabel.textContent = cfg.DATA_SOURCE;
    if(csvPath) csvPath.textContent = cfg.CSV_PATH;
    if(apiEndpoint) apiEndpoint.textContent = cfg.API_ENDPOINT || "(未設定)";
  }

  // Register SW
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('./sw.js').catch(()=>{});
    });
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    if(document.getElementById("chapterList")) initReader();
    if(document.getElementById("settingsPage")) initSettings();
  });
})();