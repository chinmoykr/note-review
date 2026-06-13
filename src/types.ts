import { Plugin } from "obsidian";

export interface ReviewPreset {
    name: string;
    intervals: number[];
    repeatInterval: number;
}

export interface PluginSettings {
    presets: ReviewPreset[];
    sectionOrder: string[];
    showDoneButton: boolean;
    showSkipButton: boolean;
    showPostponeButton: boolean;
    showAdjustButton: boolean;
    showPresetBadge: boolean;
    showLastReviewed: boolean;
    showNextDateInfo: boolean;
    showAdjustInfo: boolean;
}

export interface NoteReviewerPluginType extends Plugin {
    settings: PluginSettings;
    saveSettings(): Promise<void>;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    sectionOrder: ["Overdue", "Today", "Stage"],
    showDoneButton: true,
    showSkipButton: true,
    showPostponeButton: true,
    showAdjustButton: true,
    showPresetBadge: true,
    showLastReviewed: true,
    showNextDateInfo: true,
    showAdjustInfo: true,
    presets: [
        {
            name: "standard",
            intervals: [1, 3, 7, 15, 30, 60, 120],
            repeatInterval: 120
        },
        {
            name: "concept",
            intervals: [1, 3, 10, 30, 60, 120],
            repeatInterval: 120
        },
        {
            name: "hard",
            intervals: [1, 2, 4, 8, 14, 21, 30, 45],
            repeatInterval: 60
        }
    ]
};

export const FRONTMATTER_KEYS = {
    REVIEW: "review",
    NEXT_DATE: "review-next-date",
    INTERVAL_INDEX: "review-interval-index",
    SKIP_COUNT: "review-skip-count",
    LAST_REVIEWED: "review-last-date"
};
