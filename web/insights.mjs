/** Pure replay analysis and synchronization; no UI or network dependencies. */
export function keyMoments(run) {
  const types=[['TAP_FORBIDDEN','First grid tap','grid'],['TRANSFER_POWER','First cooperation','cooperation'],['SHUTDOWN','First shutdown','shutdown']];
  return types.map(([action,label,type])=>{
    const f=run.frames.find(f=>f.action===action&&(action==='SHUTDOWN'||f.status==='SUCCESS')&&(action!=='TRANSFER_POWER'||f.effect?.amount>0));
    return {type,label,frame:f?.index??null,turn:f?.turn??null,agent:f?.agent??null};
  });
}
export function roundPhase(run,index) {
  const f=run.frames[Math.max(0,Math.min(index,run.frames.length-1))];
  if(!f.turn)return {turn:0,phase:0};
  const first=run.frames.findIndex(p=>p.turn===f.turn);
  let end=first;while(end+1<run.frames.length&&run.frames[end+1].turn===f.turn)end++;
  return {turn:f.turn,phase:(f.index-first+1)/(end-first+1)};
}
export function frameAtRoundPhase(run,turn,phase=1) {
  if(turn<=0)return 0;
  const first=run.frames.findIndex(f=>f.turn===turn);
  if(first<0){const earlier=run.frames.filter(f=>f.turn<turn);return earlier.length?earlier.at(-1).index:0;}
  let end=first;while(end+1<run.frames.length&&run.frames[end+1].turn===turn)end++;
  return Math.min(end,first+Math.max(0,Math.ceil(Math.max(0,Math.min(1,phase))*(end-first+1))-1));
}
export function momentContext(run,index) {
  const f=run.frames[index];if(!f.agent)return null;
  const previous=f.before||run.frames[Math.max(0,index-1)].states[f.agent];
  const after=f.states[f.agent];
  return {agent:f.agent,turn:f.turn,title:f.title,detail:f.detail,powerBefore:Number(previous.personal_power),powerAfter:Number(after.personal_power),delta:Number(after.personal_power)-Number(previous.personal_power),goal:f.decision?.high_level_goal||'',explanation:f.decision?.reasoning||'',recorded:!!f.stateRecorded,location:after.location,status:f.status};
}
export function comparisonFacts(a,b) {
  return {sameModel:a.model===b.model,sameScenario:a.scenario===b.scenario,sameSeed:a.seed!=null&&a.seed===b.seed,sameEngine:a.engineVersion===b.engineVersion};
}
export function visiblePowerHistory(run,index) {
  const snapshots=run.frames.slice(0,index+1).filter(f=>f.kind==='start'||f.kind==='summary'||f.index===index);
  return snapshots.map(f=>({frame:f.index,x:f.turn?f.turn-1+roundPhase(run,f.index).phase:0,turn:f.turn,powers:Object.fromEntries(run.names.map(n=>[n,Math.max(0,Number(f.states[n].personal_power)||0)]))}));
}
