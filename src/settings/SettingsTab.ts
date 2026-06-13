import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import { ReviewPreset, NoteReviewerPluginType } from "../types";

export class SettingsTab extends PluginSettingTab {
    plugin: NoteReviewerPluginType;

    constructor(app: App, plugin: NoteReviewerPluginType) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "Note Reviewer Settings" });

        // Section Layout Settings
        containerEl.createEl("h3", { text: "Section Layout" });
        containerEl.createEl("p", {
            text: "Drag and drop to rearrange the sections in the Review Pane."
        });

        const listContainer = containerEl.createDiv("note-reviewer-drag-list");
        let draggedIndex: number | null = null;

        // Ensure sectionOrder is populated if it was missing from old settings
        if (!this.plugin.settings.sectionOrder || this.plugin.settings.sectionOrder.length === 0) {
            this.plugin.settings.sectionOrder = ["Overdue", "Today", "Stage"];
        }

        this.plugin.settings.sectionOrder.forEach((sectionName, index) => {
            const itemEl = listContainer.createDiv("note-reviewer-drag-item");
            itemEl.setAttribute("draggable", "true");
            
            const contentEl = itemEl.createDiv();
            contentEl.style.display = "flex";
            contentEl.style.alignItems = "center";
            contentEl.style.gap = "8px";

            contentEl.createSpan({ text: "☰", cls: "note-reviewer-drag-handle" });
            contentEl.createSpan({ text: sectionName });

            itemEl.ondragstart = (e) => {
                draggedIndex = index;
                itemEl.addClass("is-dragging");
                if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
            };

            itemEl.ondragover = (e) => {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                
                const draggingItem = listContainer.querySelector(".is-dragging");
                if (!draggingItem) return;

                const siblings = Array.from(listContainer.querySelectorAll(".note-reviewer-drag-item:not(.is-dragging)"));
                const nextSibling = siblings.find(sibling => {
                    const rect = sibling.getBoundingClientRect();
                    return e.clientY <= rect.top + rect.height / 2;
                });
                if (nextSibling) {
                    listContainer.insertBefore(draggingItem, nextSibling);
                } else {
                    listContainer.appendChild(draggingItem);
                }
            };

            itemEl.ondrop = async (e) => {
                e.preventDefault();
                if (draggedIndex !== null) {
                    // Re-calculate the actual new index based on the DOM position
                    const currentItems = Array.from(listContainer.querySelectorAll(".note-reviewer-drag-item"));
                    const newIndex = currentItems.indexOf(itemEl);
                    
                    if (newIndex !== -1 && draggedIndex !== newIndex) {
                        const newOrder = [...this.plugin.settings.sectionOrder];
                        const [removed] = newOrder.splice(draggedIndex, 1);
                        newOrder.splice(newIndex, 0, removed);
                        
                        this.plugin.settings.sectionOrder = newOrder;
                        await this.plugin.saveSettings();
                        
                        // Notify views to re-render
                        this.app.workspace.getLeavesOfType("note-reviewer-view").forEach(leaf => {
                            if (leaf.view && typeof (leaf.view as any).renderView === "function") {
                                (leaf.view as any).renderView();
                            }
                        });
                    }
                }
            };

            itemEl.ondragend = () => {
                draggedIndex = null;
                itemEl.removeClass("is-dragging");
                this.display(); // Full refresh to ensure clean state
            };
        });

        containerEl.createEl("hr");

        containerEl.createEl("h3", { text: "Presets" });
        containerEl.createEl("p", {
            text: "Define presets that you can assign to your notes. In a note's frontmatter, set 'review: preset_name' to use it."
        });

        // Add New Preset
        new Setting(containerEl)
            .setName("Add New Preset")
            .setDesc("Create a new preset with default intervals")
            .addButton(btn => btn
                .setButtonText("Add")
                .setCta()
                .onClick(async () => {
                    const newPresetName = `preset_${this.plugin.settings.presets.length + 1}`;
                    this.plugin.settings.presets.push({
                        name: newPresetName,
                        intervals: [1, 3, 7, 14, 21, 30],
                        repeatInterval: 60
                    });
                    await this.plugin.saveSettings();
                    this.display(); // Refresh
                }));

        // Render each preset
        for (let i = 0; i < this.plugin.settings.presets.length; i++) {
            const preset = this.plugin.settings.presets[i];

            containerEl.createEl("h4", { text: `Preset: ${preset.name}` });

            new Setting(containerEl)
                .setName("Name")
                .addText(text => text
                    .setValue(preset.name)
                    .onChange(async (val) => {
                        preset.name = val;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName("Intervals (days)")
                .setDesc("Comma-separated list of days for spaced repetition")
                .addText(text => text
                    .setValue(preset.intervals.join(", "))
                    .onChange(async (val) => {
                        const arr = val.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                        preset.intervals = arr;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName("Repeat Interval (days)")
                .setDesc("Number of days to repeat after the last interval is reached")
                .addText(text => text
                    .setValue(preset.repeatInterval.toString())
                    .onChange(async (val) => {
                        const num = parseInt(val.trim());
                        if (!isNaN(num)) {
                            preset.repeatInterval = num;
                            await this.plugin.saveSettings();
                        }
                    }));

            new Setting(containerEl)
                .setName("Delete Preset")
                .addButton(btn => btn
                    .setButtonText("Delete")
                    .setWarning()
                    .onClick(async () => {
                        if (this.plugin.settings.presets.length === 1) {
                            new Notice("You must have at least one preset.");
                            return;
                        }
                        this.plugin.settings.presets.splice(i, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            containerEl.createEl("hr");
        }
    }
}
