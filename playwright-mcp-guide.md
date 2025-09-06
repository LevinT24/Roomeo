# Playwright MCP Server Usage Guide

This guide demonstrates how to use the Playwright MCP server with Claude Desktop for various browser automation tasks.

## Prerequisites

- Playwright MCP server installed (`@playwright/mcp`)
- Claude Desktop configured with the MCP server
- Restart Claude Desktop after configuration

## 1. Taking Screenshots of Web Pages

### Example Prompt:
```
Please take a screenshot of https://example.com and save it as example-homepage.png
```

### What it does:
- Opens a browser instance
- Navigates to the specified URL
- Captures a full-page screenshot
- Saves the image with the specified filename

### Advanced Screenshot Example:
```
Take a screenshot of https://github.com showing only the main content area (exclude header and footer), and make it mobile viewport size
```

## 2. Interacting with Web Elements

### Example Prompts:

#### Basic Interaction:
```
Go to https://google.com, search for "Playwright automation", and click on the first search result
```

#### Form Filling:
```
Navigate to https://example-form.com, fill in the name field with "John Doe", email with "john@example.com", select "Developer" from the role dropdown, and submit the form
```

#### Complex Interactions:
```
Go to https://shopping-site.com, add the first three products to cart, then proceed to checkout and fill in the shipping information
```

### What it does:
- Locates elements using various selectors (text, CSS, XPath)
- Performs clicks, typing, form submissions
- Handles dropdowns, checkboxes, and other form elements
- Can chain multiple interactions in sequence

## 3. Running Automated Browser Tests

### Example Prompts:

#### Simple Test:
```
Create and run a test that verifies the title of https://example.com is "Example Domain"
```

#### Login Test:
```
Test the login functionality on https://myapp.com/login using username "testuser" and password "testpass123", then verify we reach the dashboard page
```

#### E-commerce Test:
```
Run a complete user journey test: visit https://store.com, search for "laptop", add a product to cart, verify cart contents, and check that checkout page loads
```

### What it does:
- Creates structured test scenarios
- Includes assertions and validations
- Reports pass/fail results
- Can test multiple user flows
- Provides detailed error reporting

## 4. Scraping Web Content

### Example Prompts:

#### Basic Scraping:
```
Scrape all the headlines from https://news-site.com and return them as a list
```

#### Product Information:
```
Go to https://product-page.com/item/123 and extract the product name, price, description, and availability status
```

#### Table Data:
```
Scrape the data table from https://data-site.com/reports and convert it to JSON format
```

#### Multiple Pages:
```
Scrape the first 5 pages of search results from https://jobs-site.com/search?q=developer and extract job titles, companies, and locations
```

### What it does:
- Extracts text, links, images, and structured data
- Handles dynamic content loaded by JavaScript
- Can navigate multiple pages
- Formats data in requested structure (JSON, CSV, etc.)
- Respects page loading and timing

## 5. Executing JavaScript in Browser Contexts

### Example Prompts:

#### DOM Manipulation:
```
Go to https://example.com and execute JavaScript to change the background color to blue and highlight all links in yellow
```

#### Data Extraction:
```
Navigate to https://dashboard.com and run JavaScript to extract all the chart data from the page and return it as an array
```

#### Performance Testing:
```
Visit https://mysite.com and execute JavaScript to measure page load time, number of DOM elements, and memory usage
```

#### Custom Functions:
```
Go to https://calculator-app.com and execute JavaScript to perform a complex calculation: (25 * 4) + (100 / 5) - 15, then verify the result matches our expected value of 105
```

### What it does:
- Executes custom JavaScript code in the browser context
- Can access and modify DOM elements
- Retrieve computed values and data
- Measure performance metrics
- Handle complex browser-based calculations

## Tips for Better Results

### 1. Be Specific
- Provide exact URLs
- Specify element selectors when possible
- Include expected outcomes for validation

### 2. Handle Wait Times
```
Wait for the page to fully load before taking a screenshot of the dynamic dashboard at https://analytics.com
```

### 3. Error Handling
```
Try to click the "Submit" button on the form, but if it's disabled, first fill in all required fields marked with red asterisks
```

### 4. Multiple Steps
```
1. Go to https://ecommerce.com
2. Search for "wireless headphones"
3. Filter by price range $50-$100
4. Sort by customer rating
5. Take a screenshot of the results
6. Click on the highest-rated product
7. Extract the product details and reviews
```

### 5. Data Validation
```
Scrape the weather data from https://weather.com for New York and verify that the temperature is a valid number between -50 and 150 degrees Fahrenheit
```

## Common Use Cases

### Website Testing
- Functional testing of web applications
- Cross-browser compatibility checks
- Performance monitoring
- Accessibility testing

### Data Collection
- Market research and competitor analysis
- Price monitoring
- Content aggregation
- Lead generation

### Automation
- Social media posting
- Form submissions
- Report generation
- Monitoring and alerting

### Quality Assurance
- Regression testing
- User acceptance testing
- Load testing preparation
- Bug reproduction

## Troubleshooting

### Common Issues:
1. **Page not loading**: Add explicit wait times
2. **Element not found**: Use more specific selectors
3. **Timeout errors**: Increase wait times for slow pages
4. **Authentication**: Include login steps in your prompt

### Best Practices:
- Always specify full URLs (include https://)
- Be patient with dynamic content
- Use descriptive filenames for screenshots
- Test prompts step-by-step for complex workflows

## Security and Ethics

- Only automate interactions with websites you own or have permission to test
- Respect robots.txt and rate limiting
- Don't use for malicious scraping or unauthorized access
- Consider website terms of service

---

*Note: Make sure Claude Desktop is restarted after configuring the MCP server for these features to work properly.*