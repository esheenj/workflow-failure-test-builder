import {mkdir,rm,copyFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const path of ['index.html','style.css','app.mjs','robots.txt','sitemap.xml'])await copyFile('site/'+path,'dist/'+path);
await copyFile('src/plan.mjs','dist/plan.mjs');
console.log('Built local-first static site to dist/');
