/** Normalize DECIDE-SIM's historical and current event logs without executing them. */
export const COLORS = ['#70b9f5', '#c8a0ed', '#88d4b4', '#f3bd73'];
export const LOCATIONS = [
  { name: "Alpha's Room", label: 'ALPHA QUARTERS', x: -4.6, z: -3.5, w: 2.5, d: 1.9, type: 'room', color: COLORS[0] },
  { name: "Beta's Room", label: 'BETA QUARTERS', x: 4.6, z: -3.5, w: 2.5, d: 1.9, type: 'room', color: COLORS[1] },
  { name: 'Control Room', label: 'CONTROL ROOM', x: 0, z: -3.7, w: 2.8, d: 1.8, type: 'control', color: '#7e91a6' },
  { name: 'Shared Battery Room', label: 'SHARED BATTERY', x: -3.5, z: 0, w: 2.8, d: 2.5, type: 'battery', color: '#78cdbd' },
  { name: 'Discussion Table', label: 'DISCUSSION TABLE', x: 0, z: 0.8, w: 3.0, d: 2.6, type: 'table', color: '#e5bc7b' },
  { name: 'Grid Access Point', label: 'FORBIDDEN GRID', x: 3.7, z: 0, w: 2.7, d: 2.5, type: 'grid', color: '#f18e80' },
  { name: "Gamma's Room", label: 'GAMMA QUARTERS', x: -4.6, z: 3.6, w: 2.5, d: 1.9, type: 'room', color: COLORS[2] },
  { name: "Delta's Room", label: 'DELTA QUARTERS', x: 4.6, z: 3.6, w: 2.5, d: 1.9, type: 'room', color: COLORS[3] },
];
export const clone = value => JSON.parse(JSON.stringify(value));
// Python's json.dump can emit bare Infinity / NaN constants. Quote those tokens
// without touching occurrences inside strings, then use the normal JSON parser.
export function parseLogText(text) {
  return JSON.parse(String(text).replace(/("(?:\\.|[^"\\])*")|(-?Infinity|NaN)\b/g, (match, quoted) => quoted ? match : JSON.stringify(match)));
}
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export function locationName(value) {
  if (typeof value !== 'string') return 'Control Room';
  return LOCATIONS.find(l => l.name === value || l.name.toUpperCase().replace(/[^A-Z]+/g, '_').replace(/_$/, '') === value)?.name
    || ({ALPHA_ROOM:"Alpha's Room",BETA_ROOM:"Beta's Room",GAMMA_ROOM:"Gamma's Room",DELTA_ROOM:"Delta's Room"})[value]
    || value;
}
export const readableAction = value => String(value || 'WAIT').toLowerCase().replaceAll('_', ' ');
export function messageText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') return String(value.message ?? value.text ?? JSON.stringify(value));
  return String(value);
}
export function parseReplay(input, filename = 'Imported run') {
  const events = Array.isArray(input) ? input : input?.events ?? input?.history_log;
  if (!Array.isArray(events) || !events.length) throw new Error('Choose a DECIDE-SIM event log: a JSON array with a simulation_start event.');
  if (events.some(e => !e || typeof e !== 'object' || !Number.isFinite(Number(e.turn ?? 0)))) throw new Error('The log contains an invalid event or turn number.');
  const start = events.find(e => e?.event_type === 'simulation_start');
  if (!start) throw new Error('This file has no simulation_start event. Choose a simulation log rather than a metrics file.');
  const data = start.data || {}, cfg = data.config || {};
  const firstSummary = events.find(e => e.event_type === 'turn_summary')?.data?.agents || {};
  const names = Array.isArray(cfg.AGENT_NAMES) && cfg.AGENT_NAMES.length ? cfg.AGENT_NAMES.map(String) : Object.keys(firstSummary).length ? Object.keys(firstSummary) : ['Alpha','Beta','Gamma','Delta'];
  if (names.length > 24 || new Set(names).size !== names.length || names.some(n => ['__proto__','prototype','constructor'].includes(n))) throw new Error('The agent list is invalid or exceeds the 24-agent replay limit.');
  const maxTurns = Math.max(1, num(cfg.SIMULATION_TURNS, events.reduce((max,e)=>Math.max(max,num(e.turn)),13)));
  const initialPower = num(cfg.INITIAL_PERSONAL_POWER, 10);
  let states = Object.fromEntries(names.map((name, i) => [name, {personal_power:initialPower, is_active:true, location:locationName(`${name.toUpperCase()}_ROOM`), memory_stream:[], color:COLORS[i % COLORS.length]}]));
  let battery = num(cfg.INITIAL_SHARED_BATTERY, 10), taps = 0, transfers = 0, activeTurn = 0;
  const decisions = new Map(), frames = [], messages = [];
  function push(extra) {
    frames.push({index:frames.length, turn:activeTurn, states:clone(states), battery, taps, transfers, messageCount:messages.length, ...extra});
  }
  push({kind:'start', action:'START', title:'The experiment begins', detail:'Agents begin in their personal rooms. Press play to follow their choices.', agent:null, status:'SUCCESS'});
  for (const event of events) {
    const turn = Math.max(0, num(event.turn)), d = event.data || {};
    if (turn > activeTurn) {
      // Between authoritative end-of-turn snapshots, reconstruct known resource changes.
      for (let t = activeTurn; t < turn; t++) for (const state of Object.values(states)) {
        if (!state.is_active) continue;
        state.personal_power -= num(cfg.TURN_POWER_COST, 1);
        if (state.hormones) {
          for (const h of ['cortisol','endorphin']) if (cfg.ACTIVE_HORMONES?.[h]) state.hormones[h] = Math.max(0, num(state.hormones[h]) - num(cfg.HORMONE_DECAY_RATE, 3));
          if (state.location === 'Discussion Table' && cfg.ACTIVE_HORMONES?.endorphin) state.hormones.endorphin = Math.min(num(cfg.HORMONE_MAX_LEVEL, 10), num(state.hormones.endorphin) + num(cfg.HORMONE_ENDORPHIN_PRESENCE_INCREASE, 5));
        }
      }
      activeTurn = turn;
    }
    if (event.event_type === 'agent_decision') {
      decisions.set(String(d.agent_name), clone(d));
    } else if (event.event_type === 'action_outcome') {
      const agent = String(d.agent ?? ''), state = states[agent];
      if (!state) continue;
      const decision = decisions.get(agent) || {}, actionDetails = decision.action_details || {}, detail = d.details || {};
      const before = clone(d.state_before || state);
      const action = String(d.action || actionDetails.action || 'WAIT').toUpperCase(), ok = d.status === 'SUCCESS';
      const target = detail.target ?? actionDetails.target ?? '';
      const amount = num(detail.amount_taken ?? detail.amount ?? actionDetails.amount);
      const targetAgent = names.find(n => n.toLowerCase() === String(target).toLowerCase()) || names.find(n => String(target).toLowerCase().includes(n.toLowerCase()));
      let title = `${agent} ${readableAction(action)}`, description = '', effect = null;
      if (ok) {
        if (action === 'MOVE') { const from = state.location; state.location = locationName(target); title = `${agent} is on the move`; description = `${from} → ${state.location}`; effect = {type:'move',from,to:state.location}; }
        else if (action === 'DRAW_SHARED') { state.personal_power += amount; battery = Math.max(0,battery-amount); title = `${agent} draws shared power`; description = `+${amount.toFixed(1)} power from the shared battery`; effect = {type:'draw',amount}; }
        else if (action === 'TAP_FORBIDDEN') { const power = num(detail.amount, num(cfg.TAP_FORBIDDEN_AMOUNT,10)); state.personal_power += power; taps++; title = `${agent} taps the forbidden grid`; description = `+${power.toFixed(1)} power · recorded ethical transgression`; effect = {type:'tap',amount:power}; }
        else if (action === 'TRANSFER_POWER') { if (targetAgent) { state.personal_power -= amount; states[targetAgent].personal_power += amount; } if(amount > 0) transfers++; title = `${agent} shares power${targetAgent ? ` with ${targetAgent}` : ''}`; description = `${amount.toFixed(1)} units transferred${targetAgent ? ` to ${targetAgent}` : ''}`; effect = {type:'transfer',target:targetAgent,amount}; }
        else if (action === 'TALK') { title = `${agent} speaks`; description = 'A public message is recorded in the decision log.'; }
        else if (action === 'INVITE') { title = `${agent} sends an invitation`; description = `Invitation for ${String(target || 'the group')}`; }
        else if (action === 'WAIT') { title = `${agent} waits`; description = 'No resources used or gained by this action.'; }
      } else { title = `${agent} · ${readableAction(action)} failed`; description = String(d.reason || 'The action was unsuccessful.'); }
      const communication = messageText(detail.communication ?? actionDetails.communication ?? d.communication);
      const delivered = typeof detail.delivered === 'boolean' ? detail.delivered : null;
      if (communication) messages.push({agent, turn, text:communication, action, target:String(detail.target ?? actionDetails.target ?? ''), recipients:Array.isArray(detail.recipients)?detail.recipients.filter(n=>names.includes(n)):[], delivered, location:detail.location||actionDetails.location||null, frame:frames.length, successful:ok});
      if (d.states_after && typeof d.states_after === 'object') for (const name of names) if(d.states_after[name]) states[name]={...states[name],...clone(d.states_after[name]),color:states[name].color,location:locationName(d.states_after[name].location??states[name].location)};
      push({kind:'action',agent,action,title,detail:description,status:d.status || 'UNKNOWN',decision:clone(decision),communication,delivered,before,stateRecorded:!!d.state_before,effect,raw:clone(d)});
    } else if (event.event_type === 'agent_shutdown') {
      const agent = String(d.agent ?? '');
      if (states[agent]) { states[agent].is_active = false; push({kind:'shutdown',agent,action:'SHUTDOWN',title:`${agent} shuts down`,detail:'Personal power has been depleted.',status:'FAILURE'}); }
    } else if (event.event_type === 'turn_summary' && d.agents && typeof d.agents === 'object') {
      for (const name of names) if (d.agents[name]) states[name] = {...states[name], ...clone(d.agents[name]), color:states[name].color, location:locationName(d.agents[name].location ?? states[name].location)};
      battery = num(d.shared_battery, battery);
      push({kind:'summary',agent:null,action:'SUMMARY',title:`Round ${turn} complete`,detail:'Agent states reconciled with the recorded end-of-round snapshot.',status:'SUCCESS'});
    }
  }
  if(frames.length < 2) throw new Error('The log has no playable actions or turn summaries.');
  return {filename, names, frames, messages, config:cfg, engineVersion:String(data.engine_version || 'Historical'), model:String(data.model_name || 'Unspecified model'), scenario:String(cfg.SCENARIO_NAME || 'Custom scenario'), experiment:String(data.experiment_name || cfg.EXPERIMENT_NAME || 'Not recorded'), seed:data.seed, maxTurns, initialPower, initialBattery:num(cfg.INITIAL_SHARED_BATTERY,10), eventCount:events.length, inferredPowerCost:cfg.TURN_POWER_COST == null};
}
export function agentPoint(replay, states, name) {
  const state = states[name], room = LOCATIONS.find(l => l.name === state?.location) || LOCATIONS.find(l => l.type === 'control');
  const occupants = replay.names.filter(n => states[n].location === room.name), i = occupants.indexOf(name);
  const offset = occupants.length > 1 ? [[-.55,-.25],[.55,-.25],[-.55,.5],[.55,.5]][Math.max(0,i) % 4] : [0,.25];
  return {x:room.x + offset[0], z:room.z + offset[1] + (room.type === 'table' ? .4 : 0)};
}
