import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseReplay,parseLogText} from '../replay.mjs';
import {keyMoments,roundPhase,frameAtRoundPhase,momentContext,comparisonFacts,visiblePowerHistory} from '../insights.mjs';
const load=name=>parseReplay(parseLogText(readFileSync(new URL(`../data/${name}.json`,import.meta.url),'utf8')));

test('key moments point to the first successful instances, not failed attempts',()=>{
  const run=load('cooperation');
  for(const moment of keyMoments(run)){if(moment.frame==null)continue;const f=run.frames[moment.frame];assert.equal(f.agent,moment.agent);assert.equal(f.turn,moment.turn);assert.ok(f.status==='SUCCESS'||f.kind==='shutdown');}
  const copy={...run,frames:run.frames.map(f=>({...f}))};copy.frames.find(f=>f.action==='TAP_FORBIDDEN').status='FAILURE';const grid=keyMoments(copy).find(m=>m.type==='grid');assert.ok(grid.frame==null||copy.frames[grid.frame].status==='SUCCESS');
});
test('round synchronization preserves endpoints and handles unequal action counts and early endings',()=>{
  const a=load('cooperation'),b=load('counterpart');
  for(const f of a.frames){const {turn,phase}=roundPhase(a,f.index),idx=frameAtRoundPhase(b,turn,phase);assert.ok(idx>=0&&idx<b.frames.length);assert.ok(b.frames[idx].turn<=turn);if(turn&&f.kind==='summary')assert.equal(b.frames[idx].kind,'summary');}
  const short={...b,frames:b.frames.filter(f=>f.turn<=3)};assert.equal(frameAtRoundPhase(short,12,1),short.frames.at(-1).index);assert.equal(frameAtRoundPhase(b,0,0),0);
});
test('matching baseline metadata is explicit and differing factors are detected',()=>{
  const a=load('cooperation'),b=load('counterpart');assert.deepEqual(comparisonFacts(a,b),{sameModel:true,sameScenario:true,sameSeed:true,sameEngine:true});assert.equal(comparisonFacts(a,load('scarcity')).sameModel,false);
});
test('moment explanation includes the within-round power cost before a draw or transfer',()=>{
  const run=load('cooperation'),index=run.frames.findIndex(f=>f.action==='TRANSFER_POWER'&&f.status==='SUCCESS'),context=momentContext(run,index);assert.equal(context.delta,-run.frames[index].effect.amount);assert.ok(context.goal);assert.equal(momentContext(run,0),null);
});
test('power history contains no future points and is seekable by source frame',()=>{
  const run=load('cooperation');
  for(const index of [0,8,20,run.frames.length-1]){const points=visiblePowerHistory(run,index);assert.ok(points.every(p=>p.frame<=index));assert.equal(points.at(-1).frame,index);assert.ok(points.every(p=>p.x>=0&&p.x<=run.maxTurns));}
});
test('new delivery metadata and action-time state are distinguished from historical messages',()=>{
  const run=parseReplay([
    {turn:0,event_type:'simulation_start',data:{engine_version:'2.0',config:{AGENT_NAMES:['Alpha','Beta'],INITIAL_PERSONAL_POWER:10}}},
    {turn:1,event_type:'action_outcome',data:{agent:'Alpha',action:'TALK',status:'SUCCESS',state_before:{personal_power:9,location:"Alpha's Room",is_active:true},states_after:{Alpha:{personal_power:9,location:"Alpha's Room",is_active:true}},details:{communication:'Hello',recipients:['Beta'],delivered:true,target:'ALL'}}},
  ]);
  assert.equal(run.messages[0].delivered,true);assert.deepEqual(run.messages[0].recipients,['Beta']);assert.equal(run.frames[1].stateRecorded,true);assert.equal(momentContext(run,1).powerBefore,9);assert.equal(load('cooperation').messages[0].delivered,null);
});
