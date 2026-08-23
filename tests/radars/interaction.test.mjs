import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';
import { loadRadarFile } from '../../web/radars/validate-data.mjs';

const rendererUrl = new URL('../../web/radars/radar.js', import.meta.url);
const legalPath = new URL('../../web/radars/data/legal.js', import.meta.url);

async function setup(data) {
  const dom = new JSDOM('<!doctype html><div id="radar-error" aria-live="assertive" hidden></div><main id="radar-app"></main>', {
    url: 'http://127.0.0.1/radars/legal.html',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  dom.window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
  if (data) dom.window.OPPORTUNITY_RADAR_DATA = data;
  dom.window.eval(await readFile(rendererUrl, 'utf8'));
  dom.window.OpportunityRadar.initRadar(dom.window.document);
  return dom;
}

test('shared renderer builds all decision sections from one data object', async () => {
  const dom = await setup(await loadRadarFile(fileURLToPath(legalPath)));
  const { document } = dom.window;
  assert.equal(document.querySelectorAll('.matrix-point').length, 12);
  assert.equal(document.querySelectorAll('.scenario').length, 12);
  assert.equal(document.querySelectorAll('.pilot').length, 3);
  assert.equal(document.querySelectorAll('.gate-item').length, 6);
  assert.equal(document.querySelectorAll('.kpi-group').length, 5);
  assert.equal(document.querySelectorAll('.source-card').length, 16);
  assert.equal(document.querySelectorAll('.calibration-item').length, 5);
});

test('filters, expands, resets, and jumps from matrix to scenario', async () => {
  const dom = await setup(await loadRadarFile(fileURLToPath(legalPath)));
  const { document, MouseEvent } = dom.window;
  document.querySelector('[data-priority-filter="P0"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.equal(document.querySelectorAll('.scenario:not([hidden])').length, 3);
  assert.equal(document.querySelector('#scenario-result-count').textContent, '3 个场景');

  const firstHeader = document.querySelector('.scenario-header');
  firstHeader.click();
  assert.equal(firstHeader.getAttribute('aria-expanded'), 'true');
  assert.equal(document.querySelector(`#${firstHeader.getAttribute('aria-controls')}`).hidden, false);

  document.querySelector('[data-category-filter="disputes"]').click();
  assert.equal(document.querySelectorAll('.scenario:not([hidden])').length, 0);
  assert.equal(document.querySelector('#radar-empty').hidden, false);
  document.querySelector('#radar-empty-reset').click();
  assert.equal(document.querySelectorAll('.scenario:not([hidden])').length, 12);

  const point = document.querySelector('[data-scenario-target="legal-07"]');
  point.click();
  const target = document.querySelector('#legal-07');
  assert.equal(target.querySelector('.scenario-header').getAttribute('aria-expanded'), 'true');
  assert.equal(document.activeElement, target.querySelector('.scenario-header'));
});

test('missing data displays an explicit error instead of a blank page', async () => {
  const dom = await setup(null);
  assert.equal(dom.window.document.querySelector('#radar-error').hidden, false);
  assert.match(dom.window.document.querySelector('#radar-error').textContent, /雷达数据未加载/);
});
