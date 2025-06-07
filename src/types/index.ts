export interface Person {
  id: number;
  name: string;
  color: string;
}

export interface Location {
  id: number;
  name: string;
  connections: number[];
}

export interface Prop {
  id: number;
  name: string;
}

export interface Information {
  id: number;
  content: string;
}

export interface InitialState {
  personId: number;
  locationId: number;
  time: string;
}

export interface Act {
  id: number;
  personId: number;
  locationId: number;
  time: string;
  description: string;
  propId?: number;
  informationId?: number;
  interactedPersonId?: number;
}

export interface Event {
  id: number;
  triggerType: string;
  triggerValue: string;
  eventTime: string;
  personId: number;
  actId: number;
}

export interface StoryData {
  persons: Person[];
  locations: Location[];
  props: Prop[];
  informations: Information[];
  initialStates: InitialState[];
  acts: Act[];
}

export interface IndexedData {
  personMap: Map<number, Person>;
  locationMap: Map<number, Location>;
  actMap: Map<number, Act>;
  propMap: Map<number, Prop>;
  infoMap: Map<number, Information>;
  persons: Person[];
  locations: Location[];
  acts: Act[];
  events: Event[];
  initialStates: InitialState[];
  sortedEvents: Event[];
}

export interface PersonState {
  locationId: number | null;
  lastAction: Act | null;
}

export interface WorldState {
  [personId: number]: PersonState;
}

export interface LogEntry {
  timeMinutes: number;
  text: string;
}

export interface LocationElements {
  [locationId: string]: {
    box: HTMLElement;
    personList: HTMLElement;
  };
}

export interface SimState {
  currentTimeMinutes: number;
  minTimeMinutes: number;
  maxTimeMinutes: number;
  isPlaying: boolean;
  speed: number;
  timerId: number | null;
  lastTimestamp: number | null;
  indexedData: IndexedData | null;
  sortedEvents: Event[] | null;
  eventLogEntries: LogEntry[];
  locationElements: LocationElements;
}

export interface DOMElements {
  jsonDataInput: HTMLTextAreaElement;
  loadButton: HTMLButtonElement;
  playPauseButton: HTMLButtonElement;
  speedControl: HTMLSelectElement;
  timeline: HTMLInputElement;
  currentTimeDisplay: HTMLElement;
  locationOutput: HTMLElement;
  logOutput: HTMLElement;
  errorOutput: HTMLElement;
  locationTimeDisplay: HTMLElement;
  logTimeDisplay: HTMLElement;
  locationLayoutContainer: HTMLElement;
  layoutTimeDisplay: HTMLElement;
  jsonDataDetails: HTMLDetailsElement;
}