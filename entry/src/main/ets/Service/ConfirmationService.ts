import promptAction from '@ohos.promptAction';

/**
 * 操作风险级别
 */
export enum OperationRiskLevel {
  LOW = 'low',      // 低风险操作
  MEDIUM = 'medium', // 中风险操作
  HIGH = 'high',     // 高风险操作
  CRITICAL = 'critical' // 关键风险操作
}

/**
 * 确认弹窗服务 - 基于HarmonyOS最佳实践的统一确认操作管理
 */
class ConfirmationService {
  // 弹窗配置常量
  private readonly CONFIG = {
    DANGER_COLOR: '#FF3B30',
    PRIMARY_COLOR: '#007AFF',
    SECONDARY_COLOR: '#666666',
    SUCCESS_COLOR: '#34C759',
    WARNING_COLOR: '#FF9500'
  };

  /**
   * 根据风险级别获取确认配置
   */
  private getConfirmationConfig(
    level: OperationRiskLevel,
    operationType: string,
    itemName: string = '项目',
    count: number = 1
  ): {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    confirmColor: string;
    showWarningIcon: boolean;
    requireAdditionalConfirmation?: boolean;
  } {
    const baseConfigs = {
      [OperationRiskLevel.LOW]: {
        title: '确认操作',
        message: `确定要执行此操作吗？`,
        confirmText: '确定',
        cancelText: '取消',
        confirmColor: this.CONFIG.PRIMARY_COLOR,
        showWarningIcon: false
      },
      [OperationRiskLevel.MEDIUM]: {
        title: '操作确认',
        message: `确定要${operationType}这个${itemName}吗？`,
        confirmText: operationType,
        cancelText: '取消',
        confirmColor: this.CONFIG.WARNING_COLOR,
        showWarningIcon: true
      },
      [OperationRiskLevel.HIGH]: {
        title: '高风险操作确认',
        message: `确定要${operationType}这个${itemName}吗？此操作将无法撤销。`,
        confirmText: operationType,
        cancelText: '取消',
        confirmColor: this.CONFIG.DANGER_COLOR,
        showWarningIcon: true,
        requireAdditionalConfirmation: true
      },
      [OperationRiskLevel.CRITICAL]: {
        title: '关键操作确认',
        message: `确定要${operationType} ${count} 个${itemName}吗？此操作将永久删除数据且无法恢复。`,
        confirmText: `确认${operationType}`,
        cancelText: '取消',
        confirmColor: this.CONFIG.DANGER_COLOR,
        showWarningIcon: true,
        requireAdditionalConfirmation: true
      }
    };

    return baseConfigs[level];
  }

  /**
   * 显示分级确认弹窗
   */
  async showGradedConfirmation(
    level: OperationRiskLevel,
    operationType: string,
    itemName: string = '项目',
    count: number = 1
  ): Promise<boolean> {
    const config = this.getConfirmationConfig(level, operationType, itemName, count);
    
    // 高风险操作需要二次确认
    if (config.requireAdditionalConfirmation) {
      const firstConfirmed = await this.showBasicConfirmation(config);
      if (!firstConfirmed) {
        return false;
      }
      
      // 二次确认
      const secondConfig = {
        ...config,
        title: '请再次确认',
        message: `请再次确认是否要${operationType} ${count > 1 ? count + '个' : '这个'}${itemName}？`,
        confirmText: '确认执行'
      };
      
      return await this.showBasicConfirmation(secondConfig);
    }
    
    return await this.showBasicConfirmation(config);
  }

  /**
   * 显示基础确认弹窗
   */
  private async showBasicConfirmation(config: {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    confirmColor: string;
    showWarningIcon: boolean;
    requireAdditionalConfirmation?: boolean;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      promptAction.showDialog({
        title: config.title,
        message: config.message,
        buttons: [
          {
            text: config.cancelText,
            color: this.CONFIG.SECONDARY_COLOR
          },
          {
            text: config.confirmText,
            color: config.confirmColor
          }
        ]
      }).then((result) => {
        resolve(result.index === 1);
      }).catch(() => {
        resolve(false);
      });
    });
  }

  /**
   * 显示删除确认弹窗 - 增强版
   */
  async showDeleteConfirmation(
    message: string = '确定要删除吗？删除后将无法恢复。',
    title: string = '删除确认',
    itemName: string = '项目'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      promptAction.showDialog({
        title: title,
        message: message,
        buttons: [
          {
            text: '取消',
            color: this.CONFIG.SECONDARY_COLOR
          },
          {
            text: `删除${itemName}`,
            color: this.CONFIG.DANGER_COLOR
          }
        ]
      }).then((result) => {
        resolve(result.index === 1);
      }).catch(() => {
        resolve(false);
      });
    });
  }

  /**
   * 显示批量删除确认弹窗 - 增强版
   */
  async showBatchDeleteConfirmation(count: number, itemName: string = '笔记'): Promise<boolean> {
    const level = count > 5 ? OperationRiskLevel.CRITICAL : OperationRiskLevel.HIGH;
    return this.showGradedConfirmation(level, '删除', itemName, count);
  }

  /**
   * 显示内容删除确认弹窗 - 增强版
   */
  async showContentDeleteConfirmation(contentType: string = '内容项'): Promise<boolean> {
    return this.showGradedConfirmation(OperationRiskLevel.MEDIUM, '删除', contentType, 1);
  }

  /**
   * 显示笔记删除确认（智能分级）
   */
  async showNoteDeleteConfirmation(noteTitle: string, isPinned: boolean = false): Promise<boolean> {
    const level = isPinned ? OperationRiskLevel.HIGH : OperationRiskLevel.MEDIUM;
    
    // 智能消息生成
    let message = `确定要删除"${noteTitle}"吗？`;
    if (isPinned) {
      message += ' 这是一个置顶笔记，删除后将无法恢复。';
    } else {
      message += ' 删除后将无法恢复。';
    }
    
    return new Promise((resolve) => {
      promptAction.showDialog({
        title: isPinned ? '删除置顶笔记' : '删除笔记',
        message: message,
        buttons: [
          {
            text: '取消',
            color: this.CONFIG.SECONDARY_COLOR
          },
          {
            text: '确认删除',
            color: this.CONFIG.DANGER_COLOR
          }
        ]
      }).then((result) => {
        resolve(result.index === 1);
      }).catch(() => {
        resolve(false);
      });
    });
  }

  /**
   * 显示保存确认弹窗
   */
  async showSaveConfirmation(): Promise<boolean> {
    return this.showGradedConfirmation(OperationRiskLevel.LOW, '保存', '修改', 1);
  }

  /**
   * 显示取消编辑确认
   */
  async showCancelEditConfirmation(hasChanges: boolean): Promise<boolean> {
    if (!hasChanges) {
      return true;
    }
    
    return new Promise((resolve) => {
      promptAction.showDialog({
        title: '放弃修改',
        message: '当前有未保存的修改，确定要放弃吗？',
        buttons: [
          {
            text: '继续编辑',
            color: this.CONFIG.SECONDARY_COLOR
          },
          {
            text: '放弃修改',
            color: this.CONFIG.DANGER_COLOR
          }
        ]
      }).then((result) => {
        resolve(result.index === 1);
      }).catch(() => {
        resolve(false);
      });
    });
  }

  /**
   * 显示通用确认弹窗 - 增强版
   */
  async showConfirmation(
    message: string,
    title: string = '确认操作',
    confirmText: string = '确定',
    cancelText: string = '取消',
    confirmType: 'primary' | 'danger' | 'success' = 'primary'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmColor = this.getConfirmColor(confirmType);
      
      promptAction.showDialog({
        title: title,
        message: message,
        buttons: [
          {
            text: cancelText,
            color: this.CONFIG.SECONDARY_COLOR
          },
          {
            text: confirmText,
            color: confirmColor
          }
        ]
      }).then((result) => {
        resolve(result.index === 1);
      }).catch(() => {
        resolve(false);
      });
    });
  }

  /**
   * 显示操作确认弹窗（带警告图标）
   */
  async showWarningConfirmation(
    message: string,
    title: string = '操作确认'
  ): Promise<boolean> {
    return this.showConfirmation(
      message,
      title,
      '继续',
      '取消',
      'danger'
    );
  }

  /**
   * 显示成功确认弹窗
   */
  async showSuccessConfirmation(
    message: string,
    title: string = '操作成功'
  ): Promise<boolean> {
    return this.showConfirmation(
      message,
      title,
      '确定',
      '',
      'success'
    );
  }

  /**
   * 显示撤销提示 - 增强版
   */
  showUndoToast(message: string = '操作已撤销', duration: number = 2000): void {
    promptAction.showToast({
      message: message,
      duration: duration
    });
  }

  /**
   * 显示操作成功提示 - 增强版
   */
  showSuccessToast(message: string, duration: number = 2000): void {
    promptAction.showToast({
      message: message,
      duration: duration
    });
  }

  /**
   * 显示错误提示 - 增强版
   */
  showErrorToast(message: string, duration: number = 3000): void {
    promptAction.showToast({
      message: message,
      duration: duration
    });
  }

  /**
   * 显示信息提示
   */
  showInfoToast(message: string, duration: number = 2000): void {
    promptAction.showToast({
      message: message,
      duration: duration
    });
  }

  /**
   * 显示警告提示
   */
  showWarningToast(message: string, duration: number = 3000): void {
    promptAction.showToast({
      message: message,
      duration: duration
    });
  }

  /**
   * 获取确认按钮颜色
   */
  private getConfirmColor(type: string): string {
    switch (type) {
      case 'danger':
        return this.CONFIG.DANGER_COLOR;
      case 'success':
        return this.CONFIG.SUCCESS_COLOR;
      case 'primary':
      default:
        return this.CONFIG.PRIMARY_COLOR;
    }
  }

  /**
   * 显示加载提示
   */
  showLoading(message: string = '加载中...'): void {
    // HarmonyOS 暂不支持自定义加载提示，使用Toast替代
    promptAction.showToast({
      message: message,
      duration: 1500
    });
  }

  /**
   * 批量操作结果提示
   */
  showBatchResultToast(successCount: number, totalCount: number, operation: string = '操作'): void {
    if (successCount === totalCount) {
      this.showSuccessToast(`${operation}成功，共处理 ${totalCount} 个项目`);
    } else if (successCount === 0) {
      this.showErrorToast(`${operation}失败，请重试`);
    } else {
      this.showWarningToast(`${operation}完成，成功 ${successCount}/${totalCount} 个项目`);
    }
  }
}

export default new ConfirmationService();