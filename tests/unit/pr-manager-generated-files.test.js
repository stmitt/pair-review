// Copyright 2026 Tim Perkins (tjwp) | SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { mergeFileListWithContext } from '../../public/js/modules/file-list-merger.js';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
let manager, document;
beforeEach(()=>{
  document=new JSDOM('<div id="diff-container"><div class="generated-file"></div></div><div id="file-list"></div><span id="sidebar-file-count"></span><span id="pr-files-count"></span><span id="pr-additions"></span><span id="pr-deletions"></span>').window.document;
  const sandbox={document,window:{FileListMerger:{mergeFileListWithContext}}, console, module:{exports:{}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../public/js/pr.js'),'utf8'),sandbox);
  manager=Object.create(sandbox.module.exports.PRManager.prototype);
  manager.contextFiles=[];
  manager.hideGenerated=false;
  manager.setupSidebarToggle=vi.fn();
  manager.renderFileGroup=vi.fn((directory,files)=>{const div=document.createElement('div');div.textContent=files.map(f=>f.name).join(',');return div;});
});
const files=[{file:'src/app.js',insertions:5,deletions:2},{file:'generated/output.js',insertions:1000,deletions:500,generated:true}];
describe('generated file filtering',()=>{
  it('hides sidebar entries, excludes their totals, and restores them without losing state',()=>{
    manager.updateFileList(files);
    manager.viewedFiles=new Set(['generated/output.js']);
    expect(document.getElementById('pr-additions').textContent).toBe('+1005');
    manager.handleGeneratedToggle(true);
    expect(document.getElementById('diff-container').classList.contains('hide-generated-files')).toBe(true);
    expect(document.getElementById('file-list').textContent).not.toContain('output.js');
    expect(document.getElementById('pr-additions').textContent).toBe('+5');
    expect(document.getElementById('pr-deletions').textContent).toBe('-2');
    expect(document.getElementById('pr-files-count').textContent).toBe('1 file');
    expect(document.getElementById('sidebar-file-count').textContent).toBe('1');
    expect(manager.diffFiles).toHaveLength(2);
    manager.handleGeneratedToggle(false);
    expect(document.getElementById('file-list').textContent).toContain('output.js');
    expect(document.getElementById('pr-deletions').textContent).toBe('-502');
    expect(manager.viewedFiles.has('generated/output.js')).toBe(true);
  });
  it('keeps context entries visible without including them in changed-line totals',()=>{
    manager.contextFiles=[{file:'reference.js',id:1,line_start:1,line_end:4}];
    manager.updateFileList(files);
    manager.handleGeneratedToggle(true);
    expect(document.getElementById('file-list').textContent).toContain('reference.js');
    expect(document.getElementById('sidebar-file-count').textContent).toBe('2');
    expect(document.getElementById('pr-files-count').textContent).toBe('1 file');
  });
  it('supports all-generated diffs, empty lists, binary files, and additions aliases',()=>{
    manager.hideGenerated=true;
    manager.updateFileList([files[1]]);
    expect(document.getElementById('pr-additions').textContent).toBe('+0');
    expect(document.getElementById('sidebar-file-count').textContent).toBe('0');
    expect(document.getElementById('file-list').textContent).toContain('All changed files are generated');
    manager.updateFileList([{file:'image.png',binary:true},{file:'app.js',additions:3}]);
    expect(document.getElementById('pr-additions').textContent).toBe('+3');
    manager.updateFileList([]);
    expect(document.getElementById('pr-files-count').textContent).toBe('0 files');
  });
  it('can apply a persisted preference before any diff has loaded',()=>{
    expect(()=>manager.handleGeneratedToggle(true)).not.toThrow();
    manager.updateFileList(files);
    expect(document.getElementById('pr-additions').textContent).toBe('+5');
  });
});
