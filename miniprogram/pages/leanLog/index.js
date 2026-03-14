// pages/leanLog/index.js
Page({
  data: {
    // 当前日期
    currentDate: '',
    currentDateTimestamp: new Date().getTime(),
    minDate: new Date(2020, 0, 1).getTime(),
    maxDate: new Date().getTime(),
    showDatePickerPopup: false,

    // 用户信息
    userInfo: null,

    // 基础数据
    weight: '',
    bodyFat: '',
    recordTime: '',

    // 饮食记录
    breakfast: '',
    lunch: '',
    dinner: '',
    snacks: '',
    water: 8, // 默认8杯水

    // 运动记录
    exercised: false,
    exerciseType: '',
    exerciseDuration: 30,
    caloriesBurned: '',

    // 状态评估
    mood: 3,
    hunger: 'normal',
    hungerOptions: [
      { label: '很饿', value: 'very_hungry' },
      { label: '有点饿', value: 'slightly_hungry' },
      { label: '适中', value: 'normal' },
      { label: '较饱', value: 'slightly_full' },
      { label: '很饱', value: 'very_full' }
    ],
    notes: ''
  },

  onLoad(options) {
    this.initCurrentDate();
    // 尝试获取本地缓存的用户信息
    this.loadCachedUserInfo();
    // 动态引入 Toast 和 Notify
    try {
      const toastModule = require('../../miniprogram_npm/@vant/weapp/toast/toast');
      this.Toast = toastModule.default || toastModule;
      const notifyModule = require('../../miniprogram_npm/@vant/weapp/notify/notify');
      this.Notify = notifyModule.default || notifyModule;
    } catch (e) {
      console.warn('Vant 组件加载失败，使用原生 API 替代', e);
      this.Toast = null;
      this.Notify = null;
    }
  },

  // 加载本地缓存的用户信息
  loadCachedUserInfo() {
    const cachedUserInfo = wx.getStorageSync('userInfo');
    if (cachedUserInfo) {
      this.setData({ userInfo: cachedUserInfo });
    }
  },

  // 获取用户信息（返回 Promise）
  getUserInfo() {
    return new Promise((resolve, reject) => {
      // 如果已有缓存的用户信息，直接返回
      if (this.data.userInfo) {
        resolve(this.data.userInfo);
        return;
      }

      // 使用 wx.getUserProfile 获取用户信息
      wx.getUserProfile({
        desc: '用于保存打卡记录，记录您的减肥历程',
        success: (res) => {
          const userInfo = res.userInfo;
          this.setData({ userInfo });
          // 缓存用户信息
          wx.setStorageSync('userInfo', userInfo);
          resolve(userInfo);
        },
        fail: (err) => {
          console.error('获取用户信息失败：', err);
          reject(err);
        }
      });
    });
  },

  // 显示弱提示 Notify
  showNotify(message, type = 'success') {
    if (this.Notify) {
      this.Notify({
        message,
        type,
        duration: 2000,
        top: 50
      });
    } else {
      // 降级使用 wx.showToast
      const icon = type === 'danger' ? 'error' : (type === 'success' ? 'success' : 'none');
      wx.showToast({ title: message, icon, duration: 2000 });
    }
  },

  // 显示提示（兼容 Toast 和 wx.showToast）
  showToast(options) {
    if (this.Toast) {
      if (typeof options === 'string') {
        this.Toast(options);
      } else {
        this.Toast(options);
      }
    } else {
      const title = typeof options === 'string' ? options : (options.message || '');
      const icon = options.type === 'fail' ? 'error' : (options.type === 'success' ? 'success' : 'none');
      wx.showToast({ title, icon, duration: 2000 });
    }
  },

  showSuccess(message) {
    if (this.Toast) {
      this.Toast.success(message);
    } else {
      wx.showToast({ title: message, icon: 'success', duration: 2000 });
    }
  },

  showFail(message) {
    if (this.Toast) {
      this.Toast.fail(message);
    } else {
      wx.showToast({ title: message, icon: 'error', duration: 2000 });
    }
  },

  // 初始化当前日期
  initCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    this.setData({
      currentDate: `${year}年${month}月${day}日`,
      recordTime: `${month}-${day} ${hours}:${minutes}`,
      currentDateTimestamp: now.getTime()
    });
  },

  // 显示日期选择器
  showDatePicker() {
    this.setData({ showDatePickerPopup: true });
  },

  // 日期确认
  onDateConfirm(e) {
    const timestamp = e.detail;
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    this.setData({
      recordTime: `${month}-${day} ${hours}:${minutes}`,
      currentDateTimestamp: timestamp,
      showDatePickerPopup: false
    });
  },

  // 日期取消
  onDateCancel() {
    this.setData({ showDatePickerPopup: false });
  },

  // 基础数据输入
  onWeightChange(e) {
    this.setData({ weight: e.detail });
  },

  onBodyFatChange(e) {
    this.setData({ bodyFat: e.detail });
  },

  // 饮食记录输入
  onBreakfastChange(e) {
    this.setData({ breakfast: e.detail });
  },

  onLunchChange(e) {
    this.setData({ lunch: e.detail });
  },

  onDinnerChange(e) {
    this.setData({ dinner: e.detail });
  },

  onSnacksChange(e) {
    this.setData({ snacks: e.detail });
  },

  // 饮水量调整
  decreaseWater() {
    if (this.data.water > 0) {
      this.setData({ water: this.data.water - 1 });
    }
  },

  increaseWater() {
    if (this.data.water < 20) {
      this.setData({ water: this.data.water + 1 });
    }
  },

  // 运动开关
  onExerciseSwitch(e) {
    this.setData({ exercised: e.detail });
  },

  // 运动类型
  onExerciseTypeChange(e) {
    this.setData({ exerciseType: e.detail });
  },

  // 运动时长
  onDurationChange(e) {
    this.setData({ exerciseDuration: e.detail });
  },

  // 消耗热量
  onCaloriesChange(e) {
    this.setData({ caloriesBurned: e.detail });
  },

  // 心情评分
  onMoodChange(e) {
    this.setData({ mood: e.detail });
  },

  // 选择饥饿感
  selectHunger(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ hunger: value });
  },

  // 备注输入
  onNotesChange(e) {
    this.setData({ notes: e.detail });
  },

  // 提交表单
  submitForm() {
    const {
      weight,
      bodyFat,
      recordTime,
      breakfast,
      lunch,
      dinner,
      snacks,
      water,
      exercised,
      exerciseType,
      exerciseDuration,
      caloriesBurned,
      mood,
      hunger,
      notes
    } = this.data;

    // 基础校验
    if (!weight) {
      this.showToast('请输入当前体重');
      return;
    }

    // 显示加载中
    wx.showLoading({ title: '保存中...', mask: true });

    // 获取用户信息后提交
    this.getUserInfo()
      .then(userInfo => {
        // 组装打卡数据
        const recordData = {
          recordTime,
          weight: parseFloat(weight),
          bodyFat: bodyFat ? parseFloat(bodyFat) : null,
          diet: {
            breakfast,
            lunch,
            dinner,
            snacks,
            water
          },
          exercise: {
            exercised,
            type: exerciseType,
            duration: exercised ? exerciseDuration : 0,
            calories: caloriesBurned ? parseInt(caloriesBurned) : 0
          },
          status: {
            mood,
            hunger
          },
          notes,
          createTime: new Date().toISOString(),
          // 用户信息
          userInfo: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            gender: userInfo.gender,
            city: userInfo.city,
            province: userInfo.province,
            country: userInfo.country
          }
        };

        console.log('打卡数据：', recordData);

        // 保存到云数据库
        return wx.cloud.database().collection('lean_logs').add({
          data: recordData
        });
      })
      .then(res => {
        wx.hideLoading();
        console.log('保存成功：', res);
        this.showNotify('打卡成功，继续保持！', 'success');
        // 延迟后重置表单
        setTimeout(() => {
          this.resetForm();
        }, 1500);
      })
      .catch(err => {
        wx.hideLoading();
        console.error('操作失败：', err);
        // 用户拒绝授权
        if (err.errMsg && err.errMsg.includes('getUserProfile:fail auth deny')) {
          this.showNotify('请授权用户信息以保存记录', 'warning');
        } else {
          this.showNotify('保存失败，请检查网络后重试', 'danger');
        }
      });
  },

  // 重置表单
  resetForm() {
    this.setData({
      weight: '',
      bodyFat: '',
      breakfast: '',
      lunch: '',
      dinner: '',
      snacks: '',
      water: 8,
      exercised: false,
      exerciseType: '',
      exerciseDuration: 30,
      caloriesBurned: '',
      mood: 3,
      hunger: 'normal',
      notes: ''
    });
    this.initCurrentDate();
  }
});
