// 自定义日历组件
Component({
  properties: {
    // 选中的日期时间戳
    selectedDate: {
      type: Number,
      value: new Date().getTime()
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
    currentSelectedDate: null
  },

  lifetimes: {
    attached() {
      this.initCalendar();
    }
  },

  observers: {
    'selectedDate, recordDates': function(selectedDate, recordDates) {
      this.initCalendar();
    }
  },

  methods: {
    // 初始化日历
    initCalendar() {
      const selected = new Date(this.properties.selectedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      this.setData({
        year: selected.getFullYear(),
        month: selected.getMonth() + 1,
        currentSelectedDate: this.formatDateToYMD(selected)
      });

      this.generateDays();
    },

    // 格式化日期为 YYYY-MM-DD
    formatDateToYMD(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    // 生成日期数据
    generateDays() {
      const year = this.data.year;
      const month = this.data.month;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = this.formatDateToYMD(today);

      // 当月第一天
      const firstDay = new Date(year, month - 1, 1);
      const firstDayWeek = firstDay.getDay();

      // 当月天数
      const daysInMonth = new Date(year, month, 0).getDate();

      // 上月天数
      const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

      const days = [];
      const recordDates = this.properties.recordDates || [];
      const maxDate = new Date(this.properties.maxDate);
      maxDate.setHours(23, 59, 59, 999);
      const maxDateStr = this.formatDateToYMD(maxDate);

      // 上月日期填充
      for (let i = firstDayWeek - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const date = new Date(year, month - 2, day);
        const dateStr = this.formatDateToYMD(date);
        days.push({
          day: day,
          dateStr: dateStr,
          isCurrentMonth: false,
          isToday: false,
          isSelected: dateStr === this.data.currentSelectedDate,
          hasRecord: recordDates.includes(dateStr),
          isFuture: date > maxDate,
          timestamp: date.getTime()
        });
      }

      // 当月日期
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month - 1, i);
        const dateStr = this.formatDateToYMD(date);
        days.push({
          day: i,
          dateStr: dateStr,
          isCurrentMonth: true,
          isToday: dateStr === todayStr,
          isSelected: dateStr === this.data.currentSelectedDate,
          hasRecord: recordDates.includes(dateStr),
          isFuture: date > maxDate,
          timestamp: date.getTime()
        });
      }

      // 下月日期填充（补满6行）
      const remaining = 42 - days.length;
      for (let i = 1; i <= remaining; i++) {
        const date = new Date(year, month, i);
        const dateStr = this.formatDateToYMD(date);
        days.push({
          day: i,
          dateStr: dateStr,
          isCurrentMonth: false,
          isToday: false,
          isSelected: dateStr === this.data.currentSelectedDate,
          hasRecord: recordDates.includes(dateStr),
          isFuture: date > maxDate,
          timestamp: date.getTime()
        });
      }

      this.setData({ days });
    },

    // 选择日期
    selectDay(e) {
      const day = e.currentTarget.dataset.day;
      
      // 不能选择未来日期
      if (day.isFuture) {
        return;
      }

      // 更新选中状态
      const days = this.data.days.map(item => ({
        ...item,
        isSelected: item.dateStr === day.dateStr
      }));

      this.setData({
        days: days,
        currentSelectedDate: day.dateStr
      });
    },

    // 上一月
    prevMonth() {
      let year = this.data.year;
      let month = this.data.month - 1;
      
      if (month < 1) {
        month = 12;
        year--;
      }

      this.setData({ year, month });
      this.generateDays();
    },

    // 下一月
    nextMonth() {
      let year = this.data.year;
      let month = this.data.month + 1;
      
      if (month > 12) {
        month = 1;
        year++;
      }

      this.setData({ year, month });
      this.generateDays();
    },

    // 取消
    onCancel() {
      this.triggerEvent('cancel');
    },

    // 确认
    onConfirm() {
      const selectedDate = this.data.currentSelectedDate;
      if (selectedDate) {
        const date = new Date(selectedDate);
        this.triggerEvent('confirm', {
          date: date.getTime(),
          dateStr: selectedDate
        });
      }
    }
  }
});
