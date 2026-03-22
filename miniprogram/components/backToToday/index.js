// 回到今天组件
Component({
  options: {
    styleIsolation: 'shared'
  },

  properties: {
    themeColor: {
      type: String,
      value: '#E8B4B8'
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('backtotoday');
    }
  }
});
