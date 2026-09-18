import { createShareCodec } from "./share.js";

const safeJson = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");

export function renderWebApp(defaults) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>fomo-nomo</title>
<style>
*{box-sizing:border-box}button,input{font:inherit}body{margin:0;background:#f1eee5;color:#20231d;font:15px/1.35 Arial,sans-serif}
button{cursor:pointer}.shell{min-height:100vh;display:flex;flex-direction:column}.footer{padding:14px 20px;text-align:right;border-top:1px solid #b8b2a4}.topbar{align-items:center;border-bottom:1px solid #b8b2a4;display:flex;gap:16px;justify-content:space-between;padding:13px 20px;position:sticky;top:0;background:#f1eee5eF;backdrop-filter:blur(12px);z-index:5}
.brand-group{align-items:center;display:flex;flex-wrap:wrap;gap:4px 11px}.brand{font:26px/1 Georgia,serif}.brand span{color:#68765f}.credit{color:#686b61;font-size:12px;text-decoration:underline;text-underline-offset:2px}.credit:hover{color:#20231d}.top-actions{align-items:center;display:flex;gap:10px}.status{color:#686b61;font-size:12px}.button{border:1px solid #20231d;background:transparent;border-radius:99px;padding:8px 14px}.button.primary{background:#20231d;color:#f8f5ec}.button:disabled{cursor:wait;opacity:.55}
.layout{display:grid;grid-template-columns:290px minmax(0,1fr);flex:1}aside{border-right:1px solid #b8b2a4;padding:22px 18px}.side-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.side-title{align-items:center;display:flex;gap:7px;position:relative}h2{font:25px/1.1 Georgia,serif;margin:0}.add-source{font-size:12px;padding:6px 12px}.info-button{align-items:center;background:transparent;border:1px solid #77766f;border-radius:50%;color:#62645c;display:inline-flex;font:700 10px/1 Arial,sans-serif;height:17px;justify-content:center;padding:0;width:17px}
.source-drag{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:24px;height:28px;padding:3px;border:0;background:transparent;color:#77766f;cursor:grab;touch-action:none;user-select:none}.source-drag:hover{color:#20231d}.source-drag:focus-visible{outline:2px solid #20231d}.source.dragging{position:relative;z-index:2;opacity:.8;box-shadow:0 4px 14px #0002}.source.dragging .source-drag{cursor:grabbing}.source.drop-before{box-shadow:0 -3px 0 #68765f}.source.drop-after{box-shadow:0 3px 0 #68765f}.source-actions{display:flex;justify-content:flex-end;margin-top:12px}.source{background:#faf8f1;border:1px solid #b8b2a4;border-radius:0;padding:10px 8px;margin-bottom:8px}.source-row{align-items:center;display:flex;gap:6px}.source input[type=checkbox]{accent-color:#68765f}.source-name{font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.source-swatch{border:1px solid #777;border-radius:50%;flex:0 0 auto;height:15px;width:15px}.source-type{flex-shrink:0;background:#ddd7c9;border-radius:99px;color:#55594e;font-size:9px;letter-spacing:.08em;margin-left:auto;padding:3px 6px;text-transform:uppercase}.edit-source{align-items:center;justify-content:center;display:inline-flex;flex-shrink:0;background:none;border:0;color:#55594e;width:24px;height:24px;padding:4px}.edit-source:hover{background:#e7e1d5;color:#20231d}.edit-source:focus-visible{outline:2px solid #20231d;outline-offset:1px}.remove{background:none;border:0;color:#8d4639;font-size:18px;padding:0 2px}.empty-sources{color:#686b61;font-size:12px;padding:12px 0}
.field{display:block;margin:0 0 12px}.field[hidden]{display:none}.field span{display:block;font-size:10px;font-weight:700;letter-spacing:.08em;margin-bottom:5px;text-transform:uppercase}.field input{background:#faf8f1;border:1px solid #b8b2a4;border-radius:4px;padding:8px;width:100%}.color-picker{border:0;padding:0;margin:0 0 12px;min-width:0}.color-picker legend{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}.color-palette{border:0;padding:0;min-width:0;margin:0;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px;margin-bottom:12px}.color-option{position:relative;display:flex;justify-content:center;align-items:center;cursor:pointer;min-height:36px}.color-option input{position:absolute;opacity:0;width:1px;height:1px}.color-chip{display:block;width:28px;height:28px;border:1px solid #0003;border-radius:50%;background:var(--chip)}.color-option input:checked+.color-chip{outline:2px solid #20231d;outline-offset:3px}.color-option input:focus-visible+.color-chip{outline:2px dashed #20231d;outline-offset:4px}.color-palette:disabled{opacity:.3;filter:grayscale(1)}.color-palette:disabled .color-option{cursor:default}.custom-color-toggle{display:flex;align-items:center;gap:7px;margin:4px 0 12px;font-size:12px}.custom-color-toggle input{accent-color:#68765f}.hex-row{display:flex;align-items:center;gap:12px}.hex-row[hidden]{display:none}.hex-row .field{flex:1;min-width:0;margin-bottom:0}.field input:disabled{opacity:.55}.hex-preview{flex:0 0 28px;width:28px;height:28px;border:1px solid #777;border-radius:50%}.hex-hint{font-size:11px;color:#686b61}.provider-note{color:#686b61;font-size:10px;margin:14px 0 0}
.content{min-width:0;padding:28px 22px 60px}.hero{align-items:end;display:flex;gap:20px;justify-content:space-between;margin-bottom:22px}.hero h1{font:clamp(38px,6vw,72px)/.94 Georgia,serif;letter-spacing:-.04em;margin:8px 0}.hero p{color:#686b61;margin:0}.calendar{background:#faf8f1;border-collapse:collapse;table-layout:fixed;width:100%}.calendar th{background:#20231d;color:#f8f5ec;font-size:10px;letter-spacing:.08em;padding:8px;text-transform:uppercase}.calendar td{border:1px solid #b8b2a4;height:165px;padding:7px;vertical-align:top}.calendar td.today{background:#fff3bd}.day-number{font:15px Georgia,serif;margin-bottom:6px}.event{background:var(--source-tint,#e1dccf);border-left:4px solid var(--source-color,#68765f);margin-bottom:6px;padding:6px}.event-time,.event-meta{color:#4f5349;font-size:9px}.event-title{font:13px/1.15 Georgia,serif;margin:3px 0}.event-title a{color:inherit;text-decoration-thickness:1px;text-underline-offset:2px}.empty-day{color:#999488;font-size:9px;font-style:italic}.message{border:1px dashed #9e998c;color:#686b61;padding:30px;text-align:center}.agenda{display:none}.error{color:#8d4639}
.undo-toast{position:fixed;right:20px;bottom:20px;z-index:10;display:flex;align-items:center;gap:18px;max-width:calc(100vw - 40px);padding:14px 18px;background:#20231d;color:#f8f5ec;box-shadow:0 6px 24px #0003}.undo-toast[hidden]{display:none}.undo-toast span{min-width:0;overflow-wrap:anywhere}.undo-toast button{background:none;border:0;color:#f8f5ec;font-weight:700;text-decoration:underline;text-underline-offset:3px;padding:8px}.undo-toast button:focus-visible{outline:2px solid #f8f5ec;outline-offset:2px}
.dialog{background:#f8f5ec;border:1px solid #20231d;box-shadow:0 15px 60px #0003;max-width:500px;padding:24px;width:calc(100% - 28px)}dialog::backdrop{background:#20231d99}.dialog h2{margin-bottom:18px}#about-dialog a{color:inherit;text-underline-offset:3px}.about-steps{padding-left:20px}.about-steps li{margin:10px 0}.dialog-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:18px}
@media(max-width:900px){.layout{display:block}aside{border-bottom:1px solid #b8b2a4;border-right:0}.content{padding:24px 14px 50px}.calendar{display:none}.agenda{display:block}.agenda-day{border-top:1px solid #b8b2a4;padding:16px 0}.agenda-day h3{font:22px Georgia,serif;margin:0 0 10px}.event{padding:10px}.event-title{font-size:18px}.event-time,.event-meta{font-size:11px}.topbar{padding:12px 14px}.status{display:none}}
</style></head><body><div class="shell">
<nav class="topbar"><div class="brand-group"><div class="brand">fomo-<span>nomo</span></div><button class="info-button" id="about-open" type="button" aria-label="About fomo-nomo" aria-haspopup="dialog" aria-controls="about-dialog">i</button></div><div class="top-actions"><span class="status" id="status">Your sources stay in this browser</span><button class="button primary" id="refresh">Refresh</button></div></nav>
<div class="layout"><aside><div class="side-head"><div class="side-title"><h2>Sources</h2></div><button class="button add-source" id="add-source">+ Add</button></div><div id="sources"></div><div class="source-actions"><button class="button" id="share-calendar" type="button">Share</button></div>
</aside>
<main class="content"><div class="hero"><div><h1>What's Happening?</h1><p id="summary"></p></div></div><div id="calendar"><div class="message">Loading your calendar...</div></div></main></div><footer class="footer"><a class="credit" href="https://funplings.github.io/" target="_blank" rel="noopener">created by funplings</a></footer></div>
<div class="undo-toast" id="undo-toast" hidden><span id="undo-message" role="status" aria-live="polite" aria-atomic="true"></span><button type="button" id="undo-remove">Undo</button></div>
<dialog class="dialog" id="share-dialog" aria-labelledby="share-title">
<h2 id="share-title">Share calendar</h2>
<p>Anyone with this link can open your sources in their calendar.</p>
<label class="field"><span>Calendar link</span><input id="share-link" type="text" readonly></label>
<p id="share-status" role="status" aria-live="polite"></p>
<div class="dialog-actions"><button class="button" id="share-close" type="button">Close</button><button class="button primary" id="copy-link" type="button">Copy link</button></div>
</dialog>
<dialog class="dialog" id="about-dialog" aria-labelledby="about-title">
<h2 id="about-title">How it works</h2>
<p>fomo-nomo consolidates events from multiple sources into one calendar.</p>
<p>Currently supported sources:</p>
<ul class="about-steps">
<li>Luma</li>
<li>Square</li>
<li>Partiful</li>
<li>Eventbrite</li>
</ul>
<p>If you would like to request support for another source, please reach out to me on Twitter (<a href="https://x.com/funplings" target="_blank" rel="noopener">@funplings</a>)!</p>
<form method="dialog" class="dialog-actions"><button class="button" autofocus>Close</button></form>
</dialog>
<dialog class="dialog" id="source-dialog"><form method="dialog" id="source-form"><h2 id="source-dialog-title">Add a source</h2><label class="field"><span>Name</span><input id="source-name" placeholder="Fractal Tech" required></label><label class="field" id="source-url-field"><span>URL</span><input id="source-url" type="url" placeholder="https://..." required><small class="provider-note">Supported: Luma calendars, Square classes, Partiful profiles, Eventbrite organizers.</small></label><fieldset class="color-picker"><legend>Color</legend><fieldset class="color-palette" id="color-palette" aria-label="Preset colors"></fieldset><label class="custom-color-toggle"><input id="use-custom-color" type="checkbox"> Use custom hexcode</label><div class="hex-row" id="custom-hex-controls" hidden><label class="field" id="custom-color-field"><span>Custom hex code</span><input id="source-color" type="text" placeholder="#6688c5" maxlength="7" pattern="#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" aria-describedby="hex-hint" autocomplete="off" spellcheck="false" required><small class="hex-hint" id="hex-hint">Use 3 or 6 hex digits, with or without #.</small></label><span class="hex-preview" id="hex-preview" role="img" aria-label="Custom color preview"></span></div></fieldset><div class="dialog-actions"><button class="button" id="source-cancel" type="button">Cancel</button><button class="button primary" id="source-save" value="default">Add source</button></div></form></dialog>
<script>const {encodeSources,decodeSources}=(${createShareCodec.toString()})();
const DEFAULTS=${safeJson(defaults)};
const KEY="fomo-nomo-settings-v1",LEGACY_KEY="open-calendar-settings-v1",PALETTE=["#d97757","#6688c5","#9b72b0","#5f9b72","#d0a43c","#b85c7a","#4e9ca1","#8b795e","#b94e48","#cd6b85","#c85b9c","#a65f91","#875f9b","#705ca8","#626ab2","#4c78a8","#3d8ca8","#3c9992","#44856b","#77964f","#a2a34b","#c19345","#c47b3f","#a86443","#e5a38a","#dba5b7","#bba3d0","#9bb5d7","#91b9ab","#b9c596","#d9c18b","#777b78"];let state=loadState(),events=[],editingSourceIndex=null,removedSources=[],undoTimer=null,refreshVersion=0;
const $=(id)=>document.getElementById(id);const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function validColor(color,index=0){return /^#[0-9a-f]{6}$/i.test(color||"")?color:PALETTE[index%PALETTE.length]}
function tint(color){const c=validColor(color);return c+"35"}
function hydrate(value){return {sources:(value.sources||[]).map((source,index)=>{const {lookaheadDays,...rest}=source;return {...rest,color:validColor(source.color,index)}})}}
function loadState(){try{return hydrate(JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY))||structuredClone(DEFAULTS))}catch{return hydrate(structuredClone(DEFAULTS))}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderSources();renderHeader();syncCalendarUrl().catch(()=>{})}
function typeFor(url){if(url.includes("squareup.com"))return"square";if(url.includes("partiful.com"))return"partiful";if(url.includes("eventbrite.com"))return"eventbrite";if(url.includes("luma.com"))return"luma";return"web"}
function renderSources(){const host=$("sources");host.innerHTML="";if(!state.sources.length){host.innerHTML='<div class="empty-sources">No sources yet. Add a Luma, Square, Partiful, or Eventbrite link to begin.</div>';return}state.sources.forEach((source,index)=>{const el=document.createElement("div");el.className="source";el.innerHTML='<div class="source-row"><input type="checkbox" '+(source.enabled!==false?"checked":"")+'><span class="source-swatch" style="background:'+validColor(source.color,index)+'"></span><span class="source-name">'+esc(source.name)+'</span><span class="source-type">'+typeFor(source.url)+'</span><button class="edit-source" type="button" title="Edit source" aria-label="Edit source"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5-13 13H3v-5L16 3Z"/><path d="m13 6 5 5"/></svg></button><button class="remove" title="Remove source">×</button><button class="source-drag" type="button" title="Drag to reorder, or use arrow keys" aria-label="Reorder source"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M3 4h10M3 8h10M3 12h10"/></svg></button></div>';const [check,,,,edit,remove,reorder]=el.querySelector(".source-row").children;check.onchange=()=>{source.enabled=check.checked;save()};edit.onclick=()=>openSourceDialog(index);remove.onclick=()=>removeSource(index);bindSourceDrag(reorder,el,index);host.append(el)})}
function reorderSource(index,target){
  if(!Number.isInteger(index)||!Number.isInteger(target)||index<0||index>=state.sources.length||target<0||target>=state.sources.length||index===target)return;
  const [source]=state.sources.splice(index,1);
  state.sources.splice(target,0,source);
  save();
  $("sources").children[target]?.querySelector(".source-drag")?.focus();
}
function moveSource(index,direction){if([-1,1].includes(direction))reorderSource(index,index+direction)}
function bindSourceDrag(handle,row,index){
  let drag=null;
  const clearMarks=()=>{for(const item of $("sources").children)item.classList.remove("drop-before","drop-after")};
  const finish=(event,cancel=false)=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    const {target,pointerId}=drag;
    drag=null;
    row.classList.remove("dragging");row.style.transform="";clearMarks();
    if(handle.hasPointerCapture(pointerId))handle.releasePointerCapture(pointerId);
    if(!cancel)reorderSource(index,target);
  };
  handle.onpointerdown=event=>{
    if(event.button!==0||!event.isPrimary||state.sources.length<2)return;
    event.preventDefault();
    handle.focus();
    drag={pointerId:event.pointerId,startY:event.clientY,target:index};
    handle.setPointerCapture(event.pointerId);
    row.classList.add("dragging");
  };
  handle.onpointermove=event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    event.preventDefault();
    row.style.transform="translateY("+(event.clientY-drag.startY)+"px)";
    const others=Array.from($("sources").children).filter(item=>item!==row);
    drag.target=others.filter(item=>{const rect=item.getBoundingClientRect();return event.clientY>rect.top+rect.height/2}).length;
    clearMarks();
    if(drag.target!==index){
      const marker=others[drag.target]||others[others.length-1];
      marker.classList.add(drag.target<others.length?"drop-before":"drop-after");
    }
    if(event.clientY<70)window.scrollBy(0,-12);
    else if(event.clientY>window.innerHeight-50)window.scrollBy(0,12);
  };
  handle.onpointerup=event=>finish(event);
  handle.onpointercancel=event=>finish(event,true);
  handle.onlostpointercapture=event=>finish(event,true);
  handle.onkeydown=event=>{
    if(event.key==="Escape"&&drag){event.preventDefault();finish({pointerId:drag.pointerId},true)}
    else if(!drag&&(event.key==="ArrowUp"||event.key==="ArrowDown")){event.preventDefault();moveSource(index,event.key==="ArrowUp"?-1:1)}
  };
}
function dismissUndo(){clearTimeout(undoTimer);undoTimer=null;removedSources=[];$("undo-toast").hidden=true;$("undo-message").textContent=""}
function scheduleUndoDismiss(){clearTimeout(undoTimer);undoTimer=setTimeout(dismissUndo,10000)}
function removeSource(index){
  const [source]=state.sources.splice(index,1);
  if(!source)return;
  removedSources.push({source,index});
  events=events.filter(event=>event.sourceId!==source.id);
  save();renderCalendar();refresh();
  $("undo-message").textContent=removedSources.length===1?source.name+" removed.":removedSources.length+" sources removed.";
  $("undo-toast").hidden=false;
  scheduleUndoDismiss();
}
$("undo-remove").onclick=()=>{
  if(!removedSources.length)return;
  for(const {source,index} of removedSources.slice().reverse())state.sources.splice(index,0,source);
  dismissUndo();save();refresh();
};
$("undo-toast").onmouseenter=()=>clearTimeout(undoTimer);
$("undo-toast").onmouseleave=scheduleUndoDismiss;
$("undo-toast").onfocusin=()=>clearTimeout(undoTimer);
$("undo-toast").onfocusout=scheduleUndoDismiss;
function renderHeader(){$("summary").textContent=events.length+" upcoming "+(events.length===1?"event":"events")+"."}
const dayKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");const time=d=>d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
function eventHtml(e){const source=state.sources.find(source=>source.id===e.sourceId),color=validColor(source?.color);return '<div class="event" style="--source-color:'+color+';--source-tint:'+tint(color)+'"><div class="event-time">'+time(new Date(e.start))+(e.categories[0]?" · "+esc(e.categories[0]):"")+'</div><div class="event-title"><a href="'+esc(e.url)+'" target="_blank" rel="noopener">'+esc(e.title)+'</a></div><div class="event-meta">'+esc(e.venue)+(e.price?" · "+esc(e.price):"")+'</div></div>'}
function renderCalendar(){renderHeader();const root=$("calendar");if(!events.length){root.innerHTML='<div class="message">No upcoming events found. Add a source or refresh to check again.</div>';return}const grouped=new Map;events.sort((a,b)=>new Date(a.start)-new Date(b.start)).forEach(e=>{const k=dayKey(new Date(e.start));grouped.set(k,[...(grouped.get(k)||[]),e])});const start=new Date;start.setHours(0,0,0,0);start.setDate(start.getDate()-start.getDay());const end=new Date(events[events.length-1].start);end.setHours(0,0,0,0);end.setDate(end.getDate()+(6-end.getDay()));const days=[];for(const d=new Date(start);d<=end;d.setDate(d.getDate()+1))days.push(new Date(d));const today=dayKey(new Date);let rows="";for(let i=0;i<days.length;i+=7)rows+="<tr>"+days.slice(i,i+7).map(d=>{const es=grouped.get(dayKey(d))||[];return '<td class="'+(dayKey(d)===today?"today":"")+'"><div class="day-number">'+d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+'</div>'+(es.map(eventHtml).join("")||'<div class="empty-day">No events</div>')+"</td>"}).join("")+"</tr>";const table='<table class="calendar"><thead><tr>'+["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>"<th>"+x+"</th>").join("")+"</tr></thead><tbody>"+rows+"</tbody></table>";const agenda='<div class="agenda">'+days.filter(d=>grouped.has(dayKey(d))).map(d=>'<section class="agenda-day"><h3>'+d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})+'</h3>'+(grouped.get(dayKey(d))||[]).map(eventHtml).join("")+"</section>").join("")+"</div>";root.innerHTML=table+agenda}
async function refresh(){const version=++refreshVersion;const button=$("refresh"),status=$("status");button.disabled=true;button.textContent="Refreshing...";status.className="status";status.textContent="Fetching public sources";try{const response=await fetch("/api/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(state)});let data;try{data=await response.json()}catch{throw new Error(response.status===404?"The events endpoint was not found. Reload the page and try again.":"The events service returned an unexpected response. Try again shortly.")}if(version!==refreshVersion)return;if(!response.ok)throw new Error(data.error||"Could not refresh events.");events=data.events||[];renderCalendar();status.textContent=data.failures?.length?data.failures.length+" source failed to load":"Updated just now"}catch(error){if(version!==refreshVersion)return;status.className="status error";status.textContent=error.message;$("calendar").innerHTML='<div class="message error">'+esc(error.message)+"</div>"}finally{if(version===refreshVersion){button.disabled=false;button.textContent="Refresh"}}}
function normalizeHex(value){const hex=value.trim().replace(/^#/,"");if(!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex))return null;return "#"+(hex.length===3?hex.split("").map(c=>c+c).join(""):hex).toLowerCase()}
let selectedPaletteColor=PALETTE[0];
function updateHexPreview(){
  const color=normalizeHex($("source-color").value);
  $("hex-preview").style.background=color||"transparent";
  $("hex-preview").title=color||"Enter a valid hex color";
  $("hex-preview").setAttribute("aria-label",color?"Custom color "+color:"Invalid hex color");
}
function updateColorMode(){
  const custom=$("use-custom-color").checked;
  $("color-palette").disabled=custom;
  $("source-color").disabled=!custom;
  $("custom-hex-controls").hidden=!custom;
  $("source-color").setCustomValidity("");
  updateHexPreview();
}
function renderColorPicker(color){
  color=validColor(color).toLowerCase();
  selectedPaletteColor=PALETTE.includes(color)?color:PALETTE[0];
  $("source-color").value=color;
  $("use-custom-color").checked=!PALETTE.includes(color);
  $("color-palette").innerHTML=PALETTE.map(c=>'<label class="color-option" title="'+c+'"><input type="radio" name="source-color-choice" value="'+c+'" aria-label="'+c+'" '+(c===selectedPaletteColor?'checked':'')+'><span class="color-chip" style="--chip:'+c+'"></span></label>').join("");
  updateColorMode();
}
$("color-palette").onchange=e=>{if(!$("use-custom-color").checked&&PALETTE.includes(e.target.value))selectedPaletteColor=e.target.value};
$("use-custom-color").onchange=updateColorMode;
$("source-color").oninput=()=>{$("source-color").setCustomValidity("");updateHexPreview()};
function openSourceDialog(index=null){editingSourceIndex=index;const editing=index!==null,source=editing?state.sources[index]:null;$("source-dialog-title").textContent=editing?"Edit source":"Add a source";$("source-save").textContent=editing?"Save changes":"Add source";$("source-name").value=source?.name||"";$("source-url").value=source?.url||"";renderColorPicker(source?.color||PALETTE[state.sources.length%PALETTE.length]);$("source-dialog").showModal()}
$("source-cancel").onclick=()=>{$("source-dialog").close();$("source-form").reset();editingSourceIndex=null};
$("add-source").onclick=()=>openSourceDialog();
$("source-form").onsubmit=e=>{
  e.preventDefault();
  const name=$("source-name").value.trim(),url=$("source-url").value.trim(),color=$("use-custom-color").checked?normalizeHex($("source-color").value):selectedPaletteColor;
  if(!color){$("source-color").setCustomValidity("Enter a valid hex color, such as #6688c5.");$("source-color").reportValidity();return}
  let urlChanged=false;
  if(editingSourceIndex!==null){
    const source=state.sources[editingSourceIndex];
    urlChanged=source.url!==url;
    Object.assign(source,{name,url,color});
    if(urlChanged)delete source.type;
  }else{
    state.sources.push({id:"custom-"+Date.now(),name,url,color,enabled:true,categories:[]});
    urlChanged=true;
  }
  $("source-dialog").close();
  e.target.reset();
  editingSourceIndex=null;
  save();
  if(urlChanged)refresh();else renderCalendar();
};
$("about-open").onclick=()=>$("about-dialog").showModal();
let urlVersion=0,loadVersion=0,urlUpdate=Promise.resolve(null);
function syncCalendarUrl(){
  const version=++urlVersion;
  urlUpdate=(async()=>{
    const encoded=await encodeSources(state.sources);
    if(version!==urlVersion)return null;
    const url=new URL(location.href);
    url.hash="calendar="+encoded;
    history.replaceState(null,"",url.href);
    return url.href;
  })();
  return urlUpdate;
}
$("share-calendar").onclick=async()=>{
  $("share-dialog").showModal();
  $("share-link").value="";
  $("share-status").textContent="Creating link…";
  $("copy-link").disabled=true;
  try{
    let link;
    do{link=await syncCalendarUrl()}while(!link);
    $("share-link").value=link;
    $("share-status").textContent="";
    $("copy-link").disabled=false;
  }catch(error){$("share-status").textContent=error.message||"Could not create a calendar link."}
};
$("share-close").onclick=()=>$("share-dialog").close();
$("share-link").onclick=()=>$("share-link").select();
$("copy-link").onclick=async()=>{
  try{await navigator.clipboard.writeText($("share-link").value);$("share-status").textContent="Link copied."}
  catch{$("share-link").focus();$("share-link").select();$("share-status").textContent="Select and copy the link above."}
};
async function initialize(){
  const version=++loadVersion;
  ++urlVersion;++refreshVersion;
  const fragment=location.hash.slice(1);
  if(fragment.startsWith("calendar=")){
    try{const sources=await decodeSources(fragment.slice(9));if(version!==loadVersion)return;state=hydrate({sources})}
    catch{
      if(version!==loadVersion)return;
      state=loadState();
      renderSources();renderHeader();
      $("calendar").innerHTML='<div class="message error">This calendar link is invalid or incomplete. Your saved sources are still available. Use Refresh to load them.</div>';
      $("status").textContent="Could not open shared calendar";
      return;
    }
  }
  renderSources();renderHeader();
  syncCalendarUrl().catch(()=>{});
  await refresh();
}
$("refresh").onclick=refresh;
window.addEventListener("hashchange",()=>{dismissUndo();initialize()});
const ready=initialize();
</script>
<script type="module">
import { inject } from 'https://cdn.jsdelivr.net/npm/@vercel/analytics@1/dist/index.js';
inject();
</script>
</body></html>`;
}
