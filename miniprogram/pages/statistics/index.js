const { THEME_CONFIG, PROPERTIE_ITEMS } = require('../../constants/index');
const { getThemeById } = require('../../utils/index');
const wxCharts = require('../../utils/wxcharts-min');

// 趋势指标配置 - 从 PROPERTIE_ITEMS 动态生成
const METRIC_COLORS = [
  '#E8B4B8', '#5B8FF9', '#13C2C2', '#FF976A', '#8B5CF6',
  '#07C160', '#FF6B6B', '#F7BA1E', '#36CFC9', '#597EF7', '#9254DE', '#F759AB'
];
const METRIC_UNITS = {
  weight: 'kg', bodyFat: '%', water: 'ml', stepNumber: '步',
  exerciseList: '分', sleepDuration: 'h', bedTimeWeight: 'kg',
  chest: 'cm', waist: 'cm', hip: 'cm', arm: 'cm', thigh: 'cm'
};
const METRIC_DECIMALS = {
  weight: 1, bodyFat: 1, water: 0, stepNumber: 0,
  exerciseList: 0, sleepDuration: 1, bedTimeWeight: 1,
  chest: 1, waist: 1, hip: 1, arm: 1, thigh: 1
};

const CHART_METRICS = PROPERTIE_ITEMS.filter(function(item) { return item.canShowLineChart; });
const METRIC_CONFIG = {};
CHART_METRICS.forEach(function(item, index) {
  METRIC_CONFIG[item.value] = {
    label: item.label,
    unit: METRIC_UNITS[item.value] || '',
    key: item.value,
    color: METRIC_COLORS[index % METRIC_COLORS.length],
    decimals: METRIC_DECIMALS[item.value] != null ? METRIC_DECIMALS[item.value] : 0,
    isArray: item.value === 'exerciseList'
  };
});

// 粒度配置
const GRANULARITY_CONFIG = {
  daily:   '每天',
  weekly:  '每周',
  monthly: '每月',
  yearly:  '每年'
};

Page({
  data: {
    primaryColor: '#E8B4B8',
    primaryColorLight: '#F2D5D8',
    chartType: 'line',
    loading: true,
    currentTheme: null,
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
    streakDays: 0,
    exerciseDays: 0,
    totalExerciseMinutes: 0,
    avgSleep: 0,
    avgWater: 0,

    // 趋势图选择器
    metricKeys: CHART_METRICS.map(function(item) { return item.value; }),
    metricNames: CHART_METRICS.map(function(item) { return item.label; }),
    metricColumns: CHART_METRICS.map(function(item) { return { text: item.label, value: item.value }; }),
    metricIndex: 0,
    showMetricPicker: false,
    startDate: '',
    endDate: '',
    dateRangeText: '选择时间段',
    showCalendar: false,
    calendarRangeStart: 0,
    calendarRangeEnd: 0,

    granularityKeys: Object.keys(GRANULARITY_CONFIG),
    granularityNames: Object.keys(GRANULARITY_CONFIG).map(function(k) { return GRANULARITY_CONFIG[k]; }),
    granularityColumns: Object.keys(GRANULARITY_CONFIG).map(function(k) { return { text: GRANULARITY_CONFIG[k], value: k }; }),
    granularityIndex: 0,
    showGranularityPicker: false,

    hasRecords: false,
    floatMenuItems: [
      { id: 'theme', icon: 'smile-o', label: '切换主题' },
      { id: 'chart', icon: 'edit', label: '打卡记录' },
      { id: 'chart-type', icon: 'bar-chart-o', label: '切换图表' },
    ],
  },

  // 保存 wxCharts 实例
  _chart: null,
  // 缓存全部记录
  _allRecords: [],

  onLoad() {
    this.loadSavedTheme();
    this.initCalendarRange();
    this.loadAllData();
  },

  onShow() {
    this.loadSavedTheme();
    // 非首次加载且有缓存数据时，重绘图表
    if (this._allRecords.length > 0 && !this.data.loading) {
      this.updateChartFromCache();
    }
  },

  // 初始化日历范围及默认时间段
  initCalendarRange() {
    var now = new Date();
    var weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 6);
    var startStr = this.formatDate(weekAgo);
    var endStr = this.formatDate(now);
    this.setData({
      calendarRangeStart: weekAgo.getTime(),
      calendarRangeEnd: now.getTime(),
      startDate: startStr,
      endDate: endStr,
      dateRangeText: startStr.substring(5) + ' ~ ' + endStr.substring(5)
    });
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
        totalDays: 0, streakDays: 0, exerciseDays: 0,
        totalExerciseMinutes: 0, avgSleep: 0, avgWater: 0
      });
      return;
    }

    let exerciseDays = 0;
    let totalExerciseMinutes = 0;
    let totalExerciseCount = 0;
    let totalWater = 0;
    let waterCount = 0;
    let totalSleep = 0;
    let sleepCount = 0;

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (r.exercised) {
        exerciseDays++;
        if (r.exerciseList && r.exerciseList.length > 0) {
          totalExerciseCount += r.exerciseList.length;
          for (let j = 0; j < r.exerciseList.length; j++) {
            totalExerciseMinutes += r.exerciseList[j].duration || 0;
          }
        }
      }
      if (r.water != null && r.water !== '') {
        totalWater += Number(r.water) || 0;
        waterCount++;
      }
      if (r.sleepDuration != null && r.sleepDuration !== '') {
        totalSleep += Number(r.sleepDuration) || 0;
        sleepCount++;
      }
    }

    // 计算连续打卡天数
    const dateSet = new Set(records.map(function(r) { return r.date; }));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = this.formatDate(today);
    const checkDate = new Date(today);
    if (!dateSet.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    let streakDays = 0;
    while (true) {
      const dateStr = this.formatDate(checkDate);
      if (dateSet.has(dateStr)) {
        streakDays++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    this.setData({
      totalDays: records.length,
      streakDays: streakDays,
      exerciseDays: exerciseDays,
      totalExerciseMinutes: totalExerciseMinutes,
      avgSleep: sleepCount > 0 ? (totalSleep / sleepCount).toFixed(1) : '0',
      avgWater: waterCount > 0 ? Math.round(totalWater / waterCount) : 0
    });
  },

  // ========== 趋势图相关 ==========

  onShowMetricPicker() {
    this.setData({ showMetricPicker: true });
  },

  onCloseMetricPicker() {
    this.setData({ showMetricPicker: false });
  },

  onMetricConfirm(e) {
    var index = e.detail.index;
    this.setData({ metricIndex: index, showMetricPicker: false });
    this.updateChartFromCache();
  },

  onShowGranularityPicker() {
    this.setData({ showGranularityPicker: true });
  },

  onCloseGranularityPicker() {
    this.setData({ showGranularityPicker: false });
  },

  onGranularityConfirm(e) {
    var index = e.detail.index;
    this.setData({ granularityIndex: index, showGranularityPicker: false });
    this.updateChartFromCache();
  },

  onShowCalendar() {
    this.setData({ showCalendar: true });
  },

  onCalendarClose() {
    this.setData({ showCalendar: false });
  },

  onCalendarConfirm(e) {
    var detail = e.detail;
    if (!detail.startStr || !detail.endStr) return;
    this.setData({
      showCalendar: false,
      calendarRangeStart: detail.startDate,
      calendarRangeEnd: detail.endDate,
      startDate: detail.startStr,
      endDate: detail.endStr,
      dateRangeText: detail.startStr.substring(5) + ' ~ ' + detail.endStr.substring(5)
    });
    this.updateChartFromCache();
  },

  onClearDateRange() {
    this.setData({
      startDate: '',
      endDate: '',
      dateRangeText: '选择时间段'
    });
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
    const granularityKey = this.data.granularityKeys[this.data.granularityIndex];
    const metric = METRIC_CONFIG[metricKey];

    // 按时间范围过滤
    var records = allRecords.slice();
    if (this.data.startDate) {
      records = records.filter(function(r) {
        if (this.data.endDate) {
          return r.date >= this.data.startDate && r.date <= this.data.endDate;
        }
        return r.date >= this.data.startDate;
      }.bind(this));
    }

    // 按日期升序排列
    records.sort(function(a, b) { return a.date.localeCompare(b.date); });

    // 提取数值，数组类型取所有元素之和
    var self = this;
    if (granularityKey === 'daily') {
      return {
        categories: records.map(function(r) { return r.date.substring(5); }),
        data: records.map(function(r) {
          var val = r[metricKey];
          if (val == null) return null;
          val = Number(val) || 0;
          if (metric.isArray && Array.isArray(val)) {
            return self.sumArray(val);
          }
          return val;
        }),
        color: metric.color,
        unit: metric.unit,
        label: metric.label
      };
    }

    // 按周/月/年分组取平均值
    var groups = {};
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var val = r[metricKey];
      if (val == null) continue;
      val = Number(val) || 0;
      if (metric.isArray && Array.isArray(val)) {
        val = self.sumArray(val);
      }

      var key;
      if (granularityKey === 'weekly') {
        key = self.getWeekKey(r.date);
      } else if (granularityKey === 'monthly') {
        key = r.date.substring(0, 7);
      } else {
        key = r.date.substring(0, 4);
      }
      if (!groups[key]) groups[key] = { sum: 0, count: 0 };
      groups[key].sum += val;
      groups[key].count++;
    }

    var sortedKeys = Object.keys(groups).sort();
    return {
      categories: sortedKeys.map(function(k) {
        if (granularityKey === 'weekly') return k;
        if (granularityKey === 'monthly') return k.substring(2);
        return k;
      }),
      data: sortedKeys.map(function(k) {
        var avg = groups[k].sum / groups[k].count;
        return Number(avg.toFixed(metric.decimals));
      }),
      color: metric.color,
      unit: metric.unit,
      label: metric.label
    };
  },

  // 获取日期所在周的key，格式 "MM/DD~MM/DD"
  getWeekKey(dateStr) {
    var d = new Date(dateStr);
    var day = d.getDay() || 7; // 周一为1，周日为7
    var monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    var fmt = function(dt) {
      return String(dt.getMonth() + 1).padStart(2, '0') + '/' + String(dt.getDate()).padStart(2, '0');
    };
    return fmt(monday) + '~' + fmt(sunday);
  },

  // 使用 wx-charts 渲染折线图
  renderWxChart(aggregated) {
    if (!aggregated || aggregated.data.length === 0) return;

    var self = this;
    var canvasId = 'trendChart';

    // 先清空 canvas，确保可以重绘
    try {
      var ctx = wx.createCanvasContext(canvasId);
      ctx.clearRect(0, 0, 345, 200);
      ctx.draw(false, function() {
        self._createChart(canvasId, aggregated);
      });
    } catch (err) {
      console.error('canvas 清空失败：', err);
      self._createChart(canvasId, aggregated);
    }
  },

  _createChart(canvasId, aggregated) {
    this._chart = null;
    var chartType = this.data.chartType || 'line';

    try {
      this._chart = new wxCharts({
        type: chartType,
        canvasId: canvasId,
        context: wx.createCanvasContext(canvasId),
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
          min: undefined
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

  // 数组数据求和
  sumArray(arr) {
    if (!Array.isArray(arr)) return arr;
    var sum = 0;
    for (var i = 0; i < arr.length; i++) {
      var item = arr[i];
      // exerciseList 中每个 item 有 duration 字段
      if (item && typeof item === 'object' && item.duration != null) {
        sum += item.duration;
      } else if (typeof item === 'number') {
        sum += item;
      }
    }
    return sum;
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
      case 'chart':
        wx.navigateTo({ url: '/pages/leanLog/index' });
        break;
      case 'chart-type':
        this.switchChartType({ currentTarget: { dataset: { type: this.data.chartType === 'line' ? 'column' : 'line' } } });
        break;
      case 'theme':
        this.setData({ showThemePopup: true });
        break;
    }
  },

  // 切换图表类型
  switchChartType(e) {
    var type = e.currentTarget.dataset.type;
    if (type === this.data.chartType) return;
    this.setData({ chartType: type, chartTypeIndex: type === 'column' ? 1 : 0 });
    this.updateChartFromCache();
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
