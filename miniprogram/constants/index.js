/**
 * 全局常量配置文件
 * 存放应用中使用的固定常量
 */

// 宣言
const MANIFESTO = "坚持就是胜利，记录每一天的改变";

// ==================== 颜色和主题配置 ====================
const THEME_CONFIG = {
  // 默认主题色ID
  DEFAULT_THEME_ID: 'pink',

  // 主题列表
  THEMES: [
    { id: 'pink', name: '樱花粉', color: '#E8B4B8', lightColor: '#F2D5D8' },
    { id: 'blue', name: '天空蓝', color: '#5B8FF9', lightColor: '#9BB8F7' },
    { id: 'green', name: '薄荷绿', color: '#07C160', lightColor: '#6FD99A' },
    { id: 'purple', name: '薰衣草', color: '#8B5CF6', lightColor: '#BFA3FA' },
    { id: 'orange', name: '暖阳橙', color: '#FF976A', lightColor: '#FFBE9E' },
    { id: 'cyan', name: '湖水青', color: '#13C2C2', lightColor: '#76DEDE' },
  ]
};

// ==================== 悬浮菜单配置 ====================
const FLOAT_MENU = {
  // 菜单项配置
  ITEMS: [
    { id: 'theme', icon: 'smile-o', label: '切换主题' },
    { id: 'chart', icon: 'chart-trending-o', label: '数据统计' },
    { id: 'date', icon: 'calendar-o', label: '选择日期' },
  ],
};

// 打卡属性列表
const PROPERTIE_ITEMS = [
  {label: '空腹体重', value: 'weight', canShowLineChart: true}, 
  {label: '体脂率', value: 'bodyFat', canShowLineChart: true}, 
  {label: '是否按计划饮食', value: 'isHealthyDiet'}, 
  {label: '饮水量', value: 'water', canShowLineChart: true}, 
  {label: '饮食记录', value: 'diet'}, 
  {label: '行走步数', value: 'stepNumber', canShowLineChart: true}, 
  {label: '是否运动', value: 'exercised'}, 
  {label: '运动总时长', value: 'exerciseList',canShowLineChart: true}, 
  {label: '昨夜睡眠', value: 'sleepDuration', canShowLineChart: true}, 
  {label: '状态', value: 'mood'}, 
  {label: '饥饿感', value: 'hunger'}, 
  {label: '睡前体重', value: 'bedTimeWeight', canShowLineChart: true}, 
  {label: '备注', value: 'notes'}, 
  {label: '胸围', value: 'chest', canShowLineChart: true}, 
  {label: '腰围', value: 'waist', canShowLineChart: true}, 
  {label: '臀围', value: 'hip', canShowLineChart: true}, 
  {label: '上臂围', value: 'arm', canShowLineChart: true}, 
  {label: '大腿围', value: 'thigh', canShowLineChart: true}];

// 饥饿程度分类
const HUNGER_OPTIONS = [
  { label: '很饿', value: 'very_hungry' },
  { label: '有点饿', value: 'slightly_hungry' },
  { label: '适中', value: 'normal' },
  { label: '较饱', value: 'slightly_full' },
  { label: '很饱', value: 'very_full' }
]

// 运动分类配置
const EXERCISE_CATEGORIES = [
  { label: '有氧运动', value: 'aerobic_exercise' },
  { label: '无氧运动', value: 'anaerobic_exercise' }
];

// 运动项目
const EXERCISE_TYPES_BY_CATEGORY = {
  'aerobic_exercise': [{ label: '快走', value: 'brisk_walking' },
    { label: '慢跑', value: 'jogging' },
    { label: '游泳', value: 'swimming' },
    { label: '骑自行车', value: 'cycling' },
    { label: '动感单车', value: 'spinning' },
    { label: '跳绳', value: 'rope_skipping' },
    { label: '椭圆机训练', value: 'elliptical_training' },
    { label: '划船机训练', value: 'rowing' },
    { label: '登山机训练', value: 'stair_climbing' },
    { label: '有氧搏击操', value: 'cardio_kickboxing' },
    { label: '瑜伽', value: 'yoga' },
    { label: '其他有氧', value: 'other_aerobic' }],
  'anaerobic_exercise': [
      { label: '深蹲', value: 'squat' },
      { label: '硬拉', value: 'deadlift' },
      { label: '卧推', value: 'benchpress' },
      { label: '引体向上', value: 'pull_up' },
      { label: '肩部推举', value: 'overhead_press' },
      { label: '臂屈伸', value: 'triceps_dip' },
      { label: '弯举', value: 'bicep_curl' },
      { label: '腿举', value: 'leg_press' },
      { label: '坐姿划船', value: 'seated_row' },
      { label: '平板支撑', value: 'plank' },
      { label: '其他无氧', value: 'other_anaerobic' }
  ]
};

module.exports = {
  MANIFESTO,
  THEME_CONFIG,
  FLOAT_MENU,
  PROPERTIE_ITEMS,
  HUNGER_OPTIONS,
  EXERCISE_TYPES_BY_CATEGORY,
  EXERCISE_CATEGORIES
};
