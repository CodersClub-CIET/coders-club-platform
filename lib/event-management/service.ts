import { createClient } from "@/lib/supabase/client";
import type {
  CreateEventInput,
  CreateSubEventInput,
  Event,
  EventFilter,
  EventStatus,
  SubEvent,
  UpdateEventInput,
  UpdateSubEventInput,
} from "./types";

type EventNodeRow = {
  id: string;
  parent_id: string | null;
  name: string;
  status: EventStatus;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  event_type: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

const NODE_COLUMNS =
  "id,parent_id,name,status,starts_at,ends_at,location,description,event_type,created_by,created_at,updated_at,is_active";

function datePart(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function timePart(value: string | null): string {
  return value ? value.slice(11, 16) : "";
}

function toTimestamp(date: string, time: string): string {
  return new Date(`${date}T${time || "00:00"}:00`).toISOString();
}

function toDbStatus(status?: EventStatus): string {
  if (status === "active") return "ongoing";
  if (status === "completed") return "completed";
  return "published";
}

function toUiStatus(dbStatus: string): EventStatus {
  if (dbStatus === "ongoing") return "active";
  if (dbStatus === "completed") return "completed";
  return "upcoming";
}

function mapNode(row: EventNodeRow): Event {
  return {
    id: row.id,
    name: row.name,
    date: datePart(row.starts_at),
    time: timePart(row.starts_at),
    venue: row.location ?? "",
    description: row.description ?? "",
    status: toUiStatus(row.status),
    subEvents: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubNode(row: EventNodeRow): SubEvent {
  return {
    id: row.id,
    eventId: row.parent_id ?? "",
    name: row.name,
    date: datePart(row.starts_at),
    time: timePart(row.starts_at),
    venue: row.location ?? "",
    description: row.description ?? "",
  };
}

function buildHierarchy(rows: EventNodeRow[]): Event[] {
  const nodes = new Map(rows.map((row) => [row.id, row]));
  const events = new Map<string, Event>();
  rows.forEach((row) => {
    if (!row.parent_id || !nodes.has(row.parent_id)) events.set(row.id, mapNode(row));
  });

  rows.forEach((row) => {
    if (!row.parent_id || !nodes.has(row.parent_id)) return;
    const parent = events.get(row.parent_id);
    if (parent) parent.subEvents = [...(parent.subEvents ?? []), mapSubNode(row)];
  });

  return [...events.values()];
}

async function requireAdmin() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Authentication required.");
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role,is_active")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error(`Unable to verify authorization: ${error.message}`);
  if (profile?.role !== "admin" || profile.is_active !== true) {
    throw new Error("Only active administrators can manage events.");
  }
  return { supabase, userId: auth.user.id };
}

async function assignedNodeIds() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const associate = await supabase
    .from("associates")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (associate.error) throw new Error(`Unable to load Associate access: ${associate.error.message}`);
  if (!associate.data) return [];
  const allocations = await supabase
    .from("associate_allocations")
    .select("event_node_id")
    .eq("associate_id", associate.data.id)
    .eq("is_active", true);
  if (allocations.error) throw new Error(`Unable to load event allocations: ${allocations.error.message}`);
  return [...new Set((allocations.data ?? []).map((row) => row.event_node_id))];
}

class EventManagementService {
  async getEvents(filter?: EventFilter): Promise<Event[]> {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    let query = supabase
      .from("event_nodes")
      .select(NODE_COLUMNS)
      .eq("is_active", true)
      .order("starts_at", { ascending: true });

    if (auth.user) {
      const profile = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (profile.error) throw new Error(`Unable to verify access: ${profile.error.message}`);
      if (profile.data?.role === "associate") {
        const ids = await assignedNodeIds();
        if (ids.length === 0) return [];
        query = query.in("id", ids);
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(`Unable to load events: ${error.message}`);
    let events = buildHierarchy((data ?? []) as EventNodeRow[]);
    if (filter?.status) events = events.filter((event) => event.status === filter.status);
    if (filter?.search?.trim()) {
      const term = filter.search.trim().toLowerCase();
      events = events.filter((event) =>
        [event.name, event.venue, event.description].some((value) =>
          value.toLowerCase().includes(term),
        ),
      );
    }
    return events;
  }

  async getEventById(id: string): Promise<Event | null> {
    const events = await this.getEvents();
    return events.find((event) => event.id === id) ?? null;
  }

  async createEvent(input: CreateEventInput): Promise<Event> {
    return this.createNode(input, null);
  }

  async updateEvent(id: string, input: UpdateEventInput): Promise<Event> {
    const { supabase } = await requireAdmin();
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.status !== undefined) updates.status = toDbStatus(input.status);
    if (input.date !== undefined || input.time !== undefined) {
      const current = await this.getEventById(id);
      if (!current) throw new Error("Event not found.");
      updates.starts_at = toTimestamp(input.date ?? current.date, input.time ?? current.time);
    }
    if (input.venue !== undefined) updates.location = input.venue;
    if (input.description !== undefined) updates.description = input.description;
    const result = await supabase.from("event_nodes").update(updates).eq("id", id).select(NODE_COLUMNS).single();
    if (result.error) throw new Error(`Unable to update event: ${result.error.message}`);
    const updated = mapNode(result.data as EventNodeRow);
    updated.subEvents = (await this.getEventById(id))?.subEvents ?? [];
    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("event_nodes").update({ is_active: false }).eq("id", id);
    if (error) throw new Error(`Unable to deactivate event: ${error.message}`);
  }

  async createSubEvent(input: CreateSubEventInput): Promise<SubEvent> {
    return this.createNode(input, input.eventId).then((event) => ({
      id: event.id,
      eventId: input.eventId,
      name: event.name,
      date: event.date,
      time: event.time,
      venue: event.venue,
      description: event.description,
    }));
  }

  async updateSubEvent(eventId: string, subEventId: string, input: UpdateSubEventInput): Promise<SubEvent> {
    const { supabase } = await requireAdmin();
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.venue !== undefined) updates.location = input.venue;
    if (input.description !== undefined) updates.description = input.description;
    if (input.date !== undefined || input.time !== undefined) {
      const parent = await this.getEventById(eventId);
      const child = parent?.subEvents?.find((item) => item.id === subEventId);
      if (!child) throw new Error("Sub-event not found.");
      updates.starts_at = toTimestamp(input.date ?? child.date, input.time ?? child.time);
    }
    const result = await supabase.from("event_nodes").update(updates).eq("id", subEventId).eq("parent_id", eventId)
      .select(NODE_COLUMNS).single();
    if (result.error) throw new Error(`Unable to update sub-event: ${result.error.message}`);
    return mapSubNode(result.data as EventNodeRow);
  }

  async deleteSubEvent(eventId: string, subEventId: string): Promise<void> {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("event_nodes").update({ is_active: false }).eq("id", subEventId).eq("parent_id", eventId);
    if (error) throw new Error(`Unable to deactivate sub-event: ${error.message}`);
  }

  private async createNode(input: CreateEventInput | CreateSubEventInput, parentId: string | null): Promise<Event> {
    const { supabase, userId } = await requireAdmin();
    const { data: yearRow } = await supabase
      .from("academic_years")
      .select("id")
      .eq("is_current", true)
      .maybeSingle();

    let academicYearId = yearRow?.id;
    if (!academicYearId) {
      const { data: anyYear } = await supabase
        .from("academic_years")
        .select("id")
        .limit(1)
        .maybeSingle();
      academicYearId = anyYear?.id;
    }

    const result = await supabase.from("event_nodes").insert({
      parent_id: parentId,
      name: input.name,
      academic_year_id: academicYearId,
      status: "published",
      starts_at: toTimestamp(input.date, input.time),
      location: input.venue,
      description: input.description,
      created_by: userId,
      is_active: true,
    }).select(NODE_COLUMNS).single();
    if (result.error) throw new Error(`Unable to create event: ${result.error.message}`);
    return mapNode(result.data as EventNodeRow);
  }
}

export const eventManagementService = new EventManagementService();
