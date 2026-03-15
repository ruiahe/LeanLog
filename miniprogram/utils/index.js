/**
 * 工具函数文件
 * 存放通用的工具函数
 */

const { THEME_CONFIG } = require('../constants/index');

/**
 * 通过主题 ID 获取主题配置
 * @param {string} id - 主题 ID
 * @returns {Object|undefined} 主题配置对象
 */
function getThemeById(id) {
  return THEME_CONFIG.THEMES.find(theme => theme.id === id);
}

/**
 * 通过颜色值获取主题配置
 * @param {string} color - 颜色值（如 #E8B4B8）
 * @returns {Object|undefined} 主题配置对象
 */
function getThemeByColor(color) {
  return THEME_CONFIG.THEMES.find(theme => theme.color === color);
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期为中文显示（如：2024年01月15日）
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDateCN(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
}

/**
 * 获取日期标签（今天、昨天、或 X月X日）
 * @param {Date} date - 目标日期
 * @returns {string} 日期标签
 */
function getDateLabel(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today - target) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '昨天';
  } else {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }
}

/**
 * 显示弱提示
 * @param {string} message - 提示消息
 * @param {string} type - 类型：success, warning, danger
 */
function showNotify(message, type = 'success') {
  try {
    const notifyModule = require('../miniprogram_npm/@vant/weapp/notify/notify');
    const Notify = notifyModule.default || notifyModule;
    Notify({
      message,
      type,
      duration: 2000,
      top: 50
    });
  } catch (e) {
    const icon = type === 'danger' ? 'error' : (type === 'success' ? 'success' : 'none');
    wx.showToast({ title: message, icon, duration: 2000 });
  }
}

/**
 * 显示加载中
 * @param {string} title - 加载提示文字
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

/**
 * 隐藏加载中
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 获取保存的主题配置
 * @returns {Object|null} 主题配置对象或 null
 */
function getSavedTheme() {
  const savedId = wx.getStorageSync('themeId');
  if (savedId) {
    return getThemeById(savedId);
  }
  return null;
}

/**
 * 保存主题设置
 * @param {Object} theme - 主题配置对象
 */
function saveTheme(theme) {
  wx.setStorageSync('themeColor', theme.color);
  wx.setStorageSync('themeId', theme.id);
}

/**
 * 深拷贝对象
 * @param {Object} obj - 要拷贝的对象
 * @returns {Object} 拷贝后的新对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 防抖函数
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 节流函数
 * @param {Function} fn - 要执行的函数
 * @param {number} interval - 间隔时间（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(fn, interval = 300) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

module.exports = {
  // 主题相关
  getThemeById,
  getThemeByColor,
  getSavedTheme,
  saveTheme,

  // 日期相关
  formatDate,
  formatDateCN,
  getDateLabel,

  // UI 相关
  showNotify,
  showLoading,
  hideLoading,

  // 通用工具
  deepClone,
  debounce,
  throttle
};
