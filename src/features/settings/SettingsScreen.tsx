import { useSettings } from '../../app/stores';
import type { PaperSize } from '../../core/model';
import { formatLength, type DisplayUnit } from '../../core/units';

const UNIT_LABELS: Record<DisplayUnit, string> = {
  cm: 'Centimetres (cm)',
  mm: 'Millimetres (mm)',
  m: 'Metres (m)',
  imperial: 'Imperial (ft / in)',
};

export function SettingsScreen() {
  const { settings, update } = useSettings();
  return (
    <div className="screen screen-narrow">
      <div className="screen-header">
        <h1>Settings</h1>
      </div>
      <section className="panel">
        <h3 className="section-title">Units</h3>
        <div className="radio-list" role="radiogroup" aria-label="Units">
          {(Object.keys(UNIT_LABELS) as DisplayUnit[]).map((u) => (
            <label key={u} className="radio">
              <input type="radio" name="unit" checked={settings.unit === u} onChange={() => update({ unit: u })} />
              <span>{UNIT_LABELS[u]}</span>
              <span className="muted">e.g. {formatLength(1625, u)}</span>
            </label>
          ))}
        </div>
        <p className="hint">You can always type another unit, e.g. “850mm” or “33 1/2in”.</p>
      </section>
      <section className="panel">
        <h3 className="section-title">PDF paper size</h3>
        <div className="segmented">
          {(['A4', 'Letter'] as PaperSize[]).map((p) => (
            <button key={p} className={settings.paper === p ? 'active' : ''} onClick={() => update({ paper: p })}>
              {p}
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <h3 className="section-title">Editor</h3>
        <label className="switch">
          <input type="checkbox" checked={settings.snapping} onChange={(e) => update({ snapping: e.target.checked })} />
          <span>Snap to edges, centres, eye level and equal gaps</span>
        </label>
        <label className="switch">
          <input type="checkbox" checked={settings.showNails} onChange={(e) => update({ showNails: e.target.checked })} />
          <span>Show hanging points (nails)</span>
        </label>
      </section>
      <section className="panel">
        <h3 className="section-title">Data</h3>
        <p className="hint">
          Everything is stored only on this device. Export projects as <code>.decorplan</code> files to back them up or move
          them to another device.
        </p>
      </section>
    </div>
  );
}
