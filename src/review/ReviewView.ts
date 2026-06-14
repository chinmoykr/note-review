import { ItemView, WorkspaceLeaf, setIcon, MarkdownRenderer } from "obsidian";
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

        const renderSection = async (title: string, notes: ReviewItem[], defaultOpen: boolean = true) => {
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
                await this.renderReviewItem(listContainer, item);
            }
        };

        // Read section order from settings
        const order = this.reviewManager.settings.sectionOrder || ["Overdue", "Today", "Stage"];
        
        for (const sectionName of order) {
            if (sectionName === "Overdue") await renderSection("Overdue", overdueNotes, true);
            else if (sectionName === "Today") await renderSection("Today", todayNotes, true);
            else if (sectionName === "Stage") await renderSection("Stage", stageNotes, true);
        }
    }

    private async renderReviewItem(parent: HTMLElement, item: ReviewItem) {
        const itemEl = parent.createDiv("note-reviewer-item");
        const settings = this.reviewManager.settings;
        
        // Header row (Title)
        const headerEl = itemEl.createDiv("note-reviewer-item-header");
        
        const titleEl = headerEl.createDiv("note-reviewer-title");
        
        const cache = this.app.metadataCache.getFileCache(item.file);
        let hasPebbleTag = false;
        
        if (cache?.tags) {
            hasPebbleTag = cache.tags.some(t => t.tag.toLowerCase() === "#pebble" || t.tag.toLowerCase() === "pebble");
        }
        if (!hasPebbleTag && cache?.frontmatter?.tags) {
            const fmTags = cache.frontmatter.tags;
            if (Array.isArray(fmTags)) {
                hasPebbleTag = fmTags.some(t => String(t).toLowerCase() === "pebble" || String(t).toLowerCase() === "#pebble");
            } else if (typeof fmTags === "string") {
                hasPebbleTag = fmTags.toLowerCase().split(/[,\s]+/).some(t => t === "pebble" || t === "#pebble");
            }
        }

        if (hasPebbleTag) {
            const content = await this.app.vault.cachedRead(item.file);
            const contentWithoutFrontmatter = content.replace(/^---[\r\n]+[\s\S]*?[\r\n]+---[\r\n]+/, "").trim();

            titleEl.empty();
            await MarkdownRenderer.render(this.app, contentWithoutFrontmatter || item.file.basename, titleEl, item.file.path, this);

            const clozeLinks = titleEl.querySelectorAll('a[href="cloze:"]');
            clozeLinks.forEach(link => {
                const clozeWord = link.textContent || "";
                
                const clozeContainer = createSpan("note-reviewer-cloze-container");
                const clozeText = clozeContainer.createSpan("note-reviewer-cloze-text");
                clozeText.setText("____");
                clozeText.style.cursor = "pointer";
                
                clozeText.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault(); // prevent any default link action just in case
                    if (clozeText.getText() === "____") {
                        clozeText.setText(clozeWord);
                        clozeText.style.textDecoration = "underline";
                        clozeText.style.textDecorationColor = "var(--text-muted)";
                    } else {
                        clozeText.setText("____");
                        clozeText.style.textDecoration = "none";
                    }
                };
                
                link.parentNode?.replaceChild(clozeContainer, link);
            });
        } else {
            titleEl.setText(item.file.basename);
        }

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

                const iconContainer = adjustRow.createDiv("note-reviewer-footer-icons");
                iconContainer.style.display = "flex";
                iconContainer.style.gap = "10px";
                iconContainer.style.alignItems = "center";

                const editIcon = iconContainer.createSpan();
                setIcon(editIcon, "pencil");
                editIcon.style.cursor = "pointer";
                editIcon.style.opacity = "0.6";
                editIcon.onclick = async (e) => {
                    e.stopPropagation();
                    await this.app.workspace.getLeaf(false).openFile(item.file);
                };
                editIcon.onmouseenter = () => editIcon.style.opacity = "1";
                editIcon.onmouseleave = () => editIcon.style.opacity = "0.6";

                const deleteIcon = iconContainer.createSpan();
                setIcon(deleteIcon, "trash-2");
                deleteIcon.style.cursor = "pointer";
                deleteIcon.style.opacity = "0.6";
                deleteIcon.onclick = async (e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to delete "${item.file.basename}"?`)) {
                        deleteIcon.style.pointerEvents = "none";
                        await this.app.vault.trash(item.file, true);
                    }
                };
                deleteIcon.onmouseenter = () => deleteIcon.style.opacity = "1";
                deleteIcon.onmouseleave = () => deleteIcon.style.opacity = "0.6";
            }
        }
    }
}
