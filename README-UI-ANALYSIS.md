# UI Analysis & Auto-Improvement System

This system automatically captures console errors, takes screenshots, and generates actionable improvement suggestions for your UI.

## Quick Start

```bash
# Run the full UI analysis and improvement workflow
npm run ui:full-flow

# Or run steps individually:
npm run ui:analyze  # Capture errors & screenshots
npm run ui:improve  # Generate improvement plan
```

## How It Works

### 1. Console Error Capture
- Automatically captures all console errors and warnings
- Records stack traces and locations
- Timestamps each error for tracking

### 2. Screenshot Automation
- Takes full-page screenshots automatically
- Captures initial page load and after content loads
- Screenshots saved to `test-results/ui-analysis/screenshots/`

### 3. UI Analysis
- Scans for accessibility issues (missing alt text, labels, etc.)
- Checks for UI problems (buttons without text, form issues)
- Analyzes color contrast issues
- All findings saved to JSON and HTML reports

### 4. Improvement Agent
- Processes analysis reports automatically
- Categorizes issues by priority (Critical, Important, Minor, Accessibility)
- Generates actionable tasks with specific suggestions
- Creates markdown todo lists for easy tracking

## File Structure

```
test-results/
├── ui-analysis/
│   ├── screenshots/        # Auto-captured screenshots  
│   └── reports/           # JSON and HTML analysis reports
└── ui-improvements/       # Generated improvement plans
    ├── improvement-plan-*.json
    └── improvement-plan-*.md
```

## Configuration

### Playwright Config
The system is configured to:
- Capture screenshots on every test run
- Record videos on failure
- Generate JSON reports for analysis
- Listen for all console messages

### Custom Test Pages
Edit `tests/ui-analysis.spec.ts` to analyze different pages:

```javascript
test('Analyze your custom page', async ({ page }) => {
  const analyzer = new UIAnalyzer(page);
  
  await page.goto('/your-page');
  await page.waitForLoadState('networkidle');
  
  await analyzer.takeScreenshot('your-page');
  const recommendations = await analyzer.analyzeUIElements();
  
  const report = analyzer.generateReport(page.url());
  report.recommendations = recommendations;
  await analyzer.saveReport(report);
});
```

## Features

### Console Error Tracking
- ✅ JavaScript errors
- ✅ Network failures  
- ✅ Permission errors
- ✅ Hydration mismatches
- ✅ React warnings

### UI Issue Detection
- ✅ Missing alt text on images
- ✅ Buttons without accessible text
- ✅ Form inputs without labels
- ✅ Color contrast problems
- ✅ Missing ARIA labels

### Auto-Generated Improvements
- 🔴 **Critical**: Console errors, broken functionality
- 🟡 **Important**: Performance, security warnings
- 🔵 **Accessibility**: WCAG compliance issues
- 🟢 **Minor**: UI polish and enhancements

## Advanced Usage

### Running Specific Analyses
```bash
# Only analyze specific test files
npx playwright test tests/ui-analysis.spec.ts --grep "main page"

# Run with specific browser
npx playwright test tests/ui-analysis.spec.ts --project=chromium

# Debug mode with UI
npm run test:e2e:ui tests/ui-analysis.spec.ts
```

### Custom Improvements Agent
You can extend the improvement agent by modifying `scripts/ui-improvement-agent.js`:

```javascript
// Add custom error patterns
getErrorSuggestion(errorText) {
  const customMap = {
    'your-error-pattern': 'Your specific solution'
  };
  // ... existing logic
}
```

## Integration with Development Workflow

### 1. During Development
```bash
# Quick check while coding
npm run ui:analyze
```

### 2. Before Deployment
```bash
# Full analysis and improvement planning
npm run ui:full-flow
```

### 3. CI/CD Integration
Add to your GitHub Actions or CI pipeline:
```yaml
- name: UI Analysis
  run: npm run ui:analyze
  
- name: Upload Analysis Results
  uses: actions/upload-artifact@v3
  with:
    name: ui-analysis-results
    path: test-results/
```

## Troubleshooting

### No Reports Generated
1. Ensure your dev server is running (`npm run dev`)
2. Check that pages load correctly at `http://localhost:3000`
3. Verify test files are in the `tests/` directory

### Missing Screenshots
1. Check that the `test-results` directory has write permissions
2. Ensure sufficient disk space
3. Try running with `--headed` flag to see browser actions

### Error Analysis Not Working
1. Verify Node.js version (requires Node 14+)
2. Check that the scripts have execute permissions
3. Run `npm install` to ensure all dependencies are installed

## Viewing Results

### HTML Reports
Open `test-results/ui-analysis/reports/ui-report-*.html` in your browser for visual reports.

### Improvement Plans
Check `test-results/ui-improvements/improvement-plan-*.md` for prioritized task lists.

### Screenshots
Review captured screenshots in `test-results/ui-analysis/screenshots/` to see visual issues.

---

This system runs completely automatically and provides actionable insights to improve your UI quality and user experience.