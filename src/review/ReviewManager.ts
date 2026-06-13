import { App, TFile } from "obsidian";
import { PluginSettings, FRONTMATTER_KEYS } from "../types";
import { FrontmatterUtils } from "../utils/FrontmatterUtils";
import { DateUtils } from "../utils/DateUtils";

export interface ReviewItem {
    file: TFile;
    presetName: string;
    nextDate: string | null;
    intervalIndex: number;
}

export class ReviewManager {
    private app: App;
    public settings: PluginSettings;
    private fmUtils: FrontmatterUtils;

    constructor(app: App, settings: PluginSettings, fmUtils: FrontmatterUtils) {
        this.app = app;
        this.settings = settings;
        this.fmUtils = fmUtils;
    }

    /**
     * Finds all notes that are due for review today or earlier.
     */
    getDueNotes(): ReviewItem[] {
        const dueNotes: ReviewItem[] = [];
        const files = this.app.vault.getMarkdownFiles();

        for (const file of files) {
            const presetName = this.fmUtils.getReviewPreset(file);
            if (presetName) {
                const nextDate = this.fmUtils.getProperty(file, FRONTMATTER_KEYS.NEXT_DATE);
                if (DateUtils.isDue(nextDate)) {
                    const intervalIndex = Number(this.fmUtils.getProperty(file, FRONTMATTER_KEYS.INTERVAL_INDEX)) || 0;
                    dueNotes.push({ file, presetName, nextDate, intervalIndex });
                }
            }
        }

        // Sort by next date (older first)
        dueNotes.sort((a, b) => {
            const dateA = a.nextDate || "";
            const dateB = b.nextDate || "";
            return dateA.localeCompare(dateB);
        });

        return dueNotes;
    }

    simulateDone(item: ReviewItem): { date: string, daysToAdd: number } {
        const preset = this.getPreset(item.presetName);
        let currentIndex = Number(this.fmUtils.getProperty(item.file, FRONTMATTER_KEYS.INTERVAL_INDEX)) || 0;
        if (isNaN(currentIndex)) currentIndex = 0;

        let daysToAdd = preset.repeatInterval;
        if (currentIndex < preset.intervals.length) {
            daysToAdd = preset.intervals[currentIndex];
        }

        const date = DateUtils.addDays(DateUtils.getTodayStr(), daysToAdd);
        return { date, daysToAdd };
    }

    /**
     * Mark a note as Done. Advance its interval index and set the next date.
     */
    async markDone(item: ReviewItem): Promise<void> {
        const { date, daysToAdd } = this.simulateDone(item);
        let currentIndex = Number(this.fmUtils.getProperty(item.file, FRONTMATTER_KEYS.INTERVAL_INDEX)) || 0;
        if (isNaN(currentIndex)) currentIndex = 0;
        
        await this.fmUtils.updateProperties(item.file, {
            [FRONTMATTER_KEYS.NEXT_DATE]: date,
            [FRONTMATTER_KEYS.INTERVAL_INDEX]: currentIndex + 1
        });
    }

    /**
     * Skip reviewing today. Act exactly like Done (advance date based on current interval),
     * but DO NOT increment the interval index. Instead, increment skip count.
     */
    async skipReview(item: ReviewItem): Promise<void> {
        const { date } = this.simulateDone(item);
        let skipCount = Number(this.fmUtils.getProperty(item.file, FRONTMATTER_KEYS.SKIP_COUNT)) || 0;
        if (isNaN(skipCount)) skipCount = 0;

        await this.fmUtils.updateProperties(item.file, {
            [FRONTMATTER_KEYS.NEXT_DATE]: date,
            [FRONTMATTER_KEYS.SKIP_COUNT]: skipCount + 1
            // Notice we do NOT update INTERVAL_INDEX
        });
    }

    /**
     * Postpone reviewing until tomorrow.
     */
    async postponeReview(item: ReviewItem): Promise<void> {
        const nextDate = DateUtils.addDays(DateUtils.getTodayStr(), 1);
        await this.fmUtils.updateProperties(item.file, {
            [FRONTMATTER_KEYS.NEXT_DATE]: nextDate
        });
    }

    getLowestLoadDay(ignorePath: string): { date: string, daysToAdd: number } {
        const today = DateUtils.getTodayStr();
        const next7Days: string[] = [];
        
        for (let i = 1; i <= 7; i++) {
            next7Days.push(DateUtils.addDays(today, i));
        }

        const counts: Record<string, number> = {};
        for (const d of next7Days) {
            counts[d] = 0;
        }

        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
            if (file.path === ignorePath) continue;
            
            const nextDate = this.fmUtils.getProperty(file, FRONTMATTER_KEYS.NEXT_DATE);
            if (nextDate && counts[nextDate] !== undefined) {
                counts[nextDate]++;
            }
        }

        let lowestDay = next7Days[0];
        let lowestCount = counts[lowestDay];

        for (let i = 1; i < next7Days.length; i++) {
            const day = next7Days[i];
            if (counts[day] < lowestCount) {
                lowestCount = counts[day];
                lowestDay = day;
            }
        }
        
        const daysToAdd = next7Days.indexOf(lowestDay) + 1;
        return { date: lowestDay, daysToAdd };
    }

    /**
     * Adjust review to the day with the lowest number of notes in the next 7 days.
     */
    async adjustReview(item: ReviewItem): Promise<void> {
        const { date } = this.getLowestLoadDay(item.file.path);
        await this.fmUtils.updateProperties(item.file, {
            [FRONTMATTER_KEYS.NEXT_DATE]: date
        });
    }

    private getPreset(name: string) {
        const lowerName = name.toLowerCase();
        const preset = this.settings.presets.find(p => p.name.toLowerCase() === lowerName);
        if (preset) return preset;
        
        // Fallback to default if not found
        return this.settings.presets[0] || {
            name: "standard",
            intervals: [1, 3, 7, 15, 30, 60, 120],
            repeatInterval: 120
        };
    }
}
