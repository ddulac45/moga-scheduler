// src/lib/defaults.js
// All hardcoded default data extracted from the original monolith.
// Import these wherever defaults are needed instead of redeclaring.

export const DEFAULT_PHYSICIANS = [
  { id:1, name:'Donofrio', color:'#1B4F8A', type:'physician', inCallPool:false, inClinic:true,
    customHours:{Mon:{enabled:false,open:'07:00',close:'16:00'},Tue:{enabled:true,open:'07:00',close:'16:00'},Wed:{enabled:true,open:'07:00',close:'16:00'},Thu:{enabled:true,open:'07:00',close:'16:00'},Fri:{enabled:false,open:'07:00',close:'16:00'}} },
  { id:2, name:'Meinz',    color:'#276749', type:'physician', inCallPool:true, inClinic:true, customHours:null },
  { id:3, name:'Stapp',    color:'#248F7A', type:'physician', inCallPool:true, inClinic:true, customHours:null },
  { id:4, name:'Dulac',    color:'#6B3A8C', type:'physician', inCallPool:true, inClinic:true, customHours:null },
  { id:5, name:'Nathan',   color:'#B7410E', type:'physician', inCallPool:true, inClinic:true, customHours:null },
  { id:6, name:'Backman',  color:'#1A5276', type:'physician', inCallPool:true, inClinic:true, customHours:null },
];

export const DEFAULT_CROSS = [{
  id:101, name:'Dartmouth', color:'#065F46', type:'cross-coverage', active:true,
  coverDays:[5,6,0], shiftStart:'19:00', shiftEnd:'07:00', shiftHours:12,
  hasSplit:true, splitStart:'07:00', splitEnd:'19:00', splitHours:12, splitPostCall:true,
  notes:'PM split call Fri-Sun every week',
}];

export const DEFAULT_CLINIC_HOURS = {
  Mon:{ open:'07:00', close:'17:00', close2:'' },
  Tue:{ open:'07:00', close:'17:00', close2:'' },
  Wed:{ open:'07:00', close:'17:00', close2:'' },
  Thu:{ open:'07:00', close:'17:00', close2:'' },
  Fri:{ open:'07:00', close:'15:00', close2:'' },
};

export const DEFAULT_PERM_NO_CALL = [
  { id:1,  docId:3, month:2,  day:12, reason:"Sawyer's birthday" },
  { id:2,  docId:4, month:2,  day:17, reason:'Birthday' },
  { id:3,  docId:2, month:3,  day:3,  reason:'Anniversary' },
  { id:4,  docId:6, month:3,  day:28, reason:'Birthday' },
  { id:5,  docId:3, month:4,  day:2,  reason:'Birthday' },
  { id:6,  docId:6, month:4,  day:28, reason:'Anniversary' },
  { id:7,  docId:5, month:5,  day:2,  reason:"Judah's birthday" },
  { id:8,  docId:6, month:5,  day:3,  reason:"Julien's birthday" },
  { id:9,  docId:5, month:5,  day:15, reason:"Christy's birthday" },
  { id:10, docId:6, month:7,  day:21, reason:"Lucas's birthday" },
  { id:11, docId:2, month:7,  day:24, reason:'Birthday' },
  { id:12, docId:2, month:8,  day:9,  reason:"Scott's birthday" },
  { id:13, docId:4, month:8,  day:15, reason:"Dustin's birthday" },
  { id:14, docId:2, month:8,  day:14, reason:"Jack's birthday" },
  { id:15, docId:3, month:8,  day:18, reason:"Shawn's birthday" },
  { id:16, docId:1, month:8,  day:21, reason:"Erica's birthday" },
  { id:17, docId:6, month:8,  day:21, reason:"Dan's birthday" },
  { id:18, docId:5, month:8,  day:24, reason:"Zoe's birthday" },
  { id:19, docId:4, month:9,  day:1,  reason:'Anniversary' },
  { id:20, docId:3, month:9,  day:5,  reason:'Anniversary' },
  { id:21, docId:4, month:10, day:5,  reason:"Hannah's birthday" },
  { id:22, docId:2, month:10, day:6,  reason:"Maddy's Birthday" },
  { id:23, docId:1, month:10, day:8,  reason:"Elena's birthday" },
  { id:24, docId:4, month:10, day:11, reason:"Molly's birthday" },
  { id:25, docId:5, month:10, day:23, reason:'Birthday' },
  { id:26, docId:2, month:11, day:23, reason:"Sydney's birthday" },
  { id:27, docId:3, month:12, day:13, reason:"Jude's birthday" },
];

export const US_HOLIDAYS_2025_2026 = [
  { date:'2025-01-01', name:"New Year's Day" },
  { date:'2025-01-20', name:'MLK Day' },
  { date:'2025-02-17', name:"Presidents' Day" },
  { date:'2025-05-26', name:'Memorial Day' },
  { date:'2025-07-04', name:'Independence Day' },
  { date:'2025-09-01', name:'Labor Day' },
  { date:'2025-10-13', name:'Columbus Day' },
  { date:'2025-11-11', name:'Veterans Day' },
  { date:'2025-11-27', name:'Thanksgiving' },
  { date:'2025-12-25', name:'Christmas' },
  { date:'2026-01-01', name:"New Year's Day" },
  { date:'2026-01-19', name:'MLK Day' },
  { date:'2026-02-16', name:"Presidents' Day" },
  { date:'2026-05-25', name:'Memorial Day' },
  { date:'2026-07-04', name:'Independence Day' },
  { date:'2026-09-07', name:'Labor Day' },
  { date:'2026-11-26', name:'Thanksgiving' },
  { date:'2026-12-25', name:'Christmas' },
];
