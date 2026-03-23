/**
 * 登录授权组件
 * 先确认授权，再根据 openid 在 users 集合中获取/创建用户记录
 */
Component({
  properties: {
    // 是否显示弹窗
    show: {
      type: Boolean,
      value: false
    },
    // 主题颜色
    themeColor: {
      type: String,
      value: '#E8B4B8'
    },
    // 描述文字
    desc: {
      type: String,
      value: '请授权登录，以保存您的打卡记录'
    }
  },

  methods: {
    // 点击登录按钮（open-type="getUserInfo" 触发）
    async onLogin(e) {
      const self = this;
      // 2. 授权成功后，调用云函数用 openid 查询/创建用户
      try {
        wx.showLoading({ title: '登录中...', mask: true });

        const cloudRes = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: { type: 'login' }
        });

        wx.hideLoading();
        const userId = cloudRes.result.userId;

        if (!userId) {
          throw new Error(cloudRes.result.error || '获取用户ID失败');
        }

        // 缓存用户ID
        wx.setStorageSync('userId', userId);

        // 触发登录成功事件
        self.triggerEvent('loginsuccess', { userId: userId });

      } catch (err) {
        wx.hideLoading();
        console.error('登录失败：', err);
        self.triggerEvent('loginfail', { error: err });
      }
    }
  }
});
