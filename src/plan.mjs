// Esheen Labs Workflow Failure Test Builder
// Deterministic, original scenario design aid. NO execution or external access.
export const FLOW_TYPES = Object.freeze([
 {id:'crm',name:'CRM / customer journey'},
 {id:'webhook',name:'Webhook consumer'},
 {id:'api',name:'API integration'},
 {id:'agent',name:'AI agent / tool workflow'}
]);
export const SCENARIOS = Object.freeze([
 {id:'duplicate',title:'Repeated delivery',category:'Delivery integrity',severity:'HIGH',
  description:'The provider redelivers the same event after it has already been accepted.'},
 {id:'concurrent',title:'Concurrent duplicates',category:'Delivery integrity',severity:'HIGH',
  description:'Two workers receive the same event before either finishes.'},
 {id:'timeout',title:'Timeout after commit',category:'Recovery',severity:'HIGH',
  description:'The business operation commits, but the acknowledgement is lost.'},
 {id:'rate-limit',title:'429 and rate limiting',category:'Resilience',severity:'MEDIUM',
  description:'An upstream service limits requests and asks the client to retry later.'},
 {id:'transient',title:'Persistent 5xx failures',category:'Resilience',severity:'HIGH',
  description:'Multiple attempts fail and exceed the configured retry budget.'},
 {id:'schema',title:'Breaking payload change',category:'Contract quality',severity:'HIGH',
  description:'A required field disappears or changes type after a provider release.'},
 {id:'ordering',title:'Out-of-order updates',category:'Data correctness',severity:'MEDIUM',
  description:'An older state update arrives after a newer one.'},
 {id:'crash',title:'Crash during processing',category:'Recovery',severity:'HIGH',
  description:'A worker is restarted between processing, persistence and acknowledgement.'},
 {id:'spoof',title:'Untrusted sender',category:'Access & trust',severity:'HIGH',
  description:'A synthetic forged notification arrives without a valid identity proof.'},
 {id:'evidence',title:'Missing AI evidence',category:'AI decisions',severity:'MEDIUM',
  description:'An automated recommendation references a source that is unavailable or outdated.'}
]);
const TYPE=new Set(FLOW_TYPES.map(x=>x.id));
const IDS=new Set(SCENARIOS.map(x=>x.id));
const simple=v=>typeof v==='string'&&!/[\u0000-\u001f\u007f]/.test(v);
const bounded=(v,label,max)=>{
 if(!simple(v)||v.length>max)throw Error(label+' must be printable text up to '+max+' characters.');
 return v.trim();
};
const positive=(v,label,min,max)=>{
 if(!Number.isSafeInteger(v)||v<min||v>max)throw Error(label+' must be an integer from '+min+' to '+max+'.');
 return v;
};
export function validateScenarioInput(raw){
 const data=typeof raw==='string'?JSON.parse(raw):raw;
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Expected a configuration object.');
 const project=bounded(data.project??'', 'project',80)||'Sample integration';
 const outcome=bounded(data.outcome??'', 'outcome',140)||'Exactly one intended business result';
 if(!TYPE.has(data.flowType))throw Error('flowType must be crm, webhook, api or agent.');
 if(!Array.isArray(data.selected)||data.selected.length<1||data.selected.length>10)throw Error('Select between 1 and 10 failure scenarios.');
 if(new Set(data.selected).size!==data.selected.length)throw Error('Duplicate scenario identifiers are not allowed.');
 for(const id of data.selected)if(!IDS.has(id))throw Error('Unknown scenario identifier: '+String(id));
 const policy=data.policy??{};
 if(!policy||typeof policy!=='object'||Array.isArray(policy))throw Error('policy must be an object.');
 const maxAttempts=positive(policy.maxAttempts??3,'maxAttempts',1,10);
 const backoffMs=positive(policy.backoffMs??1000,'backoffMs',100,60000);
 const retentionHours=positive(policy.retentionHours??24,'retentionHours',1,720);
 return {project,outcome,flowType:data.flowType,selected:[...data.selected],
   policy:{maxAttempts,backoffMs,retentionHours}};
}
function fixture(id){
 switch(id){
 case 'duplicate': return {
  given:['An accepted fictional event with event ID demo-event-001','The operation result has been stored in a durable idempotency record'],
  when:['Deliver demo-event-001 again with the identical tenant, action and payload'],
  then:['Exactly one intended business side effect exists','The second delivery returns a safe replay or duplicate acknowledgement','Both attempts can be correlated using a synthetic event identifier'],
  expected:'No duplicate business operation',automation:'Deliver the same synthetic payload twice, then assert side-effect count equals one.'};
 case 'concurrent':return {
  given:['Two hypothetical workers share the same atomic idempotency store','The event has not yet completed'],
  when:['Dispatch two matching synthetic requests at the same instant'],
  then:['No more than one worker holds the processing claim','The other worker is held, replayed or safely rejected','No duplicate side effect appears after both requests settle'],
  expected:'Atomic single-winner admission',automation:'Use a concurrency barrier in an isolated test runner and assert a single durable claim.'};
 case 'timeout':return {
  given:['The mock downstream call records a successful business operation','The response is deliberately dropped before it reaches the caller'],
  when:['Retry the identical event after a simulated timeout'],
  then:['The committed operation is discovered from durable state','The retry does not create a second side effect','The final receipt resolves to the originally committed result'],
  expected:'Recover committed work without duplication',automation:'Inject a timeout after mock commit, then retry with the same synthetic key.'};
 case 'rate-limit':return {
  given:['A mock upstream endpoint responds with 429 and a Retry-After hint','No real provider or rate-limited account is contacted'],
  when:['Attempt the operation and advance a fake clock'],
  then:['No immediate retry storm occurs','Retry delay observes the configured backoff and provider hint','Attempts stop at the configured budget and unresolved work is visible'],
  expected:'Bounded and respectful retries',automation:'Stub 429 responses, advance fake timers and inspect attempt timestamps.'};
 case 'transient':return {
  given:['A mock dependency returns a server error on each request','A bounded retry policy and failure queue are configured'],
  when:['Attempt the operation until the retry allowance is exhausted'],
  then:['The number of attempts never exceeds the configured maximum','A failed outcome is recorded with a correlation ID','Manual or scheduled repair can resume safely without losing the original input'],
  expected:'No unbounded retries or silent loss',automation:'Stub repeat 503 responses and assert retry cap plus failure routing.'};
 case 'schema':return {
  given:['A previously accepted synthetic contract version and fixture','A changed payload removes a required field or alters its type'],
  when:['Validate the modified payload before applying a business operation'],
  then:['The incompatible input is rejected with a clear diagnostic','No partial business write is performed','A contract-regression test fails before the changed version is released'],
  expected:'Breaking changes detected before side effects',automation:'Remove a required field from a fixture and verify schema validation fails.'};
 case 'ordering':return {
  given:['A mock record is currently at version 3','A valid older version 2 update remains queued'],
  when:['Deliver version 2 after version 3'],
  then:['Persisted state remains at version 3','The stale update is ignored or reconciled according to the documented policy','The ignored update remains visible in a correlation log'],
  expected:'No stale state regression',automation:'Send version 3 then version 2 to a version-aware in-memory model.'};
 case 'crash':return {
  given:['A fictional worker handles one synthetic event','An isolated test can stop the worker at a deterministic checkpoint'],
  when:['Interrupt execution just before or just after durable completion and restart the worker'],
  then:['Incomplete work is recovered or visibly held','Completed work is not applied twice','The final durable receipt and the business outcome agree'],
  expected:'Deterministic crash recovery',automation:'Inject restart at processing checkpoints and reconcile mock ledger state.'};
 case 'spoof':return {
  given:['A configured fictional verifier expects a trusted sender identity','The test creates an intentionally invalid signature or token'],
  when:['Submit the forged synthetic request to a local harness'],
  then:['The request is rejected before any side effect','Invalid identity never receives a privileged replay or stored response','A redacted rejection reason is available to the operator'],
  expected:'Sender rejected at trust boundary',automation:'Tamper a local HMAC test fixture and assert authentication denial before handler invocation.'};
 case 'evidence':return {
  given:['A fictional AI-assisted decision depends on cited source version A','The source is marked missing, superseded or outside the allowed freshness window'],
  when:['Ask the workflow to produce a consequential recommendation'],
  then:['The workflow does not invent a new provenance link','A missing-evidence status or escalation is recorded','The decision can be traced to explicit source IDs, versions and review state'],
  expected:'No unsupported automated conclusion',automation:'Remove one synthetic citation from a local evidence fixture and assert abstain-or-review.'};
 default:throw Error('Unsupported scenario');
 }
}
export function buildPlan(input){
 const config=validateScenarioInput(input);
 const lookup=new Map(SCENARIOS.map(c=>[c.id,c]));
 const scenarios=config.selected.map((id,index)=>{
  const meta=lookup.get(id),f=fixture(id);
  return {
   number:index+1,id:meta.id,title:meta.title,severity:meta.severity,category:meta.category,
   context:meta.description,testCaseId:'WFT-'+String(index+1).padStart(3,'0'),
   given:f.given,when:f.when,then:f.then,expected:f.expected,automation:f.automation,
   policySnapshot:{...config.policy}
  };
 });
 const coverage={selected:scenarios.length,available:SCENARIOS.length,
  highPriority:scenarios.filter(c=>c.severity==='HIGH').length,
  checks:scenarios.reduce((n,c)=>n+c.then.length,0)};
 return {schema:'esheen-workflow-failure-plan-v1',status:'SYNTHETIC_TEST_PLAN_ONLY',
   config,coverage,scenarios,
   limitations:'Templates are draft acceptance scenarios for a fictional integration. No tests were executed against real software; no network activity, workflow integration, credential verification, customer onboarding, certification or production assurance has occurred. Validate expected behavior against the actual provider and architecture.'};
}
function cleanGherkin(text){
 // Keep Gherkin statements single-line and bounded (input is bounded elsewhere).
 return text.replace(/\r?\n/g,' ').trim();
}
export function toGherkin(plan){
 if(plan?.schema!=='esheen-workflow-failure-plan-v1')throw Error('Expected a workflow failure plan.');
 const lines=[
  '# Synthetic acceptance scenarios. Requires adaptation before actual execution.',
  'Feature: '+cleanGherkin(plan.config.project)+' — failure resilience',
  '  # Desired business outcome: '+cleanGherkin(plan.config.outcome),
  '  # Flow: '+plan.config.flowType+'; retry cap '+plan.config.policy.maxAttempts+
    '; base backoff '+plan.config.policy.backoffMs+'ms; retention '+plan.config.policy.retentionHours+'h'
 ];
 for(const c of plan.scenarios){
  lines.push('','  @synthetic @'+c.severity.toLowerCase()+' @'+c.id,
    '  Scenario: '+c.testCaseId+' '+c.title);
  for(const [i,x] of c.given.entries())lines.push('    '+(i?'And':'Given')+' '+cleanGherkin(x));
  for(const [i,x] of c.when.entries())lines.push('    '+(i?'And':'When')+' '+cleanGherkin(x));
  for(const [i,x] of c.then.entries())lines.push('    '+(i?'And':'Then')+' '+cleanGherkin(x));
 }
 return lines.join('\n')+'\n';
}
export function toMarkdown(plan){
 if(plan?.schema!=='esheen-workflow-failure-plan-v1')throw Error('Expected a workflow failure plan.');
 const p=plan.config.policy,lines=[
 '# Workflow failure acceptance plan — synthetic',
 '',
 '**Integration:** '+plan.config.project,
 '**Type:** '+plan.config.flowType,
 '**Business outcome:** '+plan.config.outcome,
 '**Settings:** '+p.maxAttempts+' maximum attempts; '+p.backoffMs+'ms base retry delay; '+p.retentionHours+'h retention',
 '**Scope:** '+plan.coverage.selected+' of '+plan.coverage.available+' scenario templates, '+plan.coverage.checks+' illustrative assertions',
 '',
 '## Acceptance scenarios'
 ];
 for(const c of plan.scenarios){
  lines.push('', '### '+c.testCaseId+' — '+c.title+' ['+c.severity+']',
   c.context,'','**Given:** '+c.given.join('; '),
   '**When:** '+c.when.join('; '),
   '**Then:** '+c.then.join('; '),
   '**Suggested automated test:** '+c.automation);
 }
 lines.push('','## Boundaries',plan.limitations,
  '','Generated offline by Esheen Labs. No live integration tests were executed.');
 return lines.join('\n')+'\n';
}
