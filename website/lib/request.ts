export async function readJson(request:Request,limit=4096):Promise<unknown>{
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))throw new Error('Use application/json.');
 const reader=request.body?.getReader();if(!reader)throw new Error('Missing request body.');
 const decoder=new TextDecoder();let size=0,text='';
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new Error('Request is too large.');}text+=decoder.decode(value,{stream:true});}
 text+=decoder.decode();try{return JSON.parse(text);}catch{throw new Error('Invalid JSON.');}
}
