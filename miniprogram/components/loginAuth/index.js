/**
 * 登录授权组件
 * 点击按钮直接通过云函数获取 openid 完成登录
 * 注：wx.getUserInfo 已废弃，改用静默登录方式
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
      value: '登录后即可保存您的打卡记录'
    }
  },

  methods: {
    // 点击登录按钮
    async onLogin() {
      const self = this;
      try {
        wx.showLoading({ title: '登录中...', mask: true });
        const cloudRes = await wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: { type: 'login' }
        });
        wx.hideLoading();

        const result = cloudRes.result;
        if (!result || !result.userId) {
          // 云函数返回了错误（如集合不存在）
          throw new Error(result?.error || '登录返回数据异常');
        }

        // 缓存用户ID
        wx.setStorageSync('userId', result.userId);

        // 触发登录成功事件
        self.triggerEvent('loginsuccess', { userId: result.userId });

      } catch (err) {
        wx.hideLoading();
        console.error('[登录失败]', err);
        // 弹出具体错误信息，方便排查
        wx.showToast({
          title: err.message || '登录失败',
          icon: 'none',
          duration: 3000
        });
        self.triggerEvent('loginfail', { error: err });
      }
    }
  }
});
