/**
 * 全局常量配置文件
 * 存放应用中使用的固定常量
 */

// ==================== 颜色和主题配置 ====================
const THEME_CONFIG = {
  // 默认主题色ID
  DEFAULT_THEME_ID: 'pink',

  // 主题列表
  THEMES: [
    { id: 'pink', name: '樱花粉', color: '#E8B4B8', lightColor: '#F2D5D8' },
    { id: 'blue', name: '天空蓝', color: '#5B8FF9', lightColor: '#9BB8F7' },
    { id: 'green', name: '薄荷绿', color: '#07C160', lightColor: '#6FD99A' },
    { id: 'purple', name: '薰衣草', color: '#8B5CF6', lightColor: '#BFA3FA' },
    { id: 'orange', name: '暖阳橙', color: '#FF976A', lightColor: '#FFBE9E' },
    { id: 'cyan', name: '湖水青', color: '#13C2C2', lightColor: '#76DEDE' },
  ]
};

// ==================== 悬浮菜单配置 ====================
const FLOAT_MENU = {
  // 菜单项配置
  ITEMS: [
    { id: 'theme', icon: 'smile-o', label: '切换主题' },
    { id: 'chart', icon: 'chart-trending-o', label: '数据统计' },
    { id: 'date', icon: 'calendar-o', label: '选择日期' },
  ],
};

module.exports = {
  THEME_CONFIG,
  FLOAT_MENU
};
