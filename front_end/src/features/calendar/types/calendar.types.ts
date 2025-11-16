import { EventTypeValue } from '../constants/event.constants';

export interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
}

export type CalendarWeek = Array<CalendarDay | null>;

export interface EventSegment {
  id: string;
  segmentId: string;
  title: string;
  startDate: string;
  endDate: string;
  color: string;
  type: EventTypeValue;
  startCol: number;
  span: number;
  row: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color: string;
  type: EventTypeValue;
}
