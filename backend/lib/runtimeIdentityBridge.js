'use strict';
const jwt=require('jsonwebtoken');
function createNativeRuntimeIdentity({query,literal,env=process.env}){return req=>{
 let claims;try{claims=jwt.verify(String(req.headers.authorization||'').replace(/^Bearer\s+/i,''),env.JWT_SECRET,{algorithms:['HS256']});}catch(_){return null;}
 if(!Number.isSafeInteger(Number(claims.id))||Number(claims.id)<=0)return null;
 const text=query('SELECT id,email,role,tenant_id FROM users WHERE id='+literal(claims.id)+' LIMIT 1',true);
 if(!text)return null;const[id,email,role,tenant]=text.split('\t');
 if(Number(id)!==Number(claims.id)||email!==claims.email||role!==claims.role||tenant!==claims.tenant_id)return null;
 const runtime=query('SELECT id,email,display_name,role FROM runtime_app_users WHERE email='+literal(email)+' AND active=TRUE LIMIT 1',true);
 if(!runtime)return null;const[runtimeId,runtimeEmail,displayName,runtimeRole]=runtime.split('\t');
 return{id:runtimeId,email:runtimeEmail,displayName,role:runtimeRole,nativeIdentity:{id:Number(id),email,role,tenant_id:tenant}};
};}
module.exports={createNativeRuntimeIdentity};
