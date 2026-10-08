import {loadHolidayCalendar} from '@/lib/holiday-server';
export async function GET(){return Response.json(await loadHolidayCalendar(),{headers:{'Cache-Control':'private, max-age=3600'}})}
