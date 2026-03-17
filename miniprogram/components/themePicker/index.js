/**
 * 主题选择弹窗组件
 * 用于选择应用的主题色
 */
const { THEME_CONFIG } = require('../../constants/index');

Component({
  properties: {
    // 是否显示弹窗
    show: {
      type: Boolean,
      value: false
    },
    // 当前选中的主题 ID
    currentThemeId: {
      type: String,
      value: THEME_CONFIG.DEFAULT_THEME_ID
    }
  },

  data: {
    // 主题列表
    themes: THEME_CONFIG.THEMES
  },

  methods: {
    // 选择主题
    onSelectTheme(e) {
      const themeId = e.currentTarget.dataset.id;
      const theme = this.data.themes.find(t => t.id === themeId);
      if (theme) {
        // 触发事件，让父组件处理主题切换
        this.triggerEvent('change', { themeId, theme });
      }
    },

    // 关闭弹窗
    onClose() {
      this.triggerEvent('close');
    }
  }
});
