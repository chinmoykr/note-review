import { Plugin, WorkspaceLeaf } from "obsidian";
import { PluginSettings, DEFAULT_SETTINGS, FRONTMATTER_KEYS } from "./types";
import { SettingsTab } from "./settings/SettingsTab";
import { ReviewManager } from "./review/ReviewManager";
import { ReviewView, REVIEW_VIEW_TYPE } from "./review/ReviewView";
import { FrontmatterUtils } from "./utils/FrontmatterUtils";
import { DateUtils } from "./utils/DateUtils";

export default class NoteReviewerPlugin extends Plugin {
    settings: PluginSettings;
    reviewManager: ReviewManager;
    fmUtils: FrontmatterUtils;

    async onload() {
        await this.loadSettings();

        // Utilities
        this.fmUtils = new FrontmatterUtils(this.app);
        this.reviewManager = new ReviewManager(this.app, this.settings, this.fmUtils);

        // Register View
        this.registerView(
            REVIEW_VIEW_TYPE,
            (leaf: WorkspaceLeaf) => new ReviewView(leaf, this.reviewManager)
        );

        // Ribbon Icon to open view
        this.addRibbonIcon("calendar-clock", "Open Note Reviewer", () => {
            this.activateView();
        });

        // Command to open view
        this.addCommand({
            id: "open-review-view",
            name: "Open Review Pane",
            callback: () => {
                this.activateView();
            }
        });

        // Command to quickly add current note to standard review preset
        this.addCommand({
            id: "add-to-standard-review",
            name: "Add current note to standard review",
            callback: async () => {
                const file = this.app.workspace.getActiveFile();
                if (file) {
                    await this.fmUtils.updateProperties(file, {
                        [FRONTMATTER_KEYS.REVIEW]: "standard",
                        [FRONTMATTER_KEYS.NEXT_DATE]: DateUtils.getTodayStr(),
                        [FRONTMATTER_KEYS.INTERVAL_INDEX]: 0,
                        [FRONTMATTER_KEYS.SKIP_COUNT]: 0
                    });
                }
            }
        });

        // Settings tab
        this.addSettingTab(new SettingsTab(this.app, this));
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(REVIEW_VIEW_TYPE);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Updating review manager's settings reference
        this.reviewManager = new ReviewManager(this.app, this.settings, this.fmUtils);
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(REVIEW_VIEW_TYPE);

        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0];
        } else {
            // Our view could not be found in the workspace, create a new leaf
            // in the right sidebar for it
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                leaf = rightLeaf;
                await leaf.setViewState({ type: REVIEW_VIEW_TYPE, active: true });
            }
        }

        if (leaf) {
            // "Reveal" the leaf in case it is in a collapsed sidebar
            workspace.revealLeaf(leaf);
        }
    }
}
