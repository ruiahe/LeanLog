const { THEME_CONFIG, FLOAT_MENU } = require('../../constants/index');
const { getThemeById } = require('../../utils/index');
const wxCharts = require('../../utils/wxcharts-min');

// 趋势指标配置
const METRIC_CONFIG = {
  weight:        { label: '体重', unit: 'kg', key: 'weight', color: '#E8B4B8', decimals: 1 },
  bodyFat:       { label: '体脂率', unit: '%', key: 'bodyFat', color: '#5B8FF9', decimals: 1 },
  water:         { label: '饮水量', unit: 'ml', key: 'water', color: '#13C2C2', decimals: 0 },
  stepNumber:    { label: '步数', unit: '步', key: 'stepNumber', color: '#FF976A', decimals: 0 },
  sleepDuration: { label: '睡眠', unit: 'h', key: 'sleepDuration', color: '#8B5CF6', decimals: 1 }
};

// 时间范围配置
const TIME_RANGE_CONFIG = {
  '7d':  { label: '近7天', days: 7 },
  '30d': { label: '近30天', days: 30 },
  '90d': { label: '近90天', days: 90 },
  'all': { label: '全部', days: 0 }
};

// 粒度配置
const GRANULARITY_CONFIG = {
  daily:   '按天',
  monthly: '按月',
  yearly:  '按年'
};

Page({
  data: {
    primaryColor: '#E8B4B8',
    primaryColorLight: '#F2D5D8',
    loading: true,
    currentTheme: null,
    floatMenuItems: FLOAT_MENU.ITEMS,
    showThemePopup: false,

    // 今日数据
    todayWeight: null,
    todayBodyFat: null,
    weightChange: 0,
    weightChangeText: '无变化',
    fatChange: 0,
    fatChangeText: '无变化',

    // 打卡统计
    totalDays: 0,
    exerciseDays: 0,
    totalExerciseMinutes: 0,
    avgWater: 0,

    // 趋势图选择器
    metricKeys: Object.keys(METRIC_CONFIG),
    metricNames: Object.keys(METRIC_CONFIG).map(function(k) { return METRIC_CONFIG[k].label; }),
    metricIndex: 0,

    timeRangeKeys: Object.keys(TIME_RANGE_CONFIG),
    timeRangeNames: Object.keys(TIME_RANGE_CONFIG).map(function(k) { return TIME_RANGE_CONFIG[k].label; }),
    timeRangeIndex: 0,

    granularityKeys: Object.keys(GRANULARITY_CONFIG),
    granularityNames: Object.keys(GRANULARITY_CONFIG).map(function(k) { return GRANULARITY_CONFIG[k]; }),
    granularityIndex: 0,

    hasRecords: false,
    floatMenuItems: FLOAT_MENU.ITEMS.map(function(item) {
      return item.id === 'chart'
        ? { id: 'chart', icon: 'edit', label: '打卡记录' }
        : item;
    }),
  },

  // 保存 wxCharts 实例
  _chart: null,
  // 缓存全部记录
  _allRecords: [],

  onLoad() {
    this.loadSavedTheme();
    this.loadAllData();
  },

  onShow() {
    this.loadSavedTheme();
    // 非首次加载且有缓存数据时，重绘图表
    if (this._allRecords.length > 0 && !this.data.loading) {
      this.updateChartFromCache();
    }
  },

  // 加载主题
  loadSavedTheme() {
    let savedId = wx.getStorageSync('themeId');
    savedId = savedId == null || savedId === '' ? THEME_CONFIG.DEFAULT_THEME_ID : savedId;
    const theme = getThemeById(savedId);
    if (theme) {
      this.setData({
        currentTheme: theme,
        primaryColor: theme.color,
        primaryColorLight: theme.lightColor
      });
    }
  },

  // 加载所有数据
  loadAllData() {
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      this.setData({ loading: false, hasRecords: false });
      return;
    }

    const self = this;
    this.setData({ loading: true });

    const todayStr = this.formatDate(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this.formatDate(yesterday);

    Promise.all([
      this.callGet('getRecordByDate', { userId, date: todayStr }),
      this.callGet('getRecordByDate', { userId, date: yesterdayStr }),
      this.callGet('getLogList', { userId, startDate: '' })
    ]).then(function(results) {
      const todayRes = results[0].data || [];
      const yesterdayRes = results[1].data || [];
      const allRecords = results[2].data || [];

      self._allRecords = allRecords;
      self.processTodayData(todayRes, yesterdayRes);
      self.processStats(allRecords);
      self.setData({ loading: false, hasRecords: allRecords.length > 0 });

      // 等 canvas 节点渲染完后再画图
      if (allRecords.length > 0) {
        setTimeout(function() {
          self.updateChartFromCache();
        }, 300);
      }
    }).catch(function(err) {
      console.error('加载数据失败：', err);
      self.setData({ loading: false });
      self.showNotify('加载失败，请重试', 'danger');
    });
  },

  // 封装云函数调用
  callGet(type, data) {
    return wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: { type: type, ...data }
    }).then(function(res) { return res.result; });
  },

  // 处理今日数据
  processTodayData(todayRes, yesterdayRes) {
    const todayRecord = todayRes.length > 0 ? todayRes[0] : null;
    const yesterdayRecord = yesterdayRes.length > 0 ? yesterdayRes[0] : null;

    const todayWeight = todayRecord ? todayRecord.weight : null;
    const todayBodyFat = todayRecord ? todayRecord.bodyFat : null;
    const yesterdayWeight = yesterdayRecord ? yesterdayRecord.weight : null;
    const yesterdayBodyFat = yesterdayRecord ? yesterdayRecord.bodyFat : null;

    let weightChange = 0;
    let fatChange = 0;

    if (todayWeight != null && yesterdayWeight != null) {
      weightChange = todayWeight - yesterdayWeight;
    }
    if (todayBodyFat != null && yesterdayBodyFat != null) {
      fatChange = todayBodyFat - yesterdayBodyFat;
    }

    this.setData({
      todayWeight: todayWeight,
      todayBodyFat: todayBodyFat,
      weightChange: weightChange,
      weightChangeText: this.formatChange(weightChange),
      fatChange: fatChange,
      fatChangeText: this.formatChange(fatChange)
    });
  },

  // 处理打卡统计
  processStats(records) {
    if (records.length === 0) {
      this.setData({
        totalDays: 0, exerciseDays: 0,
        totalExerciseMinutes: 0, avgWater: 0
      });
      return;
    }

    let exerciseDays = 0;
    let totalExerciseMinutes = 0;
    let totalWater = 0;
    let waterCount = 0;

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (r.exercised) {
        exerciseDays++;
        if (r.exerciseList && r.exerciseList.length > 0) {
          for (let j = 0; j < r.exerciseList.length; j++) {
            totalExerciseMinutes += r.exerciseList[j].duration || 0;
          }
        }
      }
      if (r.water) {
        totalWater += r.water;
        waterCount++;
      }
    }

    this.setData({
      totalDays: records.length,
      exerciseDays: exerciseDays,
      totalExerciseMinutes: totalExerciseMinutes,
      avgWater: waterCount > 0 ? Math.round(totalWater / waterCount) : 0
    });
  },

  // ========== 趋势图相关 ==========

  onMetricChange(e) {
    this.setData({ metricIndex: e.detail.value });
    this.updateChartFromCache();
  },

  onTimeRangeChange(e) {
    this.setData({ timeRangeIndex: e.detail.value });
    this.updateChartFromCache();
  },

  onGranularityChange(e) {
    this.setData({ granularityIndex: e.detail.value });
    this.updateChartFromCache();
  },

  // 从缓存数据更新图表
  updateChartFromCache() {
    if (this._allRecords.length === 0) return;
    var aggregated = this.aggregateData(this._allRecords);
    this.renderWxChart(aggregated);
  },

  // 聚合数据
  aggregateData(allRecords) {
    const metricKey = this.data.metricKeys[this.data.metricIndex];
    const timeRangeKey = this.data.timeRangeKeys[this.data.timeRangeIndex];
    const granularityKey = this.data.granularityKeys[this.data.granularityIndex];
    const metric = METRIC_CONFIG[metricKey];

    // 按时间范围过滤
    var records = allRecords.slice();
    if (timeRangeKey !== 'all') {
      const days = TIME_RANGE_CONFIG[timeRangeKey].days;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = this.formatDate(cutoff);
      records = records.filter(function(r) { return r.date >= cutoffStr; });
    }

    // 按日期升序排列
    records.sort(function(a, b) { return a.date.localeCompare(b.date); });

    if (granularityKey === 'daily') {
      return {
        categories: records.map(function(r) { return r.date.substring(5); }),
        data: records.map(function(r) { return r[metricKey] != null ? r[metricKey] : null; }),
        color: metric.color,
        unit: metric.unit,
        label: metric.label
      };
    }

    // 按月/年分组取平均值
    var groups = {};
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var val = r[metricKey];
      if (val == null) continue;

      var key = granularityKey === 'monthly' ? r.date.substring(0, 7) : r.date.substring(0, 4);
      if (!groups[key]) groups[key] = { sum: 0, count: 0 };
      groups[key].sum += val;
      groups[key].count++;
    }

    var sortedKeys = Object.keys(groups).sort();
    return {
      categories: sortedKeys.map(function(k) { return granularityKey === 'monthly' ? k.substring(2) : k; }),
      data: sortedKeys.map(function(k) {
        var avg = groups[k].sum / groups[k].count;
        return Number(avg.toFixed(metric.decimals));
      }),
      color: metric.color,
      unit: metric.unit,
      label: metric.label
    };
  },

  // 使用 wx-charts 渲染折线图
  renderWxChart(aggregated) {
    if (!aggregated || aggregated.data.length === 0) return;

    // 销毁旧实例
    if (this._chart) {
      this._chart = null;
    }

    try {
      this._chart = new wxCharts({
        type: 'line',
        canvasId: 'trendChart',
        context: wx.createCanvasContext('trendChart'),
        width: 690 / 2,
        height: 400 / 2,
        background: '#FFFFFF',
        animation: true,
        categories: aggregated.categories,
        series: [{
          name: aggregated.label,
          data: aggregated.data,
          format: function(val) {
            return val + aggregated.unit;
          }
        }],
        color: [aggregated.color],
        xAxis: {
          disableGrid: true,
          fontColor: '#999999',
          fontSize: 10
        },
        yAxis: {
          gridColor: '#E8E8E8',
          fontColor: '#999999',
          fontSize: 10,
          format: function(val) {
            return Number(val).toFixed(1);
          },
          min: undefined // 自动计算
        },
        dataLabel: false,
        dataPointShape: true,
        extra: {
          line: {
            width: 2,
            shape: 'circle'
          },
          lineStyle: 'curve'
        }
      });
    } catch (err) {
      console.error('wx-charts 渲染失败：', err);
    }
  },

  // 格式化变化值
  formatChange(value) {
    if (value === 0) return '无变化';
    const absValue = Math.abs(value).toFixed(1);
    return value > 0 ? '+' + absValue : absValue;
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  },

  // 悬浮菜单点击事件
  onFloatMenuTap(e) {
    const { item } = e.detail;
    switch (item.id) {
      case 'date':
        break;
      case 'chart':
        wx.navigateTo({ url: '/pages/leanLog/index' });
        break;
      case 'theme':
        this.setData({ showThemePopup: true });
        break;
    }
  },

  // 主题切换事件
  onThemeChange(e) {
    const { themeId, theme } = e.detail;
    if (theme) {
      this.setData({
        currentTheme: theme,
        primaryColor: theme.color,
        primaryColorLight: theme.lightColor
      });
      wx.setStorageSync('themeId', themeId);
      this.showNotify('主题已切换为' + theme.name, 'success');
      this.setData({ showThemePopup: false });
      // 刷新图表颜色
      this.updateChartFromCache();
    }
  },

  // 关闭主题弹窗
  closeThemePopup() {
    this.setData({ showThemePopup: false });
  },

  // 显示弱提示
  showNotify(message, type) {
    try {
      const notifyModule = require('../../miniprogram_npm/@vant/weapp/notify/notify');
      const Notify = notifyModule.default || notifyModule;
      Notify({
        message: message,
        type: type,
        duration: 2000,
        top: 50
      });
    } catch (e) {
      wx.showToast({
        title: message,
        icon: type === 'danger' ? 'error' : 'none'
      });
    }
  }
});
