// src/utils/formatDate.ts
export const formatReadableDate = (dateString: string): string => {
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'long' });
    const day = date.getDate();
    const ordinal =
        day % 10 === 1 && day !== 11
            ? 'st'
            : day % 10 === 2 && day !== 12
                ? 'nd'
                : day % 10 === 3 && day !== 13
                    ? 'rd'
                    : 'th';

    return `${month} ${day}${ordinal}`;
};
