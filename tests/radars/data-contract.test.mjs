import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadRadarFile, validateRadarData } from '../../web/radars/validate-data.mjs';

const radarRoot = fileURLToPath(new URL('../../web/radars/', import.meta.url));

test('validator rejects an incomplete radar', () => {
  assert.throws(() => validateRadarData({ id: 'broken' }, { radarRoot }), /title/);
});

for (const domain of ['legal', 'hr']) {
  test(`${domain} radar satisfies the shared contract`, async () => {
    const data = await loadRadarFile(`${radarRoot}/data/${domain}.js`);
    const result = validateRadarData(data, { radarRoot });
    assert.deepEqual(result, { id: domain, scenarios: 12, p0: 3, pilots: 3, gates: 6, kpis: 5, calibrations: 5 });
  });
}

test('legal radar preserves the attachment scenarios, scores, and sources', async () => {
  const legal = await loadRadarFile(`${radarRoot}/data/legal.js`);
  const expectedScenarios = [
    ['标准合同审查、生成与红线比对', 'P0', 5, 5],
    ['法务统一入口、自动分流与知识问答', 'P0', 4.5, 5],
    ['存量合同搜索、条款抽取与履约预警', 'P0', 5, 4],
    ['法律检索、法规问答与文书初稿', 'P1', 4, 4.5],
    ['隐私权请求、数据映射与合规工作流', 'P1', 4.5, 4],
    ['外部律师账单审核与律所选择', 'P1', 4, 4.5],
    ['诉讼取证、内部调查与批量文档审阅', 'P2', 5, 3.5],
    ['法规变化监测、适用性判断与控制映射', 'P2', 4.5, 3.5],
    ['并购尽调与交易文件分析', 'P2', 4.5, 3.5],
    ['知识产权组合、申请与期限管理', 'P2', 4, 3.5],
    ['诉讼策略、结果预测与谈判辅助', 'P3', 4, 3],
    ['AI 自主谈判、接受条款或签署', 'P3', 4.5, 1.5],
  ];
  assert.deepEqual(legal.scenarios.map(({ title, priority, value, feasibility }) => [title, priority, value, feasibility]), expectedScenarios);
  assert.deepEqual(legal.sources.map((source) => source.url), [
    'https://www.luminance.com/customers/how-luminances-legal-grade-ai-is-transforming-trench-groups-contract-activity/',
    'https://www.icertis.com/customers/customer-stories/alpla-transforms-legal-operations-and-risk-management-with-icertis-generative-ai/',
    'https://ironcladapp.com/customers/signifyd-ai',
    'https://joseflegal.com/case-studies/how-bupas-legal-team-sparked-company-wide-innovation-with-self-service-tools/',
    'https://legal.thomsonreuters.com/en/insights/case-studies/turbocharging-legal-tasks-with-cocounsel-generative-ai',
    'https://mena.thomsonreuters.com/en/customer-stories/salik-cocounsel.html',
    'https://www.relativity.com/resources/customers/kroll-relativity-air-for-review/',
    'https://www.onetrust.com/customers/wipro/',
    'https://brightflag.com/resources/smbc-outside-counsel-management/',
    'https://www.persuit.com/customer-stories/customer-story-1',
    'https://www.anaqua.com/de/resource/microsoft-futureproofs-ip-management-with-anaqua/',
    'https://www.harvey.ai/customers/repsol',
    'https://help.aliyun.com/zh/model-studio/tongyi-farui/',
    'https://enablement.microsoft.com/en-gb/scenario-library/legal/',
    'https://www.bcg.com/publications/2026/ai-is-turning-m-and-a-into-a-high-impact-learning-machine',
    'https://www.litera.com/newslinks/litera-cvent-case-study',
  ]);
});
