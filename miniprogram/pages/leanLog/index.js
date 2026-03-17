const { THEME_CONFIG, FLOAT_MENU, MANIFESTO } = require('../../constants/index');
const { getThemeById } = require('../../utils/index');

Page({
  data: {
    // 主题选择
    showThemePopup: false,
    currentTheme: null,

    // 副标题 - 宣言
    headerSubtitle: MANIFESTO,

    currentDate: '', // 当前日期
    currentDateTimestamp: new Date().getTime(),
    minDate: new Date(2020, 0, 1).getTime(),
    maxDate: new Date().getTime(),
    showDatePickerPopup: false,
    selectedDateLabel: '今天', // 选中日期的显示文本
    isEditing: false, // 是否是编辑模式
    editingRecordId: null, // 正在编辑的记录ID

    // 悬浮菜单配置
    floatMenuItems: FLOAT_MENU.ITEMS,

    // 有记录的日期列表
    recordDates: [],

    // 用户信息
    userInfo: null,

    // 基础数据
    weight: '',
    bodyFat: '',
    recordTime: '',
    bedTimeWeight: '',

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
    exerciseList: [
      { id: 1, type: '', typeLabel: '', typeName: '', duration: 30 }
    ],

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
    notes: '',
  },

  onLoad(options) {
    // 尝试获取本地缓存的用户信息
    this.loadCachedUserInfo();

    // 加载保存的主题
    this.loadSavedTheme();
    this.initCurrentDate();
    
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
    // 检查今天是否已有记录
    this.checkTodayRecord();
    // 获取所有有记录的日期
    this.fetchRecordDates();
  },

  // 加载本地缓存的用户信息
  loadCachedUserInfo() {
    const cachedUserInfo = wx.getStorageSync('userInfo');
    if (cachedUserInfo) {
      this.setData({ userInfo: cachedUserInfo });
    }
  },

  // 加载保存的主题
  loadSavedTheme() {
    let savedId = wx.getStorageSync('themeId');
    // 空字符串、null、undefined 都使用默认值
    if (!savedId) {
      savedId = THEME_CONFIG.DEFAULT_THEME_ID;
    }
    const theme = getThemeById(savedId);
    if (theme) {
      this.setData({currentTheme: theme});
    } else {
      // 如果找不到对应主题，使用默认主题
      const defaultTheme = getThemeById(THEME_CONFIG.DEFAULT_THEME_ID);
      if (defaultTheme) {
        this.setData({currentTheme: defaultTheme});
      }
    }
  },

  // 主题切换事件（由组件触发）
  onThemeChange(e) {
    const { themeId, theme } = e.detail;
    if (theme) {
      this.setData({ currentTheme: theme });
      // 保存主题设置
      wx.setStorageSync('themeId', themeId);
      this.showNotify('主题已切换为' + theme.name, 'success');
      this.setData({ showThemePopup: false });
    }
  },

  // 初始化当前日期
  initCurrentDate() {
    this.setData({
      currentDateTimestamp: new Date().getTime()
    });
  },

  // 打开弹框
  openDialog(type){
    switch(type) {
      case 'theme':
        this.setData({showThemePopup: true});
        break;
    }
  },

  // 关闭弹框
  closeDialog(type){
    switch(type) {
      case 'theme':
        this.setData({showThemePopup: false});
        break;
    }
  },

  // 悬浮菜单点击事件
  onFloatMenuTap(e) {
    const { item } = e.detail;
    switch (item.id) {
      case 'date':
        this.setData({ showDatePickerPopup: true });
        break;
      case 'chart':
        wx.navigateTo({ url: '/pages/statistics/index' });
        break;
      case 'theme':
        this.setData({ showThemePopup: true });
        break;
    }
  },

  // 显示主题选择弹窗
  showThemeSelector() {
    this.setData({ showThemePopup: true });
  },

  // 获取所有有记录的日期
  fetchRecordDates() {
    const self = this;
    const db = wx.cloud.database();

    db.collection('lean_logs')
      .field({ date: true })
      .get()
      .then(function(res) {
        if (res.data && res.data.length > 0) {
          const dates = res.data.map(function(item) {
            return item.date;
          });
          self.setData({ recordDates: dates });
        }
      })
      .catch(function(err) {
        console.error('获取记录日期失败：', err);
      });
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

  // 格式化日期为 YYYY-MM-DD
  formatDateToYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 获取日期标签
  getDateLabel(date) {
    const today = new Date();
    const todayYMD = this.formatDateToYMD(today);
    const targetYMD = this.formatDateToYMD(date);

    if (todayYMD === targetYMD) {
      return '今天';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayYMD = this.formatDateToYMD(yesterday);
    if (yesterdayYMD === targetYMD) {
      return '昨天';
    }

    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  // 检查今天是否已有记录
  checkTodayRecord() {
    const self = this;
    const today = this.formatDateToYMD(new Date());

    wx.cloud.database().collection('lean_logs')
      .where({
        date: today
      })
      .limit(1)
      .get()
      .then(function(res) {
        if (res.data && res.data.length > 0) {
          // 今天已有记录，自动加载
          self.loadRecordData(res.data[0]);
        }
      })
      .catch(function(err) {
        console.error('检查记录失败：', err);
      });
  },

  // 加载记录数据到表单
  loadRecordData(record) {
    const exerciseList = record.exercise && record.exercise.items
      ? record.exercise.items.map(function(item, index) {
          return {
            id: Date.now() + index,
            category: item.category || '',
            categoryName: item.categoryName || '',
            type: item.type || '',
            typeLabel: item.typeLabel || '',
            duration: item.duration || 30
          };
        })
      : [{ id: 1, type: '', typeLabel: '', duration: 30 }];

    // 如果有三维数据，展开卡片
    const hasMeasurements = record.measurements && (
      record.measurements.chest ||
      record.measurements.waist ||
      record.measurements.hip ||
      record.measurements.arm ||
      record.measurements.thigh
    );

    this.setData({
      isEditing: true,
      editingRecordId: record._id,
      weight: record.weight ? String(record.weight) : '',
      bodyFat: record.bodyFat ? String(record.bodyFat) : '',
      bedTimeWeight: record.bedTimeWeight ? String(record.bedTimeWeight) : '',
      water: record.diet && record.diet.water ? record.diet.water : '',
      isHealthyDiet: record.diet && record.diet.isHealthyDiet ? record.diet.isHealthyDiet : false,
      diet: record.diet && record.diet.notes ? record.diet.notes : '',
      stepNumber: record.stepNumber ? String(record.stepNumber) : '',
      exercised: record.exercise ? record.exercise.exercised : false,
      exerciseList: exerciseList,
      sleepDuration: record.status && record.status.sleepDuration ? record.status.sleepDuration : 7,
      mood: record.status && record.status.mood ? record.status.mood : 3,
      hunger: record.status && record.status.hunger ? record.status.hunger : 'normal',
      notes: record.notes || '',
      showMeasurements: hasMeasurements || false,
      chest: record.measurements && record.measurements.chest ? String(record.measurements.chest) : '',
      waist: record.measurements && record.measurements.waist ? String(record.measurements.waist) : '',
      hip: record.measurements && record.measurements.hip ? String(record.measurements.hip) : '',
      arm: record.measurements && record.measurements.arm ? String(record.measurements.arm) : '',
      thigh: record.measurements && record.measurements.thigh ? String(record.measurements.thigh) : ''
    });
  },

  // 显示日期选择器
  showDatePicker() {
    this.setData({ showDatePickerPopup: true });
  },

  // 日期确认
  onDateConfirm(e) {
    const self = this;
    // 兼容两种事件格式
    const timestamp = e.detail.date || e.detail;
    const date = new Date(timestamp);
    const dateYMD = this.formatDateToYMD(date);
    const dateLabel = this.getDateLabel(date);

    // 关闭弹窗
    this.setData({
      showDatePickerPopup: false,
      currentDateTimestamp: timestamp,
      selectedDateLabel: dateLabel
    });

    // 查询该日期是否有记录
    wx.showLoading({ title: '加载中...', mask: true });
    wx.cloud.database().collection('lean_logs')
      .where({
        date: dateYMD
      })
      .limit(1)
      .get()
      .then(function(res) {
        wx.hideLoading();
        if (res.data && res.data.length > 0) {
          // 有记录，加载数据
          self.showNotify('已加载该日期的记录', 'success');
          self.loadRecordData(res.data[0]);
        } else {
          // 没有记录，清空表单
          self.showNotify('该日期暂无记录，可新建', 'success');
          self.resetForm(false);
          self.setData({
            isEditing: false,
            editingRecordId: null
          });
        }
      })
      .catch(function(err) {
        wx.hideLoading();
        console.error('查询记录失败：', err);
        self.showNotify('加载失败，请重试', 'danger');
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

  // 显示运动分类选择弹窗
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

  // 隐藏运动类型弹窗
  hideExerciseTypePicker() {
    this.setData({ showExerciseTypePopup: false });
  },

  // 返回运动分类选择（由组件触发）
  backToCategory() {
    this.setData({
      showExerciseTypePopup: false,
      showExerciseCategoryPopup: true
    });
  },

  // 选择运动分类（由组件触发）
  onSelectCategory(e) {
    const { category, categoryName } = e.detail;
    var currentExerciseIndex = this.data.currentExerciseIndex;
    var exerciseList = this.data.exerciseList;

    if (currentExerciseIndex !== null) {
      var newList = exerciseList.slice();
      var currentItem = newList[currentExerciseIndex];
      newList[currentExerciseIndex] = {
        id: currentItem.id,
        category: category,
        categoryName: categoryName,
        type: '',
        typeLabel: '',
        typeName: categoryName,
        duration: currentItem.duration
      };
      this.setData({
        exerciseList: newList,
        showExerciseCategoryPopup: false,
        showExerciseTypePopup: true
      });
    }
  },

  // 选择运动类型（由组件触发）
  onSelectType(e) {
    const { type, typeLabel, isCustom } = e.detail;
    var currentExerciseIndex = this.data.currentExerciseIndex;
    var exerciseList = this.data.exerciseList;

    if (currentExerciseIndex !== null) {
      var newList = exerciseList.slice();
      var currentItem = newList[currentExerciseIndex];
      newList[currentExerciseIndex] = {
        id: currentItem.id,
        category: currentItem.category,
        categoryName: currentItem.categoryName,
        type: type,
        typeLabel: typeLabel,
        typeName: currentItem.categoryName,
        duration: currentItem.duration,
        isCustom: isCustom || false
      };
      this.setData({
        exerciseList: newList,
        showExerciseTypePopup: false
      });
    }
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
    var bedTimeWeight = this.data.bedTimeWeight;
    var stepNumber = this.data.stepNumber;
    var isHealthyDiet = this.data.isHealthyDiet;
    var diet = this.data.diet;
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

    // 获取选中日期的 YYYY-MM-DD 格式
    var selectedDate = new Date(this.data.currentDateTimestamp);
    var dateYMD = this.formatDateToYMD(selectedDate);

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
          date: dateYMD,
          recordTime: recordTime,
          weight: parseFloat(weight),
          bodyFat: bodyFat ? parseFloat(bodyFat) : null,
          bedTimeWeight: bedTimeWeight ? parseFloat(bedTimeWeight) : null,
          stepNumber: stepNumber ? parseInt(stepNumber) : null,
          diet: {
            breakfast: breakfast,
            lunch: lunch,
            dinner: dinner,
            snacks: snacks,
            water: water,
            isHealthyDiet: isHealthyDiet,
            notes: diet
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
          updateTime: new Date().toISOString(),
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

        // 判断是更新还是新增
        if (self.data.isEditing && self.data.editingRecordId) {
          // 更新已有记录
          return wx.cloud.database().collection('lean_logs')
            .doc(self.data.editingRecordId)
            .update({
              data: recordData
            });
        } else {
          // 新增记录
          recordData.createTime = new Date().toISOString();
          return wx.cloud.database().collection('lean_logs').add({
            data: recordData
          });
        }
      })
      .then(function(res) {
        wx.hideLoading();
        console.log('保存成功：', res);

        // 如果是新增，保存返回的 ID
        if (!self.data.isEditing && res._id) {
          self.setData({
            isEditing: true,
            editingRecordId: res._id
          });
        }

        // 更新记录日期列表
        self.fetchRecordDates();

        self.showNotify(self.data.isEditing ? '记录已更新！' : '打卡成功，继续保持！', 'success');
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
  resetForm(resetDate = true) {
    this.setData({
      weight: '',
      bodyFat: '',
      bedTimeWeight: '',
      breakfast: '',
      lunch: '',
      dinner: '',
      snacks: '',
      water: '',
      isHealthyDiet: false,
      diet: '',
      exercised: false,
      stepNumber: '',
      exerciseList: [
        { id: 1, type: '', typeLabel: '', duration: 30 }
      ],
      caloriesBurned: '',
      mood: 3,
      hunger: 'normal',
      sleepDuration: 7,
      // 三维记录
      showMeasurements: false,
      chest: '',
      waist: '',
      hip: '',
      arm: '',
      thigh: '',
      notes: ''
    });
    if (resetDate) {
      this.initCurrentDate();
    }
  }
});
