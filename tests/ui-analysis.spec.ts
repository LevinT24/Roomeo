import { test, expect, Page } from '@playwright/test';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface ConsoleError {
  type: string;
  text: string;
  location?: string;
  timestamp: string;
  url: string;
}

interface UIAnalysisReport {
  url: string;
  timestamp: string;
  consoleErrors: ConsoleError[];
  screenshots: string[];
  recommendations: string[];
}

class UIAnalyzer {
  private consoleErrors: ConsoleError[] = [];
  private screenshots: string[] = [];
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.setupConsoleCapture();
  }

  private setupConsoleCapture() {
    this.page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        this.consoleErrors.push({
          type: msg.type(),
          text: msg.text(),
          location: msg.location()?.url,
          timestamp: new Date().toISOString(),
          url: this.page.url()
        });
      }
    });

    this.page.on('pageerror', (error) => {
      this.consoleErrors.push({
        type: 'pageerror',
        text: error.message,
        location: error.stack,
        timestamp: new Date().toISOString(),
        url: this.page.url()
      });
    });
  }

  async takeScreenshot(name: string): Promise<string> {
    const screenshotDir = 'test-results/ui-analysis/screenshots';
    if (!existsSync(screenshotDir)) {
      mkdirSync(screenshotDir, { recursive: true });
    }
    
    const filename = `${name}-${Date.now()}.png`;
    const path = join(screenshotDir, filename);
    
    await this.page.screenshot({ 
      path,
      fullPage: true,
      animations: 'disabled'
    });
    
    this.screenshots.push(path);
    return path;
  }

  async analyzeUIElements() {
    const recommendations: string[] = [];
    
    // Check for common UI issues
    const buttons = await this.page.locator('button, [role="button"]').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const isVisible = await button.isVisible();
      
      if (isVisible && (!text || text.trim() === '')) {
        recommendations.push('Button without text content found - consider adding aria-label or visible text');
      }
    }

    // Check for images without alt text
    const images = await this.page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const isVisible = await img.isVisible();
      
      if (isVisible && (!alt || alt.trim() === '')) {
        recommendations.push('Image without alt text found - add descriptive alt attribute for accessibility');
      }
    }

    // Check for form inputs without labels
    const inputs = await this.page.locator('input, textarea, select').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const isVisible = await input.isVisible();
      
      if (isVisible && !ariaLabel) {
        if (id) {
          const label = await this.page.locator(`label[for="${id}"]`).count();
          if (label === 0) {
            recommendations.push(`Input with id="${id}" has no associated label - add a label element`);
          }
        } else {
          recommendations.push('Input without id or aria-label found - add proper labeling for accessibility');
        }
      }
    }

    // Check for low contrast text (basic check)
    const textElements = await this.page.locator('p, span, div, h1, h2, h3, h4, h5, h6').all();
    for (const element of textElements.slice(0, 10)) { // Limit to first 10 to avoid performance issues
      const color = await element.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
          fontSize: style.fontSize
        };
      });
      
      if (color.color === 'rgb(128, 128, 128)' || color.color.includes('gray')) {
        recommendations.push('Potential low contrast text detected - verify color contrast meets WCAG guidelines');
      }
    }

    return recommendations;
  }

  generateReport(url: string): UIAnalysisReport {
    return {
      url,
      timestamp: new Date().toISOString(),
      consoleErrors: this.consoleErrors,
      screenshots: this.screenshots,
      recommendations: []
    };
  }

  async saveReport(report: UIAnalysisReport) {
    const reportsDir = 'test-results/ui-analysis/reports';
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }
    
    const filename = `ui-report-${Date.now()}.json`;
    const path = join(reportsDir, filename);
    
    writeFileSync(path, JSON.stringify(report, null, 2));
    
    // Also create a readable HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = join(reportsDir, `ui-report-${Date.now()}.html`);
    writeFileSync(htmlPath, htmlReport);
    
    console.log(`UI Analysis Report saved to: ${path}`);
    console.log(`HTML Report saved to: ${htmlPath}`);
    
    return { jsonPath: path, htmlPath };
  }

  private generateHTMLReport(report: UIAnalysisReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>UI Analysis Report - ${report.url}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .error { background: #ffebee; border-left: 4px solid #f44336; padding: 10px; margin: 10px 0; }
        .warning { background: #fff3e0; border-left: 4px solid #ff9800; padding: 10px; margin: 10px 0; }
        .recommendation { background: #e8f5e8; border-left: 4px solid #4caf50; padding: 10px; margin: 10px 0; }
        .screenshot { margin: 10px 0; }
        .screenshot img { max-width: 300px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>UI Analysis Report</h1>
        <p><strong>URL:</strong> ${report.url}</p>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
    </div>
    
    <div class="section">
        <h2>Console Errors (${report.consoleErrors.length})</h2>
        ${report.consoleErrors.map(error => `
            <div class="${error.type === 'error' ? 'error' : 'warning'}">
                <strong>[${error.type.toUpperCase()}]</strong> ${error.text}
                ${error.location ? `<br><small>Location: ${error.location}</small>` : ''}
                <br><small>Time: ${error.timestamp}</small>
            </div>
        `).join('')}
    </div>
    
    <div class="section">
        <h2>Recommendations (${report.recommendations.length})</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation">
                ${rec}
            </div>
        `).join('')}
    </div>
    
    <div class="section">
        <h2>Screenshots</h2>
        ${report.screenshots.map(screenshot => `
            <div class="screenshot">
                <img src="${screenshot}" alt="UI Screenshot" />
                <p><small>${screenshot}</small></p>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }
}

test.describe('UI Analysis Tests', () => {
  test('Analyze main page for UI issues and console errors', async ({ page }) => {
    const analyzer = new UIAnalyzer(page);
    
    // Navigate to main page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await analyzer.takeScreenshot('main-page-initial');
    
    // Wait for any dynamic content
    await page.waitForTimeout(2000);
    
    // Take screenshot after content loads
    await analyzer.takeScreenshot('main-page-loaded');
    
    // Analyze UI elements
    const recommendations = await analyzer.analyzeUIElements();
    
    // Generate and save report
    const report = analyzer.generateReport(page.url());
    report.recommendations = recommendations;
    
    await analyzer.saveReport(report);
    
    // Log summary for immediate feedback
    console.log(`Found ${report.consoleErrors.length} console errors`);
    console.log(`Generated ${recommendations.length} UI recommendations`);
    
    // Fail test if there are errors (optional - you can remove this)
    if (report.consoleErrors.length > 0) {
      console.warn('Console errors detected:', report.consoleErrors);
    }
  });

  test('Analyze authentication page', async ({ page }) => {
    const analyzer = new UIAnalyzer(page);
    
    await page.goto('/auth/login'); // Adjust path based on your auth page
    await page.waitForLoadState('networkidle');
    
    await analyzer.takeScreenshot('auth-page');
    
    const recommendations = await analyzer.analyzeUIElements();
    const report = analyzer.generateReport(page.url());
    report.recommendations = recommendations;
    
    await analyzer.saveReport(report);
  });

  test('Analyze chat page', async ({ page }) => {
    const analyzer = new UIAnalyzer(page);
    
    // You might need to handle authentication first
    await page.goto('/chat-demo');
    await page.waitForLoadState('networkidle');
    
    await analyzer.takeScreenshot('chat-page');
    
    const recommendations = await analyzer.analyzeUIElements();
    const report = analyzer.generateReport(page.url());
    report.recommendations = recommendations;
    
    await analyzer.saveReport(report);
  });
});