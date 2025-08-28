#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class UIImprovementAgent {
  constructor() {
    this.reportsDir = 'test-results/ui-analysis/reports';
    this.improvementsDir = 'test-results/ui-improvements';
  }

  async analyzeLatestReport() {
    try {
      if (!fs.existsSync(this.reportsDir)) {
        console.log('No UI analysis reports found. Run Playwright tests first.');
        return null;
      }

      const reportFiles = fs.readdirSync(this.reportsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => ({
          file,
          path: path.join(this.reportsDir, file),
          timestamp: fs.statSync(path.join(this.reportsDir, file)).mtime
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      if (reportFiles.length === 0) {
        console.log('No JSON reports found.');
        return null;
      }

      const latestReport = JSON.parse(fs.readFileSync(reportFiles[0].path, 'utf8'));
      console.log(`Analyzing report from: ${latestReport.timestamp}`);
      console.log(`URL: ${latestReport.url}`);
      console.log(`Console Errors: ${latestReport.consoleErrors.length}`);
      console.log(`Recommendations: ${latestReport.recommendations.length}`);

      return latestReport;
    } catch (error) {
      console.error('Error analyzing report:', error);
      return null;
    }
  }

  generateImprovementSuggestions(report) {
    const improvements = {
      critical: [],
      important: [],
      minor: [],
      accessibility: []
    };

    // Analyze console errors
    report.consoleErrors.forEach(error => {
      if (error.type === 'error') {
        improvements.critical.push({
          type: 'Console Error',
          description: error.text,
          location: error.location,
          suggestion: this.getErrorSuggestion(error.text)
        });
      } else if (error.type === 'warning') {
        improvements.important.push({
          type: 'Console Warning',
          description: error.text,
          location: error.location,
          suggestion: this.getWarningSuggestion(error.text)
        });
      }
    });

    // Analyze recommendations
    report.recommendations.forEach(rec => {
      if (rec.includes('accessibility') || rec.includes('aria-label') || rec.includes('alt text')) {
        improvements.accessibility.push({
          type: 'Accessibility',
          description: rec,
          suggestion: this.getAccessibilitySuggestion(rec)
        });
      } else if (rec.includes('contrast')) {
        improvements.important.push({
          type: 'Visual Design',
          description: rec,
          suggestion: 'Review color contrast ratios and update CSS to meet WCAG 2.1 AA standards (4.5:1 for normal text)'
        });
      } else {
        improvements.minor.push({
          type: 'UI Enhancement',
          description: rec,
          suggestion: rec
        });
      }
    });

    return improvements;
  }

  getErrorSuggestion(errorText) {
    const errorMap = {
      'hydration': 'Fix hydration mismatch by ensuring server and client render the same content. Check for browser-only code running on server.',
      'network': 'Handle network errors gracefully with try-catch blocks and user-friendly error messages.',
      'undefined': 'Add null/undefined checks before accessing object properties.',
      'permission': 'Add proper error handling for permission-related features (camera, location, etc.).',
      'cors': 'Configure CORS properly on your backend or use a proxy for development.'
    };

    for (const [key, suggestion] of Object.entries(errorMap)) {
      if (errorText.toLowerCase().includes(key)) {
        return suggestion;
      }
    }

    return 'Investigate and fix this console error to improve user experience and app stability.';
  }

  getWarningSuggestion(warningText) {
    const warningMap = {
      'deprecated': 'Update to use the latest API. Check documentation for migration guide.',
      'performance': 'Optimize performance by addressing the reported issue.',
      'security': 'Review and fix potential security vulnerabilities.'
    };

    for (const [key, suggestion] of Object.entries(warningMap)) {
      if (warningText.toLowerCase().includes(key)) {
        return suggestion;
      }
    }

    return 'Address this warning to improve code quality and prevent future issues.';
  }

  getAccessibilitySuggestion(recommendation) {
    if (recommendation.includes('alt text')) {
      return 'Add descriptive alt attributes to images. Use alt="" for decorative images.';
    } else if (recommendation.includes('aria-label')) {
      return 'Add aria-label attributes to provide accessible names for interactive elements.';
    } else if (recommendation.includes('label')) {
      return 'Associate form inputs with labels using the for attribute or wrap inputs in label elements.';
    }
    
    return 'Follow WCAG 2.1 guidelines to ensure your app is accessible to all users.';
  }

  generateActionableTasks(improvements) {
    const tasks = [];

    // Critical issues first
    improvements.critical.forEach((issue, index) => {
      tasks.push({
        priority: 'HIGH',
        title: `Fix Critical Error: ${issue.description.substring(0, 50)}...`,
        description: issue.suggestion,
        location: issue.location,
        category: 'Bug Fix'
      });
    });

    // Accessibility issues
    improvements.accessibility.forEach((issue, index) => {
      tasks.push({
        priority: 'HIGH',
        title: `Accessibility: ${issue.description.substring(0, 50)}...`,
        description: issue.suggestion,
        category: 'Accessibility'
      });
    });

    // Important issues
    improvements.important.forEach((issue, index) => {
      tasks.push({
        priority: 'MEDIUM',
        title: `${issue.type}: ${issue.description.substring(0, 50)}...`,
        description: issue.suggestion,
        location: issue.location,
        category: 'Enhancement'
      });
    });

    // Minor issues
    improvements.minor.forEach((issue, index) => {
      tasks.push({
        priority: 'LOW',
        title: `UI Enhancement: ${issue.description.substring(0, 50)}...`,
        description: issue.suggestion,
        category: 'Polish'
      });
    });

    return tasks;
  }

  saveImprovementPlan(report, improvements, tasks) {
    if (!fs.existsSync(this.improvementsDir)) {
      fs.mkdirSync(this.improvementsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const planPath = path.join(this.improvementsDir, `improvement-plan-${timestamp}.json`);
    
    const plan = {
      reportInfo: {
        url: report.url,
        timestamp: report.timestamp,
        errorsCount: report.consoleErrors.length,
        recommendationsCount: report.recommendations.length
      },
      improvements,
      tasks,
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));

    // Generate markdown version
    const markdownPlan = this.generateMarkdownPlan(plan);
    const mdPath = path.join(this.improvementsDir, `improvement-plan-${timestamp}.md`);
    fs.writeFileSync(mdPath, markdownPlan);

    console.log(`\nImprovement plan saved to:`);
    console.log(`JSON: ${planPath}`);
    console.log(`Markdown: ${mdPath}`);

    return { jsonPath: planPath, mdPath };
  }

  generateMarkdownPlan(plan) {
    const { reportInfo, improvements, tasks } = plan;
    
    return `# UI Improvement Plan

## Report Summary
- **URL**: ${reportInfo.url}
- **Analyzed**: ${reportInfo.timestamp}
- **Console Errors**: ${reportInfo.errorsCount}
- **Recommendations**: ${reportInfo.recommendationsCount}
- **Generated**: ${plan.generatedAt}

## Task Overview
- **High Priority**: ${tasks.filter(t => t.priority === 'HIGH').length}
- **Medium Priority**: ${tasks.filter(t => t.priority === 'MEDIUM').length}
- **Low Priority**: ${tasks.filter(t => t.priority === 'LOW').length}

## Tasks by Priority

### 🔴 High Priority
${tasks.filter(t => t.priority === 'HIGH').map(task => `
- [ ] **${task.title}**
  - Category: ${task.category}
  - Description: ${task.description}
  ${task.location ? `- Location: ${task.location}` : ''}
`).join('')}

### 🟡 Medium Priority
${tasks.filter(t => t.priority === 'MEDIUM').map(task => `
- [ ] **${task.title}**
  - Category: ${task.category}
  - Description: ${task.description}
  ${task.location ? `- Location: ${task.location}` : ''}
`).join('')}

### 🟢 Low Priority
${tasks.filter(t => t.priority === 'LOW').map(task => `
- [ ] **${task.title}**
  - Category: ${task.category}
  - Description: ${task.description}
`).join('')}

## Detailed Analysis

### Critical Issues (${improvements.critical.length})
${improvements.critical.map(issue => `
**${issue.type}**: ${issue.description}
- Suggestion: ${issue.suggestion}
${issue.location ? `- Location: ${issue.location}` : ''}
`).join('')}

### Accessibility Issues (${improvements.accessibility.length})
${improvements.accessibility.map(issue => `
**${issue.type}**: ${issue.description}
- Suggestion: ${issue.suggestion}
`).join('')}

### Important Issues (${improvements.important.length})
${improvements.important.map(issue => `
**${issue.type}**: ${issue.description}
- Suggestion: ${issue.suggestion}
${issue.location ? `- Location: ${issue.location}` : ''}
`).join('')}

### Minor Issues (${improvements.minor.length})
${improvements.minor.map(issue => `
**${issue.type}**: ${issue.description}
- Suggestion: ${issue.suggestion}
`).join('')}

---
*Generated by UI Improvement Agent*`;
  }

  async run() {
    console.log('🔍 UI Improvement Agent Starting...\n');

    const report = await this.analyzeLatestReport();
    if (!report) {
      console.log('No report to analyze. Run: npm run test:e2e');
      return;
    }

    console.log('\n📊 Analyzing issues and generating improvements...');
    const improvements = this.generateImprovementSuggestions(report);

    console.log('\n✅ Generating actionable tasks...');
    const tasks = this.generateActionableTasks(improvements);

    console.log('\n💾 Saving improvement plan...');
    const paths = this.saveImprovementPlan(report, improvements, tasks);

    console.log('\n🎯 Summary:');
    console.log(`- Critical issues: ${improvements.critical.length}`);
    console.log(`- Accessibility issues: ${improvements.accessibility.length}`);
    console.log(`- Important issues: ${improvements.important.length}`);
    console.log(`- Minor issues: ${improvements.minor.length}`);
    console.log(`- Total tasks: ${tasks.length}`);

    console.log('\n📋 Next Steps:');
    console.log('1. Review the generated improvement plan');
    console.log('2. Prioritize tasks based on your project needs');
    console.log('3. Fix critical and accessibility issues first');
    console.log('4. Re-run tests to verify improvements');
    
    return paths;
  }
}

// Run the agent if called directly
if (require.main === module) {
  const agent = new UIImprovementAgent();
  agent.run().catch(console.error);
}

module.exports = UIImprovementAgent;