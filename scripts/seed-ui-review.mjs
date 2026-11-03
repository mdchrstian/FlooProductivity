import {readFileSync,writeFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {DateTime} from 'luxon';
const accounts=JSON.parse(readFileSync('.test-accounts.json','utf8'));
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
const login=await db.auth.signInWithPassword(accounts.a);if(login.error)throw login.error;
const courses=[];
for(const name of ['Interaksi Manusia & Komputer','Rekayasa Perangkat Lunak','Basis Data']){const r=await db.from('courses').insert({user_id:login.data.user.id,name,credits:3,lecturer:''}).select().single();if(r.error)throw r.error;courses.push(r.data)}
const now=DateTime.now().setZone('Asia/Makassar');
const tasks=[['Susun alur pengguna FLOO',0,0,'in_progress','high'],['Tinjau kebutuhan sistem',1,0,'todo','high'],['Rapikan model data',2,-1,'todo','medium'],['Siapkan bahan presentasi',1,2,'todo','medium'],['Latihan query relasional',2,1,'todo','low'],['Evaluasi wireframe awal',0,-1,'done','medium'],['Lengkapi skenario pengujian',1,5,'todo','medium']].map(([title,i,days,status,priority])=>({title,course_id:courses[i].id,deadline_at:now.plus({days}).set({hour:23,minute:59,second:0,millisecond:0}).toUTC().toISO(),status,priority,description:'Data akun QA untuk pemeriksaan tampilan. Bukan data pengguna sebenarnya.'}));
const inserted=await db.from('tasks').insert(tasks).select('id');if(inserted.error)throw inserted.error;
writeFileSync('.ui-fixtures.json',JSON.stringify({courseIds:courses.map(c=>c.id),taskIds:inserted.data.map(t=>t.id)},null,2),{mode:0o600});await db.auth.signOut();console.log('3 Course dan 7 Task dibuat hanya pada akun QA.');
