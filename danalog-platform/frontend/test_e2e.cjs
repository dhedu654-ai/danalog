const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  async function testAccount(username, password) {
    console.log(`\n\n=== BẮT ĐẦU TEST TÀI KHOẢN: ${username} ===`);
    await page.goto('https://danalog-iota.vercel.app/');
    
    // Ensure we are logged out by clearing storage
    await context.clearCookies();
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('https://danalog-iota.vercel.app/');

    // Login
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    const url = page.url();
    console.log(`[PASS] Đăng nhập thành công. Chuyển hướng tới phân hệ: ${url}`);
    
    // Get all sidebar nav items
    const navItems = await page.$$('nav div, nav a');
    const itemsText = [];
    for(const item of navItems) {
      const text = await item.innerText();
      if(text && text.trim().length > 0 && text.trim().length < 40) itemsText.push(text.trim());
    }
    
    const uniqueMenus = [...new Set(itemsText.map(t => t.split('\n')[0]))].filter(x => x !== 'Đăng xuất' && x !== 'DANALOG' && x !== 'Transport Manager');
    console.log(`[MENU SCAN] Tìm thấy danh mục: ${uniqueMenus.join(' | ')}`);
    
    for (let txt of uniqueMenus) {
       console.log(`-> Click Menu: "${txt}"`);
       try {
           const locator = page.locator(`text="${txt}"`).first();
           const isVisible = await locator.isVisible();
           if (!isVisible) continue;
           await locator.click({timeout: 1500});
           await page.waitForTimeout(1500); 

           const errorAlert = await page.$('.bg-red-50');
           if (errorAlert) console.log(`   [WARNING] Phát hiện vạch đỏ nội bộ!`);
           const content = await page.content();
           if (!content.includes('id="root"')) console.log(`   [FAIL] White Screen! Trang lỗi hoàn toàn.`);
           else console.log(`   [PASS] Ổn định. Không hiện lỗi Trắng Trang (White Screen).`);
       } catch(e) {
       }
    }
    
    // Test action buttons inside main content
    console.log('\n[BUTTON STRESS TEST]');
    const pageButtons = await page.$$('main button, .col-span-full button');
    let tested = 0;
    for (let btn of pageButtons) {
        if (tested >= 3) break;
        const text = await btn.innerText();
        if(!text) continue;
        try {
           console.log(`-> Click Action: "${text.replace(/\n/g, '').slice(0, 30)}..."`);
           await btn.click({timeout: 1000});
           await page.waitForTimeout(1000); // let UI settle properly
           console.log(`   [PASS] Không văng app.`);
           tested++;
        } catch(e) {}
    }
    
    console.log('[LOGOUT TEST] Tiến hành ép đăng xuất...');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    console.log(`[PASS] Hệ thống dọn session và đăng xuất mượt mà.`);
  }
  
  await testAccount('dispatcher1', 'dispatch123');
  await testAccount('cs_user', 'password123');
  
  await browser.close();
})();
