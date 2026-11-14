import { useState } from 'react';
import {
  BellPhase,
  calculateNoiseRadius,
  evaluateVisionDetection,
  FloorSurface,
  PlayerStance,
} from '../prd/simulation';

const STANCES: { id: PlayerStance; label: string }[] = [
  { id: 'crouch', label: 'Crouch (1.7 m/s)' },
  { id: 'walk', label: 'Walk (3.2 m/s)' },
  { id: 'sprint', label: 'Sprint (5.4 m/s)' },
];

const SURFACES: { id: FloorSurface; label: string }[] = [
  { id: 'carpet', label: 'Aisle Runner' },
  { id: 'tile', label: 'Hall Tile' },
  { id: 'creaky_wood', label: 'Creaky Oak' },
];

const BELLS: { id: BellPhase; label: string }[] = [
  { id: 1, label: 'Bell 1' },
  { id: 2, label: 'Bell 2' },
  { id: 3, label: 'Bell 3' },
];

export function MechanicTuner() {
  const [stance, setStance] = useState<PlayerStance>('walk');
  const [surface, setSurface] = useState<FloorSurface>('tile');
  const [carryingHeavy, setCarryingHeavy] = useState(false);
  const [bellPhase, setBellPhase] = useState<BellPhase>(1);
  const [distanceMeters, setDistanceMeters] = useState(8);
  const [inShadow, setInShadow] = useState(false);
  const [hasDeskCover, setHasDeskCover] = useState(false);

  const noise = calculateNoiseRadius({
    stance,
    surface,
    carryingHeavyProp: carryingHeavy,
  });

  const vision = evaluateVisionDetection({
    lecturerX: 0,
    lecturerZ: 0,
    lecturerYaw: 0,
    playerX: 0,
    playerZ: distanceMeters,
    playerCrouched: stance === 'crouch',
    inShadow,
    hasDeskCover,
    bellPhase,
  });

  const noisePercent = Math.min(100, Math.round((noise.radiusMeters / 20) * 100));

  return (
    <div className="border border-white/10 bg-[#151a1f] rounded-lg p-6 lg:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <h3 className="font-serif text-xl font-medium text-[#efece6]">
            Stealth &amp; Acoustic Balance Calculator
          </h3>
          <p className="text-sm text-[#a6adb5] mt-1">
            Live parameter model for tuning footstep noise propagation and desk-cover occlusion.
          </p>
        </div>
        <div className="text-xs font-mono text-[#a6adb5] tabular-nums">
          Bell {bellPhase} · {distanceMeters.toFixed(1)}m from Lectern
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
        <div className="lg:col-span-7 space-y-5">
          <div>
            <span className="block text-xs font-medium text-[#a6adb5] mb-2">
              Player Stance
            </span>
            <div className="flex flex-wrap gap-2">
              {STANCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStance(s.id)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    stance === s.id
                      ? 'bg-[#d99b43] text-[#0e1114] border-[#d99b43]'
                      : 'bg-[#0e1114] text-[#cfd4da] border-white/10 hover:border-white/25'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-[#a6adb5] mb-2">
              Floor Material
            </span>
            <div className="flex flex-wrap gap-2">
              {SURFACES.map((sf) => (
                <button
                  key={sf.id}
                  type="button"
                  onClick={() => setSurface(sf.id)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    surface === sf.id
                      ? 'bg-[#efece6] text-[#0e1114] border-[#efece6]'
                      : 'bg-[#0e1114] text-[#cfd4da] border-white/10 hover:border-white/25'
                  }`}
                >
                  {sf.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-medium text-[#a6adb5] mb-2">
                Escalation Phase
              </span>
              <div className="flex gap-2">
                {BELLS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBellPhase(b.id)}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                      bellPhase === b.id
                        ? 'bg-[#d99b43] text-[#0e1114] border-[#d99b43]'
                        : 'bg-[#0e1114] text-[#cfd4da] border-white/10 hover:border-white/25'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="distance-range"
                className="flex items-center justify-between text-xs font-medium text-[#a6adb5] mb-2"
              >
                <span>Distance to Vance</span>
                <span className="font-mono text-[#efece6] tabular-nums">{distanceMeters} m</span>
              </label>
              <input
                id="distance-range"
                type="range"
                min={2}
                max={18}
                step={0.5}
                value={distanceMeters}
                onChange={(e) => setDistanceMeters(Number(e.target.value))}
                className="w-full accent-[#d99b43] cursor-pointer"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-5 pt-1">
            <label className="inline-flex items-center gap-2.5 text-sm text-[#cfd4da] cursor-pointer">
              <input
                type="checkbox"
                checked={hasDeskCover}
                onChange={(e) => setHasDeskCover(e.target.checked)}
                className="h-4 w-4 rounded accent-[#d99b43]"
              />
              <span>Behind Oak Desk Panel</span>
            </label>
            <label className="inline-flex items-center gap-2.5 text-sm text-[#cfd4da] cursor-pointer">
              <input
                type="checkbox"
                checked={inShadow}
                onChange={(e) => setInShadow(e.target.checked)}
                className="h-4 w-4 rounded accent-[#d99b43]"
              />
              <span>Standing in Shadow Zone</span>
            </label>
            <label className="inline-flex items-center gap-2.5 text-sm text-[#cfd4da] cursor-pointer">
              <input
                type="checkbox"
                checked={carryingHeavy}
                onChange={(e) => setCarryingHeavy(e.target.checked)}
                className="h-4 w-4 rounded accent-[#d99b43]"
              />
              <span>Carrying Fuse / Textbook</span>
            </label>
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#0e1114] border border-white/10 rounded-md p-5 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#a6adb5]">Acoustic Emission Radius</span>
                <span className="font-mono text-xs text-[#d99b43] tabular-nums">
                  {noise.tier}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-3xl font-semibold text-[#efece6] tabular-nums">
                  {noise.radiusMeters.toFixed(1)}m
                </span>
                <span className="font-mono text-xs text-[#89929c] tabular-nums">
                  ({noise.decibels} dB)
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-sm mt-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    noise.tier === 'Alerting'
                      ? 'bg-[#c84b4b]'
                      : noise.tier === 'Moderate'
                        ? 'bg-[#d99b43]'
                        : 'bg-[#6ba386]'
                  }`}
                  style={{ width: `${noisePercent}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#a6adb5]">Direct Line-of-Sight Result</span>
                <span
                  className={`font-mono text-xs font-medium ${
                    vision.detected
                      ? 'text-[#c84b4b]'
                      : vision.occluded
                        ? 'text-[#6ba386]'
                        : 'text-[#a6adb5]'
                  }`}
                >
                  {vision.detected
                    ? 'Spotted'
                    : vision.occluded
                      ? 'Occluded by Desk'
                      : 'Out of Range'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-[#151a1f] border border-white/10 rounded px-3 py-2.5">
                  <div className="text-xs text-[#89929c]">Suspicion Gain</div>
                  <div className="font-mono text-lg font-medium text-[#efece6] tabular-nums mt-0.5">
                    {vision.suspicionPerSecond}%/s
                  </div>
                </div>
                <div className="bg-[#151a1f] border border-white/10 rounded px-3 py-2.5">
                  <div className="text-xs text-[#89929c]">Time to Lock</div>
                  <div className="font-mono text-lg font-medium text-[#efece6] tabular-nums mt-0.5">
                    {vision.suspicionPerSecond > 0
                      ? `${(100 / vision.suspicionPerSecond).toFixed(1)}s`
                      : 'Safe'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#89929c] leading-relaxed border-t border-white/10 pt-3">
            {stance === 'crouch' && hasDeskCover
              ? 'Crouching behind a bolted oak modesty panel blocks line-of-sight even inside the front light cone.'
              : noise.tier === 'Alerting'
                ? 'Sprinting across hardwood echoes up to 14m+, pulling Prof. Vance from the podium.'
                : 'Combine aisle runners with crouch-walks to cross lateral gaps while Vance faces the chalkboard.'}
          </p>
        </div>
      </div>
    </div>
  );
}
