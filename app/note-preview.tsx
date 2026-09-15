'use client';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Pencil,NotebookPen} from 'lucide-react';
import type {RecordItem} from '@/lib/model';
import NoteText from './note-text';

export default function NotePreview({note,company,onClose,onEdit}:{note:RecordItem|null;company:string;onClose:()=>void;onEdit:(note:RecordItem)=>void}){
 return <Dialog open={!!note} onOpenChange={v=>{if(!v)onClose()}}><DialogContent className="editor note-reader">
   <DialogTitle>{note?.data.title||'説明会ノート'}</DialogTitle>
   <DialogDescription>{company} · {note?.data.date}</DialogDescription>
   {note&&<><div className="note-reader-tools"><span className="rating" aria-label={'企業への印象 '+note.data.rating+' / 5'}>{'★'.repeat(Number(note.data.rating))}{'☆'.repeat(5-Number(note.data.rating))}</span><button type="button" className="secondary" onClick={()=>onEdit(note)}><Pencil size={16}/>編集する</button></div>
   <section className="note-reader-section"><h3><NotebookPen size={18}/>聞いた内容</h3>{note.data.content?<NoteText text={note.data.content}/>:<p>まだ記録されていません。</p>}</section>
   <section className="note-reader-section impressions"><h3>感じたこと・気になる点</h3>{note.data.feeling?<NoteText text={note.data.feeling}/>:<p>まだ記録されていません。</p>}</section>
   <div className="form-actions"><button type="button" className="secondary" onClick={onClose}>閉じる</button></div></>}
 </DialogContent></Dialog>
}
