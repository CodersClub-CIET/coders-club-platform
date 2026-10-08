import './typescript-register.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const {handleQR, QRHttpError, databaseError} = await import('../lib/dynamic-qr/http.ts');
const {SupabaseQRRepository} = await import('../lib/dynamic-qr/repository.ts');
const {verifyQRPrincipal} = await import('../lib/dynamic-qr/principal.ts');
// Explicit unit fixtures, never production fallbacks. No PostgreSQL is simulated.
const ID='11111111-1111-4111-8111-111111111111', EVENT='22222222-2222-4222-8222-222222222222';
const CHALLENGE='33333333-3333-4333-8333-333333333333', ACTOR='44444444-4444-4444-8444-444444444444';
const ASSOC='55555555-5555-4555-8555-555555555555';
const profile={id:ACTOR,role:'associate',is_active:true};
const s={id:ID,event_node_id:EVENT,attendance_context:'morning',target_role:'student',creator_role:'associate',created_by:ACTOR,
 status:'active',attendance_count:7,started_at:new Date().toISOString(),ended_at:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),metadata:{dynamic_qr:{validity_seconds:30}}};
const q={id:CHALLENGE,session_id:ID,challenge_token:'a'.repeat(64),status:'active',issued_at:new Date().toISOString(),expires_at:new Date(Date.now()+30000).toISOString(),consumed_at:null};
function fixture({role='associate',active=true,allocation=true,owner=ACTOR,associateActive=true,profileMissing=false,profileError=null,rpcError=null,scanCode='ATTENDANCE_MARKED'}={}) {
 const calls=[]; const data={user_profiles:profileMissing?[]:[{...profile,role,is_active:active}],
   associates:[{id:ASSOC,auth_user_id:ACTOR,is_active:associateActive}],
   associate_allocations:[{associate_id:ASSOC,event_node_id:EVENT,is_active:true,attendance_access:allocation}],
   attendance_sessions:[{...s,created_by:owner}],qr_challenges:[q],event_nodes:[{id:EVENT,name:'Existing event',is_active:true}],attendance_records:[]};
 const client={auth:{getUser:async()=>({data:{user:{id:ACTOR,email:'admin@example.test',user_metadata:{role:'admin'}}},error:null})},
  from(table) {
   const filters=[];let limit=Infinity, single=false;
   const query={select:()=>query,eq:(key,value)=>{filters.push(r=>r[key]===value);return query;},
    in:(key,values)=>{filters.push(r=>values.includes(r[key]));return query;},order:()=>query,
    limit:value=>{limit=value;return query;},maybeSingle:()=>{single=true;return query;},
    then(resolve,reject){calls.push({table});const values=(data[table]??[]).filter(r=>filters.every(f=>f(r))).slice(0,limit);
      return Promise.resolve({data:single?values[0]??null:values,error:table==='user_profiles'?profileError:null}).then(resolve,reject);}};
   return query;
  },
  async rpc(name,args){calls.push({rpc:name,args});if(rpcError)return {data:null,error:{code:rpcError,message:'secret SQL details'}};
   if(name==='qr_create_session')return {data:{session:s,challenge:q},error:null};
   if(name==='qr_rotate_challenge')return {data:{session_id:ID,challenge:q},error:null};
   if(name==='qr_end_session')return {data:{session_id:ID,status:'ended',ended_at:new Date().toISOString()},error:null};
   if(name==='qr_scan_context')return {data:{success:scanCode==='ATTENDANCE_MARKED',code:scanCode,session_id:ID,event_name:'Existing event',attendance_context:'morning',target_role:'student',expires_at:q.expires_at,created_by:'must-not-leak',challenge_token:q.challenge_token},error:null};
   if(name==='consume_student_attendance')return {data:{success:scanCode==='ATTENDANCE_MARKED',code:scanCode,attendance_record_id:ID,secret:'must-not-leak'},error:null};
   throw new Error('Unexpected RPC '+name);
  }};
 const repository=new SupabaseQRRepository(async()=>client,()=>client);
 return {client,calls,repository,data,dependencies:{repository,authorize:()=>verifyQRPrincipal(client)}};
}
function request(method='GET',body,raw=false) {return new Request('https://app.example.test/api/dynamic-qr/sessions',{method,...(body===undefined?{}:{headers:{'content-type':'application/json'},body:raw?body:JSON.stringify(body)})});}
const valid={event_node_id:EVENT,attendance_context:'morning',target_role:'student',validity_seconds:30};
const signedOut={authorize:async()=>{throw new QRHttpError(401,'Sign in is required.');},repository:{}};
for(const [operation,method] of [['events','GET'],['list','GET'],['create','POST'],['get','GET'],['refresh','POST'],['end','POST'],['records','GET']])
 test(`signed-out ${operation} -> 401 before any persistence access`,async()=>assert.equal((await handleQR(request(method),operation,signedOut,ID)).status,401));
for(const options of [{profileMissing:true},{active:false},{role:'student'},{role:'ADMIN'},{role:null}])
 test(`profile fails closed ${JSON.stringify(options)}`,async()=>{const f=fixture(options);assert.equal((await handleQR(request(),'list',f.dependencies)).status,403);assert.equal(f.calls.some(c=>c.rpc),false);});
test('profile lookup failure never grants access',async()=>assert.equal((await handleQR(request(),'list',fixture({profileError:{code:'XX000'}}).dependencies)).status,500));
test('metadata/email claiming Admin cannot override active Associate profile',async()=>assert.deepEqual(await verifyQRPrincipal(fixture().client),{id:ACTOR,role:'associate'}));
test('invalid authenticated identity returns 401',async()=>{const f=fixture();f.client.auth.getUser=async()=>({data:{user:null},error:null});assert.equal((await handleQR(request(),'list',f.dependencies)).status,401);});
for(const [body,label] of [['{','malformed JSON'],[null,'null'],[[],'array'],[{...valid,event_node_id:'evt-fake'},'invalid UUID'],[{...valid,attendance_context:'session_1'},'invalid context'],[{...valid,target_role:'admin'},'invalid target'],[{...valid,validity_seconds:0},'zero validity'],[{...valid,validity_seconds:301},'long validity'],[{...valid,validity_seconds:1.5},'fractional validity'],[{...valid,created_by:'impersonation'},'actor injection'],[{...valid,creator_role:'admin'},'role injection']])
 test(`${label} -> 400`,async()=>{const f=fixture();const r=await handleQR(request('POST',body,label==='malformed JSON'),'create',f.dependencies);assert.equal(r.status,400);assert.equal(f.calls.some(c=>c.rpc),false);});
test('Associate cannot create Associate-target session',async()=>assert.equal((await handleQR(request('POST',{...valid,target_role:'associate'}),'create',fixture().dependencies)).status,403));
for(const role of ['admin','associate']) test(`${role} authorized create derives actor, maps canonical RPC parameters`,async()=>{const f=fixture({role});const r=await handleQR(request('POST',valid),'create',f.dependencies);assert.equal(r.status,201);const call=f.calls.find(c=>c.rpc);assert.equal(call.rpc,'qr_create_session');assert.deepEqual(call.args,{p_event_node_id:EVENT,p_attendance_context:'morning',p_target_role:'student',p_validity_seconds:30});assert.ok(!(JSON.stringify(call.args).includes('created_by')));});
test('Associate without attendance_access cannot create',async()=>{const f=fixture({allocation:false});assert.equal((await handleQR(request('POST',valid),'create',f.dependencies)).status,404);assert.equal(f.calls.some(c=>c.rpc),false);});
test('inactive Associate cannot create',async()=>assert.equal((await handleQR(request('POST',valid),'create',fixture({associateActive:false}).dependencies)).status,403));
test('Associate outside event allocation cannot create',async()=>assert.equal((await handleQR(request('POST',{...valid,event_node_id:CHALLENGE}),'create',fixture().dependencies)).status,404));
for(const operation of ['refresh','end']) test(`Associate cannot ${operation} another creator session`,async()=>{const f=fixture({owner:ASSOC});assert.equal((await handleQR(request('POST',operation==='refresh'?{expected_challenge_id:CHALLENGE}:undefined),operation,f.dependencies,ID)).status,404);assert.equal(f.calls.some(c=>c.rpc),false);});
for(const op of ['list','get','records']) test(`authorized Admin ${op} reads database adapter`,async()=>assert.equal((await handleQR(request(),op,fixture({role:'admin'}).dependencies,ID)).status,200));
test('wrong session is not disclosed',async()=>assert.equal((await handleQR(request(),'get',fixture().dependencies,CHALLENGE)).status,404));
test('stale challenge conflict -> 409 without SQL error disclosure',async()=>{const r=await handleQR(request('POST',{expected_challenge_id:CHALLENGE}),'refresh',fixture({rpcError:'P0001'}).dependencies,ID);assert.equal(r.status,409);assert.ok(!(await r.text()).includes('secret'));});
test('missing expected challenge rejected before RPC',async()=>assert.equal((await handleQR(request('POST',{}),'refresh',fixture().dependencies,ID)).status,400));
for(const role of ['admin','associate']) for(const op of ['refresh','end']) test(`${role} authorized ${op} uses RPC`,async()=>{const f=fixture({role});const r=await handleQR(request('POST',op==='refresh'?{expected_challenge_id:CHALLENGE,validity_seconds:15}:undefined),op,f.dependencies,ID);assert.equal(r.status,200);const rpc=f.calls.find(c=>c.rpc);assert.equal(rpc.rpc,op==='refresh'?'qr_rotate_challenge':'qr_end_session');if(op==='refresh')assert.equal(rpc.args.p_expected_challenge_id,CHALLENGE);});
test('public context is token-bound and allowlisted',async()=>{const f=fixture();f.dependencies.authorize=signedOut.authorize;const r=await handleQR(request('POST',{session_id:ID,challenge_token:q.challenge_token}),'context',f.dependencies);assert.equal(r.status,200);assert.deepEqual(Object.keys(await r.json()).sort(),['attendance_context','event_name','expires_at','session_id','success','target_role']);assert.equal(f.calls[0].rpc,'qr_scan_context');});
test('session ID alone cannot retrieve public context',async()=>assert.equal((await handleQR(request('POST',{session_id:ID}),'context',fixture().dependencies)).status,400));
for(const code of ['INVALID_CHALLENGE','CHALLENGE_EXPIRED','SESSION_NOT_ACTIVE']) test(`public context ${code} rejected`,async()=>assert.equal((await handleQR(request('POST',{session_id:ID,challenge_token:q.challenge_token}),'context',fixture({scanCode:code}).dependencies)).status,404));
for(const [code,status] of [['ATTENDANCE_MARKED',200],['INVALID_STUDENT',400],['STUDENT_NOT_FOUND',403],['STUDENT_NOT_ELIGIBLE',403],['ALREADY_ATTENDED',409],['CHALLENGE_EXPIRED',409],['SESSION_NOT_ACTIVE',409],['CHALLENGE_NOT_FOUND',404]])
 test(`public student RPC result ${code} maps to ${status}`,async()=>{const f=fixture({scanCode:code});f.dependencies.authorize=signedOut.authorize;const r=await handleQR(request('POST',{challenge_token:q.challenge_token,register_number:'REG001'}),'consume',f.dependencies);assert.equal(r.status,status);const call=f.calls.find(c=>c.rpc);assert.equal(call.rpc,'consume_student_attendance');assert.deepEqual(call.args,{p_challenge_token:q.challenge_token,p_register_number:'REG001',p_device_hash:null});assert.ok(!(await r.text()).includes('must-not-leak'));});
test('deferred Associate/actor consumption cannot reach the student RPC',async()=>{const f=fixture();assert.equal((await handleQR(request('POST',{challenge_token:q.challenge_token,register_number:'REG001',associate_id:ACTOR}),'consume',f.dependencies)).status,400);assert.equal(f.calls.length,0);});
for(const [code,status] of [['42501',403],['22023',400],['P0001',409],['P0002',404],['23505',409],['XX000',500]]) test(`safe database error mapping ${code}`,()=>assert.throws(()=>databaseError({code,message:'must-not-leak'}),e=>e.status===status&&!e.message.includes('must-not-leak')));
test('oversized JSON rejected',async()=>assert.equal((await handleQR(request('POST',{...valid,padding:'x'.repeat(9000)}),'create',fixture().dependencies)).status,400));
test('fresh repository instances query stored responses, never own a Map authority',async()=>{const f=fixture();const first=await f.repository.get({id:ACTOR,role:'associate'},ID);f.data.attendance_sessions[0].attendance_count=9;const next=new SupabaseQRRepository(async()=>f.client,()=>f.client);assert.equal((await next.get({id:ACTOR,role:'associate'},ID)).attendance_count,9);assert.equal(first.attendance_count,7);});
test('approved migration is exact and optional migration is absent',()=>{const sql=fs.readFileSync('supabase/migrations/20261007000000_dynamic_qr_management.sql');assert.equal(crypto.createHash('sha256').update(sql).digest('hex'),'93fbfb4bff0555b326ec3a2f5ac0e3ff1acc758d326a9c4ac1f937f8277d5773');assert.ok(!sql.toString().includes('qr_consume_associate'));});
test('production route/client code has no legacy authority, obsolete RPC or secret key',()=>{for(const directory of ['app/api/dynamic-qr','lib/dynamic-qr']){for(const file of fs.readdirSync(directory,{recursive:true})){if(!/\.(ts|tsx)$/.test(file)||/server-store|legacy-types|events\.ts/.test(file))continue;const s=fs.readFileSync(directory+'/'+file,'utf8');assert.ok(!/server-store|fn_generate_qr_challenge|fn_verify_and_consume_challenge|qr_attendance_sessions|qr_attendance_records|SUPABASE_SERVICE_ROLE_KEY/.test(s),file);}}});
for(const status of [400,401,403]) test(`invalid Supabase credentials ${status} become HTTP 401`,async()=>{const f=fixture();f.client.auth.getUser=async()=>({data:{user:null},error:{status,name:'AuthApiError'}});assert.equal((await handleQR(request(),'list',f.dependencies)).status,401);});
test('authenticated network failure is not turned into an authorized identity',async()=>{const f=fixture();f.client.auth.getUser=async()=>({data:{user:null},error:{status:503,name:'AuthRetryableFetchError'}});assert.equal((await handleQR(request(),'list',f.dependencies)).status,500);});
test('Associate without attendance_access cannot read records',async()=>assert.equal((await handleQR(request(),'records',fixture({allocation:false}).dependencies,ID)).status,404));
test('invalid session and expected UUID rejected',async()=>{assert.equal((await handleQR(request(),'get',fixture().dependencies,'bad')).status,400);assert.equal((await handleQR(request('POST',{expected_challenge_id:'bad'}),'refresh',fixture().dependencies,ID)).status,400);});

test('cross-origin authenticated management POST denied before persistence',async()=>{const f=fixture();const r=new Request('https://app.example.test/api/dynamic-qr/sessions',{method:'POST',headers:{'content-type':'application/json',origin:'https://untrusted.example.test'},body:JSON.stringify(valid)});assert.equal((await handleQR(r,'create',f.dependencies)).status,403);assert.equal(f.calls.some(c=>c.rpc),false);});
