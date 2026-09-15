import {Fragment} from 'react';

// Render only the small, safe formatting vocabulary used by the note editor.
// All other text (including HTML and links) remains escaped React text.
export default function NoteText({text}:{text:string}){
 const inline=(value:string)=>value.split(/(\*\*[^*\n]+\*\*)/g).map((part,i)=>part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:<Fragment key={i}>{part}</Fragment>);
 const blocks=text.replace(/\r\n/g,'\n').split(/\n\s*\n/);
 return <div className="note-prose">{blocks.map((block,index)=>{
   const lines=block.split('\n');
   return <div className="note-block" key={index}>{lines.map((line,i)=>{
     const heading=line.match(/^#{1,4}\s+(.+)$/),bullet=line.match(/^\s*(?:[-*・]|\d+[.)])\s+(.+)$/);
     if(heading)return <h4 key={i}>{inline(heading[1])}</h4>;
     if(bullet)return <div className="note-bullet" key={i}><span aria-hidden="true">•</span><p>{inline(bullet[1])}</p></div>;
     return <p key={i}>{inline(line)}</p>;
   })}</div>;
 })}</div>
}
