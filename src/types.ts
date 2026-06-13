import { Plugin } from "obsidian";

export interface ReviewPreset {
    name: string;
    intervals: number[];
    repeatInterval: number;
}

export interface PluginSettings {
    presets: ReviewPreset[];
}

export interface NoteReviewerPluginType extends Plugin {
    settings: PluginSettings;
    saveSettings(): Promise<void>;
}

export const DEFAULT_SETTINGS: PluginSettings = {
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
    SKIP_COUNT: "review-skip-count"
};
