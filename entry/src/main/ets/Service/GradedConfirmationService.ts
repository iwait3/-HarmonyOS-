/**
 * 分级确认服务 - 基于操作风险级别提供不同的确认弹窗
 */

import promptAction from '@ohos.promptAction';
import { NoteData } from '../model/NoteData';

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
 * 确认弹窗配置
 */
interface ConfirmationConfig {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  confirmColor: string;
  showWarningIcon: boolean;
  requireAdditionalConfirmation?: boolean; // 是否需要二次确认
}

class GradedConfirmationService {
  // 颜色配置
  private readonly COLORS = {
    PRIMARY: '#007AFF',
    DANGER: '#FF3B30',
    WARNING: '#FF9500',
    SUCCESS: '#34C759',
    SECONDARY: '#8E8E93'
  };

  /**
   * 根据风险级别获取确认配置
   */
  private getConfirmationConfig(
    level: OperationRiskLevel,
    operationType: string,
    itemName: string = '项目',
    count: number = 1
  ): ConfirmationConfig {
    const baseConfigs = {
      [OperationRiskLevel.LOW]: {
        title: '确认操作',
        message: `确定要执行此操作吗？`,
        confirmText: '确定',
        cancelText: '取消',
        confirmColor: this.COLORS.PRIMARY,
        showWarningIcon: false
      },
      [OperationRiskLevel.MEDIUM]: {
        title: '操作确认',
        message: `确定要${operationType}这个${itemName}吗？`,
        confirmText: operationType,
        cancelText: '取消',
        confirmColor: this.COLORS.WARNING,
        showWarningIcon: true
      },
      [OperationRiskLevel.HIGH]: {
        title: '高风险操作确认',
        message: `确定要${operationType}这个${itemName}吗？此操作将无法撤销。`,
        confirmText: operationType,
        cancelText: '取消',
        confirmColor: this.COLORS.DANGER,
        showWarningIcon: true,
        requireAdditionalConfirmation: true
      },
      [OperationRiskLevel.CRITICAL]: {
        title: '关键操作确认',
        message: `确定要${operationType} ${count} 个${itemName}吗？此操作将永久删除数据且无法恢复。`,
        confirmText: `确认${operationType}`,
        cancelText: '取消',
        confirmColor: this.COLORS.DANGER,
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
  private async showBasicConfirmation(config: ConfirmationConfig): Promise<boolean> {
    return new Promise((resolve) => {
      promptAction.showDialog({
        title: config.title,
        message: config.message,
        buttons: [
          {
            text: config.cancelText,
            color: this.COLORS.SECONDARY
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
   * 显示笔记删除确认
   */
  async showNoteDeleteConfirmation(note: NoteData): Promise<boolean> {
    const level = note.isPinned ? OperationRiskLevel.HIGH : OperationRiskLevel.MEDIUM;
    return this.showGradedConfirmation(level, '删除', '笔记', 1);
  }

  /**
   * 显示批量删除确认
   */
  async showBatchDeleteConfirmation(count: number, itemName: string = '笔记'): Promise<boolean> {
    const level = count > 5 ? OperationRiskLevel.CRITICAL : OperationRiskLevel.HIGH;
    return this.showGradedConfirmation(level, '删除', itemName, count);
  }

  /**
   * 显示内容项删除确认
   */
  async showContentDeleteConfirmation(contentType: string): Promise<boolean> {
    return this.showGradedConfirmation(OperationRiskLevel.MEDIUM, '删除', contentType, 1);
  }

  /**
   * 显示保存确认
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
            color: this.COLORS.SECONDARY
          },
          {
            text: '放弃修改',
            color: this.COLORS.DANGER
          }
        ]
      }).then((result) => {
        resolve(result.index === 1);
      }).catch(() => {
        resolve(false);
      });
    });
  }
}

export default new GradedConfirmationService();