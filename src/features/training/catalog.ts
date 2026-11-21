import type { Exercise } from '../../db/models';
const epoch = '2026-01-01T00:00:00.000Z';
export const exerciseCatalog: Exercise[] = [
  ['bench', '杠铃卧推', '胸', '杠铃'],
  ['incline', '上斜哑铃卧推', '胸', '哑铃'],
  ['squat', '深蹲', '腿', '杠铃'],
  ['rdl', '罗马尼亚硬拉', '腿', '杠铃'],
  ['deadlift', '硬拉', '背', '杠铃'],
  ['pulldown', '高位下拉', '背', '器械'],
  ['row', '划船', '背', '器械'],
  ['press', '肩上推举', '肩', '哑铃'],
  ['lateral', '侧平举', '肩', '哑铃'],
  ['legpress', '腿举', '腿', '器械'],
  ['curl', '二头弯举', '手臂', '哑铃'],
  ['pushdown', '三头下压', '手臂', '绳索'],
  ['pushup', '俯卧撑', '胸', '自重'],
].map(([id, name, muscle, equipment]) => ({
  id: `builtin:${id}`,
  name,
  muscleGroups: [muscle],
  equipment,
  isCustom: false,
  notes: '入门动作示例；请按自身能力选择，并注意热身与休息。',
  createdAt: epoch,
  updatedAt: epoch,
  revision: 0,
}));
export function filterExercises(
  exercises: Exercise[],
  query: string,
  muscle = '',
  equipment = '',
) {
  const term = query.trim().toLocaleLowerCase();
  return exercises.filter(
    (exercise) =>
      (!term ||
        `${exercise.name} ${exercise.notes ?? ''}`
          .toLocaleLowerCase()
          .includes(term)) &&
      (!muscle || exercise.muscleGroups.includes(muscle)) &&
      (!equipment || exercise.equipment === equipment),
  );
}
export const planTemplates = [
  {
    id: 'full',
    name: '全身训练',
    days: [
      { name: '全身 A', moves: ['squat', 'bench', 'row'] },
      { name: '休息', moves: [] },
      { name: '全身 B', moves: ['rdl', 'press', 'pulldown'] },
    ],
  },
  {
    id: 'upper-lower',
    name: '上下肢',
    days: [
      { name: '上肢 A', moves: ['bench', 'row'] },
      { name: '下肢 A', moves: ['squat', 'rdl'] },
      { name: '休息', moves: [] },
      { name: '上肢 B', moves: ['incline', 'pulldown'] },
      { name: '下肢 B', moves: ['legpress', 'rdl'] },
    ],
  },
  {
    id: 'ppl',
    name: '推拉腿',
    days: [
      { name: '推', moves: ['bench', 'press', 'pushdown'] },
      { name: '拉', moves: ['pulldown', 'row', 'curl'] },
      { name: '腿', moves: ['squat', 'rdl'] },
      { name: '休息', moves: [] },
    ],
  },
  {
    id: 'four',
    name: '四分化 · 胸背肩腿',
    days: [
      { name: '胸', moves: ['bench', 'incline'] },
      { name: '背', moves: ['pulldown', 'row'] },
      { name: '肩', moves: ['press', 'lateral'] },
      { name: '腿', moves: ['squat', 'legpress'] },
      { name: '休息', moves: [] },
    ],
  },
];
