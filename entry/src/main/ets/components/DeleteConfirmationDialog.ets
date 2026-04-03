/**
 * 自定义删除确认弹窗组件
 * 提供丰富的删除确认体验，支持不同风险级别的删除操作
 */

import { DeleteDialogConfig } from '../types/ModalTypes';

@Component
export struct DeleteConfirmationDialog {
  @Link isShow: boolean;
  @Link onConfirm: () => void;
  @Link onCancel: () => void;
  
  // 弹窗配置
  private title: string = '删除确认';
  private message: string = '确定要删除吗？此操作将无法撤销。';
  private confirmText: string = '确认删除';
  private cancelText: string = '取消';
  private riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  private itemType: string = '项目';
  private itemName: string = '';
  private itemCount: number = 1;

  /**
   * 设置弹窗配置
   */
  setConfig(config: DeleteDialogConfig): DeleteConfirmationDialog {
    if (config.title) this.title = config.title;
    if (config.message) this.message = config.message;
    if (config.confirmText) this.confirmText = config.confirmText;
    if (config.cancelText) this.cancelText = config.cancelText;
    if (config.riskLevel) this.riskLevel = config.riskLevel;
    if (config.itemType) this.itemType = config.itemType;
    if (config.itemName) this.itemName = config.itemName;
    if (config.itemCount) this.itemCount = config.itemCount;
    
    return this;
  }

  /**
   * 获取风险级别对应的颜色
   */
  private getRiskColor(): string {
    switch (this.riskLevel) {
      case 'low':
        return '#007AFF';
      case 'medium':
        return '#FF9500';
      case 'high':
        return '#FF3B30';
      case 'critical':
        return '#FF2D55';
      default:
        return '#007AFF';
    }
  }

  /**
   * 获取风险级别对应的图标
   */
  private getRiskIcon(): Resource {
    // 使用现有图标资源
    return $r('app.media.add');
  }

  build() {
    Stack({ alignContent: Alignment.Center }) {
      if (this.isShow) {
        // 遮罩层
        Column() {
          // 半透明遮罩
          Blank()
            .width('100%')
            .height('100%')
            .backgroundColor('#000000')
            .opacity(0.5)
            .onClick(() => {
              this.onCancel();
            })
        }
        .width('100%')
        .height('100%')

        // 弹窗内容
        Column({ space: 20 }) {
          // 标题区域
          Column({ space: 12 }) {
            // 图标和标题
            Row({ space: 8 }) {
              Image(this.getRiskIcon())
                .width(24)
                .height(24)
                .fillColor(this.getRiskColor())
              
              Text(this.title)
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .fontColor('#000000')
            }
            .width('100%')
            .justifyContent(FlexAlign.Start)

            // 消息内容
            Text(this.message)
              .fontSize(14)
              .fontColor('#666666')
              .textAlign(TextAlign.Start)
              .width('100%')
              .maxLines(4)
          }
          .width('100%')
          .padding({ left: 24, right: 24, top: 24 })

          // 按钮区域
          Row({ space: 12 }) {
            // 取消按钮
            Button(this.cancelText)
              .layoutWeight(1)
              .height(44)
              .fontSize(16)
              .fontColor('#007AFF')
              .backgroundColor('#F2F2F7')
              .borderRadius(8)
              .onClick(() => {
                this.onCancel();
              })

            // 确认按钮
            Button(this.confirmText)
              .layoutWeight(1)
              .height(44)
              .fontSize(16)
              .fontColor('#FFFFFF')
              .backgroundColor(this.getRiskColor())
              .borderRadius(8)
              .onClick(() => {
                this.onConfirm();
              })
          }
          .width('100%')
          .padding({ left: 24, right: 24, bottom: 24 })
        }
        .width('80%')
        .backgroundColor('#FFFFFF')
        .borderRadius(16)
        .shadow({
          radius: 20,
          color: '#000000',
          offsetX: 0,
          offsetY: 4
        })
      }
    }
    .width('100%')
    .height('100%')
    .position({
      x: 0,
      y: 0
    })
  }
}