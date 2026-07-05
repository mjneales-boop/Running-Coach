import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tag } from '../components/ui/Tag';
import { Eyebrow } from '../components/ui/Eyebrow';
import { TabBar, type TabKey } from '../components/ui/TabBar';
import { Accordion, Chevron } from '../components/ui/Accordion';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { Input } from '../components/ui/Input';
import { ScreenHeader, SettingsHeader } from '../components/ui/ScreenHeader';

export function UiKitDemo() {
  const [tab, setTab] = useState<TabKey>('daily');
  const [open, setOpen] = useState(true);
  const [seg, setSeg] = useState<'km' | 'mi'>('km');
  const [on, setOn] = useState(true);
  const [weight, setWeight] = useState('74');

  return (
    <div className="mx-auto min-h-screen max-w-[390px] bg-canvas px-[22px] pb-[160px] pt-[6px]">
      <ScreenHeader onAvatarClick={() => {}} />

      <div className="mb-6">
        <SettingsHeader onBack={() => {}} />
      </div>

      <Eyebrow className="mb-3">Eyebrow label</Eyebrow>

      <div className="mb-6 flex flex-col gap-4">
        <Card>Default card — hairline border, 18px radius</Card>
        <Card dashed>Dashed empty-state card</Card>
      </div>

      <div className="mb-6 flex gap-3">
        <Button variant="primary" className="flex-1">
          Primary
        </Button>
        <Button variant="ghost" className="flex-1">
          Ghost
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Tag tone="accent">Long run</Tag>
        <Tag tone="muted">Rest</Tag>
      </div>

      <div className="mb-6">
        <Accordion
          open={open}
          onToggle={() => setOpen((v) => !v)}
          header={
            <>
              <div className="font-bold">Incline Smith Machine</div>
              <Chevron open={open} />
            </>
          }
        >
          <div className="font-mono text-xs text-muted">Expanded accordion body content</div>
        </Accordion>
      </div>

      <div className="mb-6">
        <SegmentedControl
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'km', label: 'Kilometres' },
            { value: 'mi', label: 'Miles' },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <span className="font-bold">Notifications</span>
        <ToggleSwitch checked={on} onChange={setOn} />
      </div>

      <div className="mb-6">
        <Input value={weight} onChange={(e) => setWeight(e.target.value)} unit="KG" align="right" inputMode="decimal" />
      </div>

      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
