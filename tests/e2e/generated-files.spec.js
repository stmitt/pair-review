// Copyright 2026 Tim Perkins (tjwp) | SPDX-License-Identifier: Apache-2.0
import { test, expect } from './fixtures.js';
for (const mode of [{name:'PR',path:'/pr/test-owner/test-repo/1'},{name:'Local',path:'/local/2'}]) {
  test(`${mode.name}: generated files toggle hides diffs and adjusts totals across reload`,async({page})=>{
    await page.route('**/api/**/diff*',async route=>{
      const response=await route.fetch();
      const data=await response.json();
      if(data.changed_files) data.changed_files=data.changed_files.map(file=>({...file,generated:file.file==='src/main.js'}));
      data.generated_files=['src/main.js'];
      await route.fulfill({response,json:data});
    });
    await page.goto(mode.path);
    const generated=page.locator('.d2h-file-wrapper[data-file-name="src/main.js"]');
    await expect(generated).toBeVisible();
    const originalAdditions=await page.locator('#pr-additions').textContent();
    await page.locator('#diff-options-btn').click();
    const toggle=page.getByLabel('Hide generated files',{exact:true});
    await toggle.check();
    await expect(generated).toBeHidden();
    await expect(page.locator('.file-item[data-path="src/main.js"]')).toHaveCount(0);
    await expect(page.locator('#pr-files-count')).toHaveText('1 file');
    await expect(page.locator('#pr-additions')).toHaveText('+5');
    await expect(page.locator('#pr-deletions')).toHaveText('-2');
    await page.reload();
    await expect(generated).toBeHidden();
    await expect(page.locator('#pr-additions')).toHaveText('+5');
    await page.locator('#diff-options-btn').click();
    await toggle.uncheck();
    await expect(generated).toBeVisible();
    await expect(page.locator('.file-item[data-path="src/main.js"]')).toHaveCount(1);
    await expect(page.locator('#pr-additions')).toHaveText(originalAdditions);
    await expect(page.locator('#pr-files-count')).toHaveText('2 files');
  });
}
