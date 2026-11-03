import assert from 'node:assert/strict';
import {writeFileSync, mkdirSync} from 'node:fs';
const base='http://localhost:3000',results=[];
for(const path of ['/login','/register','/forgot-password','/reset-password']){
 const r=await fetch(base+path),html=await r.text();assert.equal(r.status,200);assert.match(html,/<form[^>]*method="post"/);assert.match(html,/<button[^>]*disabled=""/);results.push({scenario:`SSR ${path}`,status:'PASS',actual:'Form memakai POST; tombol submit nonaktif sebelum hydration.'});
}
const r=await fetch(base+'/api/workspace');assert.equal(r.status,401);results.push({scenario:'API workspace tanpa sesi',status:'PASS',actual:'HTTP 401.'});
const mutation=await fetch(base+'/api/courses',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({name:'forged',credits:3})});assert.equal(mutation.status,401);results.push({scenario:'Mutasi tanpa sesi',status:'PASS',actual:'HTTP 401.'});
const cross=await fetch(base+'/api/courses',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});assert.equal(cross.status,403);results.push({scenario:'Origin lintas situs',status:'PASS',actual:'HTTP 403 sebelum mutasi.'});
mkdirSync('docs/evidence', {recursive:true});
writeFileSync('docs/evidence/http-results.json',JSON.stringify({testedAt:new Date().toISOString(),results},null,2));console.log(`${results.length} HTTP/SSR checks passed.`);
