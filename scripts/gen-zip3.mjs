#!/usr/bin/env node
// 郵便番号街当て用データの生成(開発時に手元で1回だけ実行。生成物は demo/ に置いてコミットする)
//
//   node scripts/gen-zip3.mjs [境界GeoJSON] [GeoNamesのJP.txt]
//
// 入力
//   境界: 国土数値情報(行政区域 N03)を SmartNews が配布している GeoJSON(全国・簡略化版)
//         https://raw.githubusercontent.com/smartnews-smri/japan-topography/main/data/municipality/geojson/s0010/N03-21_210101.json
//   郵便: GeoNames の日本の郵便番号(各行に緯度経度が入っている)
//         https://download.geonames.org/export/zip/JP.zip
// 出力
//   demo/zip3.json        上3桁 → 市区町村コードの一覧(複数の3桁にまたがる市区町村は末尾に * を付ける)と、コード → 名前
//   demo/muni/<県2桁>.json  市区町村コード → 境界ポリゴン(都道府県ごとに分割して必要な分だけ読み込む)
//
// 郵便番号の座標を市区町村ポリゴンに当てはめて対応を作っているので、市区町村の境目では誤差が出ることがある。
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const geoPath=process.argv[2]||"/tmp/zdata/n03.json";
const zipPath=process.argv[3]||"/tmp/zdata/JP.txt";
const gj=JSON.parse(fs.readFileSync(geoPath,"utf8"));

const q=v=>Math.round(v*1e4)/1e4;
const quantRing=r=>{const o=[];for(const [x,y] of r){const p=[q(x),q(y)];const l=o[o.length-1];if(!l||l[0]!==p[0]||l[1]!==p[1])o.push(p);}return o;};

// 市区町村コードごとにポリゴンをまとめる(飛び地・離島は複数ポリゴン)
const muni=new Map();
for(const f of gj.features){
  const p=f.properties,code=p.N03_007;if(!code)continue;
  const polys=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;
  let m=muni.get(code);
  if(!m){
    const city=p.N03_003&&!p.N03_003.endsWith("郡")?p.N03_003:"";
    m={code,name:`${p.N03_001||""}${city}${p.N03_004||""}`,polys:[]};muni.set(code,m);
  }
  for(const poly of polys){
    const rings=poly.map(quantRing).filter(r=>r.length>=4);
    if(!rings.length)continue;
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const [x,y] of rings[0]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
    m.polys.push({rings,bbox:[x0,y0,x1,y1]});
  }
}

// 0.1度の格子に、重なるポリゴンを登録して点の判定を速くする
const CELL=0.1,grid=new Map();
const cellKey=(i,j)=>i+","+j;
for(const m of muni.values())for(const pg of m.polys){
  const [x0,y0,x1,y1]=pg.bbox;
  for(let i=Math.floor(x0/CELL);i<=Math.floor(x1/CELL);i++)for(let j=Math.floor(y0/CELL);j<=Math.floor(y1/CELL);j++){
    const k=cellKey(i,j);if(!grid.has(k))grid.set(k,[]);grid.get(k).push([m.code,pg]);
  }
}
function inRing(x,y,r){let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [xi,yi]=r[i],[xj,yj]=r[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;}
function inPoly(x,y,rings){if(!inRing(x,y,rings[0]))return false;for(let i=1;i<rings.length;i++)if(inRing(x,y,rings[i]))return false;return true;}
const cache=new Map();
function locate(lon,lat){
  const ck=lon+","+lat;if(cache.has(ck))return cache.get(ck);
  let hit=null;
  for(const [code,pg] of grid.get(cellKey(Math.floor(lon/CELL),Math.floor(lat/CELL)))||[]){
    const [x0,y0,x1,y1]=pg.bbox;if(lon<x0||lon>x1||lat<y0||lat>y1)continue;
    if(inPoly(lon,lat,pg.rings)){hit=code;break;}
  }
  cache.set(ck,hit);return hit;
}

// 郵便番号の行 → 上3桁ごとに、含まれる市区町村を数える
const z3=new Map();let rows=0,miss=0;
for(const line of fs.readFileSync(zipPath,"utf8").split("\n")){
  const c=line.split("\t");if(c[0]!=="JP"||!/^\d{3}-\d{4}$/.test(c[1]))continue;
  const lat=parseFloat(c[9]),lon=parseFloat(c[10]);if(!isFinite(lat)||!isFinite(lon))continue;
  rows++;const code=locate(lon,lat);if(!code){miss++;continue;}
  const k=c[1].slice(0,3);if(!z3.has(k))z3.set(k,new Map());
  const m=z3.get(k);m.set(code,(m.get(code)||0)+1);
}
// 数が極端に少ない市区町村は座標の誤差とみなして落とす(1つしかなければ残す)
const kept=new Map();
for(const [k,m] of z3){
  const tot=[...m.values()].reduce((a,b)=>a+b,0);
  let list=[...m].filter(([,n])=>n>=2||n/tot>=0.05).sort((a,b)=>b[1]-a[1]).map(([c])=>c);
  if(!list.length)list=[[...m].sort((a,b)=>b[1]-a[1])[0][0]];
  kept.set(k,list);
}
const multi=new Map();for(const list of kept.values())for(const c of list)multi.set(c,(multi.get(c)||0)+1);
const out={z:{},n:{}};
for(const k of [...kept.keys()].sort()){
  out.z[k]=kept.get(k).map(c=>multi.get(c)>1?c+"*":c);
  for(const c of kept.get(k))out.n[c]=muni.get(c).name;
}
fs.writeFileSync(path.join(root,"demo/zip3.json"),JSON.stringify(out));

// 都道府県ごとの境界ファイル(使われる市区町村だけ)
const used=new Set(Object.keys(out.n));
const byPref=new Map();
for(const c of used){
  const pf=c.slice(0,2);if(!byPref.has(pf))byPref.set(pf,{});
  byPref.get(pf)[c]=muni.get(c).polys.map(pg=>pg.rings);
}
fs.mkdirSync(path.join(root,"demo/muni"),{recursive:true});
let bytes=0;
for(const [pf,obj] of byPref){const s=JSON.stringify(obj);bytes+=s.length;fs.writeFileSync(path.join(root,`demo/muni/${pf}.json`),s);}
console.log(`rows ${rows}, 市区町村に当たらなかった ${miss}, 3桁 ${kept.size}件, 市区町村 ${used.size}件, 境界 ${byPref.size}ファイル ${(bytes/1e6).toFixed(1)}MB`);
