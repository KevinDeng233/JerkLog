import type { FoodSource } from '../../../db/models';
export function Provenance({ source }: { source: FoodSource }) {
  const url =
    source.kind === 'usda' && source.fdcId
      ? `https://fdc.nal.usda.gov/food-details/${source.fdcId}/nutrients`
      : undefined;
  return (
    <div className="food-provenance">
      <span className="tag">
        {source.kind === 'usda'
          ? 'USDA 数据库'
          : source.kind === 'label'
            ? '用户转录标签'
            : '用户输入 / 未独立核验'}
      </span>
      {source.reference && (
        <p>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              referrerPolicy="no-referrer"
            >
              查看 USDA FDC {source.fdcId} 来源
            </a>
          ) : (
            source.reference
          )}
        </p>
      )}
      {source.description && <p lang="en">{source.description}</p>}
      {source.revision && (
        <p>
          来源版本：{source.revision}
          {source.verifiedAt && ` · 核验：${source.verifiedAt}`}
          {source.license && ` · ${source.license}`}
        </p>
      )}
    </div>
  );
}
