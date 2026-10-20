import {headers} from 'next/headers';
import {handleMcp} from '@/lib/job-hunt-mcp';
import {readAccess,readSavedRecords} from '@/lib/ai-access-store';
import {loadHolidayCalendar} from '@/lib/holiday-server';
export async function POST(req:Request){
 const owner=(await headers()).get('oai-authenticated-user-id');
 return handleMcp(req,owner,{readAccess:()=>readAccess(owner!),readRecords:()=>readSavedRecords(owner!),loadHolidays:loadHolidayCalendar});
}
export async function GET(){return new Response(null,{status:405,headers:{Allow:'POST','Cache-Control':'no-store'}})}
