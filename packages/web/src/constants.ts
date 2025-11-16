import type { SnippetPosition } from '@exquisite-fish-corpse/core';

export const POSITION_OPTIONS: Array<{ label: string; value: SnippetPosition }> = [
  { label: '文頭', value: 'BEGINNING' },
  { label: '文中', value: 'MIDDLE' },
  { label: '文末', value: 'END' },
];

export const PRESET_OPTIONS = [
  {
    id: 'sample1',
    label: 'サンプル1',
    values: {
      BEGINNING: `そんなことよりもまずは
昨今の情勢を鑑みるに、
論より証拠と言うけれども、`,
      MIDDLE: `なんて余裕ぶってみたものの、
やっぱり借金って怖いもので、
考慮しなければならないのは、`,
      END: `けれど、そんなことはどうでもいい。
生命保険を見直すことにした。
彼はただ泣きそうな顔で笑った。`,
    },
  },
  {
    id: 'sample2',
    label: 'サンプル2',
    values: {
      BEGINNING: `キリウ君は、大根を一本、
今日は珍しく、
いざ列を見つけて並んでみると、`,
      MIDDLE: `の中で、おそらく最も
きょろきょろと周囲を探して、
のは信じられないそうだが、`,
      END: `だと直感した。
そしてトマトを二個買った。
ことにも気付くことができた。`,
    },
  },
];
