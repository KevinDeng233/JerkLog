export const copy = {
  nutritionIntro: {
    professional: '按实际克数与来源清晰的营养值记录，目标由你自主选择。',
    humor: '给今天的饭写个日志，数字认真算，吃饭按自己的节奏来。',
  },
  trainingIntro: {
    professional:
      '记录动作、日程与实际完成的训练。热身、休息，按自身能力调整。',
    humor: '今天的铁也有日志：认真记录，按自己的节奏来。',
  },
  navigation: [
    { to: '/', label: '总览', english: 'Dashboard', icon: '◫' },
    { to: '/habits', label: '习惯', english: 'Habits', icon: '◷' },
    { to: '/training', label: '训练', english: 'Training', icon: '⌁' },
    { to: '/nutrition', label: '饮食', english: 'Nutrition', icon: '◒' },
    { to: '/settings', label: '设置', english: 'Settings', icon: '⚙' },
  ],
  habitAction: { professional: '记录一次', humor: '记录一次 · 收工' },
  mealTypes: {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '加餐',
  },
  foodStates: { raw: '生', cooked: '熟', unspecified: '未注明' },
};
