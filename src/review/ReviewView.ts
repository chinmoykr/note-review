import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import { ReviewManager, ReviewItem } from "./ReviewManager";
import { DateUtils } from "../utils/DateUtils";

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

        const todayStr = DateUtils.getTodayStr();

        const stageNotes = dueNotes.filter(n => n.intervalIndex === 0);
        const todayNotes = dueNotes.filter(n => n.intervalIndex > 0 && n.nextDate === todayStr);
        const overdueNotes = dueNotes.filter(n => n.intervalIndex > 0 && (n.nextDate || "") < todayStr);

        const renderSection = (title: string, notes: ReviewItem[], defaultOpen: boolean = true) => {
            if (notes.length === 0) return;

            const detailsEl = container.createEl("details");
            if (defaultOpen) {
                detailsEl.setAttribute("open", "");
            }
            detailsEl.style.marginBottom = "16px";

            const summaryEl = detailsEl.createEl("summary", { text: `${title} (${notes.length})` });
            summaryEl.addClass("note-reviewer-subheader");
            summaryEl.style.cursor = "pointer";
            summaryEl.style.userSelect = "none";
            
            const listContainer = detailsEl.createDiv("note-reviewer-list");
            for (const item of notes) {
                this.renderReviewItem(listContainer, item);
            }
        };

        // Read section order from settings
        const order = this.reviewManager.settings.sectionOrder || ["Overdue", "Today", "Stage"];
        
        order.forEach(sectionName => {
            if (sectionName === "Overdue") renderSection("Overdue", overdueNotes, true);
            else if (sectionName === "Today") renderSection("Today", todayNotes, true);
            else if (sectionName === "Stage") renderSection("Stage", stageNotes, true);
        });
    }

    private renderReviewItem(parent: HTMLElement, item: ReviewItem) {
        const itemEl = parent.createDiv("note-reviewer-item");
        const settings = this.reviewManager.settings;
        
        // Header row (Title)
        const headerEl = itemEl.createDiv("note-reviewer-item-header");
        
        const titleEl = headerEl.createDiv("note-reviewer-title");
        titleEl.setText(item.file.basename);
        titleEl.onclick = async () => {
            await this.app.workspace.getLeaf(false).openFile(item.file);
        };

        // Details row (Last reviewed)
        if (settings.showLastReviewed !== false) {
            const detailsEl = itemEl.createDiv("note-reviewer-item-details");
            if (item.lastReviewed) {
                detailsEl.createSpan({ text: `Last reviewed: ${item.lastReviewed}` });
            } else {
                detailsEl.createSpan({ text: `New to queue` });
            }
        }

        // Actions area
        const actionsEl = itemEl.createDiv("note-reviewer-actions");

        if (settings.showDoneButton !== false) {
            const doneBtn = actionsEl.createEl("button", { text: "✅ Done" });
            doneBtn.onclick = async (e) => {
                e.stopPropagation();
                doneBtn.disabled = true;
                await this.reviewManager.markDone(item);
            };
        }

        if (settings.showSkipButton !== false) {
            const skipBtn = actionsEl.createEl("button", { text: "⏭️ Skip" });
            skipBtn.onclick = async (e) => {
                e.stopPropagation();
                skipBtn.disabled = true;
                await this.reviewManager.skipReview(item);
            };
        }

        if (settings.showPostponeButton !== false) {
            const postponeBtn = actionsEl.createEl("button", { text: "📅 Postpone" });
            postponeBtn.onclick = async (e) => {
                e.stopPropagation();
                postponeBtn.disabled = true;
                await this.reviewManager.postponeReview(item);
            };
        }

        if (settings.showAdjustButton !== false) {
            const adjustBtn = actionsEl.createEl("button", { text: "⚖️ Adjust" });
            adjustBtn.onclick = async (e) => {
                e.stopPropagation();
                adjustBtn.disabled = true;
                await this.reviewManager.adjustReview(item);
            };
        }

        const doneSim = this.reviewManager.simulateDone(item);
        const adjustSim = this.reviewManager.getLowestLoadDay(item.file.path);

        // Slick Footer Area
        if (settings.showNextDateInfo !== false || settings.showPresetBadge !== false || settings.showAdjustInfo !== false) {
            const footerEl = itemEl.createDiv("note-reviewer-footer");
            
            if (settings.showNextDateInfo !== false || settings.showPresetBadge !== false) {
                const doneRow = footerEl.createDiv("note-reviewer-footer-row");
                
                if (settings.showNextDateInfo !== false) {
                    doneRow.createSpan({ text: `✅ Next: ${doneSim.date} (+${doneSim.daysToAdd}d)` });
                } else {
                    doneRow.createSpan(); // spacer
                }
                
                if (settings.showPresetBadge !== false) {
                    const presetBadge = doneRow.createSpan("note-reviewer-badge");
                    presetBadge.setText(item.presetName);
                }
            }

            if (settings.showAdjustInfo !== false) {
                const adjustRow = footerEl.createDiv("note-reviewer-footer-row");
                adjustRow.createSpan({ text: `⚖️ Adjust: ${adjustSim.date} (+${adjustSim.daysToAdd}d)` });
            }
        }
    }
}
