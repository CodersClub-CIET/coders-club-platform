/**
 * Event Management Module - Data Contracts & Types
 *
 * Master event and optional sub-event contracts used by
 * Event Management and downstream modules.
 */

export type EventStatus = "upcoming" | "active" | "completed";

export interface SubEvent {
  id: string;
  eventId: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  description: string;
  children?: SubEvent[];
}

export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  description: string;
  status: EventStatus;
  subEvents?: SubEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventInput {
  name: string;
  date: string;
  time: string;
  venue: string;
  description: string;
}

export interface UpdateEventInput {
  name?: string;
  date?: string;
  time?: string;
  venue?: string;
  description?: string;
  status?: EventStatus;
}

export interface CreateSubEventInput {
  eventId: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  description: string;
}

export interface UpdateSubEventInput {
  name?: string;
  date?: string;
  time?: string;
  venue?: string;
  description?: string;
}

export interface EventFilter {
  status?: EventStatus;
  search?: string;
}