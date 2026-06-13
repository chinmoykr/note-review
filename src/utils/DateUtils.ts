export class DateUtils {
    /**
     * Returns today's date as a YYYY-MM-DD string.
     */
    static getTodayStr(): string {
        const date = new Date();
        return this.formatDate(date);
    }

    /**
     * Formats a Date object to YYYY-MM-DD.
     */
    static formatDate(date: Date): string {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    /**
     * Adds `days` to the given `dateStr` (YYYY-MM-DD) and returns the new date string.
     */
    static addDays(dateStr: string, days: number): string {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return this.formatDate(date);
    }

    /**
     * Checks if `dateStr` (YYYY-MM-DD) is today or earlier.
     */
    static isDue(dateStr: string | null | undefined): boolean {
        if (!dateStr) return true; // If no date is set, it's due
        const todayStr = this.getTodayStr();
        return dateStr <= todayStr;
    }
}
