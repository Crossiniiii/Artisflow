import { Branch, ExhibitionEvent, EventStatus } from '../types';
import { generateUUID } from '../utils/idUtils';

export const applyBulkReserveEvent = (
  events: ExhibitionEvent[],
  ids: string[],
  details: string,
  defaultLocation: Branch
): ExhibitionEvent[] => {
  if (!details || !details.startsWith('Reserved for Event:')) {
    return events;
  }

  const parts = details.split('|');
  if (parts.length === 0) {
    return events;
  }
  const eventNamePart = parts[0];
  const eventName = eventNamePart.replace('Reserved for Event:', '').trim();
  if (!eventName) {
    return events;
  }

  const existingEventIndex = events.findIndex(
    e => e.title?.toLowerCase() === eventName.toLowerCase()
  );

  if (existingEventIndex >= 0) {
    const updatedEvents = [...events];
    const target = updatedEvents[existingEventIndex];
    const uniqueIds = Array.from(new Set([...target.artworkIds, ...ids]));
    updatedEvents[existingEventIndex] = { ...target, artworkIds: uniqueIds };
    return updatedEvents;
  }

  const now = new Date();
  const newEvent: ExhibitionEvent = {
    id: generateUUID(),
    title: eventName,
    location: defaultLocation,
    startDate: now.toISOString().split('T')[0],
    endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    status: EventStatus.UPCOMING,
    artworkIds: ids
  };

  return [...events, newEvent];
};

export const linkArtworkToEventOnReserve = (
  events: ExhibitionEvent[],
  artworkBranch: Branch,
  artworkId: string,
  details: string
): ExhibitionEvent[] => {
  if (!details || !details.startsWith('Type: Event')) {
    return events;
  }

  const parts = details.split('|').map(p => p.trim());
  const targetPart = parts.find(p => p.toLowerCase().startsWith('target:'));
  const eventName = targetPart ? targetPart.substring('Target:'.length).trim() : '';
  if (!eventName) {
    return events;
  }

  const existingIndex = events.findIndex(
    e => e.title?.toLowerCase() === eventName.toLowerCase()
  );

  if (existingIndex >= 0) {
    const updated = [...events];
    const target = updated[existingIndex];
    const uniqueIds = Array.from(new Set([...target.artworkIds, artworkId]));
    updated[existingIndex] = { ...target, artworkIds: uniqueIds };
    return updated;
  }

  const now = new Date();
  const newEvent: ExhibitionEvent = {
    id: generateUUID(),
    title: eventName,
    location: artworkBranch || '',
    startDate: now.toISOString().split('T')[0],
    endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    status: EventStatus.UPCOMING,
    artworkIds: [artworkId]
  };

  return [...events, newEvent];
};
