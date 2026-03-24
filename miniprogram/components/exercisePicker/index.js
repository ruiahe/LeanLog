/**
 * 运动类型选择弹窗组件
 * 两步选择：先选分类（有氧/无氧），再选具体运动类型
 * 支持自定义运动类型输入
 */
const { EXERCISE_CATEGORIES, EXERCISE_TYPES_BY_CATEGORY } = require('../../constants/index');

Component({
  properties: {
    // 是否显示分类选择弹窗（第一步）
    showCategory: {
      type: Boolean,
      value: false
    },
    // 是否显示类型选择弹窗（第二步）
    showType: {
      type: Boolean,
      value: false
    },
    // 当前运动项数据
    currentExercise: {
      type: Object,
      value: null
    },
    // 主题色
    themeColor: {
      type: String,
      value: '#E8B4B8'
    }
  },

  data: {
    // 运动分类
    exerciseCategories: EXERCISE_CATEGORIES,
    // 运动项目（按分类）
    exerciseTypesByCategory: EXERCISE_TYPES_BY_CATEGORY,
    // 是否显示自定义输入框
    showCustomInput: false,
    // 自定义运动类型输入值
    customExerciseType: ''
  },

  methods: {
    // 选择运动分类（有氧/无氧）
    onSelectCategory(e) {
      const { value, label } = e.currentTarget.dataset;
      this.triggerEvent('selectcategory', {
        category: value,
        categoryName: label
      });
    },

    // 选择具体运动类型
    onSelectType(e) {
      const { value, label } = e.currentTarget.dataset;
      // 判断是否是"其他"类型，需要显示输入框
      if (value === 'other_aerobic' || value === 'other_anaerobic') {
        this.setData({
          showCustomInput: true,
          customExerciseType: ''
        });
        return;
      }

      // 触发选择事件
      this.triggerEvent('selecttype', {
        type: value,
        typeLabel: label,
        isCustom: false
      });
    },

    // 返回分类选择
    onBackToCategory() {
      this.setData({
        showCustomInput: false,
        customExerciseType: ''
      });
      this.triggerEvent('backtocategory');
    },

    // 关闭分类弹窗
    onCloseCategory() {
      this.triggerEvent('closeCategory', 'exercise-category');
    },

    // 关闭类型弹窗
    onCloseType() {
      this.setData({
        showCustomInput: false,
        customExerciseType: ''
      });
      this.triggerEvent('closeType', 'exercise-type');
    },

    // 自定义运动类型输入
    onCustomInput(e) {
      this.setData({
        customExerciseType: e.detail.value
      });
    },

    // 确认自定义运动类型
    onConfirmCustom() {
      const customType = this.data.customExerciseType.trim();
      if (!customType) {
        wx.showToast({ title: '请输入运动类型', icon: 'none' });
        return;
      }

      // 触发选择事件
      this.triggerEvent('selecttype', {
        type: this.properties.currentExercise.category === '1' ? 'other_aerobic' : 'other_anaerobic',
        typeLabel: customType,
        isCustom: true
      });
    }
  }
});
