// Copyright 2026 Tim Perkins (tjwp) | SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, afterEach } from 'vitest';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { getGeneratedFilePatterns, getGeneratedFiles } = require('../../src/git/gitattributes');
let repo;
afterEach(() => { if(repo) fs.rmSync(repo, {recursive:true, force:true}); });
describe('Git-resolved generated attributes', () => {
  it('honors nested attributes, override order, unset values, and quoted paths', async () => {
    repo=fs.mkdtempSync(path.join(os.tmpdir(),'generated-attributes-'));
    execFileSync('git',['init',repo],{stdio:'ignore'});
    fs.mkdirSync(path.join(repo,'nested'));
    fs.writeFileSync(path.join(repo,'.gitattributes'), '*.js linguist-generated\nkeep.js -linguist-generated\nreset.js !linguist-generated\nfalse.js linguist-generated=false\n"space name.txt" linguist-generated=true\n');
    fs.writeFileSync(path.join(repo,'nested/.gitattributes'),'manual.js -linguist-generated\n*.txt linguist-generated=true\n');
    const paths=['generated.js','keep.js','reset.js','false.js','space name.txt','nested/manual.js','nested/output.txt','normal.txt'];
    const parser=await getGeneratedFilePatterns(repo,paths);
    expect(paths.filter(file=>parser.isGenerated(file))).toEqual(['generated.js','space name.txt','nested/output.txt']);
    expect([...await getGeneratedFiles(repo,paths)]).toEqual(['generated.js','space name.txt','nested/output.txt']);
  });
  it('does not run Git when the file list is empty', async () => {
    const parser=await getGeneratedFilePatterns('/missing',[],{runGit:()=>{throw new Error('Unexpected Git invocation');}});
    expect(parser.isGenerated('normal.txt')).toBe(false);
  });
  it('propagates Git failures rather than silently misclassifying overrides', async () => {
    await expect(getGeneratedFilePatterns('/missing',['file'],{runGit:async()=>{throw new Error('Git unavailable');}})).rejects.toThrow('Git unavailable');
  });
});
