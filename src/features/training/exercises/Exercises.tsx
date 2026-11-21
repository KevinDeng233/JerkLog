import { useState } from 'react';
import type { Exercise } from '../../../db/models';
import { useAction } from '../../../lib/useAction';
import { Empty } from '../../../components/Shared';
import { training } from '../repository';
import { filterExercises } from '../catalog';
export function Exercises({ exercises }: { exercises: Exercise[] }) {
  const [newId, setNewId] = useState(() => crypto.randomUUID());
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [editing, setEditing] = useState<Exercise>();
  const [formKey, setKey] = useState(0);
  const action = useAction();
  const filtered = filterExercises(exercises, query, muscle, equipment);
  return (
    <div className="two-columns training-columns">
      <section className="card">
        <h2>{editing ? '编辑自定义动作' : '创建自定义动作'}</h2>
        <form
          key={editing?.id ?? formKey}
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            void action.run(async () => {
              await training.saveExercise({
                id: editing?.id ?? String(data.get('id')),
                revision: editing?.revision,
                name: String(data.get('name')),
                equipment: String(data.get('equipment')),
                muscleGroups: [String(data.get('muscle'))],
                notes: String(data.get('notes')),
              });
              setEditing(undefined);
              setKey((value) => value + 1);
              setNewId(crypto.randomUUID());
            }, '动作已保存。');
          }}
        >
          <input
            type="hidden"
            name="id"
            value={editing?.id ?? newId}
            readOnly
          />
          <label>
            动作名称
            <input
              name="name"
              required
              maxLength={120}
              defaultValue={editing?.name}
            />
          </label>
          <label>
            主要肌群
            <select
              name="muscle"
              defaultValue={editing?.muscleGroups[0] ?? '胸'}
            >
              {[
                '胸',
                '背',
                '肩',
                '腿',
                '手臂',
                '核心',
                '全身',
                ...exercises.flatMap((item) => item.muscleGroups),
              ]
                .filter((value, index, array) => array.indexOf(value) === index)
                .map((value) => (
                  <option key={value}>{value}</option>
                ))}
            </select>
          </label>
          <label>
            器械分类
            <select
              name="equipment"
              defaultValue={editing?.equipment ?? '哑铃'}
            >
              {[
                '杠铃',
                '哑铃',
                '器械',
                '绳索',
                '自重',
                '其他',
                ...exercises.map((item) => item.equipment),
              ]
                .filter((value, index, array) => array.indexOf(value) === index)
                .map((value) => (
                  <option key={value}>{value}</option>
                ))}
            </select>
          </label>
          <label>
            动作备注
            <textarea
              name="notes"
              maxLength={1000}
              defaultValue={editing?.notes}
            />
          </label>
          <div className="button-row">
            <button className="primary" disabled={action.busy}>
              保存动作
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(undefined);
                  setKey((value) => value + 1);
                }}
              >
                取消编辑
              </button>
            )}
          </div>
        </form>
        {action.feedback}
      </section>
      <section className="card">
        <h2>离线动作库</h2>
        <label>
          搜索动作
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索名称或备注"
          />
        </label>
        <div className="form-row">
          <label>
            筛选肌群
            <select
              value={muscle}
              onChange={(event) => setMuscle(event.target.value)}
            >
              <option value="">全部</option>
              {Array.from(
                new Set(exercises.flatMap((item) => item.muscleGroups)),
              ).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            筛选器械
            <select
              value={equipment}
              onChange={(event) => setEquipment(event.target.value)}
            >
              <option value="">全部</option>
              {Array.from(new Set(exercises.map((item) => item.equipment))).map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
        </div>
        <p className="muted">
          {filtered.length} 个动作 · 内置动作仅作参考，不含远程图片。
        </p>
        {!filtered.length ? (
          <Empty>未找到动作，试试其他关键词或创建自己的动作。</Empty>
        ) : (
          <ul className="record-list exercise-list">
            {filtered.map((item) => (
              <li className="stack" key={item.id}>
                <div className="section-title">
                  <strong>{item.name}</strong>
                  <span className="tag">
                    {item.isCustom ? '自定义' : '内置'}
                  </span>
                </div>
                <span className="muted">
                  {item.muscleGroups.join(' / ')} · {item.equipment}
                </span>
                {item.notes && <p className="muted">{item.notes}</p>}
                {item.isCustom && (
                  <div className="button-row">
                    <button
                      disabled={action.busy}
                      onClick={() => setEditing(item)}
                    >
                      编辑动作
                    </button>
                    <button
                      className="danger"
                      disabled={action.busy}
                      onClick={() => {
                        if (
                          confirm(
                            '确认删除此自定义动作？已保存训练快照仍会保留。',
                          )
                        )
                          void action.run(async () => {
                            await training.deleteExercise(item);
                            if (editing?.id === item.id) setEditing(undefined);
                          }, '动作已删除。');
                      }}
                    >
                      删除动作
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
