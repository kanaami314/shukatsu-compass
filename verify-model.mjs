import assert from 'node:assert/strict';
import {freeSlots,schemas} from './lib/model.ts';
const event=(start,end)=>({id:'t',kind:'event',data:{start,end}});
assert.equal(freeSlots([], '2026-09-15',60).length,1);
const result=freeSlots([event('2026-09-15T10:00:00+09:00','2026-09-15T11:00:00+09:00'),event('2026-09-15T10:30:00+09:00','2026-09-15T12:00:00+09:00')], '2026-09-15',60);
assert.equal(result.length,1);assert.equal(new Date(result[0][0]).toISOString(),'2026-09-15T03:30:00.000Z');
assert.equal(freeSlots([event('2026-09-14T22:00:00+09:00','2026-09-16T10:00:00+09:00')],'2026-09-15',30).length,0);
assert.equal(schemas.event.safeParse({companyId:'',title:'test',start:'2026-09-15T10:00:00Z',end:'2026-09-15T09:00:00Z',place:'',memo:''}).success,false);
console.log('Availability: empty day, overlapping events, overnight events and invalid interval passed.');
