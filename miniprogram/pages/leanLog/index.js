// miniprogram/pages/leanLog/index.js
const { THEME_CONFIG, FLOAT_MENU, MANIFESTO } = require('../../constants/index');
const { getThemeById, formatDate } = require('../../utils/index');
const toastModule = require('../../miniprogram_npm/@vant/weapp/toast/toast');
const notifyModule = require('../../miniprogram_npm/@vant/weapp/notify/notify');
const exerciseItem = { id: 1, type: '', typeLabel: '', typeName: '', duration: 30 };

Page({
  data: {
    // 当前选中的时间戳
    currentDateTimestamp: null,
    // 主题选择
    showThemePopup: false,
    currentTheme: null,
    // 记录
    record: null,
    // 用户ID（OpenID）
    userId: null,
    // 消息
    Toast: toastModule.default || toastModule,
    Notify: notifyModule.default || notifyModule,
    // 有记录的日期列表
    recordDates: [],



    // 副标题 - 宣言
    headerSubtitle: MANIFESTO,

    currentDate: '', // 当前日期
    
    minDate: new Date(2020, 0, 1).getTime(),
    maxDate: new Date().getTime(),
    showDatePickerPopup: false,
    selectedDateLabel: '今天', // 选中日期的显示文本
    isEditing: false, // 是否是编辑模式
    editingRecordId: null, // 正在编辑的记录ID

    // 悬浮菜单配置
    floatMenuItems: FLOAT_MENU.ITEMS,

    

    
    isLoggedIn: false, // 是否已授权登录



    showMeasurements: false, // 三维记录卡片是否展开
    

    

    

    

    hunger: 'normal',
    hungerOptions: [
      { label: '很饿', value: 'very_hungry' },
      { label: '有点饿', value: 'slightly_hungry' },
      { label: '适中', value: 'normal' },
      { label: '较饱', value: 'slightly_full' },
      { label: '很饱', value: 'very_full' }
    ],
    showExerciseTypePopup: false,
    showExerciseCategoryPopup: false, // 是否显示运动分类弹窗
    currentExerciseIndex: null, // 当前正在编辑的运动项索引
    

    // 登录弹窗
    showLoginPopup: false,
  },

  onLoad(options) {
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
      dietrecords: '',
      // 运动记录
      stepNumber: '',
      exercised: false,
      exerciseList: [exerciseItem],
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
  // 初始化当前日期
  initCurrentDate() {
    this.setData({
      currentDateTimestamp: new Date().getTime()
    });
  },
  // 加载保存/默认的主题
  loadSavedTheme() {
    let savedId = wx.getStorageSync('themeId') ?? THEME_CONFIG.DEFAULT_THEME_ID;
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
      showLoginPopup: false
    });

    // 登录成功后，获取数据
    this.fetchRecordDates();
    this.checkRecordByDate().then(res => this.updateCurrentForm(res));
  },
  // 更新当前表单
  updateCurrentForm(record) {
    if (record != null) {
      this.setData({record: record});
    } else {
      this.initRecord();
    }
  },
  // 登录失败回调
  onLoginFail(e) {
    console.error('登录失败：', e.detail.error);
    this.showNotify('登录失败，请重试', 'warning');
  },
  // 检查选定日期是否有记录， 并返回结果
  checkRecordByDate() {
    const { userId, currentDateTimestamp } = this.data;
    const date = formatDate(currentDateTimestamp);
    return wx.cloud.database().collection('lean_logs')
      .where({ userId, date })
      .limit(1)
      .get()
  },
  // 更新选定日期记录
  updateRecord(record) {
    return wx.cloud.database().collection('lean_logs')
      .where({ userId, date })
      .limit(1)
      .update({ data: record })
  },
  // 新增记录
  addRecord(record, userId, currentDateTimestamp) {
    return wx.cloud.database().collection('lean_logs')
      .add({ data: {...record, userId, date: formatDate(currentDateTimestamp)} })
  },
  // 提交表单
  submitForm() {
    const { userId, record, currentDateTimestamp } = this.data
    // 检查是否已登录
    if (!userId) {
      this.setData({ showLoginPopup: true });
      return;
    }

    // 显示加载中
    wx.showLoading({ title: '保存中...', mask: true });

    // 根据 userId + date 查询是否已有记录
    const self = this;
    this.checkRecordByDate().then(res => {
      if (res?.length > 0) {
        this.updateRecord(record);
      } else {
        this.addRecord(record, userId, currentDateTimestamp);
      }
    }).then(() => {
      self.showNotify('更新成功，继续保持！', 'success');
      self.fetchRecordDates();
    }).catch(function(err) {
      wx.hideLoading();
      console.error('保存失败：', err);
      self.showNotify('保存失败，请重试', 'danger');
    });
  },


  // 获取所有有记录的日期
  fetchRecordDates() {
    const {userId, currentDateTimestamp} = this.data;
    if (userId == null) {
      return;
    }
    const self = this;
    const db = wx.cloud.database();
    const date = formatDate(currentDateTimestamp);
    db.collection('lean_logs')
      .where({ userId, date })
      .field({ date: true })
      .get()
      .then(function(res) {
        if (res?.data && res.data?.length > 0) {
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
  



  


  

  // 登录失败回调（由 login-auth 组件触发）
  onLoginFail(e) {
    console.error('登录失败：', e.detail.error);
    this.showNotify('需要授权才能使用完整功能', 'warning');
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

    // 关闭弹窗，更新标题中的日期信息
    this.setData({
      showDatePickerPopup: false,
      currentDateTimestamp: timestamp,
      selectedDateLabel: dateLabel
    });

    // 重新获取该日期的记录
    wx.showLoading({ title: '加载中...', mask: true });
    wx.cloud.database().collection('lean_logs')
      .where({
        date: dateYMD
      })
      .limit(1)
      .get()
      .then(function(res) {
        wx.hideLoading();
        if (res?.data && res.data?.length > 0) {
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
    const { record } = this.data;
    if (record == null) {
      this.initRecord();
    }
    record[field] = e.detail;
    this.setData({record});
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

  

});
