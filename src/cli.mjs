#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {buildPlan,toMarkdown,toGherkin} from './plan.mjs';
const [path,format='json']=process.argv.slice(2);
if(!path||!['json','markdown','gherkin'].includes(format)){
 console.error('Usage: node src/cli.mjs input.json [json|markdown|gherkin]');
 process.exitCode=1;
}else{
 try{
  const raw=await readFile(path,'utf8');
  if(raw.length>1048576)throw Error('Maximum file size is 1 MiB.');
  const plan=buildPlan(raw);
  const result=format==='json'?JSON.stringify(plan,null,2):format==='markdown'?toMarkdown(plan):toGherkin(plan);
  console.log(result);
 }catch(e){console.error('Input error: '+e.message);process.exitCode=1;}
}
