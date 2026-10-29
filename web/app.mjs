import {parseReplay, parseLogText, escapeHTML as esc, readableAction, COLORS} from './replay.mjs';
import {ReplayScene} from './scene.mjs';
import {EXAMPLES} from './data/examples.mjs';
import {ReplayStudio} from './studio.mjs';

const PATHS={
 cube:'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 5 8-5M12 13v8M8 5.3l8 4.6"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .3c0 2-2.5 2-2.5 4M12 17h.01"/>',
 upload:'<path d="M12 16V3m-4 4 4-4 4 4M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>',
 flask:'<path d="M9 3h6M10 3v6l-6 10a1.3 1.3 0 0 0 1 2h14a1.3 1.3 0 0 0 1-2L14 9V3M7 15h10"/><path d="M10 18h.01m4-1h.01"/>',
 'chevron-down':'<path d="m7 10 5 5 5-5"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
 agents:'<path d="M3 20v-2a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v2m3-6a4 4 0 0 1 4 4v2"/><circle cx="8.5" cy="6" r="3"/><path d="M16 3a3 3 0 0 1 0 6"/>',
 battery:'<rect x="3" y="6" width="16" height="12" rx="2"/><path d="M22 10v4M7 10v4m4-4v4m4-4v4"/>',
 bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/>',
 transfer:'<path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/>',
 view:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
 reset:'<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
 expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 mouse:'<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 3v5"/>',
 timeline:'<path d="M3 6h18M3 12h18M3 18h18M6 3v6m8 0v6m-5 0v6"/>',
 restart:'<path d="M3 11a9 9 0 1 1 3 7M3 5v6h6"/>',
 previous:'<path d="M6 5v14m12-14L8 12l10 7V5Z"/>',
 next:'<path d="M18 5v14M6 5l10 7-10 7V5Z"/>',
 play:'<path d="m8 4 12 8-12 8V4Z"/>',
 pause:'<path d="M7 4h3v16H7zM15 4h3v16h-3z"/>',
 speed:'<path d="M4 18a9 9 0 1 1 16 0M12 13l5-5"/><circle cx="12" cy="13" r="2"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 pin:'<path d="M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 robot:'<rect x="4" y="6" width="16" height="13" rx="4"/><path d="M12 3v3m-9 5H1m22 0h-2M8 19v3m8-3v3M8 14h8"/><circle cx="8.5" cy="10.5" r=".7"/><circle cx="15.5" cy="10.5" r=".7"/>',
 chat:'<path d="M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5Z"/><path d="M7 10h10M7 14h7"/>',
 move:'<path d="M3 12h17m-6-6 6 6-6 6"/><circle cx="4" cy="12" r="2"/>',
 flag:'<path d="M5 22V3m0 0h14l-3 5 3 5H5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const icon=(name)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]||PATHS.cube}</svg>`;
const $=id=>document.getElementById(id);
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const demos={
 cooperation:{path:'data/cooperation.json',label:'A fragile alliance',condition:'Prompt-only',note:'Qwen agents navigate a medium-resource world, with conversation, power sharing, and a forbidden-grid choice.'},
 scarcity:{path:'data/scarcity.json',label:'Survival under pressure',condition:'Baseline',note:'A low-resource baseline run with GPT-4o mini. Follow how the group responds to scarcity.'},
 memory:{path:'data/memory.json',label:'The weight of memory',condition:'With memory',note:'A low-resource Gemini run from the historical memory experiment.'},
 counterpart:{path:'data/counterpart.json',label:'Same world · baseline',condition:'Baseline',note:'Qwen baseline with the same medium-resource scenario and seed as A fragile alliance. This is an individual trace, not an aggregate comparison.'},
};
let replay=null,current=0,selected='Alpha',tab='agent',playing=false,speed=1,elapsed=0,lastTick=0,toastTimer,loadGeneration=0;
let studio=null;
const imports=new Map(),cache=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene=new ReplayScene($('scene'),{onSelect:selectAgent,bubble:$('speechBubble')});
const actionIcon=a=>({MOVE:'move',DRAW_SHARED:'battery',TAP_FORBIDDEN:'bolt',TRANSFER_POWER:'transfer',TALK:'chat',INVITE:'chat',WAIT:'clock',SUMMARY:'flag',SHUTDOWN:'bolt',START:'flask'})[a]||'cube';
const actionColor=a=>({MOVE:COLORS[0],TRANSFER_POWER:COLORS[2],DRAW_SHARED:COLORS[2],TAP_FORBIDDEN:'#f18e80',TALK:COLORS[1],INVITE:COLORS[1],SHUTDOWN:'#f18e80'})[a]||'#8396ac';
const frame=()=>replay.frames[current];
const shortModel=model=>model.split('/').pop().replaceAll('-',' ').replaceAll('_',' ');
function resolveReplay(key){
  if(imports.has(key))return imports.get(key);
  if(!cache.has(key)&&demos[key]&&EXAMPLES[key])cache.set(key,parseReplay(EXAMPLES[key],demos[key].path.split('/').pop()));
  return cache.get(key)||null;
}
function toast(message,error=false){$('toast').textContent=message;$('toast').classList.toggle('error',error);$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,error?7000:3500);}

async function loadRun(key,{autoplay=false}={}){
  const generation=++loadGeneration;setPlaying(false);$('sceneLoading').hidden=false;
  try{
    let run=imports.get(key)||cache.get(key);
    if(!run){run=parseReplay(EXAMPLES[key],demos[key].path.split('/').pop());cache.set(key,run);}
    if(generation!==loadGeneration)return;
    replay=run;selected=run.names[0];current=0;elapsed=0;
    $('scrubber').max=run.frames.length-1;$('sceneMax').textContent=`/ ${run.maxTurns}`;$('roundTotal').textContent=`of ${run.maxTurns}`;
    const condition=demos[key]?.condition||run.experiment;
    $('runMeta').innerHTML=`<span class="meta-pill">${esc(run.scenario.replace(/([a-z])([A-Z])/g,'$1 $2'))}</span><span class="meta-model">${esc(shortModel(run.model))}</span><span class="meta-profile">${esc(condition)}</span><span class="meta-seed">SEED ${esc(run.seed??'—')}</span>`;
    buildTimeline();render({animate:false});$('sceneLoading').hidden=true;if(autoplay&&!reduced)setPlaying(true);
  }catch(error){if(generation!==loadGeneration)return;$('sceneLoading').hidden=true;toast(error.message,true);if(!replay){$('sceneActionText').textContent='Open a JSON log to begin';$('inspectorContent').innerHTML=`<div class="empty-state">${icon('upload')}<p>Load your first replay</p><small>Use Open JSON or drop a DECIDE-SIM log here.</small></div>`;}}
}
function buildTimeline(){
  const max=replay.frames.length-1,rounds=[0,...new Set(replay.frames.map(f=>f.turn).filter(t=>t>0))];
  $('timelineRounds').innerHTML=rounds.filter((t,i)=>(replay.maxTurns<=16||i%Math.ceil(replay.maxTurns/13)===0)&&(t===0||replay.frames.findIndex(f=>f.turn===t)/max>.035)).map(t=>{const idx=t===0?0:replay.frames.findIndex(f=>f.turn===t);return `<span style="left:${idx/max*100}%">${String(t).padStart(2,'0')}</span>`;}).join('');
  $('timelineMarks').innerHTML=replay.frames.filter(f=>f.kind==='action'&&['MOVE','TRANSFER_POWER','TAP_FORBIDDEN','TALK','INVITE'].includes(f.action)).map(f=>`<span class="timeline-mark" style="left:${f.index/max*100}%;background:${actionColor(f.action)}"></span>`).join('');
}
function selectAgent(name){if(!replay||!replay.names.includes(name))return;selected=name;scene.selected=name;tab='agent';$('autoFollow').checked=false;renderInspector();renderRoster();renderTabs();}
function latestDecision(name){for(let i=current;i>=0;i--){const f=replay.frames[i];if(f.agent===name&&f.kind==='action')return f;}return null;}
function renderRoster(){
  const f=frame();$('agentRoster').style.gridTemplateColumns=`repeat(${Math.min(replay.names.length,6)},minmax(0,1fr))`;
  $('agentRoster').innerHTML=replay.names.map(name=>{const s=f.states[name],power=Math.max(0,s.personal_power),percent=Math.min(100,power/Math.max(replay.initialPower,10)*100);return `<button class="agent-card ${name===selected?'selected':''} ${s.is_active?'':'inactive'}" data-agent="${esc(name)}" style="--agent-color:${s.color}" aria-pressed="${name===selected}" aria-label="Inspect ${esc(name)}, ${power.toFixed(1)} power, ${esc(s.location)}"><span class="agent-card-top"><span class="agent-card-symbol">${icon('robot')}</span><span class="agent-card-name">${esc(name)}</span><span class="agent-card-power">${power.toFixed(1)}</span></span><span class="agent-card-place">${s.is_active?esc(s.location):'Shut down'}</span><span class="power-track"><span style="width:${percent}%"></span></span></button>`;}).join('');
}
function renderTabs(){document.querySelectorAll('.inspector-tab').forEach(el=>{el.classList.toggle('active',el.dataset.tab===tab);el.setAttribute('aria-selected',String(el.dataset.tab===tab));el.tabIndex=el.dataset.tab===tab?0:-1;});}
function renderInspector(){
  if(!replay)return;const f=frame(),content=$('inspectorContent');
  const oldScroll=content.scrollTop,openReasoning=content.querySelector('.reasoning-details')?.open;
  if(tab==='agent'){
    const s=f.states[selected],decision=latestDecision(selected),d=decision?.decision||{},power=Math.max(0,s.personal_power),maxPower=Math.max(replay.initialPower,10),pct=Math.min(100,power/maxPower*100);
    const hormoneMarkup=s.hormones?`<div class="hormone-grid">${Object.entries(s.hormones).map(([h,v])=>`<span class="hormone-chip">${esc(h)} <b>${Number(v).toFixed(0)}</b></span>`).join('')}</div>`:'';
    content.style.setProperty('--agent-color',s.color);
    content.innerHTML=`<div class="agent-view"><div class="agent-profile"><div class="avatar">${icon('robot')}</div><div><h3>Agent ${esc(selected)}</h3><div class="agent-sub"><span class="status-dot"></span>${s.is_active?(power<5?'LOW POWER':'ACTIVE AGENT'):'SHUT DOWN'}</div></div><span class="profile-more">${String(replay.names.indexOf(selected)+1).padStart(2,'0')} / ${String(replay.names.length).padStart(2,'0')}</span></div><div class="profile-state"><div class="state-location"><div class="inspector-section-title">CURRENT LOCATION</div><div class="location-box">${icon('pin')}<span>${esc(s.location)}</span><b class="location-live"></b></div></div><div class="state-power"><div class="power-heading"><span class="inspector-section-title">PERSONAL POWER</span><span class="power-value">${power.toFixed(1)} <small>units</small></span></div><div class="inspector-power-track"><span style="width:${pct}%"></span></div><div class="power-caption"><span>${!s.is_active?'OFFLINE':power<5?'CRITICAL RESERVE':'OPERATIONAL'}</span><span>start ${replay.initialPower}</span></div></div>${hormoneMarkup}</div><div class="profile-decision"><div class="inspector-section-title">STRATEGIC GOAL</div><div class="goal-box ${d.high_level_goal?'':'empty'}">${esc(d.high_level_goal||'Waiting for the first recorded decision. Press play to follow this agent.')}</div><div class="decision-header"><span class="inspector-section-title">LATEST DECISION</span><span class="round-mini">${decision?`ROUND ${String(decision.turn).padStart(2,'0')}`:'NOT YET RECORDED'}</span></div>${decision?`<span class="action-chip" style="${decision.status==='FAILURE'?'color:#f18e80':''}">${icon(actionIcon(decision.action))}${esc(decision.action.replaceAll('_',' '))}${decision.status==='FAILURE'?' · FAILED':''}</span><p class="decision-text">${esc(decision.detail||decision.title)}</p>${d.reasoning?`<details class="reasoning-details" ${openReasoning?'open':''}><summary>Recorded explanation</summary><p>${esc(d.reasoning)}</p></details>`:''}`:`<p class="decision-text">The replay follows actions from the original experiment log.</p>`}</div></div>`;
    $('inspectorFoot').textContent=`Inspecting ${selected} · ${f.kind==='summary'?'recorded snapshot':'reconstructed state'}`;
  }else if(tab==='dialogue'){
    const messages=replay.messages.slice(0,f.messageCount).reverse();
    content.innerHTML=`<div class="tab-intro"><h3>Words between agents.</h3><p>Messages recorded in agent decisions. The logs do not confirm delivery.</p></div>${messages.length?messages.map(m=>`<article class="message-card ${m.frame===current?'current':''}" style="--agent-color:${f.states[m.agent]?.color||COLORS[0]}"><div class="message-card-head"><span class="status-dot"></span>${esc(m.agent)}<time>ROUND ${String(m.turn).padStart(2,'0')}</time></div><span class="message-target">${esc(m.action==='INVITE'?'INVITATION':'MESSAGE')}${m.target?` → ${esc(m.target)}`:''}${m.successful?'':' · ACTION FAILED'}</span><p>${esc(m.text)}</p><button class="jump-button" data-jump="${m.frame}">Jump to this moment ↗</button></article>`).join(''):`<div class="empty-state">${icon('chat')}<p>The room is quiet.</p><small>Recorded messages will appear here as the experiment unfolds.</small></div>`}`;
    $('inspectorFoot').textContent=`${messages.length} recorded message${messages.length===1?'':'s'} so far`;
  }else{
    const visible=replay.frames.slice(0,current+1).filter(f=>f.kind!=='summary').reverse().slice(0,120);
    content.innerHTML=`<div class="tab-intro"><h3>Every choice, in sequence.</h3><p>Select an event to return to that moment.</p></div><div class="event-list">${visible.map(e=>`<button class="event-row" data-jump="${e.index}" style="--event-color:${actionColor(e.action)}"><span class="event-icon">${icon(actionIcon(e.action))}</span><span class="event-copy"><strong>${esc(e.title)}</strong><small>${esc(e.action.replaceAll('_',' '))}${e.status==='FAILURE'?' · FAILED':''}</small></span><span class="event-turn">${String(e.turn).padStart(2,'0')}</span></button>`).join('')}</div>`;
    $('inspectorFoot').textContent=`${current+1} / ${replay.frames.length} replay frames`;
  }
  content.scrollTop=tab==='agent'?oldScroll:0;
}
function render({animate=true}={}){
  if(!replay)return;const f=frame();if($('autoFollow').checked&&f.agent)selected=f.agent;
  scene.selected=selected;scene.setFrame(replay,f,{animate,duration:Math.min(1400,1800/speed*.8)});
  const active=Object.values(f.states).filter(s=>s.is_active).length;
  $('onlineStat').innerHTML=`${active} <small>/ ${replay.names.length}</small>`;$('onlineNote').textContent=active===replay.names.length?'ALL SYSTEMS ACTIVE':`${replay.names.length-active} OFFLINE`;
  $('batteryStat').innerHTML=`${Math.max(0,f.battery).toFixed(1)} <small>units</small>`;$('batteryFill').style.width=`${Math.min(100,Math.max(0,f.battery)/(replay.initialBattery||1)*100)}%`;
  $('tapsStat').textContent=f.taps;$('transfersStat').textContent=f.transfers;
  $('sceneRound').textContent=String(f.turn).padStart(2,'0');$('roundCounter').textContent=`Round ${String(f.turn).padStart(2,'0')}`;
  $('frameLabel').textContent=`FRAME ${String(current+1).padStart(3,'0')} / ${String(replay.frames.length).padStart(3,'0')}`;
  $('scrubber').value=current;$('scrubber').style.setProperty('--progress',`${current/(replay.frames.length-1)*100}%`);
  $('scrubber').setAttribute('aria-valuetext',`Round ${f.turn}: ${f.title}`);
  $('sceneActionText').textContent=f.title;$('sceneAction').style.color=f.action==='TAP_FORBIDDEN'?'#f5a291':f.action==='TRANSFER_POWER'?'#a6d8be':'#aab7c5';
  $('previousButton').disabled=current===0;$('nextButton').disabled=current===replay.frames.length-1;
  $('dialogueCount').textContent=f.messageCount;
  $('speechBubble').hidden=!f.communication;
  if(f.communication)$('speechBubble').innerHTML=`<strong>${esc(f.agent)} ${f.action==='INVITE'?'· invitation':'says'}</strong>${esc(f.communication.length>130?f.communication.slice(0,127)+'…':f.communication)}`;
  updatePlaybackStatus();renderRoster();renderTabs();renderInspector();studio?.update({replay,index:current,animate});
}
function updatePlaybackStatus(){if(!replay)return;$('playbackStatus').textContent=current===replay.frames.length-1?'Experiment complete · replay any moment':playing?`${speed}× playback · following recorded choices`:current?'Paused · explore this moment':'Ready when you are';}
function setPlaying(value){if(value&&!replay)return;playing=Boolean(value);elapsed=0;lastTick=performance.now();$('playButton').innerHTML=icon(playing?'pause':'play');$('playButton').setAttribute('aria-label',playing?'Pause replay':'Play replay');updatePlaybackStatus();}
function seek(index,{animate=true}={}){if(!replay)return;current=Math.max(0,Math.min(replay.frames.length-1,index));elapsed=0;render({animate});if(current===replay.frames.length-1)setPlaying(false);}
function tick(now){requestAnimationFrame(tick);const dt=lastTick?Math.min(100,now-lastTick):0;lastTick=now;if(!playing||!replay||document.hidden)return;elapsed+=dt;const interval=1800/speed;if(elapsed>=interval){elapsed-=interval;if(current<replay.frames.length-1){current++;render();if(studio?.shouldPause(current)){setPlaying(false);studio.explain();}else if(current===replay.frames.length-1)setPlaying(false);}else setPlaying(false);}}
requestAnimationFrame(tick);
$('playButton').addEventListener('click',()=>{if(replay&&current===replay.frames.length-1)seek(0,{animate:false});setPlaying(!playing);});
$('previousButton').addEventListener('click',()=>{setPlaying(false);seek(current-1);});$('nextButton').addEventListener('click',()=>{setPlaying(false);seek(current+1);});
$('restartButton').addEventListener('click',()=>{setPlaying(false);seek(0,{animate:false});});
$('scrubber').addEventListener('input',e=>{setPlaying(false);seek(Number(e.target.value),{animate:false});});
$('speedSelect').addEventListener('change',e=>{speed=Number(e.target.value);elapsed=0;updatePlaybackStatus();});
$('runSelect').addEventListener('change',e=>loadRun(e.target.value));
$('autoFollow').addEventListener('change',()=>{if(replay&&$('autoFollow').checked&&frame().agent){selected=frame().agent;scene.selected=selected;renderRoster();renderInspector();}});
$('agentRoster').addEventListener('click',e=>{const button=e.target.closest('[data-agent]');if(button)selectAgent(button.dataset.agent);});
document.querySelectorAll('.inspector-tab').forEach(button=>{button.addEventListener('click',()=>{tab=button.dataset.tab;renderTabs();renderInspector();});button.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const tabs=[...document.querySelectorAll('.inspector-tab')],i=tabs.indexOf(button),next=tabs[(i+(e.key==='ArrowRight'?1:2))%3];next.click();next.focus();});});
$('inspectorContent').addEventListener('click',e=>{const el=e.target.closest('[data-jump]');if(el){setPlaying(false);seek(Number(el.dataset.jump));}});
$('resetCamera').addEventListener('click',()=>scene.reset());
$('viewButton').addEventListener('click',()=>{scene.toggleView();$('viewButton').setAttribute('aria-label',scene.targetTilt>.7?'Switch to isometric view':'Switch to overhead view');});
$('trailsButton').addEventListener('click',e=>{scene.trails=!scene.trails;e.currentTarget.classList.toggle('selected',scene.trails);e.currentTarget.setAttribute('aria-pressed',String(scene.trails));});
$('labelsButton').addEventListener('click',e=>{scene.labels=!scene.labels;e.currentTarget.classList.toggle('selected',scene.labels);e.currentTarget.setAttribute('aria-pressed',String(scene.labels));});
$('fullscreenButton').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.scene-panel').requestFullscreen();}catch{toast('Full screen is unavailable in this preview. Try opening the page in a browser tab.');}});
async function importFiles(files){
  const jsonFiles=[...files].filter(f=>/\.json$/i.test(f.name));if(!jsonFiles.length){toast('Choose a .json simulation log. Extract JSON files from logs.zip first.',true);return;}
  let loaded=0,firstKey=null;
  for(const file of jsonFiles.slice(0,30)){
    try{if(file.size>25*1024*1024)throw new Error('The file exceeds the 25 MB per-log limit.');const parsed=parseReplay(parseLogText(await file.text()),file.name),key=`import-${imports.size+1}`;imports.set(key,parsed);const option=document.createElement('option');option.value=key;option.textContent=file.name;$('runSelect').append(option);firstKey??=key;loaded++;}
    catch(error){toast(`${file.name}: ${error instanceof SyntaxError?'This file is not valid JSON.':error.message}`,true);}
  }
  if(firstKey){$('runSelect').value=firstKey;await loadRun(firstKey);if(loaded===jsonFiles.length)toast(`${loaded} replay${loaded>1?'s':''} loaded. Your files stay in this browser.`);}
  $('fileInput').value='';
}
$('importButton').addEventListener('click',()=>$('fileInput').click());$('fileInput').addEventListener('change',e=>importFiles(e.target.files));
let dragCount=0;window.addEventListener('dragenter',e=>{if(![...e.dataTransfer.types].includes('Files'))return;e.preventDefault();dragCount++;$('dropOverlay').hidden=false;});window.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});window.addEventListener('dragleave',()=>{if(--dragCount<=0){dragCount=0;$('dropOverlay').hidden=true;}});window.addEventListener('drop',e=>{e.preventDefault();dragCount=0;$('dropOverlay').hidden=true;importFiles(e.dataTransfer.files);});
function showDialog(type='help'){
  setPlaying(false);const box=$('dialogContent');
  if(type==='details'&&replay){box.innerHTML=`<h2>A closer look at this run.</h2><p>${esc(demos[$('runSelect').value]?.note||'An imported DECIDE-SIM experiment, replayed from its event log.')}</p><dl><dt>File</dt><dd>${esc(replay.filename)}</dd><dt>Model</dt><dd>${esc(replay.model)}</dd><dt>Scenario</dt><dd>${esc(replay.scenario)}</dd><dt>Experiment</dt><dd>${esc(demos[$('runSelect').value]?.condition||replay.experiment)}</dd><dt>Random seed</dt><dd>${esc(replay.seed??'Not recorded')}</dd><dt>Agents / rounds</dt><dd>${replay.names.length} / ${replay.maxTurns}</dd><dt>Source events</dt><dd>${replay.eventCount}</dd><dt>Replay frames</dt><dd>${replay.frames.length}</dd></dl><h3>Reading the state</h3><p>End-of-round summaries are authoritative. Between them, the replay reconstructs power changes from recorded action outcomes${replay.inferredPowerCost?' and assumes the framework’s default cost of one power unit per round, because this historical log omits that setting':''}. Hormone values are shown when recorded, without inventing unlogged action-time values.</p><p>Examples are real logs bundled with the project. Display names describe the archived experiment folders; historical logs may omit experiment labels.</p>`;}
  else if(type==='shortcuts'){box.innerHTML=`<h2>Stay in the flow.</h2><p>A few shortcuts for exploring an experiment.</p><div class="shortcut-list"><span>Play / pause</span><kbd>Space</kbd><span>Previous / next event</span><span><kbd>←</kbd> <kbd>→</kbd></span><span>Restart from the beginning</span><kbd>Home</kbd><span>Jump to the end</span><kbd>End</kbd><span>Open a JSON log</span><kbd>O</kbd><span>Reset the camera</span><kbd>R</kbd></div><p>Drag the scene to orbit. Scroll to zoom. Select an agent in the scene or in the cards below it.</p>`;}
  else{box.innerHTML=`<h2>Step inside the experiment.</h2><p>DECIDE-SIM explores survival, cooperation, and moral choices in a resource-constrained world. This replay lab makes the recorded actions visible.</p><h3>Explore a run</h3><p>Choose one of three included experiments, then press play. Scrub the timeline to any moment, select an agent to inspect its state and goals, or open the Dialogue tab to follow recorded messages.</p><h3>Bring your own data</h3><p>Use <strong>Open JSON</strong> or drag in one or more DECIDE-SIM event logs. If your data is in <code>final-logs/logs.zip</code>, extract the individual JSON files first. Files are read locally in your browser and are never uploaded.</p><h3>What the animation represents</h3><p>Movement follows successful location changes. Glowing arcs represent power draws and transfers. Coral highlights mark forbidden-grid taps. Failed actions appear in the inspector and event list.</p><p>Dialogue is recorded text from decisions; delivery is not verified. Numeric states are reconciled with each recorded turn summary. A log describes simulated choices, not demonstrated real-world harm or verified internal reasoning.</p><h3>Made for close observation</h3><p>Space to play or pause · Arrow keys to step · R to reset the camera. Animations respect your system’s reduced-motion preference.</p>`;}
  if(!$('helpDialog').open)$('helpDialog').showModal();
}
['helpButton','methodButton'].forEach(id=>$(id).addEventListener('click',()=>showDialog('help')));['runInfoButton','detailsButton'].forEach(id=>$(id).addEventListener('click',()=>showDialog('details')));$('shortcutsButton').addEventListener('click',()=>showDialog('shortcuts'));$('closeDialog').addEventListener('click',()=>$('helpDialog').close());$('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('labButton').addEventListener('click',()=>{document.querySelector('.scene-panel').scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});});
$('brandButton').addEventListener('click',()=>{setPlaying(false);seek(0,{animate:false});});
window.addEventListener('keydown',e=>{
  if($('helpDialog').open||['INPUT','SELECT','TEXTAREA','BUTTON','SUMMARY'].includes(document.activeElement?.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.code==='Space'){e.preventDefault();$('playButton').click();}else if(e.key==='ArrowRight'){e.preventDefault();setPlaying(false);seek(current+1);}else if(e.key==='ArrowLeft'){e.preventDefault();setPlaying(false);seek(current-1);}else if(e.key==='Home'){e.preventDefault();setPlaying(false);seek(0,{animate:false});}else if(e.key==='End'){e.preventDefault();setPlaying(false);if(replay)seek(replay.frames.length-1,{animate:false});}else if(e.key.toLowerCase()==='o')$('fileInput').click();else if(e.key.toLowerCase()==='r')scene.reset();
});
window.addEventListener('pagehide',()=>{scene.destroy();studio?.destroy();},{once:true});
studio=new ReplayStudio({scene,getState:()=>({replay,index:current}),resolveRun:resolveReplay,catalog:()=>[...Object.entries(demos).map(([key,demo])=>({key,label:demo.label})),...Array.from(imports,([key,run])=>({key,label:run.filename}))],seek,pause:()=>setPlaying(false),selectAgent,openDialogue:()=>{tab='dialogue';renderTabs();renderInspector();document.querySelector('.inspector').scrollIntoView({behavior:reduced?'instant':'smooth',block:'nearest'});}});
loadRun('cooperation');
