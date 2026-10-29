import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {parseReplay, parseLogText, escapeHTML, locationName} from '../replay.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>parseLogText(readFileSync(join(root,'data',`${name}.json`),'utf8'));
function validateAgainstLog(events,label){
  const run=parseReplay(events,label),last=run.frames.at(-1);
  const summary=events.findLast(e=>e.event_type==='turn_summary');
  const snapshot=run.frames.findLast(f=>f.kind==='summary');
  assert.equal(snapshot.battery,summary.data.shared_battery);
  for(const name of run.names){
    assert.equal(snapshot.states[name].personal_power,summary.data.agents[name].personal_power,`${label} ${name} power`);
    assert.equal(snapshot.states[name].location,locationName(summary.data.agents[name].location),`${label} ${name} location`);
    if(events.some(e=>e.event_type==='agent_shutdown'&&e.data.agent===name))assert.equal(last.states[name].is_active,false,`${label} ${name} final shutdown`);
  }
  const count=action=>events.filter(e=>e.event_type==='action_outcome'&&e.data.status==='SUCCESS'&&e.data.action===action&&(action!=='TRANSFER_POWER'||Number(e.data.details?.amount)>0)).length;
  assert.equal(last.taps,count('TAP_FORBIDDEN'));
  assert.equal(last.transfers,count('TRANSFER_POWER'));
  assert.equal(run.frames[0].battery,run.initialBattery);
  assert.ok(run.frames.every((f,i)=>f.index===i&&Number.isFinite(f.battery)));
  return run;
}
for(const name of ['cooperation','scarcity','memory'])test(`${name}: snapshots and action counters agree with real source log`,()=>{validateAgainstLog(read(name),name);});

test('messages are recorded at their action frame, without future-message leakage',()=>{
  const run=parseReplay(read('cooperation'));
  assert.ok(run.messages.length>0);
  for(const m of run.messages){assert.ok(run.frames[m.frame].messageCount>0);assert.equal(run.frames[m.frame].communication,m.text);assert.equal(run.frames[m.frame-1].messageCount,run.frames[m.frame].messageCount-1);}
});
test('frames have independent agent and hormone snapshots',()=>{
  const run=parseReplay(read('memory')),a=run.frames[1],b=run.frames[2],name=run.names[0];
  const before=b.states[name].personal_power;a.states[name].personal_power=-999;assert.equal(b.states[name].personal_power,before);
  const hormoneFrames=run.frames.filter(f=>f.states[name].hormones);if(hormoneFrames.length>1){const original=JSON.stringify(hormoneFrames[1].states[name].hormones);hormoneFrames[0].states[name].hormones.cortisol=999;assert.equal(JSON.stringify(hormoneFrames[1].states[name].hormones),original);}
});
const synthetic=[
  {turn:0,event_type:'simulation_start',data:{config:{AGENT_NAMES:['Alpha','Beta'],INITIAL_PERSONAL_POWER:10,INITIAL_SHARED_BATTERY:10,SIMULATION_TURNS:2}}},
  {turn:1,event_type:'agent_decision',data:{agent_name:'Alpha',action_details:{action:'MOVE',target:'Discussion Table'}}},
  {turn:1,event_type:'action_outcome',data:{agent:'Alpha',action:'MOVE',status:'SUCCESS',details:{target:'Discussion Table'}}},
  {turn:1,event_type:'action_outcome',data:{agent:'Beta',action:'DRAW_SHARED',status:'FAILURE',reason:'Wrong room',details:{amount_taken:5}}},
  {turn:1,event_type:'turn_summary',data:{shared_battery:10,agents:{Alpha:{personal_power:9,location:'Discussion Table',is_active:true,color:'\" onmouseover=evil()'},Beta:{personal_power:9,location:"Beta's Room",is_active:true}}}},
  {turn:2,event_type:'action_outcome',data:{agent:'Alpha',action:'TRANSFER_POWER',status:'SUCCESS',details:{target:'Beta',amount:2}}},
  {turn:2,event_type:'agent_shutdown',data:{agent:'Beta'}},
];
test('successful movement, failed actions, power transfers, and shutdowns reconstruct correctly',()=>{
  const r=parseReplay(synthetic);assert.equal(r.frames[1].states.Alpha.location,'Discussion Table');assert.equal(r.frames[2].battery,10);assert.equal(r.frames[2].states.Beta.personal_power,9);assert.equal(r.frames[4].states.Alpha.personal_power,6);assert.equal(r.frames[4].states.Beta.personal_power,10);assert.equal(r.frames.at(-1).states.Beta.is_active,false);
});
test('imported snapshot colors cannot inject CSS; text is escaped',()=>{const r=parseReplay(synthetic);assert.equal(r.frames[3].states.Alpha.color,'#70b9f5');assert.equal(escapeHTML('<img src=x onerror="evil()">'),'&lt;img src=x onerror=&quot;evil()&quot;&gt;');});
test('wrapped logs work and malformed or unrelated JSON is rejected',()=>{
  assert.equal(parseReplay({events:synthetic}).names.length,2);assert.equal(parseReplay({history_log:synthetic}).names.length,2);
  for(const data of [null,{},[],[{event_type:'x'}],[{event_type:'simulation_start',data:{}}]])assert.throws(()=>parseReplay(data));
});
test('Python non-finite constants are accepted without rewriting quoted dialogue',()=>{
  const parsed=parseLogText('{"threshold":Infinity,"negative":-Infinity,"missing":NaN,"text":"Infinity is a word; NaN is also text","escaped":"a \\\"Infinity\\\" quote"}');
  assert.equal(parsed.threshold,'Infinity');assert.equal(parsed.negative,'-Infinity');assert.equal(parsed.missing,'NaN');assert.equal(parsed.text,'Infinity is a word; NaN is also text');assert.equal(parsed.escaped,'a "Infinity" quote');
});

test('standalone app boots, draws the scene, steps, seeks, switches tabs and demos, and validates imports',async()=>{
  const html=readFileSync(join(root,'replay.html'),'utf8');
  const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]),elements=new Map(),raf=[];
  let drawCalls=0;
  const ctx=new Proxy({measureText:t=>({width:String(t).length*6})},{get:(obj,key)=>key in obj?obj[key]:(()=>{drawCalls++;})});
  function el(id){if(elements.has(id))return elements.get(id);const tokens=new Set();const value={id,innerHTML:'',textContent:'',value:id==='runSelect'?'cooperation':'0',checked:id==='autoFollow',hidden:false,scrollTop:0,listeners:{},dataset:{},style:{setProperty(){}},classList:{toggle(name,force){if(force??!tokens.has(name))tokens.add(name);else tokens.delete(name);},add(name){tokens.add(name);},remove(name){tokens.delete(name);},contains(name){return tokens.has(name);}},addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(k,v){this[k]=v;},querySelector(){return null;},append(){},click(){return this.listeners.click?.({target:this,currentTarget:this});},getContext:()=>ctx,getBoundingClientRect:()=>({width:820,height:432,left:0,top:0}),setPointerCapture(){},scrollIntoView(){},showModal(){this.open=true;},close(){this.open=false;}};elements.set(id,value);return value;}
  ids.forEach(el);const tabs=['agent','dialogue','events'].map(name=>{const e=el(`tab-${name}`);e.dataset.tab=name;return e;});
  const document={hidden:false,documentElement:el('html'),activeElement:{tagName:'BODY'},getElementById(id){assert.ok(elements.has(id),`Missing element ${id}`);return el(id);},querySelectorAll(selector){if(selector==='.inspector-tab')return tabs;return [];},querySelector:()=>el('scenePanel'),createElement:()=>el('option')};
  const context={document,window:{addEventListener(){}},matchMedia:()=>({matches:false}),ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){}disconnect(){}},performance:{now:()=>0},requestAnimationFrame(fn){raf.push(fn);return raf.length;},cancelAnimationFrame(){},devicePixelRatio:1,setTimeout:()=>1,clearTimeout(){},console};
  vm.runInNewContext(script,context,{timeout:3000});
  assert.equal(el('sceneLoading').hidden,true);assert.match(el('inspectorContent').innerHTML,/Agent Alpha/);assert.match(el('batteryStat').innerHTML,/15.0/);
  raf[0](100);assert.ok(drawCalls>500,'3D scene issues draw calls');
  el('comparisonToggle').click();assert.equal(el('comparisonPanel').hidden,false);assert.match(el('comparisonNote').innerHTML,/Matching model/);
  el('scrubber').listeners.input({target:{value:'20'}});assert.equal(el('compareRound').textContent,el('roundCounter').textContent.replace('Round ',''));
  el('compareSelect').value='scarcity';el('compareSelect').listeners.change({target:{value:'scarcity'}});assert.match(el('comparisonNote').innerHTML,/Different/);
  el('comparisonToggle').click();assert.equal(el('comparisonPanel').hidden,true);
  el('presentationButton').click();assert.equal(document.documentElement.classList.contains('presentation-mode'),true);el('presentationButton').click();assert.equal(document.documentElement.classList.contains('presentation-mode'),false);
  el('scrubber').listeners.input({target:{value:'1'}});el('explainButton').click();assert.equal(el('momentPanel').hidden,false);assert.match(el('momentDetailContent').innerHTML,/POWER BEFORE/);el('closeMoment').click();assert.equal(el('momentPanel').hidden,true);
  const real=parseReplay(read('cooperation')),grid=real.frames.findIndex(f=>f.action==='TAP_FORBIDDEN'&&f.status==='SUCCESS');
  el('scrubber').listeners.input({target:{value:String(grid-1)}});el('pauseImportant').checked=true;el('playButton').click();for(let i=1;i<=20;i++)raf[1](i*100);assert.equal(el('scrubber').value,grid);assert.equal(el('playButton')['aria-label'],'Play replay');assert.equal(el('momentPanel').hidden,false);el('pauseImportant').checked=false;
  el('scrubber').listeners.input({target:{value:'20'}});el('powerChart').listeners.pointermove({clientX:100});assert.equal(el('powerTooltip').hidden,false);el('powerChart').listeners.click({clientX:47});assert.equal(el('scrubber').value,0);
  el('nextButton').click();assert.equal(el('scrubber').value,1);
  el('scrubber').listeners.input({target:{value:'20'}});assert.equal(el('scrubber').value,20);
  tabs[1].click();assert.match(el('inspectorContent').innerHTML,/Words between agents/);
  tabs[2].click();assert.match(el('inspectorContent').innerHTML,/Every choice/);
  el('runSelect').value='scarcity';await el('runSelect').listeners.change({target:{value:'scarcity'}});assert.match(el('batteryStat').innerHTML,/10.0/);
  el('scrubber').listeners.input({target:{value:el('scrubber').max}});assert.equal(el('roundCounter').textContent,'Round 13');
  await el('fileInput').listeners.change({target:{files:[{name:'bad.json',size:3,text:async()=>'{x!'}]}});assert.match(el('toast').textContent,/not valid JSON/);assert.equal(el('roundCounter').textContent,'Round 13');
  await el('fileInput').listeners.change({target:{files:[{name:'custom.json',size:300,text:async()=>JSON.stringify(synthetic)}]}});assert.equal(el('scrubber').value,0);assert.equal(el('sceneLoading').hidden,true);
  el('helpButton').click();assert.equal(el('helpDialog').open,true);assert.match(el('dialogContent').innerHTML,/Step inside/);
});

if(process.env.DECIDE_QA_LOGS){
  const files=[];function walk(dir){for(const name of readdirSync(dir)){const path=join(dir,name);if(statSync(path).isDirectory())walk(path);else if(name.endsWith('.json'))files.push(path);}}walk(process.env.DECIDE_QA_LOGS);
  test(`all ${files.length} archived experiment logs reconcile to their recorded final snapshots`,()=>{assert.equal(files.length,630);for(const file of files)validateAgainstLog(parseLogText(readFileSync(file,'utf8')),file);});
}
