import { test, expect, Page } from '@playwright/test'

test.describe('Roommate Chat System', () => {
  test('should display the application homepage', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('http://localhost:3000')
    
    // Take a screenshot of the homepage
    await page.screenshot({ path: 'homepage.png', fullPage: true })
    
    // Basic assertions to verify the page loaded
    await expect(page).toHaveTitle(/Roomio/)
    
    // Look for common elements that might be on the homepage
    const bodyText = await page.textContent('body')
    console.log('Page content loaded:', bodyText?.substring(0, 200) + '...')
  })

  test('should navigate to chat if available', async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Wait for the page to load
    await page.waitForTimeout(3000)
    
    // Look for any chat or messaging related elements
    const chatButton = page.locator('text=Chat').or(page.locator('text=Messages')).or(page.locator('text=💬'))
    
    if (await chatButton.isVisible()) {
      await chatButton.first().click()
      await page.waitForTimeout(2000)
      
      // Take a screenshot of the chat interface
      await page.screenshot({ path: 'chat-interface.png', fullPage: true })
      
      console.log('Chat interface accessed successfully')
    } else {
      console.log('Chat button not found on the page')
      
      // Take a screenshot to see what's actually on the page
      await page.screenshot({ path: 'no-chat-found.png', fullPage: true })
    }
  })

  test('should test responsive design', async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Test different viewport sizes
    
    // Desktop
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'desktop-1440px.png', fullPage: true })
    
    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'tablet-768px.png', fullPage: true })
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'mobile-375px.png', fullPage: true })
    
    console.log('Responsive design screenshots captured')
  })

  test('should test roommate chat features if accessible', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForTimeout(3000)
    
    // Look for any way to access the chat system
    const possibleChatEntries = [
      'text=Chat',
      'text=Messages', 
      'text=💬',
      'text=Roommate',
      '[data-testid="chat"]',
      'button:has-text("Chat")'
    ]
    
    for (const selector of possibleChatEntries) {
      try {
        const element = page.locator(selector)
        if (await element.isVisible({ timeout: 1000 })) {
          await element.first().click()
          await page.waitForTimeout(2000)
          
          // Take screenshot of the chat interface
          await page.screenshot({ 
            path: `roommate-chat-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png`, 
            fullPage: true 
          })
          
          // Test chat features if available
          await testChatFeatures(page)
          return
        }
      } catch (error) {
        console.log(`Selector ${selector} not found or not clickable`)
      }
    }
    
    console.log('No chat interface found through any selector')
  })
})

async function testChatFeatures(page: Page) {
  try {
    // Test message input
    const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]')
    if (await messageInput.isVisible({ timeout: 2000 })) {
      await messageInput.fill('Test message: Pizza $20 for splitting 🍕')
      await page.screenshot({ path: 'chat-with-test-message.png', fullPage: true })
      console.log('Message input tested successfully')
    }
    
    // Look for chat features buttons
    const featureButtons = [
      'text=Poll', 'text=📊',
      'text=Chore', 'text=🧹', 
      'text=Split', 'text=💸',
      'text=Pin', 'text=📌'
    ]
    
    for (const buttonText of featureButtons) {
      const button = page.locator(buttonText)
      if (await button.isVisible({ timeout: 1000 })) {
        console.log(`Found feature button: ${buttonText}`)
      }
    }
    
    // Test emoji reactions if available
    const reactionButton = page.locator('text=😊').or(page.locator('[data-testid="reaction-picker"]'))
    if (await reactionButton.isVisible({ timeout: 1000 })) {
      await reactionButton.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'emoji-reaction-picker.png', fullPage: true })
      console.log('Emoji reaction picker tested')
    }
    
  } catch (error) {
    console.log('Error testing chat features:', error)
  }
}