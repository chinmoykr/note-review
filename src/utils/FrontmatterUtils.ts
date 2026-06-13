import { App, TFile } from "obsidian";
import { FRONTMATTER_KEYS } from "../types";

export class FrontmatterUtils {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Get a specific property value from a file's frontmatter.
     */
    getProperty(file: TFile, key: string): any {
        const cache = this.app.metadataCache.getFileCache(file);
        return cache?.frontmatter?.[key];
    }

    /**
     * Determine if a file has a review preset assigned.
     */
    getReviewPreset(file: TFile): string | null {
        const value = this.getProperty(file, FRONTMATTER_KEYS.REVIEW);
        if (value !== undefined && value !== null) {
            if (Array.isArray(value) && value.length > 0) {
                return String(value[0]).trim().toLowerCase();
            } else if (typeof value === "string" && value.trim().length > 0) {
                return value.trim().toLowerCase();
            }
            return "standard"; // Fallback to standard if it's there but unreadable
        }
        return null;
    }

    /**
     * Update multiple frontmatter properties at once.
     */
    async updateProperties(file: TFile, properties: Record<string, any>): Promise<void> {
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
            for (const [key, value] of Object.entries(properties)) {
                if (value === null || value === undefined) {
                    delete frontmatter[key];
                } else {
                    frontmatter[key] = value;
                }
            }
        });
    }
}
