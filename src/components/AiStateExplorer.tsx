import { useState } from 'react';
import { AI_STATE_SPECS, AiStateSpec } from '../prd/prdData';
import { BellPhase, getBellPhaseConfig } from '../prd/simulation';

export function AiStateExplorer() {
  const [selectedState, setSelectedState] = useState<AiStateSpec['id']>('LECTURING');
  const [selectedBell, setSelectedBell] = useState<BellPhase>(1);

  const activeSpec =
    AI_STATE_SPECS.find((s) => s.id === selectedState) ?? AI_STATE_SPECS[0];
  const bellCfg = getBellPhaseConfig(selectedBell);

  return (
    <div className="space-y-6">
      <div className="border border-white/10 bg-[#151a1f] rounded-lg p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <h3 className="font-serif text-xl font-medium text-[#efece6]">
              Finite State Machine Inspector
            </h3>
            <p className="text-sm text-[#a6adb5] mt-1">
              Select a behavioral state to inspect entry triggers, movement speed, and player counterplay cues.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 bg-[#0e1114] p-1 rounded-md border border-white/10">
            {AI_STATE_SPECS.map((state) => (
              <button
                key={state.id}
                type="button"
                onClick={() => setSelectedState(state.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedState === state.id
                    ? state.id === 'PURSUIT'
                      ? 'bg-[#c84b4b] text-[#efece6]'
                      : 'bg-[#d99b43] text-[#0e1114]'
                    : 'text-[#a6adb5] hover:text-[#efece6]'
                }`}
              >
                {state.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          <div>
            <div className="text-xs text-[#89929c]">State Identifier &amp; Speed</div>
            <div className="font-mono text-sm font-semibold text-[#d99b43] mt-1.5">
              {activeSpec.id}
            </div>
            <div className="font-mono text-sm text-[#efece6] mt-1 tabular-nums">
              {activeSpec.speed}
            </div>
          </div>

          <div>
            <div className="text-xs text-[#89929c]">Entry Trigger</div>
            <p className="text-sm text-[#cfd4da] leading-relaxed mt-1.5">
              {activeSpec.entryTrigger}
            </p>
          </div>

          <div>
            <div className="text-xs text-[#89929c]">AI Behavior Loop</div>
            <p className="text-sm text-[#cfd4da] leading-relaxed mt-1.5">
              {activeSpec.behavior}
            </p>
          </div>

          <div>
            <div className="text-xs text-[#89929c]">Exit &amp; Telegraph Cues</div>
            <p className="text-sm text-[#cfd4da] leading-relaxed mt-1.5">
              {activeSpec.exitCondition}
            </p>
            <p className="text-xs font-mono text-[#a6adb5] mt-2">
              Cue: {activeSpec.audioVisualCue}
            </p>
          </div>
        </div>
      </div>

      <div className="border border-white/10 bg-[#151a1f] rounded-lg p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <h3 className="font-serif text-xl font-medium text-[#efece6]">
              Three-Bell Escalation Profile
            </h3>
            <p className="text-sm text-[#a6adb5] mt-1">
              Each puzzle milestone rings a hall bell, tightening lighting, patrol speed, and hearing sensitivity.
            </p>
          </div>
          <div className="flex gap-1.5 bg-[#0e1114] p-1 rounded-md border border-white/10">
            {([1, 2, 3] as BellPhase[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBell(b)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  selectedBell === b
                    ? 'bg-[#efece6] text-[#0e1114]'
                    : 'text-[#a6adb5] hover:text-[#efece6]'
                }`}
              >
                Bell {b}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 pt-6">
          <div className="bg-[#0e1114] border border-white/10 rounded p-4">
            <div className="text-xs text-[#89929c]">Patrol Speed</div>
            <div className="font-mono text-2xl font-medium text-[#efece6] tabular-nums mt-1">
              {bellCfg.patrolSpeedMps.toFixed(2)} m/s
            </div>
          </div>
          <div className="bg-[#0e1114] border border-white/10 rounded p-4">
            <div className="text-xs text-[#89929c]">Pursuit Speed</div>
            <div className="font-mono text-2xl font-medium text-[#c84b4b] tabular-nums mt-1">
              {bellCfg.pursuitSpeedMps.toFixed(2)} m/s
            </div>
          </div>
          <div className="bg-[#0e1114] border border-white/10 rounded p-4">
            <div className="text-xs text-[#89929c]">Lit Sight Range</div>
            <div className="font-mono text-2xl font-medium text-[#efece6] tabular-nums mt-1">
              {bellCfg.visionRangeLitM.toFixed(1)} m
            </div>
          </div>
          <div className="bg-[#0e1114] border border-white/10 rounded p-4">
            <div className="text-xs text-[#89929c]">Vision FOV</div>
            <div className="font-mono text-2xl font-medium text-[#d99b43] tabular-nums mt-1">
              {bellCfg.fovDegrees}°
            </div>
          </div>
          <div className="col-span-2 lg:col-span-1 bg-[#0e1114] border border-white/10 rounded p-4">
            <div className="text-xs text-[#89929c]">Hearing Scale</div>
            <div className="font-mono text-2xl font-medium text-[#efece6] tabular-nums mt-1">
              {bellCfg.hearingMultiplier.toFixed(1)}×
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
          <div className="bg-[#0e1114] border border-white/10 rounded p-4">
            <span className="text-xs text-[#89929c] block">Lighting &amp; Visibility Condition</span>
            <span className="text-[#efece6] mt-1 block">{bellCfg.lightingState}</span>
          </div>
          <div className="bg-[#0e1114] border border-white/10 rounded p-4">
            <span className="text-xs text-[#89929c] block">Exit &amp; Door Lock Behavior</span>
            <span className="text-[#efece6] mt-1 block">{bellCfg.doorLockState}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
