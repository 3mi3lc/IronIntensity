import React from 'react';
import { Calendar } from 'react-native-calendars';

type CalendarProps = React.ComponentProps<typeof Calendar>;

/**
 * App-themed wrapper around react-native-calendars so every calendar in the app
 * (logging, finish-workout, plan a session, community calendar) shares one look:
 * dark, red accent, week starts Monday. The background is transparent so it
 * inherits whatever surface it sits on. Pass any Calendar prop through; a `theme`
 * override is merged on top of the base.
 */
const BASE_THEME: CalendarProps['theme'] = {
    calendarBackground: 'transparent',
    dayTextColor: '#ffffff',
    monthTextColor: '#ffffff',
    textSectionTitleColor: '#8b8b8b',
    arrowColor: '#eb0202',
    selectedDayBackgroundColor: '#eb0202',
    selectedDayTextColor: '#ffffff',
    todayTextColor: '#ff7857',
    textDisabledColor: '#4a4a4a',
    dotColor: '#eb0202',
    selectedDotColor: '#ffffff',
    textMonthFontWeight: 'bold',
    textMonthFontSize: 18,
    textDayFontSize: 15,
    textDayHeaderFontSize: 13,
};

export function ThemedCalendar({ theme, ...props }: CalendarProps) {
    return <Calendar firstDay={1} {...props} theme={{ ...BASE_THEME, ...(theme ?? {}) }} />;
}
