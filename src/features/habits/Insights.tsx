import type { HabitEntry } from '../../db/models';
import { Metrics } from '../../components/Shared';
import { displayTime, summarize } from '../../lib/calendar';
export function Insights({
  entries,
  now,
}: {
  entries: HabitEntry[];
  now: Date;
}) {
  const stats = summarize(entries, now);
  const peak = Math.max(1, ...stats.trend.map((day) => day.count));
  return (
    <>
      <Metrics
        items={[
          { label: '今日记录', value: stats.today, unit: '次' },
          { label: '本周 · 周一起', value: stats.week, unit: '次' },
          { label: '最近 7 天', value: stats.seven, unit: '次' },
          { label: '最近 30 天', value: stats.thirty, unit: '次' },
        ]}
      />
      <p className="muted">
        最近一次：
        {stats.latest ? (
          <time dateTime={stats.latest}>{displayTime(stats.latest)}</time>
        ) : (
          '暂无记录'
        )}
      </p>
      <section className="card trend-card">
        <h2>每日记录趋势 · 近 30 天</h2>
        <p className="muted">次数仅用于自主回顾，不作健康评分。</p>
        <div
          className="trend"
          role="img"
          aria-label={`最近30天每日次数，共 ${stats.thirty} 次；完整数据见下方表格。`}
        >
          {stats.trend.map((day) => (
            <div
              key={day.date}
              className="trend-column"
              title={`${day.date}：${day.count} 次`}
            >
              <span
                className="trend-bar"
                style={{ height: `${(day.count / peak) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="section-title muted">
          <span>{stats.trend[0].date.slice(5)}</span>
          <span>{stats.trend[29].date.slice(5)}</span>
        </div>
        <details>
          <summary>查看每日数据</summary>
          <div className="trend-table">
            <table>
              <caption>近 30 天实际记录次数</caption>
              <thead>
                <tr>
                  <th scope="col">日期</th>
                  <th scope="col">次数</th>
                </tr>
              </thead>
              <tbody>
                {stats.trend.map((day) => (
                  <tr key={day.date}>
                    <th scope="row">{day.date}</th>
                    <td>{day.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </>
  );
}
