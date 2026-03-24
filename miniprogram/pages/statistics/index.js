const { THEME_CONFIG } = require('../../constants/index');

// 图表配置
const CHART_CONFIG = {
  padding: 30,
  pointRadius: 4,
  lineWidth: 2,
  gridColor: '#E8E8E8',
  lineColor: THEME_CONFIG.DEFAULT_COLOR,
  pointColor: THEME_CONFIG.DEFAULT_COLOR,
  textColor: '#999999',
  fontSize: 10
};

Page({
  data: {
    primaryColor: THEME_CONFIG.DEFAULT_COLOR,
    primaryColorLight: THEME_CONFIG.DEFAULT_LIGHT_COLOR,
    loading: true,
    timeRange: 'week', // week, month, all
    records: [],
    recentRecords: [],
    chartData: [],

    // 统计数据
    latestWeight: null,
    latestBodyFat: null,
    weightChange: 0,
    fatChange: 0,
    weightChangeText: '无变化',
    fatChangeText: '无变化',
    totalDays: 0,
    exerciseDays: 0,
    totalExerciseMinutes: 0,
    avgWater: 0
  },

  onLoad() {
    this.loadSavedTheme();
    this.loadStatistics();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadSavedTheme();
    this.loadStatistics();
  },

  // 加载保存的主题
  loadSavedTheme() {
    const savedId = wx.getStorageSync('themeId');
    if (savedId) {
      const theme = THEME_CONFIG.getThemeById(savedId);
      if (theme) {
        this.setData({
          primaryColor: theme.color,
          primaryColorLight: theme.lightColor
        });
      }
    }
  },

  // 切换时间范围
  changeTimeRange(e) {
    const range = e.currentTarget.dataset.range;
    if (range === this.data.timeRange) return;

    this.setData({ timeRange: range, loading: true });
    this.loadStatistics();
  },

  // 加载统计数据
  loadStatistics() {
    const self = this;
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      this.setData({ loading: false });
      return;
    }

    // 根据时间范围计算开始日期
    let startDate = '';
    if (this.data.timeRange !== 'all') {
      const days = this.data.timeRange === 'week' ? 7 : 30;
      const startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() - days);
      startDate = this.formatDate(startDateObj);
    }

    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: { type: 'getLogList', userId, startDate }
    }).then(function(res) {
      const records = res.result?.data || [];
      self.processData(records);
    }).catch(function(err) {
      console.error('加载统计数据失败：', err);
      self.setData({ loading: false });
      self.showNotify('加载失败，请重试', 'danger');
    });
  },

  // 处理数据
  processData(records) {
    if (records.length === 0) {
      this.setData({
        loading: false,
        records: [],
        recentRecords: [],
        chartData: [],
        latestWeight: null,
        latestBodyFat: null,
        totalDays: 0,
        exerciseDays: 0,
        totalExerciseMinutes: 0,
        avgWater: 0
      });
      return;
    }

    // 计算统计数据
    const totalDays = records.length;
    let exerciseDays = 0;
    let totalExerciseMinutes = 0;
    let totalWater = 0;
    let waterCount = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // 运动统计
      if (record.exercise && record.exercise.exercised) {
        exerciseDays++;
        totalExerciseMinutes += record.exercise.totalDuration || 0;
      }

      // 饮水统计
      if (record.diet && record.diet.water) {
        totalWater += record.diet.water;
        waterCount++;
      }
    }

    const avgWater = waterCount > 0 ? Math.round(totalWater / waterCount) : 0;

    // 最新数据
    const latestRecord = records[0];
    const latestWeight = latestRecord.weight;
    const latestBodyFat = latestRecord.bodyFat;

    // 计算变化值
    let weightChange = 0;
    let fatChange = 0;

    if (records.length >= 2) {
      const firstRecord = records[records.length - 1];
      weightChange = latestWeight - firstRecord.weight;
      if (latestBodyFat && firstRecord.bodyFat) {
        fatChange = latestBodyFat - firstRecord.bodyFat;
      }
    }

    const weightChangeText = this.formatChange(weightChange);
    const fatChangeText = this.formatChange(fatChange);

    // 图表数据（按日期正序排列）
    const chartData = records.slice().reverse().map(function(record) {
      return {
        date: record.date,
        weight: record.weight
      };
    });

    this.setData({
      loading: false,
      records: records,
      recentRecords: records.slice(0, 5),
      chartData: chartData,
      latestWeight: latestWeight,
      latestBodyFat: latestBodyFat,
      weightChange: weightChange,
      fatChange: fatChange,
      weightChangeText: weightChangeText,
      fatChangeText: fatChangeText,
      totalDays: totalDays,
      exerciseDays: exerciseDays,
      totalExerciseMinutes: totalExerciseMinutes,
      avgWater: avgWater
    });

    // 绘制图表
    this.drawChart();
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

  // 绘制图表
  drawChart() {
    const chartData = this.data.chartData;
    if (chartData.length === 0) return;

    const self = this;
    const query = wx.createSelectorQuery();
    query.select('#weightChart')
      .fields({ node: true, size: true })
      .exec(function(res) {
        if (!res || !res[0] || !res[0].node) {
          console.error('获取 canvas 节点失败');
          return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const width = res[0].width;
        const height = res[0].height;

        canvas.width = width * 2;
        canvas.height = height * 2;
        ctx.scale(2, 2);

        self.renderChart(ctx, width, height, chartData);
      });
  },

  // 渲染图表
  renderChart(ctx, width, height, data) {
    if (data.length === 0) return;

    const padding = CHART_CONFIG.padding;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // 计算数据范围
    const weights = data.map(function(d) { return d.weight; });
    const minWeight = Math.floor(Math.min.apply(null, weights) - 1);
    const maxWeight = Math.ceil(Math.max.apply(null, weights) + 1);
    const weightRange = maxWeight - minWeight;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 绘制网格线
    ctx.strokeStyle = CHART_CONFIG.gridColor;
    ctx.lineWidth = 0.5;

    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const y = padding + (chartHeight / gridCount) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // 绘制数据点和连线
    ctx.strokeStyle = CHART_CONFIG.lineColor;
    ctx.lineWidth = CHART_CONFIG.lineWidth;
    ctx.fillStyle = CHART_CONFIG.pointColor;

    const points = [];
    const pointCount = data.length;

    for (let i = 0; i < pointCount; i++) {
      const x = padding + (chartWidth / (pointCount - 1 || 1)) * i;
      const y = padding + chartHeight - ((data[i].weight - minWeight) / weightRange) * chartHeight;
      points.push({ x: x, y: y });
    }

    // 绘制连线
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        ctx.moveTo(points[i].x, points[i].y);
      } else {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    ctx.stroke();

    // 绘制数据点
    for (let i = 0; i < points.length; i++) {
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, CHART_CONFIG.pointRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制日期标签（只显示首尾）
    ctx.fillStyle = CHART_CONFIG.textColor;
    ctx.font = CHART_CONFIG.fontSize + 'px sans-serif';
    ctx.textAlign = 'center';

    if (data.length > 0) {
      // 第一个日期
      const firstDate = data[0].date.substring(5);
      ctx.fillText(firstDate, padding, height - 8);

      // 最后一个日期
      if (data.length > 1) {
        const lastDate = data[data.length - 1].date.substring(5);
        ctx.fillText(lastDate, width - padding, height - 8);
      }
    }
  },

  // 查看记录详情
  viewRecord(e) {
    const id = e.currentTarget.dataset.id;
    // 可以跳转到详情页或编辑页
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
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
