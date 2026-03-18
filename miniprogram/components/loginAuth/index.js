/**
 * 登录授权组件
 * 登录成功后返回用户的 OpenID
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
    // 点击登录按钮
    async onLogin() {
      const self = this;

      try {
        // 1. 调用云函数获取 OpenID
        wx.showLoading({ title: '登录中...', mask: true });
        const cloudRes = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: { type: 'getOpenId' }
        });
        wx.hideLoading();

        const openid = cloudRes.result.openid;

        if (!openid) {
          throw new Error('获取用户ID失败');
        }

        // 2. 缓存用户ID
        wx.setStorageSync('userId', openid);

        // 3. 触发登录成功事件，只返回 ID
        self.triggerEvent('loginsuccess', { userId: openid });

      } catch (err) {
        wx.hideLoading();
        console.error('登录失败：', err);
        self.triggerEvent('loginfail', { error: err });
      }
    }
  }
});
