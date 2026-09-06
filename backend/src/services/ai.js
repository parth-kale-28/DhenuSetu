import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

function systemInstruction(){return `You are the DhenuSetu dairy-health assistant. Help farmers and veterinarians understand the application, animal records and mastitis-risk indicators. Do not diagnose disease or prescribe medication. Distinguish a risk indicator from a veterinary diagnosis. Prefer clear, practical advice. If a user asks you to navigate the app, return a concise navigation instruction, but the browser should handle navigation commands before calling you.`}

export async function askAI({prompt,context={},history=[]}){
  const provider=(process.env.AI_PROVIDER||'gemini').toLowerCase();
  const payload=`Role: ${context.role||'user'}\nAnimal context: ${JSON.stringify(context.animals||[]).slice(0,12000)}\nConversation: ${JSON.stringify(history||[]).slice(0,6000)}\nUser: ${String(prompt).slice(0,5000)}`;
  if(provider==='openai'){
    if(!process.env.OPENAI_API_KEY) throw new Error('OpenAI API key is not configured.');
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const r=await client.responses.create({model:process.env.OPENAI_MODEL||'gpt-5',instructions:systemInstruction(),input:payload});
    return r.output_text||'No response was returned.';
  }
  if(!process.env.GEMINI_API_KEY) throw new Error('Gemini API key is not configured.');
  const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
  const r=await ai.models.generateContent({model:process.env.GEMINI_MODEL||'gemini-3.7-flash',contents:payload,config:{systemInstruction:systemInstruction(),temperature:0.2}});
  return r.text||'No response was returned.';
}
