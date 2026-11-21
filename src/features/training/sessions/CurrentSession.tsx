import { useState } from 'react';
import type { WorkoutSet } from '../../../db/models';
import { Empty, Metrics } from '../../../components/Shared';
import { useAction } from '../../../lib/useAction';
import { displayTime } from '../../../lib/calendar';
import { training } from '../repository';
import { loggedVolume, activeSeconds } from '../metrics';
import type { TrainingData } from '../useTraining';
import { SetEditor } from './SetEditor';
export function CurrentSession({
  data,
  now,
  onStart,
  onHistory,
}: {
  data: TrainingData;
  now: Date;
  onStart: () => void;
  onHistory: () => void;
}) {
  const pending = data.sessions.filter((item) => item.status !== 'completed');
  const [selected, setSelected] = useState('');
  const session = pending.find((item) => item.id === selected) ?? pending[0];
  const action = useAction();
  const [editing, setEditing] = useState<WorkoutSet>();
  const [editorKey, setKey] = useState(0);
  const [message, setMessage] = useState('');
  if (!session)
    return (
      <section className="card">
        <h2>当前训练</h2>
        <Empty>没有正在进行的训练。从计划训练日或自由训练开始。</Empty>
        <button className="primary" onClick={onStart}>
          开始自由训练
        </button>
        {message && <p role="status">{message}</p>}
      </section>
    );
  const sets = data.sets
    .filter((set) => set.sessionId === session.id)
    .sort((a, b) => a.order - b.order);
  const volume = loggedVolume(sets);
  return (
    <section className="card current-session">
      <div className="section-title">
        <h2>
          {session.planName ?? '自由训练'}
          {session.dayName && ` / ${session.dayName}`}
        </h2>
        <span className="tag">
          {session.status === 'active' ? '进行中' : '已暂停'}
        </span>
      </div>
      {pending.length > 1 && (
        <label>
          未完成的训练
          <select
            value={session.id}
            onChange={(event) => {
              setSelected(event.target.value);
              setEditing(undefined);
            }}
          >
            {pending.map((item) => (
              <option key={item.id} value={item.id}>
                {displayTime(item.startedAt)} · {item.planName ?? '自由训练'}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="muted">
        开始于 {displayTime(session.startedAt)} · 热身后再记录实际完成的组。
      </p>
      <Metrics
        items={[
          { label: '已记录组', value: sets.length, unit: '组' },
          { label: '负重容量', value: volume.kgReps, unit: 'kg·次' },
          {
            label: '有效计时（暂停不计）',
            value: Math.floor(activeSeconds(session, now) / 60),
            unit: '分钟',
          },
        ]}
      />
      <div className="button-row">
        <button
          disabled={action.busy}
          onClick={() =>
            void action.run(
              () =>
                training.transition(
                  session,
                  session.status === 'active' ? 'paused' : 'active',
                ),
              session.status === 'active' ? '训练已暂停。' : '训练已恢复。',
            )
          }
        >
          {session.status === 'active' ? '暂停训练' : '恢复训练'}
        </button>
        <button
          className="primary"
          disabled={action.busy}
          onClick={() => {
            if (
              confirm('确认完成本次训练？完成后历史保留，训练组在本阶段只读。')
            )
              void action.run(async () => {
                await training.transition(session, 'completed');
                onHistory();
              }, '训练已完成。');
          }}
        >
          完成训练
        </button>
        <button
          className="danger"
          disabled={action.busy}
          onClick={() => {
            if (confirm('确认放弃此未完成训练及其全部组记录？此操作不能撤销。'))
              void action.run(async () => {
                await training.abandon(session);
                setMessage('未完成训练已放弃。');
              }, '训练已放弃。');
          }}
        >
          放弃训练
        </button>
      </div>
      {session.exercises.length > 0 && (
        <details>
          <summary>开始时的计划/动作快照</summary>
          <ol>
            {session.exercises.map((item) => (
              <li key={item.id}>
                {item.name}
                {item.sets > 0 &&
                  ` · 计划 ${item.sets} 组 × ${item.repsMin}–${item.repsMax} 次`}
                {item.notes && ` · ${item.notes}`}
              </li>
            ))}
          </ol>
        </details>
      )}
      <p className="muted">
        容量仅合计负重组的重量 ×
        次数，不估算自重或无负重组的重量，也不代表全面训练刺激。
      </p>
      {session.status === 'paused' ? (
        <p className="notice">计时已暂停。恢复后可新增、编辑或删除组。</p>
      ) : (
        <SetEditor
          key={`${session.id}:${editing?.id ?? editorKey}`}
          session={session}
          exercises={data.exercises}
          initial={editing?.sessionId === session.id ? editing : undefined}
          onDone={(saved) => {
            setEditing(undefined);
            setKey((value) => value + 1);
            setMessage(
              saved
                ? editing
                  ? '训练组已修改。'
                  : '训练组已保存。'
                : '已取消组编辑。',
            );
          }}
        />
      )}
      {message && <p role="status">{message}</p>}
      <h3>本次训练组</h3>
      {!sets.length ? (
        <Empty>尚未记录组。计划组数不会被自动计为已完成。</Empty>
      ) : (
        <ol className="record-list">
          {sets.map((set) => (
            <li className="stack" key={set.id}>
              <div className="section-title">
                <strong>{set.exerciseName}</strong>
                <span>
                  {set.reps} 次 ×{' '}
                  {set.mode === 'weighted'
                    ? `${set.weightKg} kg`
                    : set.mode === 'bodyweight'
                      ? '自重'
                      : '无负重'}
                </span>
              </div>
              {set.rpe !== undefined && <span>RPE {set.rpe}</span>}
              {set.rir !== undefined && <span>RIR {set.rir}</span>}
              {set.notes && <p>{set.notes}</p>}
              <div className="button-row">
                <button
                  disabled={action.busy || session.status !== 'active'}
                  onClick={() => setEditing(set)}
                >
                  编辑此组
                </button>
                <button
                  disabled={action.busy || session.status !== 'active'}
                  onClick={() => {
                    if (confirm('确认删除此组？'))
                      void action.run(
                        () => training.deleteSet(set),
                        '训练组已删除。',
                      );
                  }}
                >
                  删除此组
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <form
        key={`notes:${session.id}`}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void action.run(
            () => training.saveNotes(session, String(data.get('notes'))),
            '训练备注已保存。',
          );
        }}
      >
        <label>
          训练备注
          <textarea
            name="notes"
            maxLength={2000}
            defaultValue={session.notes}
          />
        </label>
        <button disabled={action.busy}>保存训练备注</button>
      </form>
      {action.feedback}
    </section>
  );
}
