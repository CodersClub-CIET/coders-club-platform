"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Edit,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import type {
  CreateEventInput,
  CreateSubEventInput,
  Event,
  EventStatus,
  UpdateEventInput,
  UpdateSubEventInput,
} from "@/lib/event-management/types";

import { eventManagementService } from "@/lib/event-management/service";
import { useAuth } from "@/lib/auth/use-auth";

import {
  validateCreateEventInput,
  validateCreateSubEventInput,
  validateUpdateEventInput,
  validateUpdateSubEventInput,
} from "@/lib/event-management/validation";

type ModalMode =
  | "create-event"
  | "edit-event"
  | "create-sub-event"
  | "edit-sub-event"
  | null;

const emptyEventForm: CreateEventInput = {
  name: "",
  date: "",
  time: "",
  venue: "",
  description: "",
};

const emptySubEventForm: CreateSubEventInput = {
  eventId: "",
  name: "",
  date: "",
  time: "",
  venue: "",
  description: "",
};

const statusClasses: Record<EventStatus, string> = {
  upcoming: "bg-blue-100 text-blue-700 border-blue-200",
  active: "bg-green-100 text-green-700 border-green-200",
  completed: "bg-[#171A20] text-[#9B9EA6] border-[#292D33]",
};

export default function EventManagementTable() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>(
    "all"
  );

  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(
    new Set()
  );

  const [modalMode, setModalMode] = useState<ModalMode>(null);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingSubEventId, setEditingSubEventId] = useState<string | null>(
    null
  );

  const [eventForm, setEventForm] =
    useState<CreateEventInput>(emptyEventForm);

  const [subEventForm, setSubEventForm] =
    useState<CreateSubEventInput>(emptySubEventForm);

  const [error, setError] = useState("");

  const loadEvents = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await eventManagementService.getEvents();
      setEvents(result);
    } catch {
      setError("Unable to load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initializeEvents = async () => {
      try {
        const eventList = await eventManagementService.getEvents();

        if (!cancelled) {
          setEvents(eventList);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load events.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initializeEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !query ||
        event.name.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || event.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [events, search, statusFilter]);

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents((current) => {
      const next = new Set(current);

      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }

      return next;
    });
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingEventId(null);
    setEditingSubEventId(null);
    setEventForm(emptyEventForm);
    setSubEventForm(emptySubEventForm);
    setError("");
  };

  const openCreateEvent = () => {
    setEventForm(emptyEventForm);
    setEditingEventId(null);
    setError("");
    setModalMode("create-event");
  };

  const openEditEvent = (event: Event) => {
    setEditingEventId(event.id);

    setEventForm({
      name: event.name,
      date: event.date,
      time: event.time,
      venue: event.venue,
      description: event.description,
    });

    setError("");
    setModalMode("edit-event");
  };

  const openCreateSubEvent = (event: Event) => {
    setSubEventForm({
      eventId: event.id,
      name: "",
      date: event.date,
      time: event.time,
      venue: event.venue,
      description: "",
    });

    setEditingSubEventId(null);
    setError("");
    setModalMode("create-sub-event");
  };

  const openEditSubEvent = (event: Event, subEventId: string) => {
    const subEvent = event.subEvents?.find(
      (item) => item.id === subEventId
    );

    if (!subEvent) return;

    setSubEventForm({
      eventId: event.id,
      name: subEvent.name,
      date: subEvent.date,
      time: subEvent.time,
      venue: subEvent.venue,
      description: subEvent.description,
    });

    setEditingEventId(event.id);
    setEditingSubEventId(subEvent.id);
    setError("");
    setModalMode("edit-sub-event");
  };

  const handleDeleteEvent = async (event: Event) => {
    const confirmed = window.confirm(
      `Delete event "${event.name}"?\n\nThis will also remove its sub-events from the local Event Management data.`
    );

    if (!confirmed) return;

    setError("");

    try {
      await eventManagementService.deleteEvent(event.id);
      await loadEvents();
    } catch {
      setError("Unable to delete the event.");
    }
  };

  const handleDeleteSubEvent = async (
    event: Event,
    subEventId: string
  ) => {
    const subEvent = event.subEvents?.find(
      (item) => item.id === subEventId
    );

    if (!subEvent) return;

    const confirmed = window.confirm(
      `Delete sub-event "${subEvent.name}"?`
    );

    if (!confirmed) return;

    setError("");

    try {
      await eventManagementService.deleteSubEvent(
        event.id,
        subEventId
      );

      await loadEvents();
    } catch {
      setError("Unable to delete the sub-event.");
    }
  };

  const handleEventSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (modalMode === "create-event") {
      const validation = validateCreateEventInput(eventForm);

      if (!validation.valid) {
        setError(validation.message);
        return;
      }

      try {
        await eventManagementService.createEvent(eventForm);
        closeModal();
        await loadEvents();
      } catch {
        setError("Unable to create the event.");
      }

      return;
    }

    if (modalMode === "edit-event" && editingEventId) {
      const updateInput: UpdateEventInput = {
        name: eventForm.name,
        date: eventForm.date,
        time: eventForm.time,
        venue: eventForm.venue,
        description: eventForm.description,
      };

      const validation = validateUpdateEventInput(updateInput);

      if (!validation.valid) {
        setError(validation.message);
        return;
      }

      try {
        await eventManagementService.updateEvent(
          editingEventId,
          updateInput
        );

        closeModal();
        await loadEvents();
      } catch {
        setError("Unable to update the event.");
      }
    }
  };

  const handleSubEventSubmit = async (
    formEvent: React.FormEvent<HTMLFormElement>
  ) => {
    formEvent.preventDefault();
    setError("");

    if (modalMode === "create-sub-event") {
      const validation = validateCreateSubEventInput(subEventForm);

      if (!validation.valid) {
        setError(validation.message);
        return;
      }

      try {
        await eventManagementService.createSubEvent(subEventForm);
        closeModal();
        await loadEvents();
      } catch {
        setError("Unable to create the sub-event.");
      }

      return;
    }

    if (
      modalMode === "edit-sub-event" &&
      editingEventId &&
      editingSubEventId
    ) {
      const updateInput: UpdateSubEventInput = {
        name: subEventForm.name,
        date: subEventForm.date,
        time: subEventForm.time,
        venue: subEventForm.venue,
        description: subEventForm.description,
      };

      const validation = validateUpdateSubEventInput(updateInput);

      if (!validation.valid) {
        setError(validation.message);
        return;
      }

      try {
        await eventManagementService.updateSubEvent(
          editingEventId,
          editingSubEventId,
          updateInput
        );

        closeModal();
        await loadEvents();
      } catch {
        setError("Unable to update the sub-event.");
      }
    }
  };

  const handleStatusChange = async (
    eventId: string,
    status: EventStatus
  ) => {
    setError("");

    try {
      await eventManagementService.updateEvent(eventId, {
        status,
      });

      await loadEvents();
    } catch {
      setError("Unable to update the event status.");
    }
  };

  const renderStatus = (status: EventStatus) => (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses[status]}`}
    >
      {status}
    </span>
  );

  return (
    <>
      <section className="rounded-2xl bg-[#111318] shadow-sm border border-[#292D33] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#292D33]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#F3F1EC]">
                Events
              </h2>

              <p className="text-sm text-[#686C74] mt-1">
                Manage master events and their optional sub-events.
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={openCreateEvent}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF2A1A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C51D16] transition"
              >
                <Plus className="h-4 w-4" />
                Create Event
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#686C74]" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, venues, descriptions..."
                className="w-full rounded-lg border border-[#3A3E45] bg-[#111318] pl-10 pr-4 py-2.5 text-sm text-[#F3F1EC] outline-none focus:border-[#FF2A1A]/50 focus:ring-2 focus:ring-[#FF2A1A]/30"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | EventStatus
                )
              }
              className="rounded-lg border border-[#3A3E45] bg-[#111318] px-4 py-2.5 text-sm text-[#9B9EA6] outline-none focus:border-[#FF2A1A]/50 focus:ring-2 focus:ring-[#FF2A1A]/30"
            >
              <option value="all">All Statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>

            <button
              type="button"
              onClick={loadEvents}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#3A3E45] px-4 py-2.5 text-sm font-medium text-[#9B9EA6] hover:bg-[#08090B] transition"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {error && !modalMode && (
          <div className="mx-5 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-sm text-[#686C74]">
            Loading events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-[#3A3E45]" />

            <h3 className="mt-3 text-sm font-semibold text-[#F3F1EC]">
              No events found
            </h3>

            <p className="mt-1 text-sm text-[#686C74]">
              {isAdmin ? "Try changing your search/filter or create a new event." : "No events have been assigned to you yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-[#08090B] border-b border-[#292D33]">
                <tr>
                  <th className="w-10 px-4 py-3" />

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#686C74]">
                    Event
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#686C74]">
                    Date
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#686C74]">
                    Time
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#686C74]">
                    Venue
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#686C74]">
                    Status
                  </th>

                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#686C74]">
                    Sub-events
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#686C74]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#292D33]">
                {filteredEvents.map((event) => {
                  const isExpanded = expandedEvents.has(event.id);
                  const subEvents = event.subEvents ?? [];

                  return (
                    <Fragment key={event.id}>
                      <tr className="group hover:bg-[#171A20]/50 transition-colors">
                        <td className="px-4 py-4">
                          {subEvents.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(event.id)}
                              className="rounded-md p-1 text-[#686C74] hover:bg-[#1D2026] hover:text-[#F3F1EC]"
                              aria-label={
                                isExpanded
                                  ? "Collapse sub-events"
                                  : "Expand sub-events"
                              }
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-semibold text-[#F3F1EC]">
                            {event.name}
                          </div>

                          <div className="mt-1 text-xs text-[#686C74] max-w-xs truncate">
                            {event.description || "No description"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-[#9B9EA6]">
                          {event.date}
                        </td>

                        <td className="px-4 py-4 text-sm text-[#9B9EA6]">
                          {event.time}
                        </td>

                        <td className="px-4 py-4 text-sm text-[#9B9EA6]">
                          {event.venue}
                        </td>

                        <td className="px-4 py-4">
                          {renderStatus(event.status)}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex min-w-8 justify-center rounded-full bg-[#171A20] px-2.5 py-1 text-xs font-semibold text-[#9B9EA6]">
                            {subEvents.length}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {isAdmin && <button
                              type="button"
                              onClick={() => openCreateSubEvent(event)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 px-2.5 py-1.5 text-xs font-semibold text-[#7FA7FF] hover:bg-[#FF2A1A]/10"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Sub-event
                            </button>}

                            {isAdmin && <button
                              type="button"
                              onClick={() => openEditEvent(event)}
                              className="rounded-md border border-[#292D33] p-2 text-[#9B9EA6] hover:bg-[#171A20]"
                              aria-label="Edit event"
                            >
                              <Edit className="h-4 w-4" />
                            </button>}

                            {isAdmin && <button
                              type="button"
                              onClick={() => handleDeleteEvent(event)}
                              className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                              aria-label="Delete event"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && subEvents.length > 0 && (
                        <tr>
                          <td colSpan={8} className="bg-[#08090B] px-8 py-4">
                            <div className="rounded-xl border border-[#292D33] bg-[#111318] overflow-hidden">
                              <div className="px-4 py-3 border-b border-[#292D33]">
                                <h3 className="text-sm font-bold text-[#F3F1EC]">
                                  Sub-events of {event.name}
                                </h3>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[800px]">
                                  <thead className="bg-[#08090B]">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#686C74]">
                                        Name
                                      </th>

                                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#686C74]">
                                        Date
                                      </th>

                                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#686C74]">
                                        Time
                                      </th>

                                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#686C74]">
                                        Venue
                                      </th>

                                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#686C74]">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody className="divide-y divide-slate-200">
                                    {subEvents.map((subEvent) => (
                                      <tr key={subEvent.id}>
                                        <td className="px-4 py-3 text-sm font-medium text-[#F3F1EC]">
                                          {subEvent.name}
                                        </td>

                                        <td className="px-4 py-3 text-sm text-[#9B9EA6]">
                                          {subEvent.date}
                                        </td>

                                        <td className="px-4 py-3 text-sm text-[#9B9EA6]">
                                          {subEvent.time}
                                        </td>

                                        <td className="px-4 py-3 text-sm text-[#9B9EA6]">
                                          {subEvent.venue}
                                        </td>

                                        <td className="px-4 py-3">
                                          <div className="flex justify-end gap-2">
                                            {isAdmin && <button
                                              type="button"
                                              onClick={() =>
                                                openEditSubEvent(
                                                  event,
                                                  subEvent.id
                                                )
                                              }
                                              className="rounded-md border border-[#292D33] p-2 text-[#9B9EA6] hover:bg-[#171A20]"
                                              aria-label="Edit sub-event"
                                            >
                                              <Edit className="h-4 w-4" />
                                            </button>}

                                            {isAdmin && <button
                                              type="button"
                                              onClick={() =>
                                                handleDeleteSubEvent(
                                                  event,
                                                  subEvent.id
                                                )
                                              }
                                              className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                              aria-label="Delete sub-event"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08090B]/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111318] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#292D33] px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#F3F1EC]">
                  {modalMode === "create-event" && "Create Event"}
                  {modalMode === "edit-event" && "Edit Event"}
                  {modalMode === "create-sub-event" && "Create Sub-event"}
                  {modalMode === "edit-sub-event" && "Edit Sub-event"}
                </h2>

                <p className="mt-1 text-xs text-[#686C74]">
                  Enter the required event details below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-[#686C74] hover:bg-[#171A20] hover:text-[#F3F1EC]"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(modalMode === "create-event" ||
              modalMode === "edit-event") && (
              <form onSubmit={handleEventSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#9B9EA6] mb-1">
                    Event Name *
                  </label>

                  <input
                    required
                    value={eventForm.name}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#3A3E45] px-3 py-2.5 text-sm outline-none focus:border-[#FF2A1A]/50 focus:ring-2 focus:ring-[#FF2A1A]/30"
                    placeholder="Enter event name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#9B9EA6] mb-1">
                      Date *
                    </label>

                    <input
                      required
                      type="date"
                      value={eventForm.date}
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          date: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-[#3A3E45] px-3 py-2.5 text-sm outline-none focus:border-[#FF2A1A]/50 focus:ring-2 focus:ring-[#FF2A1A]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#9B9EA6] mb-1">
                      Time *
                    </label>

                    <input
                      required
                      type="time"
                      value={eventForm.time}
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          time: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-[#3A3E45] px-3 py-2.5 text-sm outline-none focus:border-[#FF2A1A]/50 focus:ring-2 focus:ring-[#FF2A1A]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9B9EA6] mb-1">
                    Venue *
                  </label>

                  <input
                    required
                    value={eventForm.venue}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        venue: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#3A3E45] px-3 py-2.5 text-sm outline-none focus:border-[#FF2A1A]/50 focus:ring-2 focus:ring-[#FF2A1A]/30"
                    placeholder="Enter venue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9B9EA6] mb-1">
                    Description
                  </label>

                  <textarea
                    rows={4}
                    value={eventForm.description}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#3A3E45] px-3 py-2.5 text-sm outline-none focus:border-[#FF2A1A]/50 focus:ring-2 focus:ring-[#FF2A1A]/30 resize-none"
                    placeholder="Describe the event"
                  />
                </div>

                {modalMode === "edit-event" && (
                  <div>
                    <label className="block text-sm font-medium text-[#9B9EA6] mb-1">
                      Status
                    </label>

                    <select
                      value={
                        editingEventId
                          ? events.find(
                              (item) => item.id === editingEventId
                            )?.status ?? "upcoming"
                          : "upcoming"
                      }
                      onChange={(e) => {
                        if (!editingEventId) return;

                        void handleStatusChange(
                          editingEventId,
                          e.target.value as EventStatus
                        );
                      }}
                      className="w-full rounded-lg border border-[#3A3E45] px-3 py-2.5 text-sm outline-none focus:border-[#FF2A1A]/50 focus:ring-2 focus:ring-[#FF2A1A]/30"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-[#3A3E45] px-4 py-2.5 text-sm font-medium text-[#9B9EA6] hover:bg-[#08090B]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="rounded-lg bg-[#FF2A1A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C51D16]"
                  >
                    {modalMode === "create-event"
                      ? "Create Event"
                      : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {(modalMode === "create-sub-event" ||
              modalMode === "edit-sub-event") && (
              <form
                onSubmit={handleSubEventSubmit}
                className="p-5 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-[#9B9EA6] mb-1">
                    Sub-event Name *
                  </label>

                  <input
                    required
                    value={subEventForm.name}
                    onChange={(e) =>
                      setSubEventForm({
                        ...subEventForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#3A3E45] px-3 py-2.5 text-sm outline-none focus:border-[#FF2A1A]/50 focus:ring-2 focus:ring-[#FF2A1A]/30"
                    placeholder="Enter sub-event name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#9B9EA6] mb-1">
                      Date *
                    </label>

                    <input
                      required
                      type="date"
                      value={subEventForm.date}
                      onChange={(e) =>
                        setSubEventForm({
                          ...subEventForm,
                          date: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-[#3A3E45] px-3 py-2.5 text-sm outline-none focus:border-[#FF2A1A]/50 focus:ring-2 focus:ring-[#FF2A1A]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#9B9EA6] mb-1">
                      Time *
                    </label>

                    <input
                      required
                      type="time"
                      value={subEventForm.time}
                      onChange={(e) =>
                        setSubEventForm({
                          ...subEventForm,
                          time: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-[#3A3E45] px-3 py-2.5 text-sm outline-none focus:border-[#FF2A1A]/50 focus:ring-2 focus:ring-[#FF2A1A]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9B9EA6] mb-1">
                    Venue *
                  </label>

                  <input
                    required
                    value={subEventForm.venue}
                    onChange={(e) =>
                      setSubEventForm({
                        ...subEventForm,
                        venue: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#3A3E45] px-3 py-2.5 text-sm outline-none focus:border-[#FF2A1A]/50 focus:ring-2 focus:ring-[#FF2A1A]/30"
                    placeholder="Enter venue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9B9EA6] mb-1">
                    Description
                  </label>

                  <textarea
                    rows={4}
                    value={subEventForm.description}
                    onChange={(e) =>
                      setSubEventForm({
                        ...subEventForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#3A3E45] px-3 py-2.5 text-sm outline-none focus:border-[#FF2A1A]/50 focus:ring-2 focus:ring-[#FF2A1A]/30 resize-none"
                    placeholder="Describe the sub-event"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-[#3A3E45] px-4 py-2.5 text-sm font-medium text-[#9B9EA6] hover:bg-[#08090B]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="rounded-lg bg-[#FF2A1A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C51D16]"
                  >
                    {modalMode === "create-sub-event"
                      ? "Create Sub-event"
                      : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}