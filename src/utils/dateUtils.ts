
export const getBalancedWeeks = (date: Date): { weekIndex: number, days: number[] }[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks: number[][] = [];
    let currentWeek: number[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
        currentWeek.push(day);
        const currentDate = new Date(year, month, day);
        if (currentDate.getDay() === 0 || day === daysInMonth) { // End of week on Sunday or end of month
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    // Merge short first week (<= 2 days)
    if (weeks.length > 1 && weeks[0].length <= 2) {
        const firstWeek = weeks.shift()!;
        weeks[0] = [...firstWeek, ...weeks[0]];
    }

    // Merge short last week (<= 2 days)
    if (weeks.length > 1 && weeks[weeks.length - 1].length <= 2) {
        const lastWeek = weeks.pop()!;
        weeks[weeks.length - 1] = [...weeks[weeks.length - 1], ...lastWeek];
    }

    return weeks.map((days, index) => ({ weekIndex: index, days }));
};
