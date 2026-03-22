// 一键填写组件
const { formatDate } = require('../../utils/index');

Component({
  options: {
    styleIsolation: 'shared'
  },

  properties: {
    userId: {
      type: String,
      value: ''
    },
    currentDateTimestamp: {
      type: Number,
      value: new Date().getTime()
    },
    themeColor: {
      type: String,
      value: '#E8B4B8'
    }
  },

  methods: {
    onTap() {
      const { userId, currentDateTimestamp } = this.data;
      if (!userId) {
        this.triggerEvent('shownotify', { message: '需要登录后使用', type: 'warning' });
        return;
      }

      const currentDateStr = formatDate(currentDateTimestamp);
      const db = wx.cloud.database();
      const _ = db.command;

      wx.showLoading({ title: '加载中...', mask: true });
      const self = this;
      db.collection('lean_logs')
        .where({ userId, date: _.lt(currentDateStr) })
        .orderBy('date', 'desc')
        .limit(1)
        .get()
        .then(function(res) {
          wx.hideLoading();
          if (res?.data && res.data?.length > 0) {
            const { _id, ...rest } = res.data[0];
            const copied = {};
            Object.assign(copied, rest);
            self.triggerEvent('fill', { record: copied });
          } else {
            self.triggerEvent('shownotify', { message: '该日期之前暂无记录', type: 'warning' });
          }
        })
        .catch(function(err) {
          wx.hideLoading();
          console.error('查询记录失败：', err);
          self.triggerEvent('shownotify', { message: '加载失败，请重试', type: 'danger' });
        });
    }
  }
});
