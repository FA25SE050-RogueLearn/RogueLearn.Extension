# 🚀 Quick Start Guide

## Get Your Enhanced RogueLearn Extension Running in 3 Steps!

---

## Step 1: Build the Extension (30 seconds)

```bash
cd d:\Capstone\wxt-dev-wxt
npm run dev
```

Wait for the build to complete. You should see:
```
✔ Finished in X.XX s
```

---

## Step 2: Load in Browser (1 minute)

### For Chrome:
1. Open Chrome
2. Go to: `chrome://extensions/`
3. Toggle ON "Developer mode" (top right)
4. Click "Load unpacked"
5. Navigate to: `d:\Capstone\wxt-dev-wxt\.output\chrome-mv3`
6. Click "Select Folder"
7. ✅ Extension icon should appear in toolbar!

### For Firefox:
1. Open Firefox
2. Go to: `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to: `d:\Capstone\wxt-dev-wxt\.output\firefox-mv3`
5. Select any file in that folder
6. ✅ Extension loaded!

---

## Step 3: Test Your New UI (2 minutes)

### Test the Popup:
1. Click the extension icon in your browser toolbar
2. You should see:
   - ✅ RPG-themed dark brown background
   - ✅ Gold accents
   - ✅ Smooth animations
   - ✅ Transcript and Schedule tabs

### Test the Dashboard:
**Option A - Manual**:
1. Copy your extension ID from the extensions page
2. Go to: `chrome-extension://[YOUR-EXTENSION-ID]/dashboard/index.html`
3. Replace `[YOUR-EXTENSION-ID]` with your actual ID

**Option B - Add Button (Recommended)**:
Add this code to your popup `App.tsx` to open dashboard with a button:

```typescript
// Add this function near your other functions:
const openDashboard = () => {
  browser.tabs.create({
    url: browser.runtime.getURL('/dashboard/index.html')
  });
};

// Add this button in your JSX (after your tabs):
<Button
  onClick={openDashboard}
  className="w-full mt-4 rpg-glow-gold"
>
  <TrendingUp className="mr-2 h-4 w-4" />
  Open Full Dashboard
</Button>
```

**What You Should See**:
- ✅ Full-page dashboard with RPG theme
- ✅ Student info card with avatar
- ✅ 4 animated stat cards
- ✅ Transcript table (will show "No data" until you scrape)
- ✅ Schedule accordion (will show "No data" until you scrape)
- ✅ Export and Clear buttons in header
- ✅ Smooth entrance animations

---

## Step 4: Test with Real Data (3 minutes)

1. Go to FAP student portal (FAP login page)
2. Click extension icon
3. Click "Scrape Data" button
4. Wait for scraping to complete
5. Open Dashboard
6. ✅ See your real transcript and schedule data!

---

## 🎨 What You Got

### Visual Features:
- ✨ RPG roguelike theme (brown + gold)
- ⚡ GSAP animations throughout
- 🎭 20 shadcn components
- 📊 Data visualization
- 💾 Export functionality

### Technical Features:
- React 19 + TypeScript
- Tailwind CSS 4
- GSAP 3.12
- WXT framework
- Browser storage integration

---

## 🐛 Common Issues

### "Extension error: Failed to load"
**Fix**: Run `npm run dev` again

### "Page not found" when opening dashboard
**Fix**: Make sure extension ID in URL is correct

### "No data showing"
**Fix**: You need to scrape data from FAP first using the popup

### Animations not working
**Fix**: Check browser console for errors, reload extension

---

## 📚 Next Steps

1. ✅ Test popup and dashboard
2. ✅ Scrape real data from FAP
3. ✅ Try exporting data (Download JSON button)
4. ✅ Explore the animations and interactions

### Want More?
- Read: [COMPLETION_SUMMARY.md](.superdesign/COMPLETION_SUMMARY.md)
- Read: [IMPLEMENTATION_GUIDE.md](.superdesign/IMPLEMENTATION_GUIDE.md)
- Check: [roguelearn_theme.css](.superdesign/design_iterations/roguelearn_theme.css)

---

## 🎯 Quick Test Checklist

### Popup:
- [ ] Loads in 600x500px window
- [ ] RPG theme applied (brown + gold)
- [ ] Tabs switch smoothly
- [ ] Scraping progress shows
- [ ] Error messages display correctly

### Dashboard:
- [ ] Opens in full browser tab
- [ ] Entrance animations play
- [ ] Header is sticky on scroll
- [ ] Stat cards hover with gold glow
- [ ] Table rows hover with highlight
- [ ] Accordion expands smoothly
- [ ] Export dialog opens
- [ ] Clear data confirmation works

---

**That's it! Your enhanced RogueLearn extension is ready! 🎉**

Questions? Check the docs in `.superdesign/` folder.
