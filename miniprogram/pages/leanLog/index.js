// miniprogram/pages/leanLog/index.js
const { THEME_CONFIG, FLOAT_MENU, MANIFESTO, HUNGER_OPTIONS } = require('../../constants/index');
const { getThemeById, formatDate } = require('../../utils/index');
const toastModule = require('../../miniprogram_npm/@vant/weapp/toast/toast');
const notifyModule = require('../../miniprogram_npm/@vant/weapp/notify/notify');

Page({
  data: {
    currentDateTimestamp: null, // 当前选中的时间戳
    currentTheme: null, // 当前主题item
    record: null, // 记录
    currentRecordId: null, // 当前记录的 _id（用于判断是更新还是新增）
    userId: null, // 用户ID
    // 消息
    Toast: toastModule.default || toastModule,
    Notify: notifyModule.default || notifyModule,
    recordDates: [], // 有记录的日期列表
    headerSubtitle: MANIFESTO, // 副标题 - 宣言
    floatMenuItems: FLOAT_MENU.ITEMS, // 悬浮菜单配置
    isLoggedIn: false, // 是否已授权登录
    hungerOptions: HUNGER_OPTIONS, // 饥饿程度
    showThemePopup: false, // 主题选择弹框
    showMeasurements: false, // 三维记录卡片是否展开
    showDatePickerPopup: false, // 四期选择弹框
    showExerciseCategoryPopup: false, // 是否显示运动分类弹窗
    showExerciseTypePopup: false, // 是否显示运动种类
    showLoginPopup: false, // 登录弹窗
    isToday: true, // 当前选中日期是否为今天
    streakDays: 0, // 连续打卡天数
    savedSnapshot: null, // 记录加载/保存后的快照，用于检测未保存改动
  },

  onLoad() {
    // 0. 初始化表单数据
    this.initRecord();
    // 1. 初始化日期（先显示页面）
    this.initCurrentDate();
    // 2. 加载保存/默认的主题
    this.loadSavedTheme();
    // 3. 尝试获取本地缓存的用户ID
    this.loadCachedUserId();
    // 4. 检查登录状态，未登录则弹出登录框
    this.checkLoginStatus();
  },
  // 初始化表单数据
  initRecord(){
    const initRecord = {
      // 基础数据
      weight: '',
      bodyFat: '',
      // 饮食记录
      isHealthyDiet: false,
      water: '',
      diet: '',
      // 运动记录
      stepNumber: '',
      exercised: false,
      exerciseList: [],
      currentExerciseIndex: null,
      // 睡眠与状态记录
      sleepDuration: '',
      mood: 0,
      hunger: 'normal',
      // 睡前数据
      sleepDuration: 7,
      notes: '',
      // 三维记录（每周记录）
      chest: '',    // 胸围
      waist: '',    // 腰围
      hip: '',      // 臀围
      arm: '',      // 上臂围
      thigh: '',    // 大腿围
    };
    this.setData({record: initRecord})
  },
  // 一键填写成功回调（由 quick-fill 组件触发）
  onQuickFill(e) {
    const { record } = e.detail;
    this.setData({ record, currentRecordId: null });
    this.showNotify('已一键填写', 'success');
  },
  // 初始化当前日期
  initCurrentDate() {
    this.setData({
      currentDateTimestamp: new Date().getTime(),
      isToday: true
    });
  },
  // 保存记录快照（记录加载或保存后调用）
  saveSnapshot(record) {
    // 深拷贝，过滤掉系统字段
    var fieldsToKeep = ['weight', 'bodyFat', 'isHealthyDiet', 'water', 'diet',
      'stepNumber', 'exercised', 'exerciseList', 'sleepDuration', 'mood', 'hunger',
      'bedTimeWeight', 'notes', 'chest', 'waist', 'hip', 'arm', 'thigh'];
    var snapshot = {};
    fieldsToKeep.forEach(function(key) {
      if (record[key] !== undefined) {
        snapshot[key] = JSON.parse(JSON.stringify(record[key]));
      }
    });
    this._savedSnapshot = snapshot;
  },
  // 检查当前表单是否有未保存的改动
  checkIsDirty() {
    var snapshot = this._savedSnapshot;
    if (!snapshot) return false;
    var record = this.data.record;
    var fieldsToCheck = ['weight', 'bodyFat', 'isHealthyDiet', 'water', 'diet',
      'stepNumber', 'exercised', 'exerciseList', 'sleepDuration', 'mood', 'hunger',
      'bedTimeWeight', 'notes', 'chest', 'waist', 'hip', 'arm', 'thigh'];
    for (var i = 0; i < fieldsToCheck.length; i++) {
      var key = fieldsToCheck[i];
      var current = JSON.stringify(record[key] != null ? record[key] : '');
      var saved = JSON.stringify(snapshot[key] != null ? snapshot[key] : '');
      if (current !== saved) return true;
    }
    return false;
  },
  // 带未保存检查的日期切换
  switchDateWithCheck(timestamp) {
    var self = this;
    if (this.checkIsDirty()) {
      wx.showModal({
        title: '提示',
        content: '当前有未保存的修改内容，是否保存？',
        confirmText: '保存',
        cancelText: '放弃',
        success: (res) => {
          if (res.confirm) {
            // 先保存，再切换
            self.submitForm(() => {
              self.loadDateData(timestamp);
            });
          } else if (res.cancel) {
            // 直接切换
            self.loadDateData(timestamp);
          }
        }
      });
    } else {
      this.loadDateData(timestamp);
    }
  },
  // 加载指定日期的记录数据（纯数据加载逻辑）
  loadDateData(timestamp) {
    var self = this;
    this.setData({ currentDateTimestamp: timestamp });
    this.updateIsToday();

    wx.showLoading({ title: '加载中...', mask: true });
    this.checkRecordByDate()
      .then(function(res) {
        wx.hideLoading();
        if (res?.data && res.data?.length > 0) {
          self.updateCurrentForm(res);
        } else {
          self.initRecord();
          self.saveSnapshot(self.data.record);
          self.setData({ currentRecordId: null });
        }
      })
      .catch(function(err) {
        wx.hideLoading();
        console.error('查询记录失败：', err);
        self.showNotify('加载失败，请重试', 'danger');
      });
  },
  // 判断当前选中日期是否为今天
  updateIsToday() {
    const { currentDateTimestamp } = this.data;
    const today = new Date();
    const selected = new Date(currentDateTimestamp);
    this.setData({
      isToday: today.getFullYear() === selected.getFullYear() &&
                today.getMonth() === selected.getMonth() &&
                today.getDate() === selected.getDate()
    });
  },
  // 回到今天
  goToToday() {
    this.switchDateWithCheck(new Date().getTime());
  },

  // 一键填写提示回调（由 quick-fill 组件触发）
  onQuickFillNotify(e) {
    const { message, type } = e.detail;
    this.showNotify(message, type);
  },
  // 加载保存/默认的主题
  loadSavedTheme() {
    let savedId = wx.getStorageSync('themeId');
    savedId = savedId == null || savedId === '' ? THEME_CONFIG.DEFAULT_THEME_ID : savedId;
    const theme = getThemeById(savedId);
    if (theme) {
      this.setData({currentTheme: theme});
    }
  },
  // 加载本地缓存的用户ID
  loadCachedUserId() {
    const cachedUserId = wx.getStorageSync('userId');
    if (cachedUserId) {
      this.setData({ userId: cachedUserId });
    }
  },
  // 检查登录状态
  checkLoginStatus() {
    // 如果已有缓存的用户ID，直接使用
    if (this.data.userId) {
      this.setData({ isLoggedIn: true });
      // 获取数据
      this.fetchRecordDates();
      this.checkRecordByDate().then(res => this.updateCurrentForm(res));
      return;
    }
    // 未登录，弹出登录框
    this.setData({ showLoginPopup: true });
  },
  // 登录成功回调（由 login-auth 组件触发）
  onLoginSuccess(e) {
    const userId = e.detail.userId;
    this.setData({
      userId: userId,
      isLoggedIn: true,
    });
    this.closeDialog('login');

    // 登录成功后，获取数据
    this.fetchRecordDates();
    this.checkRecordByDate().then(res => this.updateCurrentForm(res));
  },
   // 获取当前用户的所有有记录的日期
   fetchRecordDates() {
    const {userId} = this.data;
    if (userId == null) {
      return;
    }
    const self = this;
    const db = wx.cloud.database();
    db.collection('lean_logs')
      .where({ userId })
      .field({ date: true })
      .get()
      .then(function(res) {
        if (res?.data && res.data?.length > 0) {
          const dates = res.data.map(function(item) {
            return item.date;
          });
          self.setData({ recordDates: dates });
          self.calcStreak(dates);
        }
      })
      .catch(function(err) {
        console.error('获取记录日期失败：', err);
      });
  },
  // 计算连续打卡天数（从今天或昨天开始往前数）
  calcStreak(dates) {
    if (!dates || dates.length === 0) {
      this.setData({ streakDays: 0 });
      return;
    }
    // 转为 Set 方便查找
    var dateSet = new Set(dates);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayStr = formatDate(today.getTime());

    // 从今天开始，如果今天没有记录则从昨天开始
    var checkDate = new Date(today);
    if (!dateSet.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    var count = 0;
    while (true) {
      var dateStr = formatDate(checkDate.getTime());
      if (dateSet.has(dateStr)) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    this.setData({ streakDays: count });
  },
  // 更新当前表单
  updateCurrentForm(res) {
    if (res.data?.length) {
      const recordData = res.data[0];
      this.setData({
        record: recordData,
        currentRecordId: recordData._id  // 保存记录ID
      });
      this.saveSnapshot(recordData);
      this.closeDialog('date-picker');
    } else {
      this.initRecord();
      this.setData({ currentRecordId: null });  // 清空记录ID
    }
  },
  // 登录失败回调（由 login-auth 组件触发）
  onLoginFail(e) {
    console.error('登录失败：', e.detail.error);
    this.showNotify('需要授权才能使用完整功能', 'warning');
  },
  // 检查选定日期是否有记录，并返回结果
  checkRecordByDate() {
    const { userId, currentDateTimestamp } = this.data;
    const date = formatDate(currentDateTimestamp);
    return wx.cloud.database().collection('lean_logs')
      .where({ userId, date })
      .limit(1)
      .get();
  },
  // 更新记录（使用 doc().update() 方式，更可靠）
  updateRecord(recordId, record) {
    // 构建更新数据，过滤掉 undefined 和 null 的字段，以及 _id
    const updateData = {};
    Object.keys(record).forEach((key) => {
      if (key !== '_id' && key !== '_openid' && record[key] !== undefined && record[key] !== null) {
        updateData[key] = record[key];
      }
    });
    const db = wx.cloud.database();
    return db.collection('lean_logs')
      .doc(recordId)
      .update({ data: updateData });
  },
  // 新增记录
  addRecord(record, userId, currentDateTimestamp) {
    const date = formatDate(currentDateTimestamp);
    const {_openid, ...rest} = record;
    return wx.cloud.database().collection('lean_logs')
      .add({ data: { ...rest, userId, date } });
  },
  // 提交表单（优化：无需再次查询数据库，直接根据 currentRecordId 判断）
  // callback: 可选，保存成功后的回调
  submitForm(callback) {
    const { userId, record, currentDateTimestamp, currentRecordId } = this.data;
    
    // 检查是否已登录
    if (!userId) {
      this.openDialog('login');
      return;
    }

    // 显示加载中
    wx.showLoading({ title: '保存中...', mask: true });

    const self = this;
    let promise;
    if (currentRecordId) {
      // 有记录ID，直接更新
      promise = this.updateRecord(currentRecordId, record);
    } else {
      // 没有记录ID，新增
      promise = this.addRecord(record, userId, currentDateTimestamp);
    }

    promise.then(function(res) {
      wx.hideLoading();
      // 如果是新增，保存返回的 _id
      if (!currentRecordId && res._id) {
        self.setData({ currentRecordId: res._id });
      }
      self.saveSnapshot(record);
      self.showNotify('保存成功，继续保持！', 'success');
      self.fetchRecordDates();
      if (typeof callback === 'function') {
        callback();
      }
    }).catch(function(err) {
      wx.hideLoading();
      console.error('保存失败：', err);
      self.showNotify('保存失败，请重试', 'danger');
    });
  },
  // 日期确认
  onDateConfirm(e) {
    // 兼容两种事件格式
    const timestamp = e.detail.date || e.detail;
    this.closeDialog('date-picker');
    this.switchDateWithCheck(timestamp);
  },
  // 主题切换事件（由组件触发）
  onThemeChange(e) {
    const { themeId, theme } = e.detail;
    if (theme) {
      this.setData({ currentTheme: theme });
      // 保存主题设置
      wx.setStorageSync('themeId', themeId);
      this.showNotify('主题已切换为' + theme.name, 'success');
      this.closeDialog('theme');
    }
  },
  // 悬浮菜单点击事件
  onFloatMenuTap(e) {
    const { item } = e.detail;
    switch (item.id) {
      case 'date':
        this.openDialog('data-picker');
        break;
      case 'chart':
        wx.navigateTo({ url: '/pages/statistics/index' });
        break;
      case 'theme':
        this.openDialog('theme');
        break;
    }
  },
  // 打开弹框
  openDialog(type){
    switch(type) {
      case 'theme':
        this.setData({showThemePopup: true});
        break;
      case 'data-picker':
        this.setData({showDatePickerPopup: true});
        break;
      case 'login':
        this.setData({showLoginPopup: true});
        break;
      case 'exercise-category':
        this.setData({showExerciseCategoryPopup: true});
        break;
      case 'exercise-type':
        this.setData({showExerciseTypePopup: true});
        break;
    }
  },
  // 关闭弹框
  closeDialog(type){
    type = type.detail ?? type;
    switch(type) {
      case 'theme':
        this.setData({showThemePopup: false});
        break;
      case 'date-picker':
        this.setData({showDatePickerPopup: false});
        break;
      case 'login':
        this.setData({showLoginPopup: false});
        break;
      case 'exercise-category':
        this.setData({showExerciseCategoryPopup: false});
        break;
      case 'exercise-type':
        this.setData({showExerciseTypePopup: false});
        break;
    }
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
  // 数据修改（通用方法）
  onDataChange(e) {
    var field = e.currentTarget.dataset.field;
    const { record } = this.data;
    if (record == null) {
      this.initRecord();
    }
    record[field] = e.detail;
    this.setData({record});
  },
  // 显示运动分类选择弹窗
  showExerciseTypePicker(e) {
    var index = e.currentTarget.dataset.index;
    this.data.record.currentExerciseIndex = index;
    this.setData({record: this.data.record});
    this.openDialog('exercise-category');
  },
  // 选择运动分类（由组件触发）
  onSelectCategory(e) {
    const { category, categoryName } = e.detail;
    var { currentExerciseIndex, exerciseList,  } = this.data.record;
    currentExerciseIndex ??= 0;
    var newList = exerciseList.slice();
    var currentItem = newList[currentExerciseIndex];
    Object.assign(newList[currentExerciseIndex], {
      id: currentItem.id,
      category: category,
      categoryName: categoryName,
      duration: currentItem.duration
    })
    this.data.record.exerciseList = newList;
    this.setData({ record: this.data.record });
    this.closeDialog('exercise-category');
    this.openDialog('exercise-type')
  },
  // 返回运动分类选择（由组件触发）
  backToCategory() {
    this.closeDialog('exercise-type');
    this.openDialog('exercise-category');
  },
  // 是否运动 切换
  onExercisedChange(e) {
    var { exerciseList} = this.data.record;
    if (e.detail) {
      if (exerciseList == null || exerciseList.length === 0) {
        this.addExercise();
      }
    } else {
      this.data.record.exerciseList = [];
    }
    this.data.record.exercised = e.detail;
    this.setData({record: this.data.record});
  },
  // 选择运动类型（由组件触发）
  onSelectType(e) {
    const { type, typeLabel, isCustom } = e.detail;
    var { currentExerciseIndex, exerciseList } = this.data.record;
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
      this.data.record.exerciseList = newList;
      this.setData({ record: this.data.record });
      this.closeDialog('exercise-type')
    }
  },
  // 运动时长输入
  onExerciseDurationInput(e) {
    var index = e.currentTarget.dataset.index;
    var value = e.detail.value;
    var newList = this.data.record.exerciseList.slice();
    newList[index].duration = parseInt(value) || 0;
    this.data.record.exerciseList = newList;
    this.setData({ record: this.data.record });
  },
  // 添加运动项
  addExercise() {
    var newList = this.data.record.exerciseList?.slice() ?? [];
    newList.push({
      id: newList.length + '' + Date.now(),
      category: '',
      categoryName: '',
      type: '',
      typeLabel: '',
      typeName: '',
      duration: null,
    });
    this.data.record.exerciseList = newList;
    this.setData({ record: this.data.record });
  },
  // 删除运动项
  removeExercise(e) {
    var index = e.currentTarget.dataset.index;
    var newList = this.data.record.exerciseList.filter((_, i) => {
      return i !== index;
    });
    this.data.record.exerciseList = newList;
    this.setData({ record: this.data.record });
  },
  // 切换三维记录卡片展开/收起
  toggleMeasurementsCard() {
    this.setData({ showMeasurements: !this.data.showMeasurements });
  },
  // 选择饥饿感
  selectHunger(e) {
    var value = e.currentTarget.dataset.value;
    this.data.record.hunger = value
    this.setData({ record: this.data.record });
  },
});
