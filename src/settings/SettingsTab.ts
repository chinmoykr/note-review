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
