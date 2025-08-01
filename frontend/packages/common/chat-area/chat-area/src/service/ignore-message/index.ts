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
 
import { VerboseMsgType } from '@coze-common/chat-core';

import {
  isBackwardsVerboseContent,
  isJumpToVerboseContent,
  isKnowledgeRecallVerboseContent,
  isKnowledgeRecallVerboseContentDeprecated,
  isLongTermMemoryVerboseContent,
  isVerboseContent,
  isVerboseMessage,
} from '../../utils/verbose';
import { safeJSONParse } from '../../utils/safe-json-parse';
import { type Message } from '../../store/types';
import {
  IgnoreMessageType,
  type ChatAreaConfigs,
} from '../../context/chat-area-context/type';

const checkIgnoreMessageFuncMap: Record<
  IgnoreMessageType,
  (parsedContent: unknown, message: Message) => boolean
> = {
  [IgnoreMessageType.Knowledge]: (parsedContent, message) =>
    message.type === 'knowledge' ||
    isKnowledgeRecallVerboseContentDeprecated(parsedContent) ||
    isKnowledgeRecallVerboseContent(parsedContent),
  [IgnoreMessageType.LongTermMemory]: isLongTermMemoryVerboseContent,
  [IgnoreMessageType.JumpToAgent]: isJumpToVerboseContent,
  [IgnoreMessageType.Backwards]: isBackwardsVerboseContent,
};

const allVerboseTypesMap: Record<VerboseMsgType, true> = {
  [VerboseMsgType.BACK_WORD]: true,
  [VerboseMsgType.GENERATE_ANSWER_FINISH]: true,
  [VerboseMsgType.JUMP_TO]: true,
  [VerboseMsgType.LONG_TERM_MEMORY]: true,
  [VerboseMsgType.STREAM_PLUGIN_FINISH]: true,
  [VerboseMsgType.KNOWLEDGE_RECALL]: true,
  [VerboseMsgType.INTERRUPT]: true,
  [VerboseMsgType.HOOK_CALL]: true,
};

/**
 * 是否是可以识别的 verbose 消息
 */
export const isIdentifiedVerboseMessage = (value: unknown) =>
  (isVerboseContent(value) && allVerboseTypesMap[value.msg_type]) ||
  isKnowledgeRecallVerboseContentDeprecated(value);

/**
 * !important
 * 除了显示传入的 ignoreMessageConfigList 外
 * 隐含了对所有不能识别的 verbose 消息的处理
 * 一定要注意
 */
export const getShouldDropMessage = (
  ignoreMessageConfigList: ChatAreaConfigs['ignoreMessageConfigList'],
  message: Message,
) => {
  const parsedContent = safeJSONParse(message.content);

  if (!isVerboseMessage(message)) {
    return false;
  }

  if (!isIdentifiedVerboseMessage(parsedContent)) {
    return true;
  }

  for (const ignoreConfig of ignoreMessageConfigList) {
    // 这里面是判断 content 是否符合对应的 verbose 消息, 需要前置先保证是 verbose 消息
    if (checkIgnoreMessageFuncMap[ignoreConfig](parsedContent, message)) {
      return true;
    }
  }

  return false;
};
