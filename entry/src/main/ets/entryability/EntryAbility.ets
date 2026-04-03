/**
 * 入口能力类 - HarmonyOS应用的主入口点
 * 负责应用生命周期管理和初始化工作
 */

import { AbilityConstant, ConfigurationConstant, UIAbility, Want } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { window } from '@kit.ArkUI';
import NoteService from '../Service/NoteService';

// 日志域标识
const DOMAIN = 0x0000;

export default class EntryAbility extends UIAbility {
  /**
   * 能力创建时调用
   * @param want - 启动参数
   * @param launchParam - 启动配置
   */
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    try {
      // 设置应用颜色模式为系统默认
      this.context.getApplicationContext().setColorMode(ConfigurationConstant.ColorMode.COLOR_MODE_NOT_SET);
    } catch (err) {
      hilog.error(DOMAIN, 'testTag', 'Failed to set colorMode. Cause: %{public}s', JSON.stringify(err));
    }
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onCreate');
  }

  /**
   * 能力销毁时调用
   * 清理资源和释放内存
   */
  onDestroy(): void {
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onDestroy');
  }

  /**
   * 窗口阶段创建时调用
   * 主要初始化工作和UI加载
   * @param windowStage - 窗口阶段对象
   */
  onWindowStageCreate(windowStage: window.WindowStage): void {
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onWindowStageCreate');

    // 初始化笔记服务的上下文，为数据持久化做准备
    NoteService.setContext(this.context);

    // 加载主页面内容
    windowStage.loadContent('pages/Index', (err) => {
      if (err.code) {
        hilog.error(DOMAIN, 'testTag', 'Failed to load the content. Cause: %{public}s', JSON.stringify(err));
        return;
      }
      hilog.info(DOMAIN, 'testTag', 'Succeeded in loading the content.');
    });
  }

  /**
   * 窗口阶段销毁时调用
   * 清理UI相关资源
   */
  onWindowStageDestroy(): void {
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onWindowStageDestroy');
  }

  /**
   * 应用进入前台时调用
   * 恢复应用状态和数据同步
   */
  onForeground(): void {
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onForeground');
  }

  /**
   * 应用进入后台时调用
   * 保存状态和释放非必要资源
   */
  onBackground(): void {
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onBackground');
  }
}