import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.txt':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 let stat;try{stat=fs.statSync(file)}catch{res.writeHead(404).end('Not found');return}
 if(!stat.isFile()){res.writeHead(404).end();return}
 const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Accept-Ranges':'bytes'};
 const range=req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
 let start=0,end=stat.size-1;
 if(range){start=range[1]?Number(range[1]):Math.max(0,stat.size-Number(range[2]));end=range[1]&&range[2]?Math.min(Number(range[2]),end):end;if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':'bytes */'+stat.size}).end();return}headers['Content-Range']='bytes '+start+'-'+end+'/'+stat.size}
 headers['Content-Length']=end-start+1;res.writeHead(range?206:200,headers);
 if(req.method==='HEAD'){res.end();return}
 fs.createReadStream(file,{start,end}).pipe(res);
});
server.listen(4763,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:4763'));

