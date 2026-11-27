// Decisions use game time. Sorting performance and a contract's eligibility are separate.
export const CASES = Object.freeze([
  {
    id: 'clean-a2', title: '작은 재료, 첫 거래', material: '깨끗한 A2 기판 묶음',
    brief: '그대로 넘기면 2,000원. 주문에 맞게 골라 가공하면 50,000원을 받는다.',
    clues: [
      { id: 'order', label: '주문서', text: '매입 조건: A2 코드 · 원 표시. 맞는 부품 4개 중 3개 이상을 골라야 한다.' },
      { id: 'condition', label: '재료 상태', text: '기판에 A2가 인쇄되어 있다. 침수 표시가 없고 접점이 깨끗하다.' },
      { id: 'terms', label: '작업 조건', text: '오선택은 1개까지 허용. 가공에는 80분과 체력 1이 들며, 실패하면 이 재료만 잃는다.' },
    ],
    target: { code: 'A2', shape: 'circle', label: 'A2 · 원' }, boardState: 'clean', canInquire: false,
  },
  {
    id: 'wet-a2', title: '싸게 나온 이유', material: '물에 젖었던 A2 기판 묶음',
    brief: '중고 재료상이 2,000원에 산다. 가공품 주문의 보수는 50,000원이다.',
    clues: [
      { id: 'order', label: '주문서', text: '매입 조건: A2 · 원. 침수된 기판은 선별을 잘해도 매입하지 않는다.' },
      { id: 'condition', label: '재료 상태', text: '침수 감지 표시가 붉게 변했고 접점 안쪽에 부식이 있다. 말리거나 선별해도 복구되지 않는다.' },
      { id: 'terms', label: '재료상 메모', text: '2,000원은 고철 매입가다. 가공에 쓰면 고철로도 넘길 수 없고, 기존 현금은 잃지 않는다.' },
    ],
    target: { code: 'A2', shape: 'circle', label: 'A2 · 원' }, boardState: 'wet', canInquire: false,
  },
  {
    id: 'clean-b7', title: '다른 손님을 찾으면', material: '깨끗한 B7 기판 묶음',
    brief: '재료는 B7인데 받은 주문은 A2다. 그대로 팔면 2,000원을 받는다.',
    clues: [
      { id: 'order', label: '기존 주문', text: '기존 주문은 A2 · 원만 받는다. B7을 A2로 바꾸는 가공은 할 수 없다.' },
      { id: 'condition', label: '재료 상태', text: '인쇄 코드는 B7이다. 접점은 깨끗하고 침수 흔적은 없다.' },
      { id: 'contact', label: '매입처 연락처', text: '다른 매입처가 B7 · 원을 찾는다. 20분을 들여 문의하면 50,000원짜리 주문을 확정할 수 있다.' },
    ],
    target: { code: 'A2', shape: 'circle', label: 'A2 · 원' }, boardState: 'clean', canInquire: true,
  },
]);

export function createRun() {
  return { version: 1, caseIndex: 0, phase: 'inspect', cash: 14000, debt: 20000,
    minutes: 540, stamina: 4, inspected: [], inquired: false, history: [], work: null, paid: false };
}

function requirePhase(run, phase) {
  if (run.phase !== phase) throw new Error(`이 행동은 ${phase} 단계에서만 가능해.`);
}
function currentCase(run) {
  const entry = CASES[run.caseIndex];
  if (!entry) throw new Error('진행 중인 거래가 없어.');
  return entry;
}

export function inspect(run, clueId) {
  requirePhase(run, 'inspect');
  if (!currentCase(run).clues.some(clue => clue.id === clueId)) throw new Error('없는 단서야.');
  if (run.inspected.includes(clueId)) return run;
  return { ...run, minutes: run.minutes + 10, inspected: [...run.inspected, clueId] };
}

export function inquire(run) {
  requirePhase(run, 'inspect');
  if (!currentCase(run).canInquire) throw new Error('이 거래에는 추가 문의가 없어.');
  if (run.inquired) return run;
  return { ...run, minutes: run.minutes + 20, inquired: true };
}

function viable(run) {
  const entry = currentCase(run);
  return entry.boardState === 'clean' && (!entry.canInquire || run.inquired);
}

function historyEntry(run, details) {
  return { caseId: currentCase(run).id, caseIndex: run.caseIndex,
    cashBefore: run.cash, inspected: [...run.inspected], inquired: run.inquired,
    ruleViable: viable(run), ...details };
}

export function choose(run, choice, reason = '') {
  requirePhase(run, 'inspect');
  if (typeof reason !== 'string') throw new Error('선택 이유는 글자로 남겨줘.');
  if (!['sell', 'process'].includes(choice)) throw new Error('없는 선택이야.');
  const entry = currentCase(run);
  if (choice === 'sell') {
    const cash = run.cash + 2000;
    const record = historyEntry(run, { choice, reason, cashAfter: cash, metrics: null,
      outcome: 'sold', explanation: '재료를 그대로 넘겨 2,000원을 받았다. 작업 시간과 체력은 쓰지 않았다.' });
    return { ...run, cash, phase: 'result', history: [...run.history, record] };
  }
  if (run.stamina < 1) throw new Error('작업할 체력이 부족해.');
  const target = entry.canInquire && run.inquired
    ? { code: 'B7', shape: 'circle', label: 'B7 · 원' } : { ...entry.target };
  const otherCode = target.code === 'A2' ? 'B7' : 'A2';
  const distractors = [
    { code: otherCode, shape: 'circle' }, { code: target.code, shape: 'triangle' },
    { code: otherCode, shape: 'triangle' }, { code: otherCode, shape: 'circle' },
  ];
  const pool = distractors.flatMap((item, index) => [
    { id: `${entry.id}-${index * 2}`, code: target.code, shape: target.shape, isTarget: true },
    { id: `${entry.id}-${index * 2 + 1}`, ...item, isTarget: false },
  ]);
  // Fixed per-case orders keep comparisons reproducible without an alternating shortcut.
  const orders = [
    [0, 2, 1, 3, 4, 5, 7, 6],
    [1, 0, 3, 2, 4, 6, 5, 7],
    [1, 3, 0, 2, 5, 4, 6, 7],
  ];
  const items = orders[run.caseIndex].map(index => pool[index]);
  return { ...run, phase: 'work', work: { items, target, required: 4, reason } };
}

function validateMetrics(metrics) {
  if (!metrics || metrics.mode !== 'normal') throw new Error('연습 기록은 거래에 반영할 수 없어.');
  for (const key of ['hits', 'misses', 'falseHits']) {
    if (!Number.isInteger(metrics[key]) || metrics[key] < 0 || metrics[key] > 4)
      throw new Error(`잘못된 작업 기록: ${key}`);
  }
  if (metrics.hits + metrics.misses !== 4) throw new Error('목표 부품 4개의 결과가 필요해.');
  if (!Array.isArray(metrics.reactionMs) || metrics.reactionMs.length > 8 ||
    metrics.reactionMs.some(ms => !Number.isFinite(ms) || ms < 0))
    throw new Error('잘못된 반응 시간 기록이야.');
}

export function finishWork(run, metrics) {
  requirePhase(run, 'work');
  validateMetrics(metrics);
  const entry = currentCase(run);
  const ruleViable = viable(run);
  const qualified = metrics.hits >= 3 && metrics.falseHits <= 1;
  const success = ruleViable && qualified;
  const cash = run.cash + (success ? 50000 : 0);
  let explanation;
  if (entry.boardState === 'wet') explanation = '침수와 부식 때문에 매입이 거절됐다. 선별 정확도와 관계없이 이 재료는 주문 조건에 맞지 않았다.';
  else if (!ruleViable) explanation = 'B7 재료를 받는 주문을 확정하지 않아 매입이 거절됐다. 기존 A2 주문에는 납품할 수 없다.';
  else if (!qualified) explanation = '재료와 주문은 맞았지만 목표 3개 이상·오선택 1개 이하의 작업 기준을 충족하지 못했다.';
  else explanation = '재료와 주문이 맞고 선별 기준을 충족해 50,000원을 받았다.';
  if (!success) explanation += ' 작업에 쓴 재료만 잃었고 기존 현금은 그대로다.';
  const record = historyEntry(run, { choice: 'process', reason: run.work.reason,
    cashAfter: cash, metrics: { ...metrics, reactionMs: [...metrics.reactionMs] },
    outcome: success ? 'success' : ruleViable ? 'work_failed' : 'rejected', explanation });
  return { ...run, cash, minutes: run.minutes + 80, stamina: run.stamina - 1,
    phase: 'result', history: [...run.history, record] };
}

export function nextCase(run) {
  requirePhase(run, 'result');
  const caseIndex = run.caseIndex + 1;
  return { ...run, caseIndex, phase: caseIndex < CASES.length ? 'inspect' : 'summary',
    inspected: [], inquired: false, work: null };
}

export function payDebt(run) {
  requirePhase(run, 'summary');
  if (run.paid) return run;
  const amount = Math.min(run.cash, run.debt);
  return { ...run, cash: run.cash - amount, debt: run.debt - amount, paid: true };
}

export function getReflection(run) {
  const observations = run.history.map(record => {
    const entry = CASES[record.caseIndex];
    const action = record.choice === 'sell' ? '그대로 팔았다' : '가공을 시도했다';
    return `${entry.title}: 단서 ${record.inspected.length}개를 확인하고${record.inquired ? ' 다른 매입처에 문의한 뒤' : ''} ${action}. ${record.explanation}`;
  });
  const tasks = run.history.filter(record => record.metrics);
  if (tasks.length) {
    const hits = tasks.reduce((sum, record) => sum + record.metrics.hits, 0);
    const falseHits = tasks.reduce((sum, record) => sum + record.metrics.falseHits, 0);
    observations.push(`작업 ${tasks.length}번에서 목표 ${tasks.length * 4}개 중 ${hits}개를 골랐고, 오선택은 ${falseHits}개였다. 반응 시간은 참고 기록이며 보수 계산에는 쓰지 않았다.`);
  }
  observations.push('이 기록은 이번 거래에서 한 행동이다. 한 번의 결과로 지능이나 성격을 판단하지 않는다.');
  const rejected = run.history.some(record => record.outcome === 'rejected');
  const workFailed = run.history.some(record => record.outcome === 'work_failed');
  return {
    headline: run.paid ? (run.debt === 0 ? '이번 빚을 모두 갚았다.' : `빚 ${run.debt.toLocaleString('ko-KR')}원이 남았다.`) : '내가 고른 길을 돌아보자.',
    observations,
    nextTry: rejected ? '다음에는 가공 전에 재료 상태와 실제로 받을 매입처를 서로 맞춰보자.'
      : workFailed ? '다음에는 연습에서 코드와 모양을 함께 확인해보자. 작업과 거래 판단은 따로 돌아볼 수 있다.'
      : '다음에는 같은 재료를 다른 선택으로 다뤄보자. 확정 수입과 가공 기회를 비교할 수 있다.',
  };
}
