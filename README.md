# Obsidian Note Reviewer

A lightning-fast, spaced-repetition plugin for Obsidian designed specifically to review whole notes. Perfect for heavy competitive exams (like UPSC) where you need to review broad concepts alongside volatile facts.

## Features

- **Note-Level Reviews:** Uses your note's Frontmatter to track review dates, keeping your raw text completely clean. No inline clozes or hidden HTML tags.
- **Custom Exam Presets:** Comes built-in with 3 specific interval presets:
  - `standard` (1, 3, 7, 15, 30, 60, 120 days)
  - `concept` (1, 3, 10, 30, 60, 120 days)
  - `hard` (1, 2, 4, 8, 14, 21, 30, 45 days)
- **Smart "Adjust" Button:** If your queue gets too heavy, click *Adjust*. The plugin will look ahead 7 days, find the day with the lowest number of scheduled notes, and move the review to that day *without* breaking your spaced repetition interval.
- **Blazing Fast UI:** Built strictly with Vanilla JS DOM manipulation. No heavy frameworks. Guaranteed to never lag, even on older iPhones or massive vaults.

## Installation (via BRAT)

Since this is a custom plugin, the easiest way to install it on your Desktop or iPhone is using the [BRAT](https://github.com/TfTHacker/obsidian42-brat) community plugin:

1. Open Obsidian -> Settings -> Community Plugins -> Browse.
2. Search for and install **BRAT**.
3. Enable BRAT, go to its settings, and click **Add Beta plugin**.
4. Paste the URL of this repository: `https://github.com/chinmoykr/note-review`
5. Click **Add Plugin**. BRAT will automatically download the files and keep them updated for you.
6. Enable **Note Reviewer** in your Community Plugins list!

## How to Use

1. **Add a note to your queue:** Open any note, open the Command Palette (`Cmd/Ctrl + P`), and select **"Add current note to standard review"**. 
2. *Alternatively:* Manually add the property `review: standard` (or `concept` / `hard`) to your note's frontmatter.
3. **Reviewing:** Click the Calendar Clock icon in the left ribbon (or run the command "Open Review Pane"). You will see a list of notes due today.
4. **Actions:**
   - `Done`: You successfully reviewed it. Moves it to the next interval.
   - `Skip`: Skips today. Moves it to the next interval but tracks that you skipped it.
   - `Postpone`: Moves the review to tomorrow.
   - `Adjust`: Smart-moves the review to the quietest day in the coming week.

## Development

If you want to modify this plugin:
```bash
npm install
npm run dev     # To watch for changes
npm run build   # To compile for production
```
