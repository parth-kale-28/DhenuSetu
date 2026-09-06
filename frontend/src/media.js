import { signMedia } from './api.js';
import { friendlyError } from './utils.js';

export async function uploadToCloudinary(file, folder='dhenusetu') {
  if(!file) throw new Error('Please choose an image first.');
  const allowed=['image/png','image/jpeg','image/webp','image/jpg','application/pdf'];
  if(!allowed.includes(file.type)) throw new Error('Please upload a JPG, PNG, WEBP image or PDF file.');
  if(file.size>8*1024*1024) throw new Error('File is too large. Please keep uploads below 8 MB.');
  try{
    const { cloudName, apiKey, timestamp, signature, folder:signedFolder, publicId } = await signMedia({folder,resourceType:file.type==='application/pdf'?'raw':'image'});
    const resourceType=file.type==='application/pdf'?'raw':'image';
    const body=new FormData();body.append('file',file);body.append('api_key',apiKey);body.append('timestamp',String(timestamp));body.append('signature',signature);body.append('folder',signedFolder);body.append('public_id',publicId);
    const response=await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,{method:'POST',body});
    const data=await response.json();if(!response.ok)throw new Error(data?.error?.message||'Cloudinary upload failed.');
    return {url:data.secure_url,publicId:data.public_id,width:data.width,height:data.height,format:data.format,folder:signedFolder};
  }catch(e){throw new Error(friendlyError(e));}
}
export function dataUrlToFile(dataUrl,name='capture.jpg'){const [meta,raw]=dataUrl.split(',');const mime=(meta.match(/data:(.*?);base64/)||[])[1]||'image/jpeg';const bytes=atob(raw);const arr=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);return new File([arr],name,{type:mime})}
