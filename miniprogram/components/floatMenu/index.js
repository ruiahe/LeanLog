// 悬浮菜单组件
Component({
  options: {
    multipleSlots: true
  },

  properties: {
    // 菜单项配置
    menuItems: {
      type: Array,
      value: []
      // 格式: [{ id: 'date', icon: 'calendar-o', bgColor: 'linear-gradient(...)' }, ...]
    },
    // 主题色
    theme: {
      type: Object,
      value: null,
    },
    // 按钮初始X位置
    initialX: {
      type: Number,
      value: 0,
    },
    // 按钮初始Y位置
    initialY: {
      type: Number,
      value: 0
    }
  },

  data: {
    btnX: 0,
    btnY: 0,
    windowWidth: 375,
    windowHeight: 667,
    showMenu: false,
    menuPositions: ['scale(0)', 'scale(0)', 'scale(0)']
  },

  lifetimes: {
    attached() {
      this.initPosition();
    }
  },

  methods: {
    // 初始化按钮位置
    initPosition() {
      const sysInfo = wx.getSystemInfoSync();
      const btnSize = 50; // 按钮尺寸 px
      const padding = 20;

      // 默认位置：右下角
      const defaultX = sysInfo.windowWidth - btnSize - padding;
      // 贴近右下角，留出底部安全区域
      const safeAreaBottom = sysInfo.safeArea ? (sysInfo.screenHeight - sysInfo.safeArea.bottom) : 0;
      const defaultY = sysInfo.windowHeight - btnSize - padding - safeAreaBottom;

      this.startX = 0;
      this.startY = 0;
      this.moved = false;

      this.setData({
        btnX: defaultX,
        btnY: defaultY,
        windowWidth: sysInfo.windowWidth,
        windowHeight: sysInfo.windowHeight
      });
    },

    // 触摸开始
    onTouchStart(e) {
      const touch = e.touches[0];
      this.startX = touch.clientX - this.data.btnX;
      this.startY = touch.clientY - this.data.btnY;
      this.moved = false;
    },

    // 触摸移动
    onTouchMove(e) {
      // 菜单展开时禁止移动
      if (this.data.showMenu) {
        return;
      }

      const touch = e.touches[0];
      const btnSize = 50;
      const padding = 10;

      let newX = touch.clientX - this.startX;
      let newY = touch.clientY - this.startY;

      // 限制在屏幕范围内
      newX = Math.max(padding, Math.min(this.data.windowWidth - btnSize - padding, newX));
      newY = Math.max(padding, Math.min(this.data.windowHeight - btnSize - padding, newY));

      // 判断是否移动
      if (Math.abs(newX - this.data.btnX) > 5 || Math.abs(newY - this.data.btnY) > 5) {
        this.moved = true;
      }

      this.setData({
        btnX: newX,
        btnY: newY
      });
    },

    // 触摸结束
    onTouchEnd() {
      if (!this.moved) {
        this.toggleMenu();
      }
    },

    // 切换菜单
    toggleMenu() {
      const showMenu = !this.data.showMenu;

      if (showMenu) {
        const menuPositions = this.calculateMenuPositions();
        this.setData({
          showMenu: true,
          menuPositions: menuPositions
        });
        // 触发菜单展开事件
        this.triggerEvent('menuopen', { x: this.data.btnX, y: this.data.btnY });
      } else {
        this.setData({ showMenu: false });
        this.triggerEvent('menuclose');
      }
    },

    // 关闭菜单
    closeMenu() {
      this.setData({ showMenu: false });
      this.triggerEvent('menuclose');
    },

    // 计算菜单位置
    calculateMenuPositions() {
      const { btnX, btnY, windowWidth, windowHeight } = this.data;
      const btnRadius = 50;
      const menuRadius = 85;
      const menuItemRadius = 44;
      const padding = 15;

      const btnCenterX = btnX + btnRadius;
      const btnCenterY = btnY + btnRadius;

      const needSpace = menuRadius + menuItemRadius + padding;
      const isLeft = btnCenterX < needSpace;
      const isRight = btnCenterX > windowWidth - needSpace;
      const isTop = btnCenterY < needSpace;
      const isBottom = btnCenterY > windowHeight - needSpace;

      let baseAngle = -90;
      let angleStep = 50;

      if (isTop && isLeft) {
        baseAngle = 45;
      } else if (isTop && isRight) {
        baseAngle = 135;
      } else if (isBottom && isLeft) {
        baseAngle = -45;
      } else if (isBottom && isRight) {
        baseAngle = -135;
      } else if (isTop) {
        baseAngle = 90;
      } else if (isBottom) {
        baseAngle = -90;
      } else if (isLeft) {
        baseAngle = 0;
      } else if (isRight) {
        baseAngle = 180;
      } else {
        baseAngle = -90;
      }

      const positions = [];
      const itemCount = this.data.menuItems.length || 3;

      for (let i = 0; i < itemCount; i++) {
        const angle = (baseAngle + (i - 1) * angleStep) * Math.PI / 180;
        const offsetX = Math.round(Math.cos(angle) * menuRadius);
        const offsetY = Math.round(Math.sin(angle) * menuRadius);
        positions.push(`scale(1) translate(${offsetX}px, ${offsetY}px)`);
      }

      return positions;
    },

    // 菜单项点击
    onMenuTap(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.menuItems[index];
      this.triggerEvent('menutap', { index, item });
      this.closeMenu();
    },

    // 获取当前位置（供外部调用）
    getPosition() {
      return {
        x: this.data.btnX,
        y: this.data.btnY
      };
    },

    // 设置位置（供外部调用）
    setPosition(x, y) {
      this.setData({
        btnX: x,
        btnY: y
      });
    }
  }
});
