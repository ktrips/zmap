#!/usr/bin/env node
// 米国の ZIP コード上3桁(ZIP3)ごとの範囲データを作る(開発時に手元で1回だけ実行。生成物 demo/us-zip3.json をコミットする)
//
//   node scripts/gen-us-zip3.mjs [GeoNamesのUS.txt]
//
// 入力: GeoNames の米国の郵便番号 https://download.geonames.org/export/zip/US.zip (各行に緯度経度が入っている)
// 出力: demo/us-zip3.json   { "100": { "s": ["NY"], "n": "New York", "h": [[経度,緯度], ...] }, ... }
//       h は、そのZIP3に属する地点の外れ値を除いた凸包(ZIP3の大まかな範囲の目安。正確な区域線ではない)
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const src=process.argv[2]||"/tmp/zdata/US.txt";
const groups=new Map();
for(const line of fs.readFileSync(src,"utf8").split("\n")){
  const c=line.split("\t");if(c[0]!=="US"||!/^\d{5}$/.test(c[1]))continue;
  const lat=parseFloat(c[9]),lon=parseFloat(c[10]);
  if(!isFinite(lat)||!isFinite(lon))continue;
  if(lon<-125||lon>-66||lat<24||lat>50)continue;     // 本土の48州とDCだけ(地図の枠内)
  const k=c[1].slice(0,3);if(!groups.has(k))groups.set(k,[]);
  groups.get(k).push({lon,lat,place:c[2],st:c[4]});
}
const q=v=>Math.round(v*100)/100;
function hull(pts){
  pts=[...new Map(pts.map(p=>[p[0]+","+p[1],p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(pts.length<3)return pts;
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lo=[];for(const p of pts){while(lo.length>=2&&cross(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}
  const up=[];for(const p of pts.reverse()){while(up.length>=2&&cross(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
  return lo.slice(0,-1).concat(up.slice(0,-1));
}
const out={};
for(const [k,list] of [...groups].sort()){
  // 中央値から遠すぎる地点(座標の誤り・飛び地)は外す
  const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
  const mx=med(list.map(p=>p.lon)),my=med(list.map(p=>p.lat));
  const ds=list.map(p=>Math.hypot((p.lon-mx)*Math.cos(my*Math.PI/180),p.lat-my));
  const lim=Math.max(0.35,[...ds].sort((a,b)=>a-b)[Math.floor(ds.length*0.92)]||0);
  let kept=list.filter((p,i)=>ds[i]<=lim);if(!kept.length)kept=list;
  let h=hull(kept.map(p=>[p.lon,p.lat]));
  if(h.length<3){const e=0.12;const [x,y]=h[0]||[mx,my];h=[[x-e,y-e],[x+e,y-e],[x+e,y+e],[x-e,y+e]];}
  const cnt=new Map();for(const p of kept)cnt.set(p.place,(cnt.get(p.place)||0)+1);
  const states=[...new Set(kept.map(p=>p.st))];
  out[k]={s:states,n:[...cnt].sort((a,b)=>b[1]-a[1])[0][0],h:h.map(([x,y])=>[q(x),q(y)])};
}
fs.writeFileSync(path.join(root,"demo/us-zip3.json"),JSON.stringify(out));
console.log(`ZIP3 ${Object.keys(out).length}件, ${(JSON.stringify(out).length/1e3).toFixed(0)}KB`);
