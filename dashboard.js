'use strict';
const nf = new Intl.NumberFormat('ar-SA',{maximumFractionDigits:1});
const number=n=>nf.format(Number(n)||0);
const dateLabel=s=>s?new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(s)):'سجل سابق';
let selectedRecord=null;
function visibleRecords(){
 let rows=history.map((r,index)=>({...r,index}));
 const range=$('dashRange').value;
 const from=$('dateFrom')?.value,to=$('dateTo')?.value;if(from||to)rows=rows.filter(r=>{if(!r.at)return false;const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(r.at));return (!from||day>=from)&&(!to||day<=to)});
 if(range==='5')rows=rows.slice(0,5);
 if(range==='today'){const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Riyadh'});rows=rows.filter(r=>r.at&&new Date(r.at).toLocaleDateString('en-CA',{timeZone:'Asia/Riyadh'})===today)}
 const q=$('dashSearch').value.trim().toLowerCase(),status=$('dashStatus').value;
 return rows.filter(r=>(status==='all'||r.status===status)&&(!q||(r.name+' '+r.vehicle).toLowerCase().includes(q)));
}
function capacityMetrics(){const remaining=fleet.reduce((a,v)=>a+v.capacity,0),used=history.filter(r=>r.status==='مقبول').reduce((a,r)=>a+(r.weight||0),0);return {remaining,used,total:remaining+used,percent:remaining+used?used/(remaining+used)*100:0,incomplete:history.some(r=>r.status==='مقبول'&&!r.weight)}}
function ring(percent,value,label,key){return `<div class="ring-wrap"><div class="ring" style="background:conic-gradient(#65dbb0 0 ${percent}%,#283c4c ${percent}% 100%)"><div><b>${value}</b><small>${label}</small></div></div><div class="ring-key">${key}</div></div>`}
function drawMap(){
 const old=$('mapVehicle').value;
 $('mapVehicle').innerHTML='<option value="all">كل المركبات</option>'+fleet.map(v=>`<option value="${escapeHtml(v.id)}">${escapeHtml(v.id)}</option>`).join('');
 if(fleet.some(v=>v.id===old))$('mapVehicle').value=old;
 const id=$('mapVehicle').value,shown=id==='all'?fleet:fleet.filter(v=>v.id===id);
 const point=name=>{const p=places[name];return p?[65+p[0]*20,380-p[1]*13]:null};
 const line=(names,color,dash)=>{const ps=names.map(point);if(ps.some(x=>!x))return '';return `<polyline points="${ps.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3" ${dash?'stroke-dasharray="7 6"':''} opacity=".85"/>`};
 let svg='<svg viewBox="0 0 600 330" role="img" aria-label="مخطط تجريبي لمسارات العودة على شبكة افتراضية"><defs><pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#203846" stroke-width=".6"/></pattern></defs><rect width="600" height="330" fill="url(#grid)"/><text x="560" y="28" text-anchor="end" style="fill:#5e7b8a;font-size:12px;letter-spacing:3px">RIYADH / TEST NETWORK</text>';
 for(const v of shown)svg+=line([v.start,v.end],'#65dbb0',false);
 const chosen=history[selectedRecord];
 const vehicle=chosen&&fleet.find(v=>v.id===chosen.vehicle);
 if(vehicle&&chosen.pickup&&chosen.drop&&(id==='all'||id===vehicle.id))svg+=line([vehicle.start,chosen.pickup,chosen.drop,vehicle.end],'#b09aff',true);
 for(const [name] of Object.entries(places)){const p=point(name);svg+=`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#132d38" stroke="#81b9be" stroke-width="2"/><text x="${p[0]}" y="${p[1]-12}" text-anchor="middle">${escapeHtml(name.replace('حي ',''))}</text>`}
 svg+='</svg>';$('routeMap').innerHTML=svg;
 $('routeDetail').innerHTML=id==='all'?`<span class="live-dot"></span> ${number(fleet.length)} رحلات عودة مخططة · الخطوط لا تمثل طرقًا فعلية`:shown.map(v=>`<b dir="ltr">${escapeHtml(v.id)}</b> · ${escapeHtml(v.start)} ← ${escapeHtml(v.end)}<br>السعة المتبقية ${number(v.capacity)} كجم · ${v.cold?'مركبة مبردة':'مركبة عادية'} · وصول أساسي ${number(v.hours)} ساعات`).join('');
}
function showDetails(index){selectedRecord=index;const r=history[index];if(!r)return;const detail=$('shipmentDetails');detail.hidden=false;detail.innerHTML=`<button id="closeDetails" class="outline" style="float:left">إغلاق</button><h3>${escapeHtml(r.name)}</h3><p>${r.pickup?escapeHtml(r.pickup)+' ← '+escapeHtml(r.drop):'الموقع غير مسجل في النسخة السابقة'} · ${escapeHtml(r.status)} · ${dateLabel(r.at)}</p><p>المسافة المستقلة ${r.direct==null?'غير مسجلة':number(r.direct)+' كم'} · الانحراف ${number(r.extra)} كم · المسافة المتجنبة ${number(r.saved)} كم</p><b>فحوص المرشحين</b>${r.checks?'<ul>'+r.checks.map(c=>`<li><b dir="ltr">${escapeHtml(c.id)}</b> — ${c.reasons.length?escapeHtml(c.reasons.join('، ')):'مستوفٍ للقيود'}</li>`).join('')+'</ul>':'<p>هذا السجل أُنشئ قبل إضافة تفاصيل الفحوص.</p>'}`;
 $('closeDetails').onclick=()=>{selectedRecord=null;detail.hidden=true;drawMap()};drawMap();
}
function refreshDashboard(){
 const rows=visibleRecords(),yes=rows.filter(r=>r.status==='مقبول'),no=rows.length-yes.length,km=yes.reduce((a,r)=>a+r.saved,0),cap=capacityMetrics();
 const kpis=[['▣','مركبات العودة',number(fleet.length),'الأسطول كاملًا'],['⇄','الطلبات المعروضة',number(rows.length),'حسب مرشحات السجل'],['✓','نسبة قبول المطابقة',rows.length?number(yes.length/rows.length*100)+'٪':'—',`${number(yes.length)} مقبول · ${number(no)} مرفوض`],['◔','السعة المستخدمة',cap.incomplete?'—':number(cap.percent)+'٪','من السعة المسجلة للأسطول كاملًا'],['⌁','مسافة متجنبة تقديريًا',number(km),'كم · للنتائج المعروضة'],['﷼','فرق تكلفة تقديري',number(km*2.5),'ر.س · عند 2.5 ر.س لكل كم']];
 $('dashKpis').innerHTML=kpis.map(x=>`<article class="kpi"><span class="kpi-icon">${x[0]}</span><p>${x[1]}</p><b>${x[2]}</b><small>${x[3]}</small></article>`).join('');
 $('capacityRing').innerHTML=cap.incomplete?'<p class="empty">السجل السابق لا يحتوي الأوزان. ابدأ تجربة جديدة لقياس الاستغلال بدقة.</p>':ring(cap.percent,number(cap.percent)+'٪','سعة مستخدمة',`<i class="dot green"></i>مستخدمة ${number(cap.used)} كجم<br><i class="dot" style="background:#385369"></i>متبقية ${number(cap.remaining)} كجم`);
 $('capacityList').innerHTML=fleet.map(v=>{const used=history.filter(r=>r.vehicle===v.id&&r.status==='مقبول').reduce((a,r)=>a+(r.weight||0),0),ratio=v.capacity+used?used/(v.capacity+used)*100:0;return `<div class="capacity-row"><span dir="ltr">${escapeHtml(v.id)}</span><div class="meter" title="نسبة السعة المستخدمة"><span style="width:${ratio}%"></span></div><span>${number(v.capacity)} كجم</span></div>`}).join('');
 $('decisionRing').innerHTML=rows.length?ring(yes.length/rows.length*100,number(rows.length),'نتيجة معروضة',`<i class="dot green"></i>مقبول ${number(yes.length)}<br><i class="dot" style="background:#385369"></i>مرفوض ${number(no)}`):'<div class="empty">لا توجد نتائج بعد.<br>أضف شحنة أو حمّل سيناريو العرض.</div>';
 $('decisionChart').innerHTML=rows.length?'<div class="decision-bars">'+rows.slice(0,12).reverse().map((r,i)=>`<div title="${escapeHtml(r.name)}: ${r.status}"><div class="bar ${r.status==='مرفوض'?'no':''}"></div><small>${i+1}</small></div>`).join('')+'</div><div class="chart-legend"><i class="dot green"></i>مقبول　<i class="dot" style="background:#e69d77"></i>مرفوض</div>':'<div class="empty">سيظهر تسلسل القرارات بعد تحليل أول طلب.</div>';
 const reasons={};for(const r of rows.filter(r=>r.status==='مرفوض'))for(const c of r.checks||[])for(const why of c.reasons)reasons[why]=(reasons[why]||0)+1;
 const entries=Object.entries(reasons).sort((a,b)=>b[1]-a[1]),max=Math.max(1,...Object.values(reasons));
 $('reasonChart').innerHTML=entries.length?entries.map(([name,count])=>`<div class="reason-row"><div class="reason-label"><span>${escapeHtml(name)}</span><b>${number(count)}</b></div><div class="meter"><span style="width:${count/max*100}%"></span></div></div>`).join(''):'<div class="empty">لا توجد فحوص رفض مسجلة ضمن المرشحات.</div>';
 $('resultCount').textContent=`${number(rows.length)} من ${number(history.length)} طلبًا · السجل محفوظ في هذا المتصفح`;
 $('dashRows').innerHTML=rows.length?rows.map(r=>`<tr><td>${escapeHtml(r.name)}</td><td>${dateLabel(r.at)}</td><td><span class="tag ${r.status==='مرفوض'?'red':''}">${r.status}</span></td><td dir="ltr">${escapeHtml(r.vehicle||'—')}</td><td>${r.weight==null?'—':number(r.weight)}</td><td>${r.status==='مقبول'?number(r.extra):'—'}</td><td>${r.status==='مقبول'?number(r.saved*2.5):'—'}</td><td><button class="outline" data-detail="${r.index}">عرض</button></td></tr>`).join(''):'<tr><td colspan="8" class="empty">لا توجد طلبات تطابق المرشحات. أنشئ طلبًا أو غيّر خيارات البحث.</td></tr>';
 $('dashRows').querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>showDetails(Number(b.dataset.detail)));
 if(selectedRecord!==null&&!history[selectedRecord]){$('shipmentDetails').hidden=true;selectedRecord=null}
 drawMap();
}
window.refreshDashboard=refreshDashboard;
function selectView(view){for(const v of ['dashboard','operations','fleet','guide'])$(v+'View').hidden=v!==view;document.querySelectorAll('.sidebar [data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false')});if(view==='dashboard')refreshDashboard()}
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>selectView(b.dataset.view));
for(const id of ['dashSearch','dashStatus','dashRange'])$(id).addEventListener(id==='dashSearch'?'input':'change',()=>{selectedRecord=null;$('shipmentDetails').hidden=true;refreshDashboard()});
$('mapVehicle').addEventListener('change',drawMap);
$('clearFilters').onclick=()=>{$('dashSearch').value='';$('dashRange').value='all';$('dashStatus').value='all';refreshDashboard()};
$('demoButton').onclick=()=>{if(!confirm('سيتم استبدال سجل التجربة والمركبات المضافة بأربع حالات عرض افتراضية. هل تريد المتابعة؟'))return;selectedRecord=null;resetAll();for(const key of ['return','cold','oversize','short']){$('preset').value=key;applyPreset();match()}$('preset').value='return';applyPreset();$('clearFilters').click();selectView('dashboard')};
function csvCell(v){let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
$('dashExport').onclick=()=>{const rows=visibleRecords();const csv='\ufeff'+[['الطلب','الوقت','القرار','المركبة','الوزن كجم','الانحراف كم','المسافة المتجنبة كم','فرق التكلفة ر.س'],...rows.map(r=>[r.name,r.at||'',r.status,r.vehicle,r.weight??'',r.status==='مقبول'?fmt(r.extra):'',fmt(r.saved),fmt(r.saved*2.5)])].map(r=>r.map(csvCell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='RAFID_Dashboard.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('guideView').insertAdjacentHTML('beforeend','<h2 style="margin-top:28px">تعريف مؤشرات لوحة التحكم</h2><p class="muted">نسبة القبول = عدد الطلبات المقبولة ÷ عدد النتائج المعروضة. السعة المستخدمة = مجموع أوزان الشحنات المقبولة ÷ مجموع السعة المتبقية والأوزان المقبولة، وهي نسبة من السعة المسجلة للتجربة وليست طن كيلومتر. مؤشرا المركبات والسعة يشملان الأسطول كاملًا، بينما تتبع مؤشرات الطلبات والمسافة والتكلفة المرشحات. فحوص الرفض تعد ظهور كل قيد على كل مركبة، وقد تسجل المركبة أكثر من قيد. اليوم يُحسب بتوقيت الرياض. السجلات السابقة دون تاريخ لا تدخل مرشح اليوم.</p>');
selectView('dashboard');
