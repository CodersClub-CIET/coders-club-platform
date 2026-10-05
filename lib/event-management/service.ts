import type {
  CreateEventInput,
  CreateSubEventInput,
  Event,
  EventFilter,
  SubEvent,
  UpdateEventInput,
  UpdateSubEventInput,
} from "./types";

const STORAGE_KEY = "coders_club_events";

const SEED_EVENTS: Event[] = [
  {
    id: "evt-01",
    name: "Full Stack Web Development Hackathon",
    date: "2026-10-15",
    time: "09:00",
    venue: "Innovation Lab",
    description: "Full stack development hackathon for Coders Club members.",
    status: "upcoming",
    subEvents: [
      {
        id: "sub-01",
        eventId: "evt-01",
        name: "Round 1: Rapid Prototyping",
        date: "2026-10-15",
        time: "09:30",
        venue: "Innovation Lab",
        description: "Rapid prototyping round.",
      },
      {
        id: "sub-02",
        eventId: "evt-01",
        name: "Round 2: API Integration & Defense",
        date: "2026-10-15",
        time: "14:00",
        venue: "Innovation Lab",
        description: "API integration and project defense.",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "evt-02",
    name: "Algorithmic Problem Solving Workshop",
    date: "2026-11-05",
    time: "10:00",
    venue: "Seminar Hall",
    description: "Problem solving and competitive programming workshop.",
    status: "upcoming",
    subEvents: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

class EventManagementService {
  private inMemoryEvents: Event[] = [...SEED_EVENTS];

  private getStoredEvents(): Event[] {
    if (typeof window === "undefined") {
      return [...this.inMemoryEvents];
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_EVENTS));
        return [...SEED_EVENTS];
      }

      return JSON.parse(raw) as Event[];
    } catch {
      return [...this.inMemoryEvents];
    }
  }

  private saveEvents(events: Event[]): void {
    this.inMemoryEvents = events;

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
      } catch {
        // Keep in-memory fallback.
      }
    }
  }

  async getEvents(filter?: EventFilter): Promise<Event[]> {
    let events = this.getStoredEvents();

    if (!filter) {
      return events;
    }

    if (filter.status) {
      events = events.filter((event) => event.status === filter.status);
    }

    if (filter.search?.trim()) {
      const query = filter.search.toLowerCase().trim();

      events = events.filter(
        (event) =>
          event.name.toLowerCase().includes(query) ||
          event.venue.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query)
      );
    }

    return events;
  }

  async getEventById(id: string): Promise<Event | null> {
    return this.getStoredEvents().find((event) => event.id === id) ?? null;
  }

  async createEvent(input: CreateEventInput): Promise<Event> {
    const events = this.getStoredEvents();
    const now = new Date().toISOString();

    const event: Event = {
      id: `evt-${Date.now().toString(36)}`,
      ...input,
      status: "upcoming",
      subEvents: [],
      createdAt: now,
      updatedAt: now,
    };

    this.saveEvents([event, ...events]);

    return event;
  }

  async updateEvent(
    id: string,
    input: UpdateEventInput
  ): Promise<Event> {
    const events = this.getStoredEvents();
    const index = events.findIndex((event) => event.id === id);

    if (index === -1) {
      throw new Error("Event not found.");
    }

    const updatedEvent: Event = {
      ...events[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };

    events[index] = updatedEvent;
    this.saveEvents(events);

    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    const events = this.getStoredEvents();

    const exists = events.some((event) => event.id === id);

    if (!exists) {
      throw new Error("Event not found.");
    }

    this.saveEvents(events.filter((event) => event.id !== id));
  }

  async createSubEvent(input: CreateSubEventInput): Promise<SubEvent> {
    const events = this.getStoredEvents();
    const eventIndex = events.findIndex(
      (event) => event.id === input.eventId
    );

    if (eventIndex === -1) {
      throw new Error("Parent event not found.");
    }

    const subEvent: SubEvent = {
      id: `sub-${Date.now().toString(36)}`,
      ...input,
    };

    const event = events[eventIndex];

    events[eventIndex] = {
      ...event,
      subEvents: [...(event.subEvents ?? []), subEvent],
      updatedAt: new Date().toISOString(),
    };

    this.saveEvents(events);

    return subEvent;
  }

  async updateSubEvent(
    eventId: string,
    subEventId: string,
    input: UpdateSubEventInput
  ): Promise<SubEvent> {
    const events = this.getStoredEvents();
    const eventIndex = events.findIndex((event) => event.id === eventId);

    if (eventIndex === -1) {
      throw new Error("Parent event not found.");
    }

    const event = events[eventIndex];
    const subEvents = [...(event.subEvents ?? [])];
    const subEventIndex = subEvents.findIndex(
      (subEvent) => subEvent.id === subEventId
    );

    if (subEventIndex === -1) {
      throw new Error("Sub-event not found.");
    }

    const updatedSubEvent = {
      ...subEvents[subEventIndex],
      ...input,
    };

    subEvents[subEventIndex] = updatedSubEvent;

    events[eventIndex] = {
      ...event,
      subEvents,
      updatedAt: new Date().toISOString(),
    };

    this.saveEvents(events);

    return updatedSubEvent;
  }

  async deleteSubEvent(
    eventId: string,
    subEventId: string
  ): Promise<void> {
    const events = this.getStoredEvents();
    const eventIndex = events.findIndex((event) => event.id === eventId);

    if (eventIndex === -1) {
      throw new Error("Parent event not found.");
    }

    const event = events[eventIndex];
    const subEvents = event.subEvents ?? [];

    if (!subEvents.some((subEvent) => subEvent.id === subEventId)) {
      throw new Error("Sub-event not found.");
    }

    events[eventIndex] = {
      ...event,
      subEvents: subEvents.filter(
        (subEvent) => subEvent.id !== subEventId
      ),
      updatedAt: new Date().toISOString(),
    };

    this.saveEvents(events);
  }
}

export const eventManagementService = new EventManagementService();