import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import { ReviewManager, ReviewItem } from "./ReviewManager";

export const REVIEW_VIEW_TYPE = "note-reviewer-view";

export class ReviewView extends ItemView {
    private reviewManager: ReviewManager;

    constructor(leaf: WorkspaceLeaf, reviewManager: ReviewManager) {
        super(leaf);
        this.reviewManager = reviewManager;
    }

    getViewType() {
        return REVIEW_VIEW_TYPE;
    }

    getDisplayText() {
        return "Note Reviewer";
    }

    getIcon() {
        return "calendar-clock";
    }

    async onOpen() {
        await this.renderView();
        
        // Register event to auto-refresh when file contents or frontmatter change
        this.registerEvent(
            this.app.metadataCache.on("changed", () => {
                this.renderView();
            })
        );

        // Register event to auto-refresh when a file is renamed
        this.registerEvent(
            this.app.vault.on("rename", () => {
                this.renderView();
            })
        );

        // Register event to auto-refresh when a file is deleted
        this.registerEvent(
            this.app.vault.on("delete", () => {
                this.renderView();
            })
        );
    }

    async renderView() {
        const container = this.containerEl.children[1];
        container.empty();

        const header = container.createEl("h4", { text: "Due for Review" });
        header.addClass("note-reviewer-header");

        const dueNotes = this.reviewManager.getDueNotes();

        if (dueNotes.length === 0) {
            const emptyState = container.createEl("p", { text: "No notes to review today! 🎉" });
            emptyState.addClass("note-reviewer-empty");
            return;
        }

        const listContainer = container.createDiv("note-reviewer-list");

        for (const item of dueNotes) {
            this.renderReviewItem(listContainer, item);
        }
    }

    private renderReviewItem(parent: HTMLElement, item: ReviewItem) {
        const itemEl = parent.createDiv("note-reviewer-item");
        
        // Title area (clickable to open)
        const titleEl = itemEl.createDiv("note-reviewer-title");
        titleEl.setText(item.file.basename);
        titleEl.onclick = async () => {
            await this.app.workspace.getLeaf(false).openFile(item.file);
        };

        // Actions area
        const actionsEl = itemEl.createDiv("note-reviewer-actions");

        const doneBtn = actionsEl.createEl("button", { text: "Done" });
        doneBtn.addClass("mod-cta");
        doneBtn.onclick = async (e) => {
            e.stopPropagation();
            doneBtn.disabled = true;
            await this.reviewManager.markDone(item);
        };

        const skipBtn = actionsEl.createEl("button", { text: "Skip" });
        skipBtn.onclick = async (e) => {
            e.stopPropagation();
            skipBtn.disabled = true;
            await this.reviewManager.skipReview(item);
        };

        const postponeBtn = actionsEl.createEl("button", { text: "Postpone" });
        postponeBtn.onclick = async (e) => {
            e.stopPropagation();
            postponeBtn.disabled = true;
            await this.reviewManager.postponeReview(item);
        };

        const adjustBtn = actionsEl.createEl("button", { text: "Adjust" });
        adjustBtn.onclick = async (e) => {
            e.stopPropagation();
            adjustBtn.disabled = true;
            await this.reviewManager.adjustReview(item);
        };

        const doneSim = this.reviewManager.simulateDone(item);
        const adjustSim = this.reviewManager.getLowestLoadDay(item.file.path);

        const actionsInfoEl = itemEl.createDiv("note-reviewer-actions-info");
        actionsInfoEl.createSpan({ text: `Done -> ${doneSim.date} (+${doneSim.daysToAdd}d)` });
        actionsInfoEl.createSpan({ text: `Adjust -> ${adjustSim.date} (+${adjustSim.daysToAdd}d)` });
    }
}
