// 自定义日历组件（支持单日期 & 日期范围选择）
Component({
  properties: {
    // 选择模式: 'single' 单日期, 'range' 日期范围
    mode: {
      type: String,
      value: 'single'
    },
    // 单日期模式 - 选中的日期时间戳
    selectedDate: {
      type: Number,
      value: new Date().getTime()
    },
    // 范围模式 - 起始日期时间戳
    rangeStart: {
      type: Number,
      value: 0
    },
    // 范围模式 - 结束日期时间戳
    rangeEnd: {
      type: Number,
      value: 0
    },
    // 有记录的日期列表 ['2024-01-01', '2024-01-02']
    recordDates: {
      type: Array,
      value: []
    },
    // 最小日期
    minDate: {
      type: Number,
      value: new Date(2020, 0, 1).getTime()
    },
    // 最大日期
    maxDate: {
      type: Number,
      value: new Date().getTime()
    },
    // range 模式下最大可选天数（默认365天=1年）
    maxRange: {
      type: Number,
      value: 365
    },
    // 主题
    theme: {
      type: Object,
      value: null
    }
  },

  data: {
    year: 2024,
    month: 1,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    days: [],
    currentSelectedDate: null,
    // range 模式内部状态
    rangeStartDateStr: '',
    rangeEndDateStr: '',
    selectingEnd: false
  },

  lifetimes: {
    attached() {
      this.initCalendar();
    }
  },

  observers: {
    'selectedDate, recordDates': function(selectedDate, recordDates) {
      this.initCalendar();
    },
    'rangeStart, rangeEnd': function(rangeStart, rangeEnd) {
      if (this.properties.mode === 'range') {
        this.initRangeState();
        this.generateDays();
      }
    }
  },

  methods: {
    // 初始化日历
    initCalendar() {
      if (this.properties.mode === 'range') {
        this.initRangeState();
      } else {
        const selected = new Date(this.properties.selectedDate);
        this.setData({
          year: selected.getFullYear(),
          month: selected.getMonth() + 1,
          currentSelectedDate: this.formatDateToYMD(selected),
          rangeStartDateStr: '',
          rangeEndDateStr: '',
          selectingEnd: false
        });
      }
      this.generateDays();
    },

    // 初始化范围模式状态
    initRangeState() {
      var startTs = this.properties.rangeStart;
      var endTs = this.properties.rangeEnd;
      var startStr = startTs ? this.formatDateToYMD(new Date(startTs)) : '';
      var endStr = endTs ? this.formatDateToYMD(new Date(endTs)) : '';
      // 以起始日期定位月份
      var refDate = startTs ? new Date(startTs) : new Date();
      this.setData({
        year: refDate.getFullYear(),
        month: refDate.getMonth() + 1,
        rangeStartDateStr: startStr,
        rangeEndDateStr: endStr,
        selectingEnd: !!(startStr && !endStr)
      });
    },

    // 格式化日期为 YYYY-MM-DD
    formatDateToYMD(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    },

    // 比较两个日期字符串
    compareDateStr(a, b) {
      return a < b ? -1 : a > b ? 1 : 0;
    },

    // 生成日期数据
    generateDays() {
      var year = this.data.year;
      var month = this.data.month;
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var todayStr = this.formatDateToYMD(today);

      var firstDay = new Date(year, month - 1, 1);
      var firstDayWeek = firstDay.getDay();
      var daysInMonth = new Date(year, month, 0).getDate();
      var daysInPrevMonth = new Date(year, month - 1, 0).getDate();

      var days = [];
      var recordDates = this.properties.recordDates || [];
      var maxDate = new Date(this.properties.maxDate);
      maxDate.setHours(23, 59, 59, 999);

      var isRange = this.properties.mode === 'range';
      var rangeStart = this.data.rangeStartDateStr;
      var rangeEnd = this.data.rangeEndDateStr;
      var hasRange = isRange && rangeStart && rangeEnd;

      // 上月日期填充
      for (var i = firstDayWeek - 1; i >= 0; i--) {
        var day = daysInPrevMonth - i;
        var date = new Date(year, month - 2, day);
        var dateStr = this.formatDateToYMD(date);
        var dayData = this._buildDayData(day, dateStr, date, todayStr, recordDates, maxDate, isRange, rangeStart, rangeEnd, hasRange, false);
        days.push(dayData);
      }

      // 当月日期
      for (var j = 1; j <= daysInMonth; j++) {
        var dateCur = new Date(year, month - 1, j);
        var dateStrCur = this.formatDateToYMD(dateCur);
        var dayDataCur = this._buildDayData(j, dateStrCur, dateCur, todayStr, recordDates, maxDate, isRange, rangeStart, rangeEnd, hasRange, true);
        days.push(dayDataCur);
      }

      // 下月日期填充（补满6行）
      var remaining = 42 - days.length;
      for (var k = 1; k <= remaining; k++) {
        var dateNext = new Date(year, month, k);
        var dateStrNext = this.formatDateToYMD(dateNext);
        var dayDataNext = this._buildDayData(k, dateStrNext, dateNext, todayStr, recordDates, maxDate, isRange, rangeStart, rangeEnd, hasRange, false);
        days.push(dayDataNext);
      }

      this.setData({ days: days });
    },

    // 构建单个日期数据
    _buildDayData(day, dateStr, date, todayStr, recordDates, maxDate, isRange, rangeStart, rangeEnd, hasRange, isCurrentMonth) {
      var isSingleSelected = !isRange && dateStr === this.data.currentSelectedDate;
      var isRangeStart = isRange && dateStr === rangeStart;
      var isRangeEnd = isRange && dateStr === rangeEnd;
      var isInRange = false;
      if (hasRange) {
        var cmp1 = this.compareDateStr(dateStr, rangeStart);
        var cmp2 = this.compareDateStr(dateStr, rangeEnd);
        if (cmp1 >= 0 && cmp2 <= 0) {
          isInRange = true;
        }
      }
      // range 起始选中样式
      var isSelected = isSingleSelected || isRangeStart || isRangeEnd;

      return {
        day: day,
        dateStr: dateStr,
        isCurrentMonth: isCurrentMonth,
        isToday: dateStr === todayStr,
        isSelected: isSelected,
        hasRecord: recordDates.includes(dateStr),
        isFuture: date > maxDate,
        timestamp: date.getTime(),
        isRangeStart: isRangeStart,
        isRangeEnd: isRangeEnd,
        isInRange: isInRange && !isRangeStart && !isRangeEnd
      };
    },

    // 选择日期
    selectDay(e) {
      var day = e.currentTarget.dataset.day;

      // 不能选择未来日期
      if (day.isFuture) {
        return;
      }

      if (this.properties.mode === 'range') {
        this._selectRange(day);
      } else {
        // 单日期模式
        var days = this.data.days.map(function(item) {
          return Object.assign({}, item, { isSelected: item.dateStr === day.dateStr });
        });
        this.setData({
          days: days,
          currentSelectedDate: day.dateStr
        });
      }
    },

    // range 模式选择逻辑
    _selectRange(day) {
      var rangeStart = this.data.rangeStartDateStr;
      var rangeEnd = this.data.rangeEndDateStr;
      var selectingEnd = this.data.selectingEnd;
      var maxRange = this.properties.maxRange || 365;

      if (!selectingEnd || !rangeStart) {
        // 第一次选择：设置起始日期
        this.setData({
          rangeStartDateStr: day.dateStr,
          rangeEndDateStr: '',
          selectingEnd: true
        });
      } else {
        // 第二次选择：检查是否超出最大范围
        var startDate = new Date(rangeStart);
        var endDate = new Date(day.dateStr);
        var diffDays = Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24);
        if (diffDays > maxRange) {
          wx.showToast({ title: '最多只能选' + maxRange + '天', icon: 'none' });
          return;
        }
        // 自动排序
        var cmp = this.compareDateStr(day.dateStr, rangeStart);
        var newStart, newEnd;
        if (cmp < 0) {
          newStart = day.dateStr;
          newEnd = rangeStart;
        } else if (cmp > 0) {
          newStart = rangeStart;
          newEnd = day.dateStr;
        } else {
          newStart = day.dateStr;
          newEnd = '';
        }
        this.setData({
          rangeStartDateStr: newStart,
          rangeEndDateStr: newEnd,
          selectingEnd: false
        });
      }
      this.generateDays();
    },

    // 上一月
    prevMonth() {
      var year = this.data.year;
      var month = this.data.month - 1;
      if (month < 1) {
        month = 12;
        year--;
      }
      this.setData({ year: year, month: month });
      this.generateDays();
    },

    // 下一月
    nextMonth() {
      var year = this.data.year;
      var month = this.data.month + 1;
      if (month > 12) {
        month = 1;
        year++;
      }
      this.setData({ year: year, month: month });
      this.generateDays();
    },

    // 取消
    onCancel() {
      this.triggerEvent('cancel', 'date-picker');
    },

    // 确认
    onConfirm() {
      if (this.properties.mode === 'range') {
        var startStr = this.data.rangeStartDateStr;
        var endStr = this.data.rangeEndDateStr;
        if (!startStr || !endStr) {
          return;
        }
        this.triggerEvent('confirm', {
          startDate: new Date(startStr).getTime(),
          endDate: new Date(endStr).getTime(),
          startStr: startStr,
          endStr: endStr
        });
      } else {
        var selectedDate = this.data.currentSelectedDate;
        if (selectedDate) {
          this.triggerEvent('confirm', {
            date: new Date(selectedDate).getTime(),
            dateStr: selectedDate
          });
        }
      }
    }
  }
});
