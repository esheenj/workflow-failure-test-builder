import {FLOW_TYPES,SCENARIOS,buildPlan,toMarkdown,toGherkin} from './plan.mjs';
const $=id=>document.getElementById(id);
const example={
 project:'Fictional CRM-to-invoice handoff',
 outcome:'An approved CRM deal creates exactly one draft invoice',
 flowType:'crm',
 selected:['duplicate','concurrent','timeout','schema','crash'],
 policy:{maxAttempts:3,backoffMs:1000,retentionHours:24}
};
let report=null;
function element(tag,body,cls){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 node.textContent=body;
 return node;
}
function createForm(){
 for(const type of FLOW_TYPES){
  const option=document.createElement('option');option.value=type.id;option.textContent=type.name;
  $('flowType').append(option);
 }
 const grid=$('scenarioGrid');
 for(const [index,s] of SCENARIOS.entries()){
  const label=document.createElement('label');label.className='scenario';
  const input=document.createElement('input');input.type='checkbox';input.value=s.id;input.id='scenario-'+s.id;
  input.addEventListener('change',()=>{refreshCount();invalidate();});
  const details=document.createElement('span');details.className='scenario-content';
  const top=document.createElement('span');top.className='scenario-meta';
  top.append(element('span',String(index+1).padStart(2,'0')+' / 10'),element('span',s.severity));
  details.append(top,element('strong',s.title),element('small',s.description));
  label.append(input,details);grid.append(label);
 }
 applyInput(example);
}
function applyInput(data){
 $('project').value=data.project||'';
 $('outcome').value=data.outcome||'';
 $('flowType').value=data.flowType||'crm';
 $('maxAttempts').value=data.policy?.maxAttempts??3;
 $('backoffMs').value=data.policy?.backoffMs??1000;
 $('retentionHours').value=data.policy?.retentionHours??24;
 for(const s of SCENARIOS)$('scenario-'+s.id).checked=!!data.selected?.includes(s.id);
 refreshCount();invalidate();
}
function refreshCount(){
 const count=SCENARIOS.filter(s=>$('scenario-'+s.id).checked).length;
 $('selectedCount').textContent=count+' of '+SCENARIOS.length+' selected';
}
function invalidate(){
 report=null;$('result').hidden=true;$('error').hidden=true;$('error').textContent='';
}
function gather(){
 return {
  project:$('project').value,
  outcome:$('outcome').value,
  flowType:$('flowType').value,
  selected:SCENARIOS.filter(s=>$('scenario-'+s.id).checked).map(s=>s.id),
  policy:{
   maxAttempts:$('maxAttempts').value===''?null:Number($('maxAttempts').value),
   backoffMs:$('backoffMs').value===''?null:Number($('backoffMs').value),
   retentionHours:$('retentionHours').value===''?null:Number($('retentionHours').value)
  }
 };
}
function render(plan){
 report=plan;
 $('result').hidden=false;
 $('caseCount').textContent=String(plan.coverage.selected);
 $('highCount').textContent=String(plan.coverage.highPriority);
 $('checkCount').textContent=String(plan.coverage.checks);
 $('notice').textContent=plan.limitations;
 const list=$('testCases');list.replaceChildren();
 for(const c of plan.scenarios){
  const li=document.createElement('li');li.className='test-case';
  const header=document.createElement('div');header.className='case-header';
  header.append(element('span',c.testCaseId+' · '+c.category,'case-id'),
    element('span',c.severity,'case-severity '+c.severity));
  li.append(header,element('h3',c.title),element('p',c.context,'case-context'));
  for(const [title,entries] of [['GIVEN',c.given],['WHEN',c.when],['THEN',c.then]]){
   const row=document.createElement('div');row.className='case-phase';
   row.append(element('strong',title));
   const ul=document.createElement('ul');
   for(const value of entries)ul.append(element('li',value));
   row.append(ul);li.append(row);
  }
  li.append(element('p','Suggested automation: '+c.automation,'case-hint'));
  list.append(li);
 }
 $('result').scrollIntoView({behavior:'auto',block:'start'});
}
function generate(){
 try{
  const plan=buildPlan(gather());
  $('error').hidden=true;
  render(plan);
 }catch(error){
  invalidate();$('error').textContent=error.message;$('error').hidden=false;
 }
}
function download(content,filename,type){
 const blob=new Blob([content],{type});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=filename;
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function save(format){
 if(!report)return;
 if(format==='gherkin')download(toGherkin(report),'workflow-failure-acceptance.feature','text/plain;charset=utf-8');
 else if(format==='markdown')download(toMarkdown(report),'workflow-failure-test-plan.md','text/markdown;charset=utf-8');
 else download(JSON.stringify(report,null,2),'workflow-failure-test-plan.json','application/json');
}
$('restore').addEventListener('click',()=>applyInput(example));
$('generate').addEventListener('click',generate);
$('gherkin').addEventListener('click',()=>save('gherkin'));
$('markdown').addEventListener('click',()=>save('markdown'));
$('json').addEventListener('click',()=>save('json'));
for(const id of ['project','outcome','flowType','maxAttempts','backoffMs','retentionHours'])
 $(id).addEventListener('input',invalidate);
createForm();
