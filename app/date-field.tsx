'use client';
import {useState} from 'react';
import {CalendarDays,ChevronDown} from 'lucide-react';
import {ja} from 'date-fns/locale';
import {Calendar} from '@/components/ui/calendar';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
export default function DateField({value,onChange,label,min}:{value:string;onChange:(v:string)=>void;label:string;min?:string}){
 const [open,setOpen]=useState(false);
 const date=value?new Date(value+'T12:00:00'):undefined;
 return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button type="button" className="date-trigger" aria-label={label}><CalendarDays size={17}/><span>{date?date.toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'short'}):'日付を選択'}</span><ChevronDown size={15}/></button></PopoverTrigger><PopoverContent className="date-popover" align="start"><Calendar locale={ja} mode="single" selected={date} defaultMonth={date} disabled={min?{before:new Date(min+'T00:00:00')}:undefined} onSelect={d=>{if(d){onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);setOpen(false)}}}/></PopoverContent></Popover>;
}
