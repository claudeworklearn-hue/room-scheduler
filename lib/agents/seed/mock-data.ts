/**
 * Mock data used by tests and the /admin/agents demo panel.
 *
 * The shapes match the Phase-1 type contracts in ../types.ts. These are
 * NOT mirrored from the live Supabase schema — adapters in the agent
 * layer should pull from the real DB and convert into these types.
 */

import type {
  Deal,
  Room,
  ScheduleEvent,
  Tutor,
} from "../types";

export const mockRooms: Room[] = [
  { id: "R01", name: "ห้อง A", capacity: 24, equipment: ["whiteboard", "projector"], status: "active", unavailableSlots: [], notes: null, code: "A", building: "ตึกหลัก", roomType: "classroom", sortOrder: 1 },
  { id: "R02", name: "ห้อง D", capacity: 15, equipment: ["whiteboard"], status: "active", unavailableSlots: [], notes: null, code: "D", building: "ตึกหลัก", roomType: "classroom", sortOrder: 2 },
  { id: "R03", name: "ห้อง G", capacity: 18, equipment: ["whiteboard", "projector"], status: "active", unavailableSlots: [], notes: null, code: "G", building: "ตึกหลัก", roomType: "classroom", sortOrder: 3 },
  { id: "R04", name: "ห้อง E", capacity: 15, equipment: ["whiteboard"], status: "active", unavailableSlots: [], notes: null, code: "E", building: "ตึกหลัก", roomType: "classroom", sortOrder: 4 },
  { id: "R05", name: "ห้อง OL", capacity: 6, equipment: ["whiteboard"], status: "active", unavailableSlots: [], notes: null, code: "OL", building: "ตึกหลัก", roomType: "meeting", sortOrder: 5 },
  { id: "R06", name: "ห้อง N", capacity: 6, equipment: [], status: "active", unavailableSlots: [], notes: null, code: "N", building: "ตึกหลัก", roomType: "meeting", sortOrder: 6 },
  { id: "R07", name: "ห้องหน้า", capacity: 55, equipment: ["whiteboard", "projector", "sound"], status: "active", unavailableSlots: [], notes: null, code: "หน้า", building: "ตึก med", roomType: "classroom", sortOrder: 7 },
  { id: "R08", name: "ห้องหลัง", capacity: 20, equipment: ["whiteboard"], status: "active", unavailableSlots: [], notes: null, code: "หลัง", building: "ตึก med", roomType: "classroom", sortOrder: 8 },
  { id: "R09", name: "ห้องบนใหญ่", capacity: 25, equipment: ["whiteboard"], status: "active", unavailableSlots: [], notes: null, code: "บนใหญ่", building: "ตึก med", roomType: "classroom", sortOrder: 9 },
  // R10 is in maintenance — exercises the room_unavailable rule.
  { id: "R10", name: "ห้องบนเล็ก", capacity: 12, equipment: [], status: "maintenance", unavailableSlots: [], notes: "ปิดซ่อม", code: "บนเล็ก", building: "ตึก med", roomType: "classroom", sortOrder: 10 },
];

export const mockTutors: Tutor[] = [
  { id: "T01", name: "ครูเกรท", shortCode: "GRT", skills: ["chem"], availableSlots: [], unavailableSlots: [], maxHoursPerDay: 8, maxHoursPerWeek: 30, status: "active", color: "#22C55E", role: "tutor" },
  { id: "T02", name: "ครูขลุย", shortCode: "KLY", skills: ["physics", "math"], availableSlots: [], unavailableSlots: [], maxHoursPerDay: 8, maxHoursPerWeek: 30, status: "active", color: "#EAB308", role: "tutor" },
  { id: "T03", name: "ครูปอเซ่", shortCode: "PCH", skills: ["math"], availableSlots: [], unavailableSlots: [], maxHoursPerDay: 6, maxHoursPerWeek: 24, status: "active", color: "#3B82F6", role: "tutor" },
  { id: "T04", name: "ครูปอง", shortCode: "PNG", skills: ["chem"], availableSlots: [], unavailableSlots: [], maxHoursPerDay: 8, maxHoursPerWeek: 30, status: "active", color: "#A855F7", role: "tutor" },
  { id: "T05", name: "ครูนก", shortCode: "NOK", skills: ["bio"], availableSlots: [], unavailableSlots: [], maxHoursPerDay: 8, maxHoursPerWeek: 30, status: "active", color: "#22C55E", role: "tutor" },
  { id: "T06", name: "ครูออม", shortCode: "OOM", skills: ["english"], availableSlots: [], unavailableSlots: [], maxHoursPerDay: 8, maxHoursPerWeek: 28, status: "active", color: "#F9A8D4", role: "tutor" },
  { id: "T07", name: "ครูจ๊อด", shortCode: "AOD", skills: ["physics"], availableSlots: [], unavailableSlots: [], maxHoursPerDay: 8, maxHoursPerWeek: 30, status: "active", color: "#EF4444", role: "tutor" },
  // T08 inactive — exercises the listTutors filter.
  { id: "T08", name: "ครูลา", shortCode: "LAA", skills: ["science"], availableSlots: [], unavailableSlots: [], maxHoursPerDay: 8, maxHoursPerWeek: 30, status: "inactive", color: null, role: "tutor" },
];

export const mockEvents: ScheduleEvent[] = [
  { id: "E001", dealId: null, courseId: null, roomId: "R03", tutorId: "T03", title: "คณิต ม.1", date: null, dayOfWeek: 3, startTime: "17:30:00", endTime: "19:30:00", durationMinutes: 120, studentCount: 14, status: "confirmed", source: "manual", createdBy: null, updatedBy: null, deliveryMode: "onsite" },
  { id: "E002", dealId: null, courseId: null, roomId: "R02", tutorId: "T07", title: "ฟิสิกส์ ม.6 A-level", date: null, dayOfWeek: 4, startTime: "17:30:00", endTime: "19:30:00", durationMinutes: 120, studentCount: 20, status: "confirmed", source: "manual", createdBy: null, updatedBy: null, deliveryMode: "onsite" },
  { id: "E003", dealId: null, courseId: null, roomId: "R07", tutorId: "T05", title: "ชีวะ ม.6 TCAS", date: null, dayOfWeek: 7, startTime: "13:00:00", endTime: "15:30:00", durationMinutes: 150, studentCount: 13, status: "confirmed", source: "manual", createdBy: null, updatedBy: null, deliveryMode: "onsite" },
];

export const mockDeals: Deal[] = [
  {
    id: "D001",
    customerName: "น้องข้าว",
    courseId: null,
    studentCount: 1,
    preferredDays: [3], // พุธ
    preferredTimeRanges: [{ start: "17:00", end: "19:00" }],
    startDate: null,
    endDate: null,
    durationMinutes: 90,
    requiredTutorSkills: ["math"],
    roomRequirement: { minCapacity: 6 },
    priority: "normal",
    status: "pending_schedule",
    notes: "private one-on-one",
  },
];
