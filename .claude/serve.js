const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
http.createServer((req,res)=>{
  let f=decodeURIComponent(req.url.split('?')[0]);
  if(f==='/')f='/roadmap.html';
  const fp=path.join(root,f);
  fs.readFile(fp,(e,d)=>{
    if(e){res.writeHead(404);return res.end('not found');}
    const ext=path.extname(fp).slice(1);
    const mt={html:'text/html',js:'text/javascript',css:'text/css',json:'application/json'}[ext]||'text/plain';
    res.writeHead(200,{'Content-Type':mt});res.end(d);
  });
}).listen(8777,()=>console.log('serving on 8777'));
