// pages/leanLog/index.js
Page({
  data: {
    primaryColor: '#E8B4B8', // 主题色 跟 app.wxss中的--primary-color保持一致
    currentDate: '', // 当前日期
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
    water: '',
    isHealthyDiet: false,
    diet: '',

    // 运动记录
    exercised: false,
    caloriesBurned: '',

    // 三维记录（每周记录）
    showMeasurements: false, // 三维记录卡片是否展开
    chest: '',    // 胸围
    waist: '',    // 腰围
    hip: '',      // 臀围
    arm: '',      // 上臂围
    thigh: '',    // 大腿围
    stepNumber: '',
    showExerciseTypePopup: false,
    showExerciseCategoryPopup: false, // 是否显示运动分类弹窗
    currentExerciseIndex: null, // 当前正在编辑的运动项索引
    customExerciseType: '', // 自定义运动类型输入
    showCustomInput: false, // 是否显示自定义输入框
    exerciseList: [
      { id: 1, type: '', typeLabel: '', typeName: '', duration: 30 }
    ],
    // 运动分类
    exerciseCategories: [
      { label: '有氧运动', value: '1' },
      { label: '无氧运动', value: '2' }
    ],
    // 运动项目（按分类）
    exerciseTypesByCategory: {
      '1': [
        { label: '快走', value: 'walk' },
        { label: '慢跑', value: 'jog' },
        { label: '游泳', value: 'swim' },
        { label: '骑行', value: 'cycle' },
        { label: '跳绳', value: 'rope' },
        { label: '瑜伽', value: 'yoga' },
        { label: '其他有氧', value: 'other_aerobic' }
      ],
      '2': [
        { label: '力量训练', value: 'strength' },
        { label: '举重', value: 'weightlifting' },
        { label: '俯卧撑', value: 'pushup' },
        { label: '深蹲', value: 'squat' },
        { label: '引体向上', value: 'pullup' },
        { label: '平板支撑', value: 'plank' },
        { label: '其他无氧', value: 'other_anaerobic' }
      ]
    },

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
    sleepDuration: 7, // 昨夜睡眠时长（小时）
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

  // 数据修改（通用方法）
  onDataChange(e) {
    var field = e.currentTarget.dataset.field;
    if (field) {
      var data = {};
      data[field] = e.detail;
      this.setData(data);
    }
  },

  // 饮水量调整
  decreaseWater() {
    if (this.data.water > 0) {
      this.setData({ water: this.data.water - 250 });
    }
  },

  increaseWater() {
    if (this.data.water < 3000) {
      this.setData({ water: this.data.water + 250 });
    }
  },

  // 运动开关
  onExerciseSwitch(e) {
    this.setData({ exercised: e.detail });
  },

  // 显示运动分类选择弹窗（第一步）
  showExerciseTypePicker(e) {
    var index = e.currentTarget.dataset.index;
    this.setData({
      showExerciseCategoryPopup: true,
      currentExerciseIndex: index
    });
  },

  // 隐藏运动分类弹窗
  hideExerciseCategoryPopup() {
    this.setData({ showExerciseCategoryPopup: false });
  },

  // 返回运动分类选择
  backToCategory() {
    this.setData({
      showExerciseTypePopup: false,
      showExerciseCategoryPopup: true,
      showCustomInput: false,
      customExerciseType: ''
    });
  },

  // 选择运动分类（有氧/无氧），显示具体运动列表
  selectExerciseCategory(e) {
    var categoryValue = e.currentTarget.dataset.value;
    var categoryLabel = e.currentTarget.dataset.label;
    var currentExerciseIndex = this.data.currentExerciseIndex;
    var exerciseList = this.data.exerciseList;
    
    // 更新当前运动项的分类信息
    if (currentExerciseIndex !== null) {
      var newList = exerciseList.slice();
      newList[currentExerciseIndex] = {
        id: newList[currentExerciseIndex].id,
        category: categoryValue,
        categoryName: categoryLabel,
        type: '',
        typeLabel: '',
        typeName: categoryLabel,
        duration: newList[currentExerciseIndex].duration
      };
      this.setData({
        exerciseList: newList,
        showExerciseCategoryPopup: false,
        showExerciseTypePopup: true
      });
    }
  },

  // 隐藏运动类型弹窗
  hideExerciseTypePicker() {
    this.setData({
      showExerciseTypePopup: false,
      showCustomInput: false,
      customExerciseType: ''
    });
  },

  // 选择具体运动类型
  selectExerciseType(e) {
    var value = e.currentTarget.dataset.value;
    var label = e.currentTarget.dataset.label;
    var currentExerciseIndex = this.data.currentExerciseIndex;
    var exerciseList = this.data.exerciseList;
    
    // 判断是否是"其他"类型，需要显示输入框
    if (value === 'other_aerobic' || value === 'other_anaerobic') {
      this.setData({
        showCustomInput: true,
        customExerciseType: ''
      });
      return;
    }
    
    // 隐藏自定义输入框
    this.setData({ showCustomInput: false });
    
    if (currentExerciseIndex !== null) {
      var newList = exerciseList.slice();
      var currentItem = newList[currentExerciseIndex];
      newList[currentExerciseIndex] = {
        id: currentItem.id,
        category: currentItem.category,
        categoryName: currentItem.categoryName,
        type: value,
        typeLabel: label,
        typeName: currentItem.categoryName,
        duration: currentItem.duration
      };
      this.setData({
        exerciseList: newList,
        showExerciseTypePopup: false
      });
    }
  },

  // 自定义运动类型输入
  onCustomExerciseInput(e) {
    this.setData({
      customExerciseType: e.detail.value
    });
  },

  // 确认自定义运动类型
  confirmCustomExercise() {
    var customType = this.data.customExerciseType.trim();
    if (!customType) {
      this.showToast('请输入运动类型');
      return;
    }
    
    var currentExerciseIndex = this.data.currentExerciseIndex;
    var exerciseList = this.data.exerciseList;
    var currentItem = exerciseList[currentExerciseIndex];
    
    // 根据分类确定是其他有氧还是其他无氧
    var typeValue = currentItem.category === '1' ? 'other_aerobic' : 'other_anaerobic';
    
    var newList = exerciseList.slice();
    newList[currentExerciseIndex] = {
      id: currentItem.id,
      category: currentItem.category,
      categoryName: currentItem.categoryName,
      type: typeValue,
      typeLabel: customType, // 使用用户输入的自定义名称
      typeName: currentItem.categoryName,
      duration: currentItem.duration,
      isCustom: true // 标记为自定义类型
    };
    
    this.setData({
      exerciseList: newList,
      showExerciseTypePopup: false,
      showCustomInput: false,
      customExerciseType: ''
    });
  },

  // 运动时长变化（滑块）
  onExerciseDurationChange(e) {
    var index = e.currentTarget.dataset.index;
    var newList = this.data.exerciseList.slice();
    newList[index].duration = e.detail;
    this.setData({ exerciseList: newList });
  },

  // 运动时长输入
  onExerciseDurationInput(e) {
    var index = e.currentTarget.dataset.index;
    var value = e.detail.value;
    var newList = this.data.exerciseList.slice();
    newList[index].duration = parseInt(value) || 0;
    this.setData({ exerciseList: newList });
  },

  onExerciseChange(e) {
    console.log(e);
  },

  // 添加运动项
  addExercise() {
    var newList = this.data.exerciseList.slice();
    newList.push({
      id: Date.now(),
      category: '',
      categoryName: '',
      type: '',
      typeLabel: '',
      typeName: '',
      duration: 30
    });
    this.setData({ exerciseList: newList });
  },

  // 删除运动项
  removeExercise(e) {
    var index = e.currentTarget.dataset.index;
    var newList = this.data.exerciseList.filter(function(item, i) {
      return i !== index;
    });
    this.setData({ exerciseList: newList });
  },

  // 运动类型选择（旧方法，保留兼容）
  onExerciseTypeChange(e) {
    // 已废弃
  },

  // 运动时长（旧方法，保留兼容）
  onDurationChange(e) {
    // 已废弃
  },

  // 心情评分
  onMoodChange(e) {
    this.setData({ mood: e.detail });
  },

  // 选择饥饿感
  selectHunger(e) {
    var value = e.currentTarget.dataset.value;
    this.setData({ hunger: value });
  },

  // 切换三维记录卡片展开/收起
  toggleMeasurementsCard() {
    this.setData({ showMeasurements: !this.data.showMeasurements });
  },

  // 减少睡眠时长
  decreaseSleepDuration() {
    if (this.data.sleepDuration > 0) {
      this.setData({ sleepDuration: this.data.sleepDuration - 0.5 });
    }
  },

  // 增加睡眠时长
  increaseSleepDuration() {
    if (this.data.sleepDuration < 24) {
      this.setData({ sleepDuration: this.data.sleepDuration + 0.5 });
    }
  },

  // 提交表单
  submitForm() {
    var self = this;
    var weight = this.data.weight;
    var bodyFat = this.data.bodyFat;
    var recordTime = this.data.recordTime;
    var breakfast = this.data.breakfast;
    var lunch = this.data.lunch;
    var dinner = this.data.dinner;
    var snacks = this.data.snacks;
    var water = this.data.water;
    var exercised = this.data.exercised;
    var exerciseList = this.data.exerciseList;
    var caloriesBurned = this.data.caloriesBurned;
    var mood = this.data.mood;
    var hunger = this.data.hunger;
    var sleepDuration = this.data.sleepDuration;
    var notes = this.data.notes;
    // 三维记录
    var chest = this.data.chest;
    var waist = this.data.waist;
    var hip = this.data.hip;
    var arm = this.data.arm;
    var thigh = this.data.thigh;

    // 基础校验
    if (!weight) {
      this.showToast('请输入当前体重');
      return;
    }

    // 显示加载中
    wx.showLoading({ title: '保存中...', mask: true });

    // 计算总运动时长
    var totalDuration = 0;
    if (exercised) {
      for (var i = 0; i < exerciseList.length; i++) {
        totalDuration += exerciseList[i].duration;
      }
    }
    
    // 组装运动项
    var exerciseItems = [];
    if (exercised) {
      for (var j = 0; j < exerciseList.length; j++) {
        exerciseItems.push({
          category: exerciseList[j].category,
          categoryName: exerciseList[j].categoryName,
          type: exerciseList[j].type,
          typeLabel: exerciseList[j].typeLabel,
          duration: exerciseList[j].duration
        });
      }
    }

    // 获取用户信息后提交
    this.getUserInfo()
      .then(function(userInfo) {        
        // 组装打卡数据
        var recordData = {
          recordTime: recordTime,
          weight: parseFloat(weight),
          bodyFat: bodyFat ? parseFloat(bodyFat) : null,
          diet: {
            breakfast: breakfast,
            lunch: lunch,
            dinner: dinner,
            snacks: snacks,
            water: water
          },
          exercise: {
            exercised: exercised,
            items: exerciseItems,
            totalDuration: totalDuration,
            calories: caloriesBurned ? parseInt(caloriesBurned) : 0
          },
          status: {
            mood: mood,
            hunger: hunger,
            sleepDuration: sleepDuration
          },
          // 三维记录（每周记录）
          measurements: {
            chest: chest ? parseFloat(chest) : null,
            waist: waist ? parseFloat(waist) : null,
            hip: hip ? parseFloat(hip) : null,
            arm: arm ? parseFloat(arm) : null,
            thigh: thigh ? parseFloat(thigh) : null
          },
          notes: notes,
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
      .then(function(res) {
        wx.hideLoading();
        console.log('保存成功：', res);
        self.showNotify('打卡成功，继续保持！', 'success');
        // 延迟后重置表单
        setTimeout(function() {
          self.resetForm();
        }, 1500);
      })
      .catch(function(err) {
        wx.hideLoading();
        console.error('操作失败：', err);
        // 用户拒绝授权
        if (err.errMsg && err.errMsg.includes('getUserProfile:fail auth deny')) {
          self.showNotify('请授权用户信息以保存记录', 'warning');
        } else {
          self.showNotify('保存失败，请检查网络后重试', 'danger');
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
      exerciseList: [
        { id: 1, type: '', typeLabel: '', duration: 30 }
      ],
      caloriesBurned: '',
      mood: 3,
      hunger: 'normal',
      sleepDuration: 7,
      // 三维记录
      chest: '',
      waist: '',
      hip: '',
      arm: '',
      thigh: '',
      notes: ''
    });
    this.initCurrentDate();
  }
});
