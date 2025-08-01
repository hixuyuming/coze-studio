/*
 * Copyright 2025 coze-dev Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
import { type ContentType } from '@coze-common/chat-core';
import { type InsertedElementItem } from '@coze-arch/bot-md-box-adapter';

import { type CustomComponent } from '../plugin-component';
import { type MessageMeta, type Message } from '../../../store/types';

export interface OnTextContentRenderingContext {
  insertedElements: InsertedElementItem[] | undefined;
  message: Message;
}

export interface OnMessageBoxRenderContext {
  /**
   * 动态注入的自定义渲染组件
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention -- 符合预期的命名
  MessageBox?: CustomComponent['MessageBox'];
  /**
   * 消息体
   */
  message: Message<ContentType>;
  /**
   * Meta
   */
  meta: MessageMeta;
}
