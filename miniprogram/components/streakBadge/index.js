// 连续打卡天数徽章组件
Component({
  options: {
    styleIsolation: 'shared'
  },

  properties: {
    streakDays: {
      type: Number,
      value: 0
    },
    themeColor: {
      type: String,
      value: '#E8B4B8'
    }
  }
});
