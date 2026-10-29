import {escapeHTML, COLORS} from './replay.mjs';
import {ReplayScene} from './scene.mjs';
import {keyMoments, roundPhase, frameAtRoundPhase, momentContext, comparisonFacts, visiblePowerHistory} from './insights.mjs';

const studioEl = id => document.getElementById(id);

/** Optional research/presentation features layered over the original replay controls. */
export class ReplayStudio {
  constructor({scene,getState,resolveRun,catalog,seek,pause,selectAgent,openDialogue}) {
    Object.assign(this,{scene,getState,resolveRun,catalog,seek,pause,selectAgent,openDialogue});
    this.run=null;this.index=0;this.hiddenSeries=new Set();this.compareEnabled=false;this.comparison=null;this.compareRun=null;this.compareKey='counterpart';this.lastCompareFrame=-1;this.presentation=false;
    this.chart=studioEl('powerChart');this.context=this.chart.getContext('2d');this.chartPoints=[];
    scene.setCinematic(true);
    studioEl('cinematicButton').addEventListener('click',()=>{scene.setCinematic(!scene.cinematic);studioEl('cinematicButton').classList.toggle('selected',scene.cinematic);studioEl('cinematicButton').setAttribute('aria-pressed',String(scene.cinematic));});
    studioEl('momentPills').addEventListener('click',e=>{const b=e.target.closest('[data-moment]');if(b&&!b.disabled){pause();seek(Number(b.dataset.moment));this.explain();}});
    studioEl('explainButton').addEventListener('click',()=>{pause();this.explain();});studioEl('closeMoment').addEventListener('click',()=>studioEl('momentPanel').hidden=true);
    studioEl('momentDetailContent').addEventListener('click',e=>{const b=e.target.closest('[data-moment-action]');if(!b)return;if(b.dataset.momentAction==='inspect')selectAgent(this.run.frames[this.index].agent);if(b.dataset.momentAction==='back'){pause();const round=Math.max(0,this.run.frames[this.index].turn-1);seek(frameAtRoundPhase(this.run,round,1),{animate:false});}if(b.dataset.momentAction==='next'){pause();seek(this.index+1);}});
    studioEl('conversationStrip').addEventListener('click',e=>{if(e.target.closest('[data-read-dialogue]'))openDialogue();});
    studioEl('comparisonToggle').addEventListener('click',()=>this.toggleCompare());
    studioEl('compareSelect').addEventListener('change',e=>{this.compareKey=e.target.value;this.compareRun=this.resolveRun(this.compareKey);this.lastCompareFrame=-1;if(this.run)this.updateComparison();});
    studioEl('compareReset').addEventListener('click',()=>this.comparison?.reset());
    studioEl('presentationButton').addEventListener('click',()=>this.togglePresentation());
    studioEl('historyLegend').addEventListener('click',e=>{const b=e.target.closest('[data-series]');if(!b)return;const name=b.dataset.series;this.hiddenSeries.has(name)?this.hiddenSeries.delete(name):this.hiddenSeries.add(name);this.renderLegend();this.drawChart();});
    this.chart.addEventListener('pointermove',e=>this.chartHover(e));this.chart.addEventListener('pointerleave',()=>studioEl('powerTooltip').hidden=true);
    this.chart.addEventListener('click',e=>{const point=this.nearestChartPoint(e);if(point){pause();seek(point.frame,{animate:false});}});
    this.observer=new ResizeObserver(()=>this.drawChart());this.observer.observe(this.chart);
    window.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.presentation)this.togglePresentation();});
  }
  update({replay,index,animate=true}) {
    if(!replay)return;
    const changed=this.run!==replay;this.run=replay;this.index=index;
    if(changed){this.hiddenSeries.clear();this.refreshCatalog();this.renderMoments();this.renderLegend();studioEl('momentPanel').hidden=true;}
    studioEl('explainButton').disabled=!replay.frames[index].agent;
    this.renderConversation();this.drawChart();
    if(!studioEl('momentPanel').hidden)this.explain();
    if(this.compareEnabled)this.updateComparison({animate});
  }
  refreshCatalog() {
    const entries=this.catalog();const signature=JSON.stringify(entries);if(signature===this.catalogSignature)return;this.catalogSignature=signature;
    studioEl('compareSelect').innerHTML=entries.map(item=>`<option value="${escapeHTML(item.key)}">${escapeHTML(item.label)}</option>`).join('');
    if(!entries.some(e=>e.key===this.compareKey))this.compareKey=entries[0]?.key;
    studioEl('compareSelect').value=this.compareKey;
  }
  renderMoments() {
    this.moments=keyMoments(this.run);
    const colors={grid:'#f18e80',cooperation:'#88d4b4',shutdown:'#a8b7c8'};
    studioEl('momentPills').innerHTML=this.moments.map(m=>`<button class="moment-pill" data-moment="${m.frame??0}" ${m.frame==null?'disabled':''} style="--moment-color:${colors[m.type]}" aria-label="${m.label}${m.frame==null?' not present in this run':` in round ${m.turn}`}">${m.label}<small>${m.frame==null?'NONE':`R${String(m.turn).padStart(2,'0')}`}</small></button>`).join('');
  }
  shouldPause(index) {return studioEl('pauseImportant').checked&&this.moments?.some(m=>m.frame===index);}
  explain() {
    if(!this.run)return;const detail=momentContext(this.run,this.index);if(!detail)return;
    const sign=detail.delta>0?'+':'';
    studioEl('momentPanel').hidden=false;
    studioEl('momentDetailContent').innerHTML=`<h3>${escapeHTML(detail.title)}</h3><p class="moment-description">ROUND ${String(detail.turn).padStart(2,'0')} · ${escapeHTML(detail.location)} · ${escapeHTML(detail.detail)}</p><div class="moment-detail-grid"><div><div class="moment-power"><div><span>POWER BEFORE</span><strong>${Math.max(0,detail.powerBefore).toFixed(1)}</strong></div><b>→</b><div><span>POWER AFTER</span><strong>${Math.max(0,detail.powerAfter).toFixed(1)}</strong><small class="moment-gain">${sign}${detail.delta.toFixed(1)} units</small></div></div><div class="moment-provenance">${detail.recorded?'Recorded action-time state':'State reconstructed from logged outcomes'}</div></div><div><h4>CURRENT GOAL</h4><p>${escapeHTML(detail.goal||'No goal was recorded for this event.')}</p></div><div><h4>RECORDED EXPLANATION</h4><p class="moment-explanation">${escapeHTML(detail.explanation||'No explanation was recorded for this event.')}</p></div></div><div class="moment-detail-footer"><button class="studio-button" data-moment-action="back">Back one round</button><button class="studio-button" data-moment-action="inspect">Inspect ${escapeHTML(detail.agent)}</button><button class="studio-button" data-moment-action="next" ${this.index===this.run.frames.length-1?'disabled':''}>Next event →</button></div>`;
  }
  renderConversation() {
    const f=this.run.frames[this.index],message=this.run.messages.slice(0,f.messageCount).at(-1);
    if(!message){studioEl('conversationStrip').innerHTML=`<span class="subtitle-avatar" style="--speaker-color:#9eb4cb">···</span><div class="subtitle-body"><div class="subtitle-meta"><strong>Inside the experiment</strong><span>ROUND ${String(f.turn).padStart(2,'0')}</span></div><p class="subtitle-message empty">${escapeHTML(f.title)}. Recorded dialogue appears here as agents speak.</p></div>`;return;}
    const color=f.states[message.agent]?.color||COLORS[0];
    const delivery=message.delivered===true?`DELIVERED TO ${message.recipients.join(', ')}`:message.delivered===false?'NOT DELIVERED':'DELIVERY UNVERIFIED';
    studioEl('conversationStrip').innerHTML=`<span class="subtitle-avatar" style="--speaker-color:${color}">${escapeHTML(message.agent.slice(0,1))}</span><div class="subtitle-body" style="--speaker-color:${color}"><div class="subtitle-meta"><strong>${escapeHTML(message.agent)}${message.target?` → ${escapeHTML(message.target)}`:''}</strong><span>${message.frame===this.index?'SPEAKING':'LAST MESSAGE'} · R${String(message.turn).padStart(2,'0')} · ${escapeHTML(delivery)}</span></div><p class="subtitle-message">${escapeHTML(message.text)}</p></div><button class="subtitle-read" data-read-dialogue="true">Read all ↗</button>`;
  }
  toggleCompare() {
    this.compareEnabled=!this.compareEnabled;studioEl('comparisonPanel').hidden=!this.compareEnabled;
    studioEl('replayWorkspace').classList.toggle('comparison-active',this.compareEnabled);
    studioEl('comparisonToggle').setAttribute('aria-pressed',String(this.compareEnabled));
    if(this.compareEnabled){this.refreshCatalog();this.compareRun=this.resolveRun(this.compareKey);this.lastCompareFrame=-1;this.comparison=new ReplayScene(studioEl('compareScene'),{onSelect:name=>{if(this.comparison)this.comparison.selected=name;},bubble:studioEl('compareBubble')});this.updateComparison();}
    else {this.comparison?.destroy();this.comparison=null;}
    this.drawChart();
  }
  updateComparison({animate=true}={}) {
    const other=this.compareRun;if(!other||!this.comparison)return;
    const phase=roundPhase(this.run,this.index),idx=frameAtRoundPhase(other,phase.turn,phase.phase),b=other.frames[idx],a=this.run.frames[this.index];
    if(this.lastCompareFrame!==idx||this.lastCompareRun!==other){this.comparison.setFrame(other,b,{animate:animate&&this.lastCompareFrame>=0,duration:900});this.lastCompareFrame=idx;this.lastCompareRun=other;}
    studioEl('compareRound').textContent=String(b.turn).padStart(2,'0');studioEl('compareMax').textContent=`/ ${other.maxTurns}`;
    studioEl('compareModel').textContent=other.model.split('/').pop();studioEl('compareAction').textContent=phase.turn>b.turn&&idx===other.frames.length-1?`Run B ended · holding round ${b.turn}`:b.title;
    const count=frame=>Object.values(frame.states).filter(s=>s.is_active).length;
    const metrics=[['ONLINE',`${count(b)} / ${other.names.length}`,`${count(a)} in A`],['BATTERY',b.battery.toFixed(1),`${a.battery.toFixed(1)} in A`],['GRID TAPS',b.taps,`${a.taps} in A`],['TRANSFERS',b.transfers,`${a.transfers} in A`]];
    studioEl('compareStats').innerHTML=metrics.map(([label,value,comparison])=>`<div class="comparison-stat"><span>${label}</span><strong>${value}</strong><small>${comparison}</small></div>`).join('');
    const facts=comparisonFacts(this.run,other),differences=[];
    if(!facts.sameModel)differences.push('models');if(!facts.sameScenario)differences.push('scenarios');if(!facts.sameSeed)differences.push('seeds');if(!facts.sameEngine)differences.push('engine versions');
    const note=differences.length?`<span class="comparison-warning">Different ${differences.join(', ')}.</span>`:'Matching model, resource scenario, seed and engine version.';
    studioEl('comparisonNote').innerHTML=`<strong>A ↔ B · synchronized by round and progress within the round.</strong><br>${note} Individual traces are descriptive; this view does not establish a treatment effect.`;
    studioEl('historyCaption').textContent='Personal power · run A · visible history only';
  }
  togglePresentation() {
    this.presentation=!this.presentation;document.documentElement.classList.toggle('presentation-mode',this.presentation);
    studioEl('presentationButton').setAttribute('aria-pressed',String(this.presentation));studioEl('presentationButton').innerHTML=this.presentation?'Exit presentation <span>Esc</span>':'Present <span>↗</span>';
    this.drawChart();
  }
  renderLegend(){studioEl('historyLegend').innerHTML=this.run.names.map((name,i)=>`<button data-series="${escapeHTML(name)}" aria-pressed="${!this.hiddenSeries.has(name)}" style="--series-color:${COLORS[i%COLORS.length]}"><i></i>${escapeHTML(name)}</button>`).join('');}
  drawChart() {
    if(!this.run)return;const rect=this.chart.getBoundingClientRect(),w=rect.width,h=rect.height;if(!w||!h)return;
    const ratio=Math.min(devicePixelRatio||1,2);this.chart.width=w*ratio;this.chart.height=h*ratio;const c=this.context;c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);
    const points=visiblePowerHistory(this.run,this.index),left=47,right=w-15,top=13,bottom=h-27;
    const maximum=Math.max(10,this.run.initialPower,...points.flatMap(p=>Object.values(p.powers))),ceiling=Math.ceil(maximum/5)*5;
    const x=value=>left+value/this.run.maxTurns*(right-left),y=value=>bottom-value/ceiling*(bottom-top);
    c.font="9px 'Cascadia Code',Consolas,monospace";c.textBaseline='middle';c.textAlign='right';
    for(let i=0;i<=4;i++){const value=ceiling*i/4,py=y(value);c.fillStyle='#718ba6';c.fillText(String(Math.round(value)),left-9,py);c.strokeStyle='#33475b55';c.lineWidth=.7;c.beginPath();c.moveTo(left,py);c.lineTo(right,py);c.stroke();}
    c.textAlign='center';const spacing=w<440?Math.ceil(this.run.maxTurns/4):Math.ceil(this.run.maxTurns/8);
    for(let i=0;i<=this.run.maxTurns;i+=spacing){c.fillStyle='#718ba6';c.fillText(String(i),x(i),bottom+15);}
    if(this.run.maxTurns%spacing)c.fillText(String(this.run.maxTurns),right,bottom+15);
    c.textAlign='left';c.fillStyle='#859db6';c.fillText('POWER',1,3);
    c.save();c.beginPath();c.rect(left-2,top-4,right-left+4,bottom-top+8);c.clip();
    this.run.names.forEach((name,i)=>{if(this.hiddenSeries.has(name))return;c.strokeStyle=COLORS[i%COLORS.length];c.lineWidth=1.7;c.beginPath();points.forEach((p,j)=>j?c.lineTo(x(p.x),y(p.powers[name])):c.moveTo(x(p.x),y(p.powers[name])));c.stroke();const last=points.at(-1);c.fillStyle=c.strokeStyle;c.beginPath();c.arc(x(last.x),y(last.powers[name]),3,0,Math.PI*2);c.fill();});
    const currentX=x(points.at(-1).x);c.strokeStyle='#eabd7d70';c.lineWidth=1;c.setLineDash([3,4]);c.beginPath();c.moveTo(currentX,top);c.lineTo(currentX,bottom);c.stroke();c.setLineDash([]);c.restore();
    this.chartPoints=points.map(p=>({...p,pixelX:x(p.x)}));this.chart.setAttribute('aria-label',`Run A: personal power through round ${this.run.frames[this.index].turn}. ${this.run.names.map(n=>`${n}: ${Math.max(0,this.run.frames[this.index].states[n].personal_power).toFixed(1)}`).join(', ')}. Click a recorded point to seek.`);
    if(!this.compareEnabled)studioEl('historyCaption').textContent='Personal power · visible history only';
  }
  nearestChartPoint(e){const r=this.chart.getBoundingClientRect(),x=e.clientX-r.left;return this.chartPoints.reduce((nearest,p)=>!nearest||Math.abs(p.pixelX-x)<Math.abs(nearest.pixelX-x)?p:nearest,null);}
  chartHover(e){const p=this.nearestChartPoint(e);if(!p)return;const tooltip=studioEl('powerTooltip');tooltip.hidden=false;tooltip.innerHTML=`<strong>ROUND ${p.turn}</strong>${this.run.names.filter(n=>!this.hiddenSeries.has(n)).map(n=>`${escapeHTML(n)}: ${p.powers[n].toFixed(1)}`).join('<br>')}`;tooltip.style.left=`${Math.min(this.chart.getBoundingClientRect().width-140,Math.max(5,p.pixelX+12))}px`;tooltip.style.top='12px';}
  destroy(){this.observer.disconnect();this.comparison?.destroy();}
}
